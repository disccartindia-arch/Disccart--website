import httpx
from bs4 import BeautifulSoup
import re
import logging
from urllib.parse import urlparse, urlunparse

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

async def fetch_html(url: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers=HEADERS)
            response.raise_for_status()
            return response.text
    except Exception as e:
        logger.error(f"Failed to fetch {url}: {e}")
        return ""

def clean_amazon_url(url: str) -> str:
    parsed = urlparse(url)
    match = re.search(r"/(dp|gp/product)/([A-Z0-9]{10})", parsed.path)
    if match:
        return f"https://www.amazon.in/dp/{match.group(2)}"
    return url

def extract_amazon_product(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    title = ""
    title_elem = soup.find(id="productTitle")
    if title_elem:
        title = title_elem.text.strip()

    price = 0.0
    price_elem = soup.select_one(".a-price-whole")
    if price_elem:
        price_text = price_elem.text.strip().replace(',', '').replace('₹', '').replace('.', '')
        try:
            price = float(price_text)
        except ValueError:
            pass

    original_price = 0.0
    mrp_elem = soup.select_one(".a-text-price .a-offscreen")
    if mrp_elem:
        mrp_text = mrp_elem.text.strip().replace(',', '').replace('₹', '')
        try:
            original_price = float(mrp_text)
        except ValueError:
            pass

    image = ""
    img_elem = soup.find(id="landingImage")
    if img_elem and img_elem.has_attr("src"):
        image = img_elem["src"]
        if image.startswith("data:"):
            if img_elem.has_attr("data-old-hires"):
                 image = img_elem["data-old-hires"]
            elif img_elem.has_attr("data-a-dynamic-image"):
                 import json
                 try:
                     dynamic_images = json.loads(img_elem["data-a-dynamic-image"])
                     image = list(dynamic_images.keys())[0]
                 except:
                     pass

    canonical_url = clean_amazon_url(url)

    return {
        "title": title,
        "price": price,
        "original_price": original_price,
        "image": image,
        "url": canonical_url,
        "brand": "Amazon"
    }

def clean_flipkart_url(url: str) -> str:
    parsed = urlparse(url)
    # Removing query parameters except 'pid'
    query_params = parsed.query.split('&')
    pid = None
    for param in query_params:
        if param.startswith("pid="):
            pid = param
            break

    new_query = pid if pid else ""
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, ""))

def extract_flipkart_product(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    title = ""
    title_elem = soup.select_one(".VU-Tz5") # Flipkart title class
    if title_elem:
        title = title_elem.text.strip()
    else:
         # Fallback to span with class B_NuCI
         title_elem = soup.select_one(".B_NuCI")
         if title_elem:
             title = title_elem.text.strip()

    price = 0.0
    price_elem = soup.select_one(".Nx9bqj") # Flipkart price class
    if price_elem:
        price_text = price_elem.text.strip().replace(',', '').replace('₹', '')
        try:
            price = float(price_text)
        except ValueError:
            pass
    else:
         price_elem = soup.select_one("._30jeq3")
         if price_elem:
             price_text = price_elem.text.strip().replace(',', '').replace('₹', '')
             try:
                 price = float(price_text)
             except ValueError:
                 pass

    original_price = 0.0
    mrp_elem = soup.select_one(".yRaY8j") # Flipkart MRP class
    if mrp_elem:
        mrp_text = mrp_elem.text.strip().replace(',', '').replace('₹', '')
        try:
            original_price = float(mrp_text)
        except ValueError:
            pass
    else:
         mrp_elem = soup.select_one("._3I9_wc")
         if mrp_elem:
             mrp_text = mrp_elem.text.strip().replace(',', '').replace('₹', '')
             try:
                 original_price = float(mrp_text)
             except ValueError:
                 pass

    image = ""
    img_elem = soup.select_one(".DByuf4") # Flipkart image class
    if img_elem and img_elem.has_attr("src"):
        image = img_elem["src"]
    else:
         img_elem = soup.select_one("._396cs4")
         if img_elem and img_elem.has_attr("src"):
             image = img_elem["src"]

    canonical_url = clean_flipkart_url(url)

    return {
        "title": title,
        "price": price,
        "original_price": original_price,
        "image": image,
        "url": canonical_url,
        "brand": "Flipkart"
    }

async def extract_product_data(url: str) -> dict:
    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    if "amazon.in" in domain or "amzn.to" in domain:
        # Note: If it's amzn.to, httpx follow_redirects will resolve it to amazon.in
        html = await fetch_html(url)
        if not html:
            raise Exception("Failed to fetch Amazon page")
        return extract_amazon_product(html, url)

    elif "flipkart.com" in domain or "fkrt.it" in domain:
        html = await fetch_html(url)
        if not html:
            raise Exception("Failed to fetch Flipkart page")
        return extract_flipkart_product(html, url)

    else:
        raise Exception("Unsupported platform. Only Amazon India and Flipkart are currently supported.")
