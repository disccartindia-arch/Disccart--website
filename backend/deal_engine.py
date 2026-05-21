from fastapi import APIRouter, Request, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import logging
from urllib.parse import urlparse

from scraper import extract_product_data

logger = logging.getLogger(__name__)

deal_engine_router = APIRouter()

class DealEngineSettings(BaseModel):
    amazon_affiliate_id: Optional[str] = ""
    flipkart_affiliate_id: Optional[str] = ""
    auto_publish: Optional[bool] = False
    min_discount_percentage: Optional[int] = 0

class ExtractRequest(BaseModel):
    url: str

# These will be monkey-patched or imported correctly in server.py
# to avoid circular imports.
db = None
admin_required = None

@deal_engine_router.get("/settings")
async def get_settings(request: Request):
    if admin_required:
        await admin_required(request)

    config = await db.site_settings.find_one({"_id": "deal_engine"})
    if not config:
        return {
            "amazon_affiliate_id": "",
            "flipkart_affiliate_id": "",
            "auto_publish": False,
            "min_discount_percentage": 0
        }
    config.pop("_id", None)
    return config

@deal_engine_router.patch("/settings")
async def update_settings(request: Request, settings: DealEngineSettings):
    if admin_required:
        await admin_required(request)

    data = settings.model_dump()
    data["updated_at"] = datetime.now(timezone.utc)

    await db.site_settings.update_one(
        {"_id": "deal_engine"},
        {"$set": data},
        upsert=True
    )
    return {"status": "updated"}

@deal_engine_router.post("/extract")
async def extract_product(request: Request, payload: ExtractRequest):
    if admin_required:
        await admin_required(request)

    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
             raise HTTPException(status_code=400, detail="Invalid URL format")

        logger.info(f"Starting extraction for URL: {url}")

        # Call the scraper
        product_data = await extract_product_data(url)

        if not product_data.get("title") and not product_data.get("price"):
             raise Exception("Could not extract meaningful product data. The page layout might have changed or access was blocked.")

        logger.info(f"Successfully extracted product: {product_data.get('title')[:30]}...")

        return product_data

    except Exception as e:
        logger.error(f"Extraction failed for {url}: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
