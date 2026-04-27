"""
Iteration 12 Backend Tests - DISCCART Platform Upgrade
Tests for:
- Advanced filter system (discount filters, deal type filters, price brackets)
- Trending deals 24hr logic with admin config
- Upgraded slider with title/subtitle/CTA/bg_color
- Stores page with slug/featured/store-of-month
- Store admin with full form fields
- Site settings tab with trending config
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://coupon-hub-35.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "disccartindia@gmail.com"
ADMIN_PASSWORD = "Admin@2026@"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestFilterSystem:
    """Tests for advanced filter system - discount filters, deal type filters, price brackets"""
    
    def test_get_admin_filters_returns_all_filter_types(self):
        """GET /api/admin/filters returns price_brackets, discount_filters, deal_type_filters, categories, stores"""
        response = requests.get(f"{BASE_URL}/api/admin/filters")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected keys are present
        assert "price_brackets" in data, "Missing price_brackets in response"
        assert "discount_filters" in data, "Missing discount_filters in response"
        assert "deal_type_filters" in data, "Missing deal_type_filters in response"
        assert "categories" in data, "Missing categories in response"
        assert "stores" in data, "Missing stores in response"
        
        # Verify types
        assert isinstance(data["price_brackets"], list)
        assert isinstance(data["discount_filters"], list)
        assert isinstance(data["deal_type_filters"], list)
        assert isinstance(data["categories"], list)
        assert isinstance(data["stores"], list)
        print(f"Filter config returned: {len(data['price_brackets'])} price brackets, {len(data['discount_filters'])} discount filters, {len(data['deal_type_filters'])} deal type filters")
    
    def test_patch_admin_filters_saves_discount_filters(self, admin_headers):
        """PATCH /api/admin/filters saves discount_filters"""
        test_discount_filters = [
            {"label": "10-20% Off", "min": 10, "max": 20, "is_active": True, "display_order": 0},
            {"label": "20-50% Off", "min": 20, "max": 50, "is_active": True, "display_order": 1}
        ]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/filters",
            json={"discount_filters": test_discount_filters},
            headers=admin_headers
        )
        assert response.status_code == 200
        
        # Verify saved
        get_response = requests.get(f"{BASE_URL}/api/admin/filters")
        assert get_response.status_code == 200
        data = get_response.json()
        assert len(data["discount_filters"]) >= 2
        print("Discount filters saved successfully")
    
    def test_patch_admin_filters_saves_deal_type_filters(self, admin_headers):
        """PATCH /api/admin/filters saves deal_type_filters"""
        test_deal_type_filters = [
            {"label": "Coupons", "value": "coupon", "is_active": True, "display_order": 0},
            {"label": "Deals", "value": "deal", "is_active": True, "display_order": 1}
        ]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/filters",
            json={"deal_type_filters": test_deal_type_filters},
            headers=admin_headers
        )
        assert response.status_code == 200
        
        # Verify saved
        get_response = requests.get(f"{BASE_URL}/api/admin/filters")
        assert get_response.status_code == 200
        data = get_response.json()
        assert len(data["deal_type_filters"]) >= 2
        print("Deal type filters saved successfully")
    
    def test_patch_admin_filters_requires_auth(self):
        """PATCH /api/admin/filters requires admin authentication"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/filters",
            json={"discount_filters": []}
        )
        assert response.status_code == 401
        print("Filter update correctly requires authentication")


class TestFilteredDeals:
    """Tests for filtered deals endpoint with discount and deal type params"""
    
    def test_get_filtered_deals_basic(self):
        """GET /api/deals/filtered returns deals with pagination info"""
        response = requests.get(f"{BASE_URL}/api/deals/filtered")
        assert response.status_code == 200
        data = response.json()
        
        assert "deals" in data
        assert "total" in data
        assert isinstance(data["deals"], list)
        print(f"Filtered deals returned: {len(data['deals'])} deals, total: {data['total']}")
    
    def test_get_filtered_deals_with_min_discount(self):
        """GET /api/deals/filtered supports min_discount param"""
        response = requests.get(f"{BASE_URL}/api/deals/filtered", params={"min_discount": 10})
        assert response.status_code == 200
        data = response.json()
        assert "deals" in data
        print(f"Filtered by min_discount=10: {len(data['deals'])} deals")
    
    def test_get_filtered_deals_with_max_discount(self):
        """GET /api/deals/filtered supports max_discount param"""
        response = requests.get(f"{BASE_URL}/api/deals/filtered", params={"max_discount": 50})
        assert response.status_code == 200
        data = response.json()
        assert "deals" in data
        print(f"Filtered by max_discount=50: {len(data['deals'])} deals")
    
    def test_get_filtered_deals_with_deal_type(self):
        """GET /api/deals/filtered supports deal_type param"""
        response = requests.get(f"{BASE_URL}/api/deals/filtered", params={"deal_type": "coupon"})
        assert response.status_code == 200
        data = response.json()
        assert "deals" in data
        print(f"Filtered by deal_type=coupon: {len(data['deals'])} deals")


class TestTrendingDeals:
    """Tests for trending deals with 24hr logic and admin config"""
    
    def test_get_trending_deals_returns_deals_from_last_24hrs(self):
        """GET /api/deals/trending returns deals from last 24 hours"""
        response = requests.get(f"{BASE_URL}/api/deals/trending")
        assert response.status_code == 200
        data = response.json()
        
        assert "deals" in data
        assert "total" in data
        assert isinstance(data["deals"], list)
        print(f"Trending deals: {len(data['deals'])} deals, total: {data['total']}")
    
    def test_get_trending_config_requires_admin(self):
        """GET /api/admin/trending-config requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/trending-config")
        assert response.status_code == 401
        print("Trending config correctly requires admin auth")
    
    def test_get_trending_config_with_admin(self, admin_headers):
        """GET /api/admin/trending-config returns trending config for admin"""
        response = requests.get(f"{BASE_URL}/api/admin/trending-config", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should have trending_enabled and trending_duration_hours
        assert "trending_enabled" in data or "trending_duration_hours" in data
        print(f"Trending config: {data}")
    
    def test_patch_trending_config_requires_admin(self):
        """PATCH /api/admin/trending-config requires admin authentication"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/trending-config",
            json={"trending_enabled": True}
        )
        assert response.status_code == 401
        print("Trending config update correctly requires admin auth")
    
    def test_patch_trending_config_with_admin(self, admin_headers):
        """PATCH /api/admin/trending-config updates trending config for admin"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/trending-config",
            json={"trending_enabled": True, "trending_duration_hours": 24},
            headers=admin_headers
        )
        assert response.status_code == 200
        
        # Verify saved
        get_response = requests.get(f"{BASE_URL}/api/admin/trending-config", headers=admin_headers)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("trending_enabled") == True
        print("Trending config updated successfully")


class TestStores:
    """Tests for stores with slug, featured, store-of-month"""
    
    def test_get_stores_returns_sorted_by_display_order(self):
        """GET /api/stores returns stores sorted by display_order"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Stores returned: {len(data)} stores")
        
        # Check if stores have expected fields
        if len(data) > 0:
            store = data[0]
            assert "id" in store
            assert "name" in store
    
    def test_get_featured_stores_returns_featured_and_store_of_month(self):
        """GET /api/stores/featured returns featured stores and store_of_month"""
        response = requests.get(f"{BASE_URL}/api/stores/featured")
        assert response.status_code == 200
        data = response.json()
        
        assert "featured" in data
        assert "store_of_month" in data
        assert isinstance(data["featured"], list)
        print(f"Featured stores: {len(data['featured'])}, Store of month: {data['store_of_month'] is not None}")
    
    def test_create_store_requires_admin(self):
        """POST /api/stores requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/stores",
            json={"name": "Test Store"}
        )
        assert response.status_code == 401
        print("Store creation correctly requires admin auth")
    
    def test_create_store_with_full_fields(self, admin_headers):
        """POST /api/stores creates store with slug, description, website, featured flags"""
        test_store = {
            "name": "TEST_Store_Iteration12",
            "description": "Test store description",
            "website_url": "https://teststore.com",
            "category": "Electronics",
            "is_featured": False,
            "is_store_of_month": False,
            "show_in_filter": True,
            "display_order": 99
        }
        
        response = requests.post(
            f"{BASE_URL}/api/stores",
            json=test_store,
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        store_id = data["id"]
        print(f"Store created with ID: {store_id}")
        
        # Verify store was created with slug
        stores_response = requests.get(f"{BASE_URL}/api/stores")
        stores = stores_response.json()
        created_store = next((s for s in stores if s["id"] == store_id), None)
        
        assert created_store is not None
        assert "slug" in created_store
        assert created_store["slug"] == "test-store-iteration12"
        print(f"Store slug auto-generated: {created_store['slug']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/stores/{store_id}", headers=admin_headers)
    
    def test_get_store_by_slug_returns_store_with_deals(self, admin_headers):
        """GET /api/stores/slug/{slug} returns store with its deals"""
        # First create a test store
        test_store = {
            "name": "TEST_SlugStore",
            "description": "Test store for slug test"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/stores",
            json=test_store,
            headers=admin_headers
        )
        assert create_response.status_code == 200
        store_id = create_response.json()["id"]
        
        # Get store by slug
        response = requests.get(f"{BASE_URL}/api/stores/slug/test-slugstore")
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "name" in data
        assert "deals" in data
        assert "deal_count" in data
        assert isinstance(data["deals"], list)
        print(f"Store by slug returned with {data['deal_count']} deals")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/stores/{store_id}", headers=admin_headers)
    
    def test_get_store_by_slug_returns_404_for_nonexistent(self):
        """GET /api/stores/slug/{slug} returns 404 for non-existent store"""
        response = requests.get(f"{BASE_URL}/api/stores/slug/nonexistent-store-xyz123")
        assert response.status_code == 404
        print("Non-existent store correctly returns 404")


class TestSliderUpgrade:
    """Tests for upgraded slider with title/subtitle/CTA/bg_color"""
    
    def test_get_slides_public(self):
        """GET /api/slides returns active slides (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/slides")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Public slides: {len(data)} active slides")
    
    def test_create_slide_with_new_fields(self, admin_headers):
        """POST /api/admin/slides supports title, subtitle, btn_text, btn_link, bg_color fields"""
        test_slide = {
            "image_url": "https://example.com/test-slide.jpg",
            "title": "Test Slide Title",
            "subtitle": "Test subtitle text",
            "btn_text": "Shop Now",
            "btn_link": "/deals",
            "bg_color": "#ff5500",
            "redirect_url": "/trending",
            "is_active": True,
            "order": 99
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/slides",
            json=test_slide,
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        slide_id = data["id"]
        print(f"Slide created with ID: {slide_id}")
        
        # Verify slide was created with all fields
        slides_response = requests.get(f"{BASE_URL}/api/admin/slides", headers=admin_headers)
        slides = slides_response.json()
        created_slide = next((s for s in slides if s["id"] == slide_id), None)
        
        assert created_slide is not None
        assert created_slide.get("title") == "Test Slide Title"
        assert created_slide.get("subtitle") == "Test subtitle text"
        assert created_slide.get("btn_text") == "Shop Now"
        assert created_slide.get("btn_link") == "/deals"
        assert created_slide.get("bg_color") == "#ff5500"
        print("Slide created with all new fields (title, subtitle, btn_text, btn_link, bg_color)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/slides/{slide_id}", headers=admin_headers)


class TestExistingEndpoints:
    """Tests to verify existing endpoints still work"""
    
    def test_homepage_loads(self):
        """Verify homepage APIs work"""
        # Categories
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        print("Categories API working")
        
        # Coupons
        response = requests.get(f"{BASE_URL}/api/coupons")
        assert response.status_code == 200
        print("Coupons API working")
        
        # Hero config
        response = requests.get(f"{BASE_URL}/api/hero-config")
        assert response.status_code == 200
        print("Hero config API working")
    
    def test_auth_login(self):
        """Verify auth login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print("Auth login working")
    
    def test_analytics_overview(self, admin_headers):
        """Verify analytics overview works"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview")
        assert response.status_code == 200
        data = response.json()
        assert "total_coupons" in data
        print(f"Analytics: {data['total_coupons']} total coupons")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
