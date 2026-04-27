from fastapi import FastAPI, APIRouter, Request, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, validator
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os
import logging
import csv
import io
import time
import hashlib
import json as json_module
import bcrypt
import jwt
import re
import shutil
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# ===================== SETUP =====================
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===================== IN-MEMORY CACHE =====================
class MemoryCache:
    def __init__(self):
        self._store = {}

    def get(self, key):
        if key in self._store:
            value, expiry = self._store[key]
            if time.time() < expiry:
                return value
            del self._store[key]
        return None

    def set(self, key, value, ttl):
        self._store[key] = (value, time.time() + ttl)

    def invalidate(self, *patterns):
        if not patterns:
            self._store.clear()
            return
        keys_to_del = [k for k in self._store if any(p in k for p in patterns)]
        for k in keys_to_del:
            del self._store[k]

    def make_key(self, prefix, **kwargs):
        filtered = {k: v for k, v in sorted(kwargs.items()) if v is not None}
        suffix = hashlib.md5(json_module.dumps(filtered, default=str).encode()).hexdigest()[:12]
        return f"{prefix}:{suffix}"

cache = MemoryCache()

CACHE_DEALS = 300       # 5 minutes
CACHE_TRENDING = 300    # 5 minutes
CACHE_STORES = 1800     # 30 minutes
CACHE_CATEGORIES = 3600 # 1 hour
CACHE_CONFIG = 3600     # 1 hour

MONGO_URL = os.getenv("MONGO_URL")
JWT_SECRET = os.getenv("JWT_SECRET", "disccart_secret_2026_key")

# Cloudinary config
_cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
_api_key = os.getenv("CLOUDINARY_API_KEY")
_api_secret = os.getenv("CLOUDINARY_API_SECRET")

if _cloud_name and _api_key and _api_secret:
    cloudinary.config(
        cloud_name=_cloud_name,
        api_key=_api_key,
        api_secret=_api_secret,
        secure=True
    )
    logger.info("Cloudinary configured successfully")
else:
    logger.warning("Cloudinary env vars missing — image uploads will fail")

client = AsyncIOMotorClient(MONGO_URL)
db = client[os.getenv("DB_NAME", "disccart")]

app = FastAPI(title="Disccart API")
UPLOAD_DIR = "uploads"

# Create folder if not exists
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Serve images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ===================== CORS (must be before routes) =====================
cors_env = os.environ.get("CORS_ORIGINS", "")
origins = [o.strip() for o in cors_env.split(",") if o.strip()] if cors_env else []
origins += [
    "https://disccart.in",
    "https://www.disccart.in",
    "https://disccart-frontend.vercel.app",
    "https://coupon-hub-35.preview.emergentagent.com",
    "http://localhost:5173",
    "http://localhost:3000",
]
origins = list(set(origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter()

# ===================== HEALTH CHECK =====================
@api_router.get("/health")
async def health_check():
    try:
        await db.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {
        "status": "ok",
        "database": db_status,
        "cache_entries": len(cache._store),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ===================== CACHE HEADER MIDDLEWARE =====================
PUBLIC_CACHE_PREFIXES = [
    "/api/coupons", "/api/categories", "/api/stores",
    "/api/deals/", "/api/slides", "/api/hero-config"
]

@app.middleware("http")
async def cache_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if request.method == "GET" and any(path.startswith(p) for p in PUBLIC_CACHE_PREFIXES) and "/admin/" not in path:
        response.headers["Cache-Control"] = "public, s-maxage=60, stale-while-revalidate=300"
    elif "/admin/" in path:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response

# ===================== MODELS =====================

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class CategoryCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    icon: Optional[str] = "Tag"
    description: Optional[str] = None
    image_url: Optional[str] = None
    background_image_url: Optional[str] = None
    show_in_filter: bool = True

    @validator('slug', pre=True, always=True)
    def generate_slug(cls, v, values):
        if v:
            return v
        if 'name' in values:
            name = values['name']
            slug = name.lower().strip()
            slug = re.sub(r'[^a-z0-9\s-]', '', slug)
            slug = re.sub(r'[\s-]+', '-', slug)
            return slug
        return None

class CouponCreate(BaseModel):
    title: str
    brand_name: str
    category_name: str
    code: Optional[str] = None
    original_price: Optional[int] = None
    discounted_price: Optional[int] = None
    affiliate_url: str
    discount_type: str = "percentage"
    discount_value: float = 0
    is_active: bool = True
    offer_type: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    expires_at: Optional[str] = None

    @validator('affiliate_url')
    def validate_url(cls, v):
        v = v.strip()
        if not v.startswith(('http://', 'https://')):
            return f'https://{v}'
        return v

class CouponUpdate(BaseModel):
    title: str
    brand_name: str
    category_name: str
    original_price: Optional[int] = None
    discounted_price: Optional[int] = None
    affiliate_url: str
    image_url: Optional[str] = ""
    code: Optional[str] = None
    is_active: bool = True
    offer_type: Optional[str] = None
    description: Optional[str] = None
    expires_at: Optional[str] = None
    discount_type: str = "percentage"
    discount_value: float = 0

# ===================== AUTH UTILS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str):
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def admin_required(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ===================== AUTH ROUTES =====================

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"id": user.get("user_id"), "email": user["email"], "role": user.get("role", "user")}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    role = user.get("role", "user")
    token = create_access_token(str(user["_id"]), user["email"], role)
    return {
        "token": token,
        "user": {"id": str(user["_id"]), "email": user["email"], "role": role}
    }

@api_router.post("/auth/register")
async def register(data: UserLogin):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    token = create_access_token(str(result.inserted_id), user_doc["email"], "user")
    return {
        "token": token,
        "user": {"id": str(result.inserted_id), "email": user_doc["email"], "role": "user"}
    }

# ===================== ANALYTICS =====================

@api_router.get("/analytics/overview")
async def get_analytics():
    return {
        "total_coupons": await db.coupons.count_documents({}),
        "active_coupons": await db.coupons.count_documents({"is_active": True}),
        "total_clicks": await db.clicks.count_documents({}),
        "total_users": await db.users.count_documents({}),
        "total_categories": await db.categories.count_documents({})
    }

# ===================== CATEGORIES =====================

@api_router.get("/categories")
async def get_categories():
    cached = cache.get("categories")
    if cached is not None:
        return cached

    # Use aggregation to count deals per category in ONE query (avoids N+1)
    count_pipeline = [
        {"$match": {"is_active": True}},
        {"$project": {"category_name": {"$toLower": "$category_name"}}},
        {"$group": {"_id": "$category_name", "count": {"$sum": 1}}}
    ]
    counts_list = await db.coupons.aggregate(count_pipeline).to_list(1000)
    count_map = {c["_id"]: c["count"] for c in counts_list}

    cats = await db.categories.find().to_list(100)
    result = []
    for c in cats:
        cat_name = c.get("name", "")
        cat_doc = {
            "id": str(c.pop("_id")),
            "coupon_count": count_map.get(cat_name.lower(), 0),
        }
        for k, v in c.items():
            cat_doc[k] = v
        result.append(cat_doc)

    cache.set("categories", result, CACHE_CATEGORIES)
    return result

@api_router.post("/categories")
async def add_cat(data: CategoryCreate):
    doc = data.model_dump()
    result = await db.categories.insert_one(doc)
    doc.pop("_id", None)
    cache.invalidate("categories", "filter")
    return {"id": str(result.inserted_id), **doc}

@api_router.put("/categories/{cat_id}")
async def update_cat(cat_id: str, data: CategoryCreate):
    try:
        await db.categories.update_one(
            {"_id": ObjectId(cat_id)},
            {"$set": data.model_dump()}
        )
        cache.invalidate("categories", "filter")
        return {"status": "updated"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

@api_router.delete("/categories/{cat_id}")
async def delete_cat(cat_id: str):
    try:
        await db.categories.delete_one({"_id": ObjectId(cat_id)})
        cache.invalidate("categories", "filter")
        return {"message": "Deleted"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

# ===================== COUPONS / DEALS =====================

@api_router.get("/coupons")
async def get_coupons(
    category: Optional[str] = None,
    offer_type: Optional[str] = None,
    isAdmin: bool = False,
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    featured: Optional[bool] = None
):
    # Skip cache for admin requests or searches
    cache_key = None
    if not isAdmin and not search:
        cache_key = cache.make_key("coupons", category=category, offer_type=offer_type,
                                    page=page, limit=limit, sort_by=sort_by, featured=featured)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    query = {}
    if not isAdmin:
        query["is_active"] = True

    if category and category not in ["All", "undefined", "null"]:
        cat_doc = await db.categories.find_one({"slug": category})
        cat_name = cat_doc["name"] if cat_doc else category
        query["category_name"] = {"$regex": cat_name, "$options": "i"}

    if offer_type and offer_type not in ["undefined", "null"]:
        query["offer_type"] = {"$regex": offer_type, "$options": "i"}

    if search and search.strip():
        search_regex = {"$regex": search.strip(), "$options": "i"}
        query["$or"] = [
            {"title": search_regex},
            {"brand_name": search_regex},
            {"description": search_regex}
        ]

    if featured:
        query["is_featured"] = True

    sort_field = [("created_at", -1), ("_id", -1)]
    if sort_by == "popular":
        sort_field = [("clicks", -1), ("created_at", -1), ("_id", -1)]

    total = await db.coupons.count_documents(query)
    skip = (page - 1) * limit
    coupons = await db.coupons.find(query).sort(sort_field).skip(skip).limit(limit).to_list(limit)
    for c in coupons:
        c["id"] = str(c.pop("_id"))

    result = {
        "deals": coupons,
        "total": total,
        "page": page,
        "has_more": (skip + limit) < total
    }

    if cache_key:
        cache.set(cache_key, result, CACHE_DEALS)
    return result


@api_router.get("/coupons-only")
async def get_coupons_only(
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "popular",
    limit: int = 50,
    page: int = 1
):
    cache_key = None
    if not search:
        cache_key = cache.make_key("coupons_only", category=category, sort_by=sort_by, limit=limit, page=page)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    query = {
        "is_active": True,
        "code": {"$ne": None, "$nin": [None, ""]}
    }

    if category and category not in ["All", "undefined", "null"]:
        cat_doc = await db.categories.find_one({"slug": category})
        cat_name = cat_doc["name"] if cat_doc else category
        query["category_name"] = {"$regex": cat_name, "$options": "i"}

    if search and search.strip():
        search_regex = {"$regex": search.strip(), "$options": "i"}
        query["$or"] = [
            {"title": search_regex},
            {"brand_name": search_regex},
            {"code": search_regex}
        ]

    sort_field = {"created_at": -1}
    if sort_by == "popular":
        sort_field = {"clicks": -1, "created_at": -1}

    skip = (page - 1) * limit
    coupons = await db.coupons.find(query).sort(list(sort_field.items())).skip(skip).limit(limit).to_list(limit)
    for c in coupons:
        c["id"] = str(c.pop("_id"))

    if cache_key:
        cache.set(cache_key, coupons, CACHE_DEALS)
    return coupons

@api_router.post("/coupons")
async def create_coupon(data: CouponCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.coupons.insert_one(doc)
    cache.invalidate("coupons", "deals", "trending", "categories")
    return {"id": str(result.inserted_id), "status": "success"}

@api_router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str):
    await db.coupons.delete_one({"_id": ObjectId(coupon_id)})
    cache.invalidate("coupons", "deals", "trending", "categories")
    return {"status": "deleted"}

@api_router.post("/coupons/bulk-delete")
async def bulk_delete_coupons(request: Request):
    data = await request.json()
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    deleted = 0
    for cid in ids:
        try:
            result = await db.coupons.delete_one({"_id": ObjectId(cid)})
            deleted += result.deleted_count
        except Exception:
            pass
    cache.invalidate("coupons", "deals", "trending", "categories")
    return {"deleted": deleted, "status": "success"}

@api_router.put("/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, coupon: CouponUpdate):
    update_data = coupon.dict()
    result = await db.coupons.update_one(
        {"_id": ObjectId(coupon_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    cache.invalidate("coupons", "deals", "trending", "categories")
    return {"message": "Updated successfully"}

# ===================== CLICK TRACKING =====================

@api_router.post("/clicks")
async def track_click(request: Request):
    try:
        data = await request.json()
        click_doc = {
            "coupon_id": data.get("coupon_id"),
            "brand": data.get("brand"),
            "timestamp": datetime.now(timezone.utc),
            "ip": request.client.host
        }
        await db.clicks.insert_one(click_doc)
        return {"status": "tracked"}
    except Exception as e:
        logger.error(f"Click Error: {e}")
        return {"status": "error", "message": "Failed to track"}

# ===================== BULK UPLOAD =====================

@api_router.post("/coupons/bulk-upload")
async def bulk_upload(file: UploadFile = File(...)):
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
    count = 0
    for row in reader:
        url = row.get("affiliate_url", "").strip()
        if url and not url.startswith(('http://', 'https://')):
            url = f'https://{url}'

        row["affiliate_url"] = url
        row["is_active"] = True
        row["created_at"] = datetime.now(timezone.utc)

        try:
            orig = row.get("original_price")
            disc = row.get("discounted_price")
            row["original_price"] = float(orig) if orig and str(orig).strip() else 0.0
            row["discounted_price"] = float(disc) if disc and str(disc).strip() else 0.0
        except Exception:
            row["original_price"] = 0.0
            row["discounted_price"] = 0.0

        await db.coupons.insert_one(row)
        count += 1
    return {"message": f"Successfully uploaded {count} deals"}

# ===================== IMAGE UPLOAD (Cloudinary) =====================

@api_router.post("/upload-image")
async def upload_image(image: UploadFile = File(...)):
    # Check Cloudinary is configured
    if not _api_key:
        raise HTTPException(status_code=500, detail="Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET env vars.")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"]
    if image.content_type and image.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {image.content_type}. Allowed: JPG, PNG, WebP, GIF")

    # Validate file size (2MB max)
    contents = await image.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 2MB.")

    try:
        result = cloudinary.uploader.upload(
            contents,
            folder="disccart",
            resource_type="image",
            transformation=[
                {"quality": "auto", "fetch_format": "auto"}
            ]
        )
        return {"url": result["secure_url"]}
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===================== WISHLIST =====================

@api_router.get("/wishlist/{user_id}")
async def get_wishlist(user_id: str):
    items = await db.wishlists.find({"user_id": user_id}).to_list(500)
    coupon_ids = [item.get("coupon_id") for item in items]
    coupons = []
    for cid in coupon_ids:
        try:
            coupon = await db.coupons.find_one({"_id": ObjectId(cid)})
            if coupon:
                coupon["id"] = str(coupon.pop("_id"))
                coupons.append(coupon)
        except Exception:
            pass
    return coupons

@api_router.get("/wishlist/{user_id}/ids")
async def get_wishlist_ids(user_id: str):
    items = await db.wishlists.find({"user_id": user_id}).to_list(500)
    return [item.get("coupon_id") for item in items]

@api_router.post("/wishlist")
async def add_to_wishlist(request: Request):
    data = await request.json()
    user_id = data.get("user_id")
    coupon_id = data.get("coupon_id")
    existing = await db.wishlists.find_one({"user_id": user_id, "coupon_id": coupon_id})
    if existing:
        return {"status": "already_exists"}
    await db.wishlists.insert_one({
        "user_id": user_id,
        "coupon_id": coupon_id,
        "created_at": datetime.now(timezone.utc)
    })
    return {"status": "added"}

@api_router.delete("/wishlist/{user_id}/{coupon_id}")
async def remove_from_wishlist(user_id: str, coupon_id: str):
    await db.wishlists.delete_one({"user_id": user_id, "coupon_id": coupon_id})
    return {"status": "removed"}

# ===================== PRETTY LINKS (Placeholder) =====================

@api_router.get("/pretty-links")
async def get_pretty_links():
    links = await db.pretty_links.find().to_list(500)
    for link in links:
        link["id"] = str(link.pop("_id"))
    return links

@api_router.post("/pretty-links")
async def create_pretty_link(request: Request):
    data = await request.json()
    data["created_at"] = datetime.now(timezone.utc)
    result = await db.pretty_links.insert_one(data)
    return {"id": str(result.inserted_id), "status": "created"}

@api_router.put("/pretty-links/{link_id}")
async def update_pretty_link(link_id: str, request: Request):
    data = await request.json()
    await db.pretty_links.update_one({"_id": ObjectId(link_id)}, {"$set": data})
    return {"status": "updated"}

@api_router.delete("/pretty-links/{link_id}")
async def delete_pretty_link(link_id: str):
    await db.pretty_links.delete_one({"_id": ObjectId(link_id)})
    return {"status": "deleted"}

# ===================== PAGES CMS (Placeholder) =====================

@api_router.get("/pages")
async def get_pages(published_only: bool = False):
    query = {"published": True} if published_only else {}
    pages = await db.pages.find(query).to_list(500)
    for p in pages:
        p["id"] = str(p.pop("_id"))
    return pages

@api_router.get("/pages/{slug}")
async def get_page(slug: str):
    page = await db.pages.find_one({"slug": slug})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    page["id"] = str(page.pop("_id"))
    return page

@api_router.post("/pages")
async def create_page(request: Request):
    data = await request.json()
    data["created_at"] = datetime.now(timezone.utc)
    result = await db.pages.insert_one(data)
    return {"id": str(result.inserted_id), "status": "created"}

@api_router.put("/pages/{page_id}")
async def update_page(page_id: str, request: Request):
    data = await request.json()
    await db.pages.update_one({"_id": ObjectId(page_id)}, {"$set": data})
    return {"status": "updated"}

@api_router.delete("/pages/{page_id}")
async def delete_page(page_id: str):
    await db.pages.delete_one({"_id": ObjectId(page_id)})
    return {"status": "deleted"}

# ===================== BLOG (Placeholder) =====================

@api_router.get("/blog")
async def get_blog_posts(published_only: bool = True, limit: int = 20, skip: int = 0):
    query = {"published": True} if published_only else {}
    posts = await db.blog_posts.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for p in posts:
        p["id"] = str(p.pop("_id"))
    return posts

@api_router.get("/blog/{slug}")
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post["id"] = str(post.pop("_id"))
    return post

@api_router.post("/blog")
async def create_blog_post(request: Request):
    data = await request.json()
    data["created_at"] = datetime.now(timezone.utc)
    result = await db.blog_posts.insert_one(data)
    return {"id": str(result.inserted_id), "status": "created"}

@api_router.put("/blog/{post_id}")
async def update_blog_post(post_id: str, request: Request):
    data = await request.json()
    await db.blog_posts.update_one({"_id": ObjectId(post_id)}, {"$set": data})
    return {"status": "updated"}

@api_router.delete("/blog/{post_id}")
async def delete_blog_post(post_id: str):
    await db.blog_posts.delete_one({"_id": ObjectId(post_id)})
    return {"status": "deleted"}

# ===================== STORES =====================

@api_router.get("/stores")
async def get_stores(featured: Optional[bool] = None):
    cache_key = cache.make_key("stores", featured=featured)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    query = {}
    if featured:
        query["is_featured"] = True
    stores = await db.stores.find(query).sort("display_order", 1).to_list(500)
    for s in stores:
        s["id"] = str(s.pop("_id"))

    cache.set(cache_key, stores, CACHE_STORES)
    return stores

@api_router.get("/stores/slug/{slug}")
async def get_store_by_slug(slug: str):
    store = await db.stores.find_one({"slug": slug})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    store["id"] = str(store.pop("_id"))
    # Get deals for this store
    deals = await db.coupons.find(
        {"brand_name": {"$regex": f"^{re.escape(store['name'])}$", "$options": "i"}, "is_active": True}
    ).sort("created_at", -1).to_list(100)
    for d in deals:
        d["id"] = str(d.pop("_id"))
    store["deals"] = deals
    store["deal_count"] = len(deals)
    return store

@api_router.get("/stores/featured")
async def get_featured_stores():
    cached = cache.get("stores_featured")
    if cached is not None:
        return cached

    featured = await db.stores.find({"is_featured": True, "is_active": {"$ne": False}}).sort("display_order", 1).to_list(10)
    for s in featured:
        s["id"] = str(s.pop("_id"))
    store_of_month = await db.stores.find_one({"is_store_of_month": True, "is_active": {"$ne": False}})
    if store_of_month:
        store_of_month["id"] = str(store_of_month.pop("_id"))

    result = {"featured": featured, "store_of_month": store_of_month}
    cache.set("stores_featured", result, CACHE_STORES)
    return result

@api_router.post("/stores")
async def create_store(request: Request):
    await admin_required(request)
    data = await request.json()
    data.setdefault("show_in_filter", True)
    data.setdefault("is_active", True)
    data.setdefault("is_featured", False)
    data.setdefault("is_store_of_month", False)
    data.setdefault("display_order", 0)
    data.setdefault("description", "")
    data.setdefault("website_url", "")
    data.setdefault("category", "")
    # Auto-generate slug
    name = data.get("name", "")
    data["slug"] = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    data["created_at"] = datetime.now(timezone.utc)
    result = await db.stores.insert_one(data)
    cache.invalidate("stores", "filter")
    return {"id": str(result.inserted_id), "status": "created"}

@api_router.put("/stores/{store_id}")
async def update_store(store_id: str, request: Request):
    await admin_required(request)
    data = await request.json()
    data.pop("_id", None)
    data.pop("id", None)
    if "name" in data:
        data["slug"] = re.sub(r'[^a-z0-9]+', '-', data["name"].lower()).strip('-')
    if data.get("is_store_of_month"):
        await db.stores.update_many({}, {"$set": {"is_store_of_month": False}})
    await db.stores.update_one({"_id": ObjectId(store_id)}, {"$set": data})
    cache.invalidate("stores", "filter")
    return {"status": "updated"}

@api_router.delete("/stores/{store_id}")
async def delete_store(store_id: str, request: Request):
    await admin_required(request)
    await db.stores.delete_one({"_id": ObjectId(store_id)})
    cache.invalidate("stores", "filter")
    return {"status": "deleted"}

# ===================== FILTER CONFIG =====================

@api_router.get("/admin/filters")
async def get_filter_config():
    cached = cache.get("filter_config")
    if cached is not None:
        return cached

    config = await db.filter_configs.find_one({"_id": "global"})
    price_brackets = config.get("price_brackets", []) if config else []
    discount_filters = config.get("discount_filters", []) if config else []
    deal_type_filters = config.get("deal_type_filters", []) if config else []

    categories = await db.categories.find().sort("display_order", 1).to_list(500)
    for c in categories:
        c["id"] = str(c.pop("_id"))

    stores = await db.stores.find().sort("display_order", 1).to_list(500)
    for s in stores:
        s["id"] = str(s.pop("_id"))

    result = {
        "price_brackets": price_brackets,
        "discount_filters": discount_filters,
        "deal_type_filters": deal_type_filters,
        "categories": categories,
        "stores": stores
    }
    cache.set("filter_config", result, CACHE_CONFIG)
    return result

@api_router.patch("/admin/filters")
async def update_filter_config(request: Request):
    await admin_required(request)
    data = await request.json()
    update_doc = {}

    # Validate price brackets
    brackets = data.get("price_brackets")
    if brackets is not None:
        for b in brackets:
            if b.get("min", 0) > b.get("max", 0):
                raise HTTPException(status_code=400, detail=f"Invalid bracket: min ({b['min']}) > max ({b['max']})")
        update_doc["price_brackets"] = brackets

    # Discount filters
    discount_filters = data.get("discount_filters")
    if discount_filters is not None:
        for d in discount_filters:
            if d.get("min", 0) > d.get("max", 0):
                raise HTTPException(status_code=400, detail=f"Invalid discount: min ({d['min']}) > max ({d['max']})")
        update_doc["discount_filters"] = discount_filters

    # Deal type filters
    deal_type_filters = data.get("deal_type_filters")
    if deal_type_filters is not None:
        update_doc["deal_type_filters"] = deal_type_filters

    if update_doc:
        await db.filter_configs.update_one(
            {"_id": "global"},
            {"$set": update_doc},
            upsert=True
        )

    # Update category show_in_filter flags
    cat_updates = data.get("categories", [])
    for cat in cat_updates:
        cid = cat.get("id")
        if cid:
            await db.categories.update_one(
                {"_id": ObjectId(cid)},
                {"$set": {"show_in_filter": cat.get("show_in_filter", True)}}
            )

    # Update store show_in_filter flags
    store_updates = data.get("stores", [])
    for store in store_updates:
        sid = store.get("id")
        if sid:
            await db.stores.update_one(
                {"_id": ObjectId(sid)},
                {"$set": {"show_in_filter": store.get("show_in_filter", True)}}
            )

    cache.invalidate("filter", "categories", "stores")
    return {"status": "updated"}

# ===================== FILTERED DEALS =====================

@api_router.get("/deals/filtered")
async def get_filtered_deals(
    category: Optional[str] = None,
    store: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    offer_type: Optional[str] = None,
    min_discount: Optional[int] = None,
    max_discount: Optional[int] = None,
    deal_type: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    sort_by: Optional[str] = None
):
    match_stage = {"is_active": True}

    if category and category not in ["All", "undefined", "null"]:
        match_stage["category_name"] = {"$regex": category, "$options": "i"}

    if store and store not in ["All", "undefined", "null"]:
        match_stage["brand_name"] = {"$regex": f"^{re.escape(store)}$", "$options": "i"}

    if offer_type and offer_type not in ["undefined", "null"]:
        match_stage["offer_type"] = {"$regex": offer_type, "$options": "i"}

    if deal_type and deal_type not in ["undefined", "null"]:
        match_stage["offer_type"] = {"$regex": deal_type, "$options": "i"}

    # Price filtering
    if min_price is not None or max_price is not None:
        price_cond = {}
        if min_price is not None:
            price_cond["$gte"] = min_price
        if max_price is not None:
            price_cond["$lte"] = max_price
        match_stage["$or"] = [
            {"discounted_price": price_cond},
            {"discounted_price": {"$in": [None, 0]}, "original_price": price_cond}
        ]

    # Discount percentage filtering
    if min_discount is not None or max_discount is not None:
        disc_cond = {}
        if min_discount is not None:
            disc_cond["$gte"] = min_discount
        if max_discount is not None:
            disc_cond["$lte"] = max_discount
        match_stage["discount_value"] = disc_cond

    # Sort logic
    sort_field = {"created_at": -1}
    if sort_by == "popularity":
        sort_field = {"clicks": -1}
    elif sort_by == "price_low":
        sort_field = {"discounted_price": 1}
    elif sort_by == "price_high":
        sort_field = {"discounted_price": -1}
    elif sort_by == "discount":
        sort_field = {"discount_value": -1}

    pipeline = [
        {"$match": match_stage},
        {"$facet": {
            "results": [
                {"$sort": sort_field},
                {"$skip": skip},
                {"$limit": limit}
            ],
            "category_counts": [
                {"$group": {"_id": "$category_name", "count": {"$sum": 1}}}
            ],
            "total": [{"$count": "count"}]
        }}
    ]

    cursor = db.coupons.aggregate(pipeline)
    facet_result = await cursor.to_list(1)
    facet = facet_result[0] if facet_result else {"results": [], "category_counts": [], "total": []}

    results = facet.get("results", [])
    for r in results:
        r["id"] = str(r.pop("_id"))

    total = facet["total"][0]["count"] if facet.get("total") else 0

    return {
        "deals": results,
        "category_counts": facet.get("category_counts", []),
        "total": total
    }

# ===================== TRENDING DEALS =====================

@api_router.get("/deals/trending")
async def get_trending_deals(limit: int = 20, skip: int = 0):
    cache_key = cache.make_key("trending", limit=limit, skip=skip)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    config = await db.site_settings.find_one({"_id": "trending"})
    trending_hours = 24
    if config:
        trending_hours = config.get("trending_duration_hours", 24)
        if not config.get("trending_enabled", True):
            return {"deals": [], "total": 0}

    cutoff = datetime.now(timezone.utc) - timedelta(hours=trending_hours)

    pipeline = [
        {"$match": {
            "is_active": True,
            "created_at": {"$gte": cutoff}
        }},
        {"$facet": {
            "results": [
                {"$sort": {"clicks": -1, "created_at": -1}},
                {"$skip": skip},
                {"$limit": limit}
            ],
            "total": [{"$count": "count"}]
        }}
    ]

    cursor = db.coupons.aggregate(pipeline)
    facet_result = await cursor.to_list(1)
    facet = facet_result[0] if facet_result else {"results": [], "total": []}

    results = facet.get("results", [])
    for r in results:
        r["id"] = str(r.pop("_id"))

    total = facet["total"][0]["count"] if facet.get("total") else 0
    result = {"deals": results, "total": total}
    cache.set(cache_key, result, CACHE_TRENDING)
    return result

@api_router.get("/admin/trending-config")
async def get_trending_config(request: Request):
    await admin_required(request)
    config = await db.site_settings.find_one({"_id": "trending"})
    if not config:
        return {"trending_enabled": True, "trending_duration_hours": 24}
    config.pop("_id", None)
    return config

@api_router.patch("/admin/trending-config")
async def update_trending_config(request: Request):
    await admin_required(request)
    data = await request.json()
    data.pop("_id", None)
    await db.site_settings.update_one(
        {"_id": "trending"},
        {"$set": data},
        upsert=True
    )
    cache.invalidate("trending")
    return {"status": "updated"}

# ===================== HOMEPAGE SLIDES =====================

@api_router.get("/slides")
async def get_slides():
    cached = cache.get("slides")
    if cached is not None:
        return cached
    slides = await db.homepage_slides.find({"is_active": True}).sort("order", 1).to_list(10)
    for s in slides:
        s["id"] = str(s.pop("_id"))
    cache.set("slides", slides, CACHE_STORES)
    return slides

@api_router.get("/admin/slides")
async def get_all_slides(request: Request):
    await admin_required(request)
    slides = await db.homepage_slides.find().sort("order", 1).to_list(20)
    for s in slides:
        s["id"] = str(s.pop("_id"))
    return slides

@api_router.post("/admin/slides")
async def create_slide(request: Request):
    await admin_required(request)
    data = await request.json()
    data.setdefault("title", "")
    data.setdefault("subtitle", "")
    data.setdefault("btn_text", "")
    data.setdefault("btn_link", "")
    data.setdefault("bg_color", "#ee922c")
    data.setdefault("is_active", True)
    data.setdefault("order", 1)
    data["created_at"] = datetime.now(timezone.utc)
    result = await db.homepage_slides.insert_one(data)
    cache.invalidate("slides")
    return {"id": str(result.inserted_id), "status": "created"}

@api_router.patch("/admin/slides/{slide_id}")
async def update_slide(slide_id: str, request: Request):
    await admin_required(request)
    data = await request.json()
    data.pop("_id", None)
    data.pop("id", None)
    await db.homepage_slides.update_one({"_id": ObjectId(slide_id)}, {"$set": data})
    cache.invalidate("slides")
    return {"status": "updated"}

@api_router.delete("/admin/slides/{slide_id}")
async def delete_slide(slide_id: str, request: Request):
    await admin_required(request)
    await db.homepage_slides.delete_one({"_id": ObjectId(slide_id)})
    cache.invalidate("slides")
    return {"status": "deleted"}

# ===================== HERO CONFIG =====================

HERO_DEFAULTS = {
    "_id": "hero",
    "heading_line1": "Best Deals,",
    "heading_line2": "Smart Savings",
    "subtext": "Discover verified coupons and exclusive deals from top brands. Save big on every purchase!",
    "btn1_text": "Explore Deals",
    "btn1_link": "/trending",
    "btn2_text": "View Categories",
    "btn2_link": "/categories",
    "bg_gradient": "linear-gradient(135deg, #FFF8F0 0%, #F0F9F0 40%, #E8F5E9 65%, #FFF3E0 100%)",
    "bg_color1": "#FFF8F0",
    "bg_color2": "#F0F9F0",
    "bg_color3": "#E8F5E9",
    "bg_color4": "#FFF3E0",
    "heading_color": "#111827",
    "accent_color": "#ee922c",
    "subtext_color": "#4B5563",
    "show_floating_icons": True,
    "show_wave": True,
}

@api_router.get("/hero-config")
async def get_hero_config():
    cached = cache.get("hero_config")
    if cached is not None:
        return cached
    config = await db.site_settings.find_one({"_id": "hero"})
    if not config:
        cache.set("hero_config", HERO_DEFAULTS, CACHE_CONFIG)
        return HERO_DEFAULTS
    config.pop("_id", None)
    merged = {**HERO_DEFAULTS, **config}
    merged.pop("_id", None)
    cache.set("hero_config", merged, CACHE_CONFIG)
    return merged

@api_router.patch("/admin/hero-config")
async def update_hero_config(request: Request):
    await admin_required(request)
    data = await request.json()
    data.pop("_id", None)
    # Rebuild gradient from colors if provided
    c1 = data.get("bg_color1")
    c2 = data.get("bg_color2")
    c3 = data.get("bg_color3")
    c4 = data.get("bg_color4")
    if c1 and c2 and c3 and c4:
        data["bg_gradient"] = f"linear-gradient(135deg, {c1} 0%, {c2} 40%, {c3} 65%, {c4} 100%)"
    await db.site_settings.update_one(
        {"_id": "hero"},
        {"$set": data},
        upsert=True
    )
    cache.invalidate("hero")
    return {"status": "updated"}

# ===================== POPUPS =====================

class PopupCreate(BaseModel):
    title: str = ""
    description: str = ""
    cta_text: str = ""
    cta_link: str = ""
    image_url: str = ""
    video_url: str = ""
    popup_type: str = "entry"  # entry, exit_intent, scroll, click, timed, offer, newsletter
    trigger: str = "on_load"  # on_load, on_scroll, exit_intent, time_delay, click
    scroll_percent: int = 50
    delay_seconds: int = 5
    target_pages: list = []  # [], ["home","coupons","deals","blog","stores"]
    target_devices: list = []  # [], ["mobile","desktop","tablet"]
    animation_style: str = "slide_up"  # slide_up, slide_down, fade, scale, bounce
    is_active: bool = True
    frequency: str = "once_per_session"  # once_per_session, once_per_day, always
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: int = 0

@api_router.get("/popups")
async def get_popups():
    cached = cache.get("popups_all")
    if cached is not None:
        return cached
    popups = await db.popups.find().sort("priority", -1).to_list(100)
    for p in popups:
        p["id"] = str(p.pop("_id"))
    cache.set("popups_all", popups, CACHE_DEALS)
    return popups

@api_router.get("/popups/active")
async def get_active_popups():
    cached = cache.get("popups_active")
    if cached is not None:
        return cached
    now = datetime.now(timezone.utc).isoformat()
    query = {"is_active": True}
    popups = await db.popups.find(query).sort("priority", -1).to_list(50)
    result = []
    for p in popups:
        sd = p.get("start_date")
        ed = p.get("end_date")
        if sd and sd > now:
            continue
        if ed and ed < now:
            continue
        p["id"] = str(p.pop("_id"))
        result.append(p)
    cache.set("popups_active", result, 60)
    return result

@api_router.post("/admin/popups")
async def create_popup(request: Request):
    await admin_required(request)
    data = await request.json()
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["views"] = 0
    data["clicks"] = 0
    result = await db.popups.insert_one(data)
    cache.invalidate("popups")
    return {"id": str(result.inserted_id), "status": "created"}

@api_router.put("/admin/popups/{popup_id}")
async def update_popup(popup_id: str, request: Request):
    await admin_required(request)
    data = await request.json()
    data.pop("_id", None)
    data.pop("id", None)
    await db.popups.update_one({"_id": ObjectId(popup_id)}, {"$set": data})
    cache.invalidate("popups")
    return {"status": "updated"}

@api_router.delete("/admin/popups/{popup_id}")
async def delete_popup(popup_id: str, request: Request):
    await admin_required(request)
    await db.popups.delete_one({"_id": ObjectId(popup_id)})
    cache.invalidate("popups")
    return {"status": "deleted"}

@api_router.post("/popups/{popup_id}/view")
async def track_popup_view(popup_id: str):
    try:
        await db.popups.update_one({"_id": ObjectId(popup_id)}, {"$inc": {"views": 1}})
    except Exception:
        pass
    return {"status": "ok"}

@api_router.post("/popups/{popup_id}/click")
async def track_popup_click(popup_id: str):
    try:
        await db.popups.update_one({"_id": ObjectId(popup_id)}, {"$inc": {"clicks": 1}})
    except Exception:
        pass
    return {"status": "ok"}

# ===================== LIKES & COMMENTS =====================

@api_router.post("/deals/{deal_id}/like")
async def toggle_like(deal_id: str, request: Request):
    body = await request.json()
    user_id = body.get("user_id", "")
    if not user_id:
        raise HTTPException(400, "user_id required")
    existing = await db.likes.find_one({"deal_id": deal_id, "user_id": user_id})
    if existing:
        await db.likes.delete_one({"_id": existing["_id"]})
        count = await db.likes.count_documents({"deal_id": deal_id})
        return {"liked": False, "count": count}
    else:
        await db.likes.insert_one({
            "deal_id": deal_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        count = await db.likes.count_documents({"deal_id": deal_id})
        return {"liked": True, "count": count}

@api_router.get("/deals/{deal_id}/likes")
async def get_likes(deal_id: str, user_id: Optional[str] = None):
    count = await db.likes.count_documents({"deal_id": deal_id})
    liked = False
    if user_id:
        liked = await db.likes.find_one({"deal_id": deal_id, "user_id": user_id}) is not None
    return {"count": count, "liked": liked}

@api_router.post("/deals/{deal_id}/comments")
async def add_comment(deal_id: str, request: Request):
    body = await request.json()
    user_id = body.get("user_id", "")
    user_name = body.get("user_name", "User")
    text = body.get("text", "").strip()
    if not user_id or not text:
        raise HTTPException(400, "user_id and text required")
    doc = {
        "deal_id": deal_id,
        "user_id": user_id,
        "user_name": user_name,
        "text": text[:500],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.comments.insert_one(doc)
    doc.pop("_id", None)
    doc["id"] = str(result.inserted_id)
    return doc

@api_router.get("/deals/{deal_id}/comments")
async def get_comments(deal_id: str):
    comments = await db.comments.find({"deal_id": deal_id}).sort("created_at", -1).to_list(100)
    for c in comments:
        c["id"] = str(c.pop("_id"))
    return comments

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, request: Request):
    await admin_required(request)
    await db.comments.delete_one({"_id": ObjectId(comment_id)})
    return {"status": "deleted"}

# ===================== AI DEAL ASSISTANT =====================

SYNONYMS = {
    "phone": ["mobile", "smartphone", "cellphone"],
    "mobile": ["phone", "smartphone"],
    "laptop": ["notebook", "computer"],
    "shoes": ["sneakers", "footwear", "sandals"],
    "sneakers": ["shoes", "footwear"],
    "clothes": ["fashion", "apparel", "clothing", "wear"],
    "fashion": ["clothes", "apparel", "clothing"],
    "food": ["dining", "restaurant", "delivery", "meal"],
    "beauty": ["cosmetics", "makeup", "skincare"],
    "electronics": ["gadgets", "tech", "devices"],
    "travel": ["flights", "hotels", "booking", "trip"],
    "amazon": ["amazon.in"],
    "flipkart": ["flipkart.com"],
    "myntra": ["myntra.com"],
}

def extract_keywords(message: str) -> list:
    stop_words = {"i", "me", "my", "the", "a", "an", "is", "are", "was", "for", "on",
                  "in", "to", "of", "and", "or", "not", "it", "do", "can", "you",
                  "have", "has", "any", "best", "good", "great", "show", "find",
                  "get", "want", "need", "looking", "search", "deal", "deals",
                  "coupon", "coupons", "offer", "offers", "discount", "discounts",
                  "please", "tell", "give", "what", "which", "where", "how", "this", "that"}
    words = re.findall(r'[a-zA-Z0-9]+', message.lower())
    keywords = [w for w in words if w not in stop_words and len(w) > 1]
    expanded = list(keywords)
    for kw in keywords:
        if kw in SYNONYMS:
            expanded.extend(SYNONYMS[kw])
    return list(set(expanded))

async def search_products_for_ai(keywords: list, limit: int = 10) -> list:
    if not keywords:
        deals = await db.coupons.find({"is_active": True}).sort("clicks", -1).limit(limit).to_list(limit)
    else:
        or_conditions = []
        for kw in keywords:
            regex = {"$regex": kw, "$options": "i"}
            or_conditions.extend([
                {"title": regex}, {"brand_name": regex},
                {"category_name": regex}, {"description": regex},
                {"code": regex}
            ])
        deals = await db.coupons.find({"$or": or_conditions, "is_active": True}).sort("clicks", -1).limit(limit).to_list(limit)
    for d in deals:
        d["id"] = str(d.pop("_id"))
        for k in list(d.keys()):
            if isinstance(d[k], ObjectId):
                d[k] = str(d[k])
            if isinstance(d[k], datetime):
                d[k] = d[k].isoformat()
    return deals

@api_router.post("/ai/chat")
async def ai_chat(request: Request):
    body = await request.json()
    message = body.get("message", "").strip()

    if not message:
        raise HTTPException(400, "message required")

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "AI service not configured")

    keywords = extract_keywords(message)
    products = await search_products_for_ai(keywords, limit=8)

    products_context = ""
    if products:
        items = []
        for p in products:
            price_str = ""
            if p.get("discounted_price"):
                price_str = f"₹{p['discounted_price']}"
                if p.get("original_price"):
                    price_str += f" (was ₹{p['original_price']})"
            items.append(
                f"- {p.get('title','')} | Brand: {p.get('brand_name','')} | "
                f"Category: {p.get('category_name','')} | Price: {price_str} | "
                f"Code: {p.get('code','N/A')} | Score: {p.get('deal_score','N/A')}"
            )
        products_context = "\n\nAvailable deals from our database:\n" + "\n".join(items)

    system_prompt = (
        "You are DealBot, the smart shopping assistant for DISCCART.IN — India's best deal discovery platform. "
        "You help users find the best deals, coupons, and discounts. "
        "Be friendly, concise, and helpful. Use a casual Indian shopping tone. "
        "When recommending deals, highlight the discount %, coupon code (if any), and why it's a good deal. "
        "If the user's query is vague, ask a follow-up question to narrow down. "
        "If no relevant deals are found, suggest what categories to explore or ask for more details. "
        "Keep responses under 150 words. Use bullet points for multiple deals."
        + products_context
    )

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import uuid

        session_id = body.get("session_id", str(uuid.uuid4()))

        chat = LlmChat(
            api_key=api_key,
            session_id=f"dealbot_{session_id}",
            system_message=system_prompt
        )
        chat.with_model("openai", "gpt-4o")

        user_msg = UserMessage(text=message)
        reply = await chat.send_message(user_msg)

        product_cards = []
        for p in products[:5]:
            product_cards.append({
                "id": p.get("id"),
                "title": p.get("title", ""),
                "brand": p.get("brand_name", ""),
                "category": p.get("category_name", ""),
                "price": p.get("discounted_price"),
                "original_price": p.get("original_price"),
                "code": p.get("code"),
                "image_url": p.get("image_url"),
                "deal_score": p.get("deal_score"),
                "affiliate_url": p.get("affiliate_url", ""),
            })

        return {
            "reply": reply,
            "products": product_cards,
            "keywords": keywords[:5]
        }

    except Exception as e:
        logger.error(f"AI chat error: {e}")
        fallback_reply = "I'm having trouble connecting right now. "
        if products:
            fallback_reply += f"But I found {len(products)} deals matching your search! Check them out below."
        else:
            fallback_reply += "Try browsing our categories or use the search bar to find deals."

        product_cards = []
        for p in products[:5]:
            product_cards.append({
                "id": p.get("id"),
                "title": p.get("title", ""),
                "brand": p.get("brand_name", ""),
                "price": p.get("discounted_price"),
                "original_price": p.get("original_price"),
                "code": p.get("code"),
                "image_url": p.get("image_url"),
            })

        return {"reply": fallback_reply, "products": product_cards, "keywords": keywords[:5]}


# ===================== ENHANCED SEARCH =====================

@api_router.get("/search")
async def enhanced_search(
    q: str = "",
    category: Optional[str] = None,
    brand: Optional[str] = None,
    sort: Optional[str] = "relevance",
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_discount: Optional[float] = None,
    limit: int = 20,
    page: int = 1
):
    cache_key = cache.make_key("search", q=q, category=category, brand=brand,
                                sort=sort, min_price=min_price, max_price=max_price,
                                min_discount=min_discount, limit=limit, page=page)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    query_filter = {"is_active": True}
    keywords = extract_keywords(q) if q else []

    if keywords:
        or_conditions = []
        for kw in keywords:
            regex = {"$regex": kw, "$options": "i"}
            or_conditions.extend([
                {"title": regex}, {"brand_name": regex},
                {"category_name": regex}, {"description": regex},
                {"code": regex}
            ])
        query_filter["$or"] = or_conditions

    if category and category not in ["All", "undefined"]:
        query_filter["category_name"] = {"$regex": category, "$options": "i"}
    if brand:
        query_filter["brand_name"] = {"$regex": brand, "$options": "i"}
    if min_price is not None:
        query_filter["discounted_price"] = {"$gte": min_price}
    if max_price is not None:
        query_filter.setdefault("discounted_price", {})
        if isinstance(query_filter["discounted_price"], dict):
            query_filter["discounted_price"]["$lte"] = max_price
        else:
            query_filter["discounted_price"] = {"$gte": min_price, "$lte": max_price}
    if min_discount is not None:
        query_filter["discount_percentage"] = {"$gte": min_discount}

    sort_field = [("clicks", -1), ("created_at", -1)]
    if sort == "price_low":
        sort_field = [("discounted_price", 1)]
    elif sort == "price_high":
        sort_field = [("discounted_price", -1)]
    elif sort == "newest":
        sort_field = [("created_at", -1)]
    elif sort == "discount":
        sort_field = [("discount_percentage", -1)]

    total = await db.coupons.count_documents(query_filter)
    skip = (page - 1) * limit
    results = await db.coupons.find(query_filter).sort(sort_field).skip(skip).limit(limit).to_list(limit)
    for r in results:
        r["id"] = str(r.pop("_id"))

    # Generate suggestions (autocomplete-style)
    suggestions = []
    if q:
        suggest_pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$brand_name"}},
            {"$match": {"_id": {"$regex": q, "$options": "i"}}},
            {"$limit": 5}
        ]
        brand_suggestions = await db.coupons.aggregate(suggest_pipeline).to_list(5)
        suggestions = [s["_id"] for s in brand_suggestions if s["_id"]]

        cat_pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$category_name"}},
            {"$match": {"_id": {"$regex": q, "$options": "i"}}},
            {"$limit": 5}
        ]
        cat_suggestions = await db.coupons.aggregate(cat_pipeline).to_list(5)
        suggestions.extend([s["_id"] for s in cat_suggestions if s["_id"] and s["_id"] not in suggestions])

    result = {
        "results": results,
        "suggestions": suggestions[:8],
        "total": total,
        "page": page,
        "has_more": (skip + limit) < total,
        "keywords": keywords[:5]
    }
    if not q:
        cache.set(cache_key, result, CACHE_DEALS)
    else:
        cache.set(cache_key, result, 60)
    return result

@api_router.get("/search/suggest")
async def search_suggestions(q: str = ""):
    if not q or len(q) < 2:
        return {"suggestions": []}

    cache_key = f"suggest:{q.lower()[:20]}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    regex = {"$regex": q, "$options": "i"}

    # Search titles, brands, categories in parallel
    title_pipeline = [
        {"$match": {"is_active": True, "title": regex}},
        {"$project": {"title": 1, "_id": 0}},
        {"$limit": 5}
    ]
    brand_pipeline = [
        {"$match": {"is_active": True, "brand_name": regex}},
        {"$group": {"_id": "$brand_name"}},
        {"$limit": 5}
    ]
    cat_pipeline = [
        {"$match": {"is_active": True, "category_name": regex}},
        {"$group": {"_id": "$category_name"}},
        {"$limit": 5}
    ]

    import asyncio
    titles, brands, cats = await asyncio.gather(
        db.coupons.aggregate(title_pipeline).to_list(5),
        db.coupons.aggregate(brand_pipeline).to_list(5),
        db.coupons.aggregate(cat_pipeline).to_list(5)
    )

    suggestions = []
    for t in titles:
        suggestions.append({"text": t["title"], "type": "deal"})
    for b in brands:
        if b["_id"]:
            suggestions.append({"text": b["_id"], "type": "brand"})
    for c in cats:
        if c["_id"]:
            suggestions.append({"text": c["_id"], "type": "category"})

    result = {"suggestions": suggestions[:10]}
    cache.set(cache_key, result, 120)
    return result

app.include_router(api_router, prefix="/api")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
async def startup():
    admin_email = os.getenv("ADMIN_EMAIL", "disccartindia@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin@2026@")
    user = await db.users.find_one({"email": admin_email})
    if not user:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user seeded: {admin_email}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

