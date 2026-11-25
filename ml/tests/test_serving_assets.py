import hashlib
import io
import json
import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from zipfile import ZipFile

from ml.src.serving import assets


class GitHubReleaseAssetsTest(unittest.TestCase):
    def setUp(self):
        archive = io.BytesIO()
        with ZipFile(archive, "w") as bundle:
            for name in assets.FILES:
                bundle.writestr(name, f"fixture for {name}")
        self.payload = archive.getvalue()
        self.settings = {
            "ML_ASSET_GITHUB_REPOSITORY": "example/sellens-models",
            "ML_ASSET_GITHUB_TAG": "model/v2",
            "ML_ASSET_GITHUB_FILE": "sellens-ml-v2.zip",
            "ML_ASSET_GITHUB_TOKEN": "fake-test-token",
            "ML_ASSET_SHA256": hashlib.sha256(self.payload).hexdigest(),
        }
        self.metadata = json.dumps({"assets": [
            {"name": "wrong.zip", "id": 1, "size": 1},
            {"name": "sellens-ml-v2.zip", "id": 2, "size": len(self.payload)},
        ]}).encode()

    def test_finds_named_asset_and_extracts_verified_bundle(self):
        with TemporaryDirectory() as temp, patch.dict(os.environ, self.settings), patch.object(
            assets, "build_opener",
        ) as opener:
            request_log = opener.return_value.open
            request_log.side_effect = [io.BytesIO(self.metadata), io.BytesIO(self.payload)]
            output = Path(temp) / "model"
            assets.fetch_github(output)

            metadata, binary = [call.args[0] for call in request_log.call_args_list]
            api = "https://api.github.com/repos/example/sellens-models/releases"
            self.assertEqual(metadata.full_url, api + "/tags/model%2Fv2")
            self.assertEqual(binary.full_url, api + "/assets/2")
            self.assertEqual(binary.get_header("Accept"), "application/octet-stream")
            self.assertEqual(binary.get_header("Authorization"), "Bearer fake-test-token")
            self.assertEqual({file.name for file in output.iterdir()}, assets.FILES)

    def test_checksum_mismatch_prevents_extraction(self):
        settings = {**self.settings, "ML_ASSET_SHA256": "0" * 64}
        with TemporaryDirectory() as temp, patch.dict(os.environ, settings), patch.object(
            assets, "build_opener",
        ) as opener:
            opener.return_value.open.side_effect = [
                io.BytesIO(self.metadata), io.BytesIO(self.payload),
            ]
            output = Path(temp) / "model"
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                assets.fetch_github(output)
            self.assertFalse(output.exists())

    def test_https_redirect_drops_the_api_token(self):
        request = assets._github_request(
            "https://api.github.com/asset", "fake-test-token", "application/octet-stream",
        )
        handler = assets._HttpsRedirect()
        redirected = handler.redirect_request(
            request, None, 302, "Found", {}, "https://release-assets.githubusercontent.com/asset",
        )
        self.assertIsNone(redirected.get_header("Authorization"))
        with self.assertRaisesRegex(ValueError, "non-HTTPS"):
            handler.redirect_request(
                request, None, 302, "Found", {}, "http://release-assets.githubusercontent.com/asset",
            )


class PackTaxonomyTest(unittest.TestCase):
    def test_pack_bundles_the_requested_taxonomy(self):
        with TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "reference_models.joblib").write_bytes(b"model")
            (root / "model_metrics.json").write_text(json.dumps({
                "model_version": "test", "model_a_actionable": {"estimator_backend": "sklearn_hist_gradient_boosting"},
            }), encoding="utf-8")
            corpus = root / "clean_products.csv"
            corpus.write_text(",".join(assets.CORPUS_COLUMNS) + "\n" + ",".join(["1"] * len(assets.CORPUS_COLUMNS)) + "\n",
                              encoding="utf-8")
            output = root / "bundle.zip"
            assets.pack(root, corpus, output, Path("ml/config/taxonomy_v3.yml"))
            with ZipFile(output) as bundle:
                self.assertEqual(bundle.read("taxonomy.yml"), Path("ml/config/taxonomy_v3.yml").read_bytes())
