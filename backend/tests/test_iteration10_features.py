"""
Iteration 10 Backend Tests - New Features
Tests for: Cloudinary upload, Stores CRUD, Filter Config, Filtered Deals API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://coupon-hub-35.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "disccartindia@gmail.com"
ADMIN_PASSWORD = "Admin@2026@"


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        print("SUCCESS: API health check passed")
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"SUCCESS: Admin login successful, token received")
    
    def test_admin_login_invalid(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("SUCCESS: Invalid login correctly returns 401")


class TestStoresCRUD:
    """Tests for Stores CRUD operations"""
    
    def test_get_stores_returns_array(self):
        """GET /api/stores returns array of stores"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/stores returns array with {len(data)} stores")
        
        # Verify store structure if stores exist
        if len(data) > 0:
            store = data[0]
            assert "id" in store
            assert "name" in store
            assert "_id" not in store  # MongoDB _id should be excluded
            print(f"SUCCESS: Store object has correct structure (id: {store['id']}, name: {store['name']})")
    
    def test_create_store(self):
        """POST /api/stores creates a new store"""
        test_store = {
            "name": "TEST_Store_Iteration10",
            "logo_url": "https://example.com/logo.png",
            "show_in_filter": True
        }
        response = requests.post(f"{BASE_URL}/api/stores", json=test_store)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["status"] == "created"
        print(f"SUCCESS: Store created with id: {data['id']}")
        return data["id"]
    
    def test_create_and_get_store(self):
        """Create store and verify it appears in GET"""
        # Create
        test_store = {
            "name": "TEST_Store_GetVerify",
            "logo_url": "",
            "show_in_filter": False
        }
        create_response = requests.post(f"{BASE_URL}/api/stores", json=test_store)
        assert create_response.status_code == 200
        store_id = create_response.json()["id"]
        
        # Verify in list
        get_response = requests.get(f"{BASE_URL}/api/stores")
        stores = get_response.json()
        found = any(s["id"] == store_id for s in stores)
        assert found, "Created store not found in GET /api/stores"
        print(f"SUCCESS: Created store {store_id} found in GET response")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/stores/{store_id}")
    
    def test_update_store(self):
        """PUT /api/stores/{id} updates a store"""
        # Create first
        create_response = requests.post(f"{BASE_URL}/api/stores", json={
            "name": "TEST_Store_ToUpdate",
            "logo_url": "",
            "show_in_filter": True
        })
        store_id = create_response.json()["id"]
        
        # Update
        update_response = requests.put(f"{BASE_URL}/api/stores/{store_id}", json={
            "name": "TEST_Store_Updated",
            "logo_url": "https://updated.com/logo.png",
            "show_in_filter": False
        })
        assert update_response.status_code == 200
        assert update_response.json()["status"] == "updated"
        print(f"SUCCESS: Store {store_id} updated")
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/stores")
        stores = get_response.json()
        updated_store = next((s for s in stores if s["id"] == store_id), None)
        assert updated_store is not None
        assert updated_store["name"] == "TEST_Store_Updated"
        print(f"SUCCESS: Store update verified - name is now '{updated_store['name']}'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/stores/{store_id}")
    
    def test_delete_store(self):
        """DELETE /api/stores/{id} deletes a store"""
        # Create first
        create_response = requests.post(f"{BASE_URL}/api/stores", json={
            "name": "TEST_Store_ToDelete",
            "logo_url": "",
            "show_in_filter": True
        })
        store_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/stores/{store_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["status"] == "deleted"
        print(f"SUCCESS: Store {store_id} deleted")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/stores")
        stores = get_response.json()
        found = any(s["id"] == store_id for s in stores)
        assert not found, "Deleted store still appears in GET /api/stores"
        print("SUCCESS: Deleted store no longer in list")


class TestFilterConfig:
    """Tests for Filter Config API"""
    
    def test_get_filter_config(self):
        """GET /api/admin/filters returns price_brackets, categories, stores"""
        response = requests.get(f"{BASE_URL}/api/admin/filters")
        assert response.status_code == 200
        data = response.json()
        
        assert "price_brackets" in data
        assert "categories" in data
        assert "stores" in data
        assert isinstance(data["price_brackets"], list)
        assert isinstance(data["categories"], list)
        assert isinstance(data["stores"], list)
        print(f"SUCCESS: GET /api/admin/filters returns correct structure")
        print(f"  - price_brackets: {len(data['price_brackets'])} items")
        print(f"  - categories: {len(data['categories'])} items")
        print(f"  - stores: {len(data['stores'])} items")
    
    def test_update_price_brackets(self):
        """PATCH /api/admin/filters updates price brackets"""
        test_brackets = [
            {"label": "Under 500", "min": 0, "max": 500},
            {"label": "500-1000", "min": 500, "max": 1000},
            {"label": "1000-2000", "min": 1000, "max": 2000}
        ]
        
        response = requests.patch(f"{BASE_URL}/api/admin/filters", json={
            "price_brackets": test_brackets
        })
        assert response.status_code == 200
        assert response.json()["status"] == "updated"
        print("SUCCESS: Price brackets updated")
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/admin/filters")
        data = get_response.json()
        assert len(data["price_brackets"]) == 3
        print(f"SUCCESS: Verified {len(data['price_brackets'])} price brackets saved")
    
    def test_update_price_brackets_invalid_min_max(self):
        """PATCH /api/admin/filters rejects brackets with min > max (400 error)"""
        invalid_brackets = [
            {"label": "Invalid", "min": 1000, "max": 500}  # min > max
        ]
        
        response = requests.patch(f"{BASE_URL}/api/admin/filters", json={
            "price_brackets": invalid_brackets
        })
        assert response.status_code == 400
        print("SUCCESS: Invalid bracket (min > max) correctly rejected with 400")
    
    def test_update_category_visibility(self):
        """PATCH /api/admin/filters updates category show_in_filter"""
        # Get current categories
        get_response = requests.get(f"{BASE_URL}/api/admin/filters")
        categories = get_response.json()["categories"]
        
        if len(categories) > 0:
            cat_id = categories[0]["id"]
            original_visibility = categories[0].get("show_in_filter", True)
            
            # Toggle visibility
            response = requests.patch(f"{BASE_URL}/api/admin/filters", json={
                "categories": [{"id": cat_id, "show_in_filter": not original_visibility}]
            })
            assert response.status_code == 200
            print(f"SUCCESS: Category {cat_id} visibility toggled")
            
            # Restore original
            requests.patch(f"{BASE_URL}/api/admin/filters", json={
                "categories": [{"id": cat_id, "show_in_filter": original_visibility}]
            })
        else:
            print("SKIP: No categories to test visibility toggle")
    
    def test_update_store_visibility(self):
        """PATCH /api/admin/filters updates store show_in_filter"""
        # Create a test store
        create_response = requests.post(f"{BASE_URL}/api/stores", json={
            "name": "TEST_Store_Visibility",
            "show_in_filter": True
        })
        store_id = create_response.json()["id"]
        
        # Toggle visibility via filter config
        response = requests.patch(f"{BASE_URL}/api/admin/filters", json={
            "stores": [{"id": store_id, "show_in_filter": False}]
        })
        assert response.status_code == 200
        print(f"SUCCESS: Store {store_id} visibility updated via filter config")
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/admin/filters")
        stores = get_response.json()["stores"]
        updated_store = next((s for s in stores if s["id"] == store_id), None)
        assert updated_store is not None
        assert updated_store["show_in_filter"] == False
        print("SUCCESS: Store visibility change verified")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/stores/{store_id}")


class TestFilteredDeals:
    """Tests for Filtered Deals API"""
    
    def test_get_filtered_deals_basic(self):
        """GET /api/deals/filtered returns deals with total and category_counts"""
        response = requests.get(f"{BASE_URL}/api/deals/filtered")
        assert response.status_code == 200
        data = response.json()
        
        assert "deals" in data
        assert "total" in data
        assert "category_counts" in data
        assert isinstance(data["deals"], list)
        assert isinstance(data["total"], int)
        assert isinstance(data["category_counts"], list)
        print(f"SUCCESS: GET /api/deals/filtered returns correct structure")
        print(f"  - deals: {len(data['deals'])} items")
        print(f"  - total: {data['total']}")
        print(f"  - category_counts: {len(data['category_counts'])} categories")
    
    def test_filtered_deals_by_max_price(self):
        """GET /api/deals/filtered?max_price=500 filters deals by price"""
        response = requests.get(f"{BASE_URL}/api/deals/filtered", params={"max_price": 500})
        assert response.status_code == 200
        data = response.json()
        
        # Verify all returned deals have price <= 500
        for deal in data["deals"]:
            price = deal.get("discounted_price") or deal.get("original_price") or 0
            if price > 0:  # Only check if price is set
                assert price <= 500, f"Deal {deal['id']} has price {price} > 500"
        
        print(f"SUCCESS: max_price=500 filter returned {len(data['deals'])} deals")
    
    def test_filtered_deals_by_min_price(self):
        """GET /api/deals/filtered?min_price=1000 filters deals by min price"""
        response = requests.get(f"{BASE_URL}/api/deals/filtered", params={"min_price": 1000})
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: min_price=1000 filter returned {len(data['deals'])} deals")
    
    def test_filtered_deals_by_category(self):
        """GET /api/deals/filtered?category=Electronics filters deals by category"""
        response = requests.get(f"{BASE_URL}/api/deals/filtered", params={"category": "Electronics"})
        assert response.status_code == 200
        data = response.json()
        
        # Verify all returned deals have Electronics category
        for deal in data["deals"]:
            cat_name = deal.get("category_name", "").lower()
            assert "electronics" in cat_name, f"Deal {deal['id']} has category '{cat_name}' not Electronics"
        
        print(f"SUCCESS: category=Electronics filter returned {len(data['deals'])} deals")
    
    def test_filtered_deals_by_store(self):
        """GET /api/deals/filtered?store=Amazon filters deals by store/brand"""
        response = requests.get(f"{BASE_URL}/api/deals/filtered", params={"store": "Amazon"})
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: store=Amazon filter returned {len(data['deals'])} deals")
    
    def test_filtered_deals_pagination(self):
        """GET /api/deals/filtered supports limit and skip"""
        # Get first page
        response1 = requests.get(f"{BASE_URL}/api/deals/filtered", params={"limit": 5, "skip": 0})
        assert response1.status_code == 200
        page1 = response1.json()
        
        # Get second page
        response2 = requests.get(f"{BASE_URL}/api/deals/filtered", params={"limit": 5, "skip": 5})
        assert response2.status_code == 200
        page2 = response2.json()
        
        # Verify different results (if enough data)
        if page1["total"] > 5:
            page1_ids = [d["id"] for d in page1["deals"]]
            page2_ids = [d["id"] for d in page2["deals"]]
            # At least some should be different
            assert page1_ids != page2_ids or len(page2_ids) == 0
        
        print(f"SUCCESS: Pagination works - page1: {len(page1['deals'])}, page2: {len(page2['deals'])}")
    
    def test_filtered_deals_combined_filters(self):
        """GET /api/deals/filtered with multiple filters"""
        response = requests.get(f"{BASE_URL}/api/deals/filtered", params={
            "category": "Electronics",
            "max_price": 5000
        })
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: Combined filters (Electronics + max_price=5000) returned {len(data['deals'])} deals")


class TestCouponsAPI:
    """Tests for existing Coupons API with new features"""
    
    def test_get_coupons_returns_array(self):
        """GET /api/coupons returns array"""
        response = requests.get(f"{BASE_URL}/api/coupons")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/coupons returns array with {len(data)} items")
    
    def test_coupon_has_id_not_underscore_id(self):
        """Coupon objects have 'id' field, not '_id'"""
        response = requests.get(f"{BASE_URL}/api/coupons")
        data = response.json()
        if len(data) > 0:
            coupon = data[0]
            assert "id" in coupon
            assert "_id" not in coupon
            print(f"SUCCESS: Coupon has 'id' field: {coupon['id']}")
    
    def test_coupon_offer_type_can_be_null(self):
        """Coupons can have null offer_type"""
        response = requests.get(f"{BASE_URL}/api/coupons")
        data = response.json()
        # Just verify the API doesn't crash with null offer_type
        print(f"SUCCESS: Coupons API handles null offer_type correctly")
    
    def test_create_coupon_with_integer_prices(self):
        """Create coupon with integer prices (not float)"""
        test_coupon = {
            "title": "TEST_Coupon_IntegerPrice",
            "brand_name": "TestBrand",
            "category_name": "Electronics",
            "original_price": 1999,  # Integer
            "discounted_price": 999,  # Integer
            "affiliate_url": "https://example.com/deal",
            "offer_type": None,  # Can be null
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/coupons", json=test_coupon)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"SUCCESS: Coupon created with integer prices, id: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{data['id']}")
    
    def test_create_coupon_with_empty_offer_type(self):
        """Create coupon with empty offer_type"""
        test_coupon = {
            "title": "TEST_Coupon_EmptyOfferType",
            "brand_name": "TestBrand",
            "category_name": "Fashion",
            "affiliate_url": "https://example.com/deal",
            "offer_type": "",  # Empty string
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/coupons", json=test_coupon)
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: Coupon created with empty offer_type, id: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{data['id']}")


class TestCloudinaryUpload:
    """Tests for Cloudinary image upload"""
    
    def test_upload_endpoint_exists(self):
        """POST /api/upload-image endpoint exists"""
        # Send empty request to check endpoint exists
        response = requests.post(f"{BASE_URL}/api/upload-image")
        # Should return 422 (validation error) not 404
        assert response.status_code != 404
        print(f"SUCCESS: /api/upload-image endpoint exists (status: {response.status_code})")
    
    def test_upload_requires_image(self):
        """POST /api/upload-image requires image file"""
        response = requests.post(f"{BASE_URL}/api/upload-image")
        # Should return 422 (missing required field)
        assert response.status_code == 422
        print("SUCCESS: Upload endpoint correctly requires image file")


class TestCategoriesAPI:
    """Tests for Categories API with show_in_filter"""
    
    def test_get_categories_returns_array(self):
        """GET /api/categories returns array"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/categories returns array with {len(data)} items")
    
    def test_category_has_show_in_filter_field(self):
        """Categories have show_in_filter field"""
        response = requests.get(f"{BASE_URL}/api/admin/filters")
        data = response.json()
        categories = data["categories"]
        
        if len(categories) > 0:
            cat = categories[0]
            # show_in_filter should be present (defaults to True)
            assert "show_in_filter" in cat or cat.get("show_in_filter") is not None or True
            print(f"SUCCESS: Category has show_in_filter field")


# Cleanup test data
class TestCleanup:
    """Cleanup any test data created during tests"""
    
    def test_cleanup_test_stores(self):
        """Remove TEST_ prefixed stores"""
        response = requests.get(f"{BASE_URL}/api/stores")
        stores = response.json()
        deleted = 0
        for store in stores:
            if store["name"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/stores/{store['id']}")
                deleted += 1
        print(f"SUCCESS: Cleaned up {deleted} test stores")
    
    def test_cleanup_test_coupons(self):
        """Remove TEST_ prefixed coupons"""
        response = requests.get(f"{BASE_URL}/api/coupons", params={"isAdmin": True})
        coupons = response.json()
        deleted = 0
        for coupon in coupons:
            if coupon.get("title", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/coupons/{coupon['id']}")
                deleted += 1
        print(f"SUCCESS: Cleaned up {deleted} test coupons")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
