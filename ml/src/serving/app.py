"""Authenticated CPU inference service for the Sellens backend."""

import hmac
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from threading import BoundedSemaphore
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from starlette.concurrency import run_in_threadpool

from ml.src.serving.assets import DEFAULT_DIR
from ml.src.serving.inference import AlreadyInCorpus, CorpusListingChanged, SCHEMA_VERSION, ServingModel

logger = logging.getLogger(__name__)

NonNegative = Annotated[float, Field(ge=0, le=999999999999999)]
Count = Annotated[int, Field(ge=0, le=9007199254740991)]


class Product(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)
    name: str = Field(min_length=1, max_length=500)
    description: str | None = Field(max_length=10000)
    category: str | None = Field(max_length=150)
    source_product_id: str | None = Field(max_length=100)
    price: NonNegative | None
    original_price: NonNegative | None
    quantity_sold: Count | None
    rating_average: Annotated[float, Field(ge=0, le=5)] | None
    review_count: Count | None
    number_of_images: Count | None
    has_video: bool | None


class InferenceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    schema_version: Literal[SCHEMA_VERSION]
    product: Product


@asynccontextmanager
async def lifespan(app: FastAPI):
    token = os.environ.get("ML_SERVICE_TOKEN", "")
    if len(token) < 32:
        raise RuntimeError("Set ML_SERVICE_TOKEN to a secret of at least 32 characters")
    app.state.authorization = ("Bearer " + token).encode("utf-8")
    directory = Path(os.environ.get("ML_ASSET_DIR", str(DEFAULT_DIR)))
    app.state.model = ServingModel(directory)
    app.state.in_flight = BoundedSemaphore(1)
    yield


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/health/ready")
async def ready(request: Request):
    model = request.app.state.model
    return {"status": "ready", "model_version": model.model_version, "schema_version": SCHEMA_VERSION}


def analyze(app: FastAPI, product: Product):
    if not app.state.in_flight.acquire(blocking=False):
        raise HTTPException(503, detail="INFERENCE_BUSY")
    try:
        return app.state.model.infer(product.model_dump())
    except CorpusListingChanged as error:
        # Model inputs changed since training: the stored out-of-fold prediction no longer applies.
        raise HTTPException(409, detail="CORPUS_LISTING_CHANGED") from error
    except AlreadyInCorpus as error:
        raise HTTPException(409, detail="PRODUCT_IN_MODEL_CORPUS") from error
    except Exception as error:
        logger.error("Inference failed (%s)", type(error).__name__)
        raise HTTPException(500, detail="INFERENCE_FAILED") from error
    finally:
        app.state.in_flight.release()


@app.post("/v1/infer")
async def infer(request: Request):
    authorization = request.headers.get("authorization", "").encode("utf-8")
    if not hmac.compare_digest(authorization, request.app.state.authorization):
        raise HTTPException(401, detail="UNAUTHORIZED")
    data = bytearray()
    async for chunk in request.stream():
        if len(data) + len(chunk) > 65536:
            raise HTTPException(413, detail="PAYLOAD_TOO_LARGE")
        data.extend(chunk)
    try:
        payload = InferenceRequest.model_validate_json(data)
    except ValidationError as error:
        raise HTTPException(422, detail="INVALID_INFERENCE_INPUT") from error
    return await run_in_threadpool(analyze, request.app, payload.product)
