from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import shutil
import os
import logging

from models.predictor import predict, find_matching_items

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fitcheck")

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(r"C:\Users\HP\oofa")

UPLOAD_DIR = BASE_DIR / "uploads"
CLOTHES_DIR = BASE_DIR / "Clothes"
LABELS_DIR = CLOTHES_DIR / "labels"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CLOTHES_DIR.mkdir(parents=True, exist_ok=True)
LABELS_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(CLOTHES_DIR)), name="static")

@app.post("/predict")
async def predict_route(file: UploadFile = File(...)):

    saved_path = None
    try:
        filename = Path(file.filename).name
        saved_path = UPLOAD_DIR / filename
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Saved upload to {saved_path}")

        tags, gemini_raw, predict_debug = predict(image_path=str(saved_path))

        true_tags = [k for k, v in tags.items() if v]
        logger.info("predict() returned true tags: %s", true_tags)
        logger.debug("predict debug: %s", predict_debug)

        matches, match_debug = find_matching_items(tags)

        payload = {
            "tags": tags,
            "matches": matches,
            "debug": {
                "saved_path": str(saved_path),
                "gemini_raw": gemini_raw,
                "predict_debug": predict_debug,
                "match_debug": match_debug,
            },
        }
        return JSONResponse(content=payload)
    except Exception as e:
        logger.exception("Error in /predict")
        return JSONResponse(content={"error": str(e), "debug": {"saved_path": str(saved_path)}}, status_code=500)

