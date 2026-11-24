"""Pack a trusted training run locally and fetch the pinned release for deployment."""

import argparse
import csv
import hashlib
import json
import os
import shutil
import sys
from importlib.metadata import version
from pathlib import Path
from tempfile import TemporaryDirectory
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
MAX_BYTES = 1024 ** 3


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def pack(artifact_dir: Path, corpus: Path, output: Path) -> None:
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
                raise ValueError("Use clean_products.csv from the matching taxonomy v2 run")
            writer = csv.DictWriter(target, CORPUS_COLUMNS)
            writer.writeheader()
            writer.writerows({name: row[name] for name in CORPUS_COLUMNS} for row in reader)
        with ZipFile(output, "x", compression=ZIP_DEFLATED) as archive:
            archive.write(artifact_dir / "reference_models.joblib", "reference_models.joblib")
            archive.write(metrics, "model_metrics.json")
            archive.write(compact, "corpus.csv")
            archive.write("ml/config/pipeline.yml", "pipeline.yml")
            archive.write("ml/config/taxonomy_v2.yml", "taxonomy.yml")
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
        if (len(entries) != len(FILES) or {entry.filename for entry in entries} != FILES
                or sum(entry.file_size for entry in entries) > MAX_BYTES):
            raise ValueError("Serving archive has unexpected files or exceeds the size limit")
        output.mkdir(parents=True, exist_ok=True)
        for entry in entries:
            with source.open(entry) as item, (output / entry.filename).open("wb") as target:
                shutil.copyfileobj(item, target)


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
    with obj["Body"] as body, TemporaryDirectory() as directory:
        if obj["ContentLength"] > MAX_BYTES:
            raise ValueError("Serving archive exceeds the size limit")
        archive = Path(directory) / "assets.zip"
        with archive.open("wb") as target:
            shutil.copyfileobj(body, target)
        unpack(archive, output, os.environ["ML_ASSET_SHA256"])
    print("Verified and extracted serving archive")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    package = commands.add_parser("pack")
    package.add_argument("--artifact-dir", type=Path, required=True)
    package.add_argument("--corpus", type=Path, required=True)
    package.add_argument("--output", type=Path, required=True)
    extract = commands.add_parser("unpack")
    extract.add_argument("--archive", type=Path, required=True)
    extract.add_argument("--sha256", required=True)
    for command in (extract, commands.add_parser("fetch")):
        command.add_argument("--output", type=Path, default=DEFAULT_DIR)
    args = parser.parse_args()
    if args.command == "pack":
        pack(args.artifact_dir, args.corpus, args.output)
    elif args.command == "unpack":
        unpack(args.archive, args.output, args.sha256)
    else:
        fetch(args.output)


if __name__ == "__main__":
    main()
