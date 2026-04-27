"""
Iteration 9 - Array Safety Tests
Testing the .map() crash fix - verifying all API endpoints return valid arrays
and frontend pages load without TypeError: e.map is not a function
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestArraySafetyAPIs:
    """Test that all list-returning endpoints return valid arrays"""
    
    def test_api_health(self):
        """Basic API health check"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        print("✓ API is accessible")
    
    def test_get_coupons_returns_array(self):
        """GET /api/coupons should return an array"""
        response = requests.get(f"{BASE_URL}/api/coupons")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/coupons returns array with {len(data)} items")
    
    def test_get_coupons_with_params_returns_array(self):
        """GET /api/coupons with query params should return an array"""
        response = requests.get(f"{BASE_URL}/api/coupons", params={"limit": 10})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/coupons?limit=10 returns array with {len(data)} items")
    
    def test_get_coupons_with_category_returns_array(self):
        """GET /api/coupons with category filter should return an array"""
        response = requests.get(f"{BASE_URL}/api/coupons", params={"category": "electronics"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/coupons?category=electronics returns array with {len(data)} items")
    
    def test_get_coupons_with_offer_type_returns_array(self):
        """GET /api/coupons with offer_type filter should return an array"""
        response = requests.get(f"{BASE_URL}/api/coupons", params={"offer_type": "limited"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/coupons?offer_type=limited returns array with {len(data)} items")
    
    def test_get_coupons_with_search_returns_array(self):
        """GET /api/coupons with search param should return an array"""
        response = requests.get(f"{BASE_URL}/api/coupons", params={"search": "test"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/coupons?search=test returns array with {len(data)} items")
    
    def test_get_coupons_only_returns_array(self):
        """GET /api/coupons-only should return an array"""
        response = requests.get(f"{BASE_URL}/api/coupons-only")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/coupons-only returns array with {len(data)} items")
    
    def test_get_categories_returns_array(self):
        """GET /api/categories should return an array"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/categories returns array with {len(data)} items")
    
    def test_get_pretty_links_returns_array(self):
        """GET /api/pretty-links should return an array"""
        response = requests.get(f"{BASE_URL}/api/pretty-links")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/pretty-links returns array with {len(data)} items")
    
    def test_get_pages_returns_array(self):
        """GET /api/pages should return an array"""
        response = requests.get(f"{BASE_URL}/api/pages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/pages returns array with {len(data)} items")
    
    def test_get_blog_posts_returns_array(self):
        """GET /api/blog should return an array"""
        response = requests.get(f"{BASE_URL}/api/blog")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/blog returns array with {len(data)} items")
    
    def test_get_wishlist_returns_array(self):
        """GET /api/wishlist/{user_id} should return an array"""
        response = requests.get(f"{BASE_URL}/api/wishlist/test_user_123")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/wishlist/test_user_123 returns array with {len(data)} items")
    
    def test_get_wishlist_ids_returns_array(self):
        """GET /api/wishlist/{user_id}/ids should return an array"""
        response = requests.get(f"{BASE_URL}/api/wishlist/test_user_123/ids")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /api/wishlist/test_user_123/ids returns array with {len(data)} items")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_login_with_valid_credentials(self):
        """POST /api/auth/login with valid admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "disccartindia@gmail.com", "password": "Admin@2026@"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "disccartindia@gmail.com"
        print("✓ Admin login successful")
    
    def test_login_with_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✓ Invalid login correctly returns 401")


class TestCouponDataStructure:
    """Test that coupon objects have expected structure"""
    
    def test_coupon_has_id_field(self):
        """Coupons should have 'id' field (not '_id')"""
        response = requests.get(f"{BASE_URL}/api/coupons", params={"limit": 1})
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            coupon = data[0]
            assert "id" in coupon, "Coupon should have 'id' field"
            assert "_id" not in coupon, "Coupon should not have '_id' field (MongoDB ObjectId)"
            print(f"✓ Coupon has 'id' field: {coupon['id']}")
        else:
            print("⚠ No coupons found to test structure")
    
    def test_category_has_id_field(self):
        """Categories should have 'id' field (not '_id')"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            category = data[0]
            assert "id" in category, "Category should have 'id' field"
            assert "_id" not in category, "Category should not have '_id' field"
            print(f"✓ Category has 'id' field: {category['id']}")
        else:
            print("⚠ No categories found to test structure")


class TestAnalyticsEndpoint:
    """Test analytics endpoint"""
    
    def test_analytics_overview(self):
        """GET /api/analytics/overview should return valid data"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview")
        assert response.status_code == 200
        data = response.json()
        assert "total_coupons" in data
        assert "active_coupons" in data
        assert "total_clicks" in data
        assert "total_users" in data
        assert "total_categories" in data
        print(f"✓ Analytics: {data['total_coupons']} coupons, {data['total_categories']} categories")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
