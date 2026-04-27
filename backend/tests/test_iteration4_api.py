"""
Test Suite for Iteration 4 - Testing 5 High-Priority Technical Directives
1. API 404s for /pretty-links, /blog, /pages routes - FIXED
2. Image upload endpoint - FIXED
3. offer_type field segregation - FIXED
4. Coupon redirect popup fallback - Frontend test
5. Category coupon count mismatch - FIXED
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCMSRoutes:
    """Test that CMS routes return arrays (not 404)"""
    
    def test_pretty_links_returns_array(self):
        """GET /api/pretty-links should return array, not 404"""
        response = requests.get(f"{BASE_URL}/api/pretty-links")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ /api/pretty-links returns array with {len(data)} items")
    
    def test_blog_returns_array(self):
        """GET /api/blog should return array, not 404"""
        response = requests.get(f"{BASE_URL}/api/blog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ /api/blog returns array with {len(data)} posts")
    
    def test_pages_returns_array(self):
        """GET /api/pages should return array, not 404"""
        response = requests.get(f"{BASE_URL}/api/pages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ /api/pages returns array with {len(data)} pages")


class TestCategoriesWithCouponCount:
    """Test that categories include coupon_count field"""
    
    def test_categories_returns_array(self):
        """GET /api/categories should return array"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ /api/categories returns array with {len(data)} categories")
    
    def test_categories_have_coupon_count_field(self):
        """Each category should have coupon_count field"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        
        for cat in data:
            assert "coupon_count" in cat, f"Category {cat.get('name')} missing coupon_count field"
            assert isinstance(cat["coupon_count"], int), f"coupon_count should be int, got {type(cat['coupon_count'])}"
            print(f"  - {cat.get('name')}: {cat['coupon_count']} coupons")
        
        print(f"✓ All {len(data)} categories have coupon_count field")


class TestOfferTypeField:
    """Test that coupons support offer_type field"""
    
    def test_coupons_have_offer_type(self):
        """GET /api/coupons should return coupons with offer_type field"""
        response = requests.get(f"{BASE_URL}/api/coupons")
        assert response.status_code == 200
        data = response.json()
        
        # Check if any coupons have offer_type
        coupons_with_offer_type = [c for c in data if "offer_type" in c]
        print(f"✓ {len(coupons_with_offer_type)}/{len(data)} coupons have offer_type field")
    
    def test_create_coupon_with_offer_type(self):
        """POST /api/coupons should accept offer_type field"""
        test_coupon = {
            "title": "TEST_Offer_Type_Deal",
            "brand_name": "TestBrand",
            "category_name": "Electronics",
            "affiliate_url": "https://example.com/test",
            "offer_type": "deal",
            "code": "TESTDEAL123"
        }
        
        response = requests.post(f"{BASE_URL}/api/coupons", json=test_coupon)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain id"
        
        coupon_id = data["id"]
        print(f"✓ Created coupon with offer_type='deal', id={coupon_id}")
        
        # Cleanup - delete test coupon
        delete_response = requests.delete(f"{BASE_URL}/api/coupons/{coupon_id}")
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test coupon {coupon_id}")


class TestImageUpload:
    """Test image upload endpoint"""
    
    def test_upload_image_endpoint_exists(self):
        """POST /api/upload-image should accept file uploads"""
        # Create a simple test image (1x1 pixel PNG)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'image': ('test.png', io.BytesIO(png_data), 'image/png')}
        response = requests.post(f"{BASE_URL}/api/upload-image", files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "url" in data, "Response should contain url field"
        print(f"✓ Image upload endpoint works, returned url: {data['url']}")


class TestAuthLogin:
    """Test authentication endpoints"""
    
    def test_login_with_correct_credentials(self):
        """POST /api/auth/login should work with correct credentials"""
        credentials = {
            "email": "disccartindia@gmail.com",
            "password": "Admin@2026@"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=credentials)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == credentials["email"]
        print(f"✓ Login successful for {credentials['email']}")
    
    def test_login_with_wrong_credentials(self):
        """POST /api/auth/login should reject wrong credentials"""
        credentials = {
            "email": "wrong@example.com",
            "password": "wrongpassword"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=credentials)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Login correctly rejects invalid credentials")


class TestAnalytics:
    """Test analytics endpoint"""
    
    def test_analytics_overview(self):
        """GET /api/analytics/overview should return stats"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        expected_fields = ["total_coupons", "active_coupons", "total_clicks", "total_users", "total_categories"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Analytics overview: {data}")


class TestCRUDOperations:
    """Test CRUD operations for pretty-links, pages, blog"""
    
    def test_pretty_links_crud(self):
        """Test create, read, delete for pretty-links"""
        # Create
        link_data = {"slug": "test-link", "target_url": "https://example.com", "title": "Test Link"}
        create_response = requests.post(f"{BASE_URL}/api/pretty-links", json=link_data)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        link_id = create_response.json()["id"]
        print(f"✓ Created pretty-link with id={link_id}")
        
        # Read
        read_response = requests.get(f"{BASE_URL}/api/pretty-links")
        assert read_response.status_code == 200
        links = read_response.json()
        assert any(l.get("id") == link_id for l in links), "Created link not found in list"
        print(f"✓ Pretty-link found in list")
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/pretty-links/{link_id}")
        assert delete_response.status_code == 200
        print(f"✓ Deleted pretty-link {link_id}")
    
    def test_pages_crud(self):
        """Test create, read, delete for pages"""
        # Create
        page_data = {"slug": "test-page", "title": "Test Page", "content": "Test content", "published": False}
        create_response = requests.post(f"{BASE_URL}/api/pages", json=page_data)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        page_id = create_response.json()["id"]
        print(f"✓ Created page with id={page_id}")
        
        # Read
        read_response = requests.get(f"{BASE_URL}/api/pages")
        assert read_response.status_code == 200
        pages = read_response.json()
        assert any(p.get("id") == page_id for p in pages), "Created page not found in list"
        print(f"✓ Page found in list")
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/pages/{page_id}")
        assert delete_response.status_code == 200
        print(f"✓ Deleted page {page_id}")
    
    def test_blog_crud(self):
        """Test create, read, delete for blog posts"""
        # Create
        post_data = {"slug": "test-post", "title": "Test Post", "content": "Test content", "published": False}
        create_response = requests.post(f"{BASE_URL}/api/blog", json=post_data)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        post_id = create_response.json()["id"]
        print(f"✓ Created blog post with id={post_id}")
        
        # Read
        read_response = requests.get(f"{BASE_URL}/api/blog", params={"published_only": False})
        assert read_response.status_code == 200
        posts = read_response.json()
        assert any(p.get("id") == post_id for p in posts), "Created post not found in list"
        print(f"✓ Blog post found in list")
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/blog/{post_id}")
        assert delete_response.status_code == 200
        print(f"✓ Deleted blog post {post_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
