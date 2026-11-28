"""Pack a trusted training run locally and fetch the pinned release for deployment."""

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import sys
from importlib.metadata import version
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import BinaryIO
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from zipfile import ZIP_DEFLATED, ZipFile

DEFAULT_DIR = Path("ml/artifacts/serving")
CORPUS_COLUMNS = (
    "product_id", "seller_id", "product_name", "description", "product_type",
    "taxonomy_version", "valid_for_model", "quantity_sold", "price", "discount_rate",
    "image_count", "rating_average", "review_count", "description_length", "has_video",
)
FILES = {
    "reference_models.joblib", "model_metrics.json", "corpus.csv", "pipeline.yml",
    "taxonomy.yml", "requirements-model.txt", "manifest.json",
}
# Optional so bundles packed before it existed (v2, v3) still unpack unchanged.
OPTIONAL_FILES = {"oof_predictions.csv"}
OOF_COLUMNS = (
    "product_id", "sale_probability", "conditional_sales", "reference_sales",
    "prediction_lower", "prediction_upper",
)
MAX_BYTES = 1024 ** 3


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def _compact_predictions(predictions: Path, target: Path, corpus_ids: set[str]) -> None:
    """Out-of-fold Model A predictions, used to re-score corpus products whose listing is unchanged."""
    with predictions.open(encoding="utf-8-sig", newline="") as source, target.open(
        "w", encoding="utf-8", newline=""
    ) as output:
        reader = csv.DictReader(source)
        if not set(OOF_COLUMNS).issubset(reader.fieldnames or []):
            raise ValueError("Use model_predictions.csv from the run that trained this bundle")
        writer = csv.DictWriter(output, OOF_COLUMNS)
        writer.writeheader()
        for row in reader:
            if row["sale_probability"] == "":
                continue
            if row["product_id"] not in corpus_ids:
                raise ValueError("Out-of-fold predictions contain a product outside the corpus")
            writer.writerow({name: row[name] for name in OOF_COLUMNS})


def pack(
    artifact_dir: Path, corpus: Path, output: Path, taxonomy: Path = Path("ml/config/taxonomy_v2.yml"),
    predictions: Path | None = None,
) -> None:
    metrics = artifact_dir / "model_metrics.json"
    report = json.loads(metrics.read_text(encoding="utf-8"))
    packages = ["joblib", "numpy", "pandas", "PyYAML", "scikit-learn", "scipy", "threadpoolctl"]
    if report["model_a_actionable"]["estimator_backend"] == "lightgbm":
        packages.append("lightgbm")
    versions = {name: version(name) for name in packages}
    requirements = "".join(f"{name}=={value}\n" for name, value in versions.items())
    # Long source descriptions are normal in the existing snapshot.
    csv.field_size_limit(MAX_BYTES)
    with TemporaryDirectory() as directory:
        compact = Path(directory) / "corpus.csv"
        with corpus.open(encoding="utf-8-sig", newline="") as source, compact.open(
            "w", encoding="utf-8", newline=""
        ) as target:
            reader = csv.DictReader(source)
            if not set(CORPUS_COLUMNS).issubset(reader.fieldnames or []):
                raise ValueError("Use clean_products.csv from the taxonomy run that trained this bundle")
            writer = csv.DictWriter(target, CORPUS_COLUMNS)
            writer.writeheader()
            corpus_ids = set()
            for row in reader:
                corpus_ids.add(row["product_id"])
                writer.writerow({name: row[name] for name in CORPUS_COLUMNS})
        if predictions is not None:
            _compact_predictions(predictions, Path(directory) / "oof_predictions.csv", corpus_ids)
        with ZipFile(output, "x", compression=ZIP_DEFLATED) as archive:
            archive.write(artifact_dir / "reference_models.joblib", "reference_models.joblib")
            archive.write(metrics, "model_metrics.json")
            archive.write(compact, "corpus.csv")
            archive.write("ml/config/pipeline.yml", "pipeline.yml")
            archive.write(taxonomy, "taxonomy.yml")
            if predictions is not None:
                archive.write(Path(directory) / "oof_predictions.csv", "oof_predictions.csv")
            archive.writestr("requirements-model.txt", requirements)
            archive.writestr("manifest.json", json.dumps({
                "model_version": report["model_version"],
                "python": ".".join(map(str, sys.version_info[:3])),
                "packages": versions,
            }))
    print(f"Python {sys.version.split()[0]} | SHA256 {digest(output)}")


def unpack(archive: Path, output: Path, expected_hash: str) -> None:
    if len(expected_hash) != 64 or digest(archive) != expected_hash.lower():
        raise ValueError("Serving archive SHA-256 does not match ML_ASSET_SHA256")
    with ZipFile(archive) as source:
        entries = source.infolist()
        names = {entry.filename for entry in entries}
        if (len(entries) != len(names) or not FILES <= names or not names <= FILES | OPTIONAL_FILES
                or sum(entry.file_size for entry in entries) > MAX_BYTES):
            raise ValueError("Serving archive has unexpected files or exceeds the size limit")
        output.mkdir(parents=True, exist_ok=True)
        for entry in entries:
            with source.open(entry) as item, (output / entry.filename).open("wb") as target:
                shutil.copyfileobj(item, target)


def _extract_download(body: BinaryIO, output: Path, expected_hash: str) -> None:
    with TemporaryDirectory() as directory:
        archive = Path(directory) / "assets.zip"
        with archive.open("wb") as target:
            total = 0
            while chunk := body.read(1024 ** 2):
                total += len(chunk)
                if total > MAX_BYTES:
                    raise ValueError("Serving archive exceeds the size limit")
                target.write(chunk)
        unpack(archive, output, expected_hash)
    print("Verified and extracted serving archive")


def fetch(output: Path) -> None:
    import boto3
    from botocore.config import Config

    client = boto3.client(
        "s3", endpoint_url=os.environ["ML_ASSET_S3_ENDPOINT"],
        aws_access_key_id=os.environ["ML_ASSET_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["ML_ASSET_SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(signature_version="s3v4", connect_timeout=10, read_timeout=30),
    )
    obj = client.get_object(Bucket=os.environ["ML_ASSET_BUCKET"], Key=os.environ["ML_ASSET_KEY"])
    with obj["Body"] as body:
        if obj["ContentLength"] > MAX_BYTES:
            raise ValueError("Serving archive exceeds the size limit")
        _extract_download(body, output, os.environ["ML_ASSET_SHA256"])


class _HttpsRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urlsplit(newurl).scheme != "https":
            raise ValueError("GitHub Release download redirected to a non-HTTPS URL")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _github_request(url: str, token: str, accept: str) -> Request:
    request = Request(url, headers={
        "Accept": accept,
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "sellens-ml-assets",
    })
    # Release downloads can redirect to a presigned URL. Keep the token on the API request.
    request.add_unredirected_header("Authorization", f"Bearer {token}")
    return request


def fetch_github(output: Path) -> None:
    repository = os.environ["ML_ASSET_GITHUB_REPOSITORY"]
    tag = os.environ["ML_ASSET_GITHUB_TAG"]
    name = os.environ.get("ML_ASSET_GITHUB_FILE", "sellens-ml-v2.zip")
    token = os.environ["ML_ASSET_GITHUB_TOKEN"]
    expected_hash = os.environ["ML_ASSET_SHA256"]
    if (not re.fullmatch(r"[A-Za-z0-9-]+/[A-Za-z0-9_.-]+", repository)
            or repository.rsplit("/", 1)[-1] in {".", ".."}):
        raise ValueError("ML_ASSET_GITHUB_REPOSITORY must be owner/repository")
    api = f"https://api.github.com/repos/{repository}/releases"
    opener = build_opener(_HttpsRedirect())
    try:
        metadata_request = _github_request(
            f"{api}/tags/{quote(tag, safe='')}", token, "application/vnd.github+json",
        )
        with opener.open(metadata_request, timeout=30) as response:
            release = json.load(response)
        asset = next(
            (item for item in release.get("assets", []) if item.get("name") == name),
            None,
        )
        if asset is None:
            raise ValueError(f"GitHub Release {tag!r} has no uploaded asset named {name!r}")
        asset_id = asset.get("id")
        if type(asset_id) is not int or asset_id <= 0:
            raise ValueError("GitHub Release returned an invalid asset ID")
        if asset["size"] > MAX_BYTES:
            raise ValueError("Serving archive exceeds the size limit")
        download_request = _github_request(
            f"{api}/assets/{asset_id}", token, "application/octet-stream",
        )
        with opener.open(download_request, timeout=30) as response:
            _extract_download(response, output, expected_hash)
    except HTTPError as error:
        status = error.code
        error.close()
        raise RuntimeError(
            f"GitHub Release request returned HTTP {status}; "
            "check repository, published tag, and the token's Contents: read access"
        ) from None
    except (URLError, TimeoutError):
        raise RuntimeError("Could not connect to the GitHub Release download") from None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    package = commands.add_parser("pack")
    package.add_argument("--artifact-dir", type=Path, required=True)
    package.add_argument("--corpus", type=Path, required=True)
    package.add_argument("--output", type=Path, required=True)
    package.add_argument("--taxonomy", type=Path, default=Path("ml/config/taxonomy_v2.yml"))
    package.add_argument("--predictions", type=Path, help="model_predictions.csv of the same run (optional)")
    extract = commands.add_parser("unpack")
    extract.add_argument("--archive", type=Path, required=True)
    extract.add_argument("--sha256", required=True)
    for command in (extract, commands.add_parser("fetch"), commands.add_parser("fetch-github")):
        command.add_argument("--output", type=Path, default=DEFAULT_DIR)
    args = parser.parse_args()
    if args.command == "pack":
        pack(args.artifact_dir, args.corpus, args.output, args.taxonomy, args.predictions)
    elif args.command == "unpack":
        unpack(args.archive, args.output, args.sha256)
    elif args.command == "fetch-github":
        fetch_github(args.output)
    else:
        fetch(args.output)


if __name__ == "__main__":
    main()
