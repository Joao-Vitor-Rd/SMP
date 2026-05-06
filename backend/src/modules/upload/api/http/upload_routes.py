from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from src.shared.auth.dependencies import verify_any_user

router = APIRouter(tags=["Uploads"])

UPLOAD_DIR = Path(__file__).resolve().parents[5] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _sanitize_filename(filename: str) -> str:
    safe_name = Path(filename).name.strip().replace(" ", "_")
    return safe_name or "arquivo"


@router.post("/images")
async def upload_images(
    file: UploadFile = File(...),
    _: dict = Depends(verify_any_user),
):
    if not file.content_type or file.content_type.lower() not in {
        "image/jpeg",
        "image/png",
        "image/tiff",
        "image/x-tiff",
    }:
        raise HTTPException(status_code=400, detail="Formato inválido. Envie JPG, PNG ou TIFF.")

    original_name = _sanitize_filename(file.filename or "arquivo")
    file_suffix = Path(original_name).suffix or ".bin"
    stored_name = f"{uuid4().hex}{file_suffix}"
    destination = UPLOAD_DIR / stored_name

    try:
        contents = await file.read()
        destination.write_bytes(contents)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {exc}") from exc
    finally:
        await file.close()

    return {
        "filename": original_name,
        "stored_filename": stored_name,
        "url": f"/uploads/{stored_name}",
        "content_type": file.content_type,
        "size_bytes": len(contents),
    }