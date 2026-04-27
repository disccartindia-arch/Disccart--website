"""
DISCCART API Tests - Comprehensive testing for CMS overhaul features
Tests: Auth, Pages, Blog, Pretty Links, Categories, Analytics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://coupon-hub-35.preview.emergentagent.com')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "disccartindia@gmail.com"
ADMIN_PASSWORD = "Admin@2026@"


class TestHealthAndBasics:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ API health check passed: {data}")
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "DISCCART" in data.get("message", "")
        print(f"✓ API root check passed: {data}")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data["email"] == ADMIN_EMAIL.lower()
        assert data["role"] == "admin"
        assert "access_token" in session.cookies or "_id" in data
        print(f"✓ Admin login successful: {data['email']}, role: {data['role']}")
        return session
    
    def test_admin_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_auth_me_without_token(self):
        """Test /auth/me without authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Unauthenticated /auth/me correctly rejected")


class TestPagesAPI:
    """Static Pages CMS API tests"""
    
    def test_get_all_pages(self):
        """Test GET /api/pages returns all pages"""
        response = requests.get(f"{BASE_URL}/api/pages")
        assert response.status_code == 200
        pages = response.json()
        assert isinstance(pages, list)
        assert len(pages) >= 4, f"Expected at least 4 pages, got {len(pages)}"
        
        # Verify expected pages exist
        slugs = [p["slug"] for p in pages]
        expected_slugs = ["privacy-policy", "terms-and-conditions", "about-us", "contact-us"]
        for slug in expected_slugs:
            assert slug in slugs, f"Missing page: {slug}"
        
        print(f"✓ GET /api/pages returned {len(pages)} pages: {slugs}")
    
    def test_get_privacy_policy_page(self):
        """Test GET /api/pages/privacy-policy"""
        response = requests.get(f"{BASE_URL}/api/pages/privacy-policy")
        assert response.status_code == 200
        page = response.json()
        assert page["slug"] == "privacy-policy"
        assert page["title"] == "Privacy Policy"
        assert "content" in page
        assert len(page["content"]) > 100, "Content should be substantial"
        print(f"✓ Privacy Policy page loaded: {page['title']}")
    
    def test_get_contact_us_page(self):
        """Test GET /api/pages/contact-us"""
        response = requests.get(f"{BASE_URL}/api/pages/contact-us")
        assert response.status_code == 200
        page = response.json()
        assert page["slug"] == "contact-us"
        assert page["title"] == "Contact Us"
        print(f"✓ Contact Us page loaded: {page['title']}")
    
    def test_get_about_us_page(self):
        """Test GET /api/pages/about-us"""
        response = requests.get(f"{BASE_URL}/api/pages/about-us")
        assert response.status_code == 200
        page = response.json()
        assert page["slug"] == "about-us"
        assert page["title"] == "About Us"
        print(f"✓ About Us page loaded: {page['title']}")
    
    def test_get_terms_page(self):
        """Test GET /api/pages/terms-and-conditions"""
        response = requests.get(f"{BASE_URL}/api/pages/terms-and-conditions")
        assert response.status_code == 200
        page = response.json()
        assert page["slug"] == "terms-and-conditions"
        assert page["title"] == "Terms & Conditions"
        print(f"✓ Terms & Conditions page loaded: {page['title']}")
    
    def test_get_nonexistent_page(self):
        """Test GET /api/pages/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/pages/nonexistent-page-xyz")
        assert response.status_code == 404
        print("✓ Nonexistent page correctly returns 404")


class TestBlogAPI:
    """Blog API tests"""
    
    def test_get_all_blog_posts(self):
        """Test GET /api/blog returns blog posts"""
        response = requests.get(f"{BASE_URL}/api/blog")
        assert response.status_code == 200
        posts = response.json()
        assert isinstance(posts, list)
        assert len(posts) >= 3, f"Expected at least 3 blog posts, got {len(posts)}"
        
        # Verify post structure
        for post in posts:
            assert "id" in post
            assert "slug" in post
            assert "title" in post
            assert "excerpt" in post
            assert "content" in post
        
        slugs = [p["slug"] for p in posts]
        print(f"✓ GET /api/blog returned {len(posts)} posts: {slugs}")
    
    def test_get_blog_post_by_slug(self):
        """Test GET /api/blog/:slug"""
        response = requests.get(f"{BASE_URL}/api/blog/how-to-save-money-online-shopping-india")
        assert response.status_code == 200
        post = response.json()
        assert post["slug"] == "how-to-save-money-online-shopping-india"
        assert "content" in post
        assert len(post["content"]) > 100
        print(f"✓ Blog post loaded: {post['title']}")
    
    def test_get_nonexistent_blog_post(self):
        """Test GET /api/blog/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/blog/nonexistent-post-xyz")
        assert response.status_code == 404
        print("✓ Nonexistent blog post correctly returns 404")


class TestPrettyLinksAPI:
    """Pretty Links API tests (requires authentication)"""
    
    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return session
    
    def test_get_pretty_links_authenticated(self, admin_session):
        """Test GET /api/pretty-links (authenticated)"""
        response = admin_session.get(f"{BASE_URL}/api/pretty-links")
        assert response.status_code == 200
        links = response.json()
        assert isinstance(links, list)
        assert len(links) >= 3, f"Expected at least 3 pretty links, got {len(links)}"
        
        # Verify expected links
        slugs = [l["slug"] for l in links]
        expected_slugs = ["amazon-deals", "flipkart-offers", "myntra-sale"]
        for slug in expected_slugs:
            assert slug in slugs, f"Missing pretty link: {slug}"
        
        print(f"✓ GET /api/pretty-links returned {len(links)} links: {slugs}")
    
    def test_get_pretty_links_unauthenticated(self):
        """Test GET /api/pretty-links without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/pretty-links")
        assert response.status_code == 401
        print("✓ Unauthenticated pretty-links request correctly rejected")
    
    def test_pretty_link_redirect(self):
        """Test GET /api/go/:slug redirects correctly"""
        response = requests.get(f"{BASE_URL}/api/go/amazon-deals", allow_redirects=False)
        assert response.status_code == 302, f"Expected 302 redirect, got {response.status_code}"
        location = response.headers.get("Location", "")
        assert "amazon" in location.lower(), f"Redirect should go to Amazon: {location}"
        print(f"✓ Pretty link redirect works: /go/amazon-deals -> {location}")
    
    def test_pretty_link_redirect_nonexistent(self):
        """Test GET /api/go/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/go/nonexistent-link-xyz", allow_redirects=False)
        assert response.status_code == 404
        print("✓ Nonexistent pretty link correctly returns 404")


class TestCategoriesAPI:
    """Categories API tests"""
    
    def test_get_all_categories(self):
        """Test GET /api/categories returns categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        categories = response.json()
        assert isinstance(categories, list)
        assert len(categories) >= 6, f"Expected at least 6 categories, got {len(categories)}"
        
        # Verify category structure
        for cat in categories:
            assert "id" in cat
            assert "name" in cat
            assert "slug" in cat
            assert "deal_count" in cat
        
        names = [c["name"] for c in categories]
        print(f"✓ GET /api/categories returned {len(categories)} categories: {names}")


class TestCouponsAPI:
    """Coupons/Deals API tests"""
    
    def test_get_all_coupons(self):
        """Test GET /api/coupons returns deals"""
        response = requests.get(f"{BASE_URL}/api/coupons")
        assert response.status_code == 200
        coupons = response.json()
        assert isinstance(coupons, list)
        assert len(coupons) >= 6, f"Expected at least 6 coupons, got {len(coupons)}"
        
        # Verify coupon structure
        for coupon in coupons:
            assert "id" in coupon
            assert "title" in coupon
            assert "brand_name" in coupon
            assert "affiliate_url" in coupon
        
        print(f"✓ GET /api/coupons returned {len(coupons)} deals")
    
    def test_get_featured_coupons(self):
        """Test GET /api/coupons?featured=true"""
        response = requests.get(f"{BASE_URL}/api/coupons", params={"featured": True})
        assert response.status_code == 200
        coupons = response.json()
        assert isinstance(coupons, list)
        for coupon in coupons:
            assert coupon.get("is_featured") == True
        print(f"✓ GET /api/coupons?featured=true returned {len(coupons)} featured deals")


class TestAnalyticsAPI:
    """Analytics API tests (requires authentication)"""
    
    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_get_analytics_overview(self, admin_session):
        """Test GET /api/analytics/overview (authenticated)"""
        response = admin_session.get(f"{BASE_URL}/api/analytics/overview")
        assert response.status_code == 200
        analytics = response.json()
        
        # Verify expected fields
        assert "total_coupons" in analytics
        assert "total_pages" in analytics
        assert "total_blog_posts" in analytics
        assert "total_pretty_links" in analytics
        
        # Verify counts match expected seeded data
        assert analytics["total_coupons"] >= 6, f"Expected at least 6 coupons, got {analytics['total_coupons']}"
        assert analytics["total_pages"] >= 4, f"Expected at least 4 pages, got {analytics['total_pages']}"
        assert analytics["total_blog_posts"] >= 3, f"Expected at least 3 blog posts, got {analytics['total_blog_posts']}"
        assert analytics["total_pretty_links"] >= 3, f"Expected at least 3 pretty links, got {analytics['total_pretty_links']}"
        
        print(f"✓ Analytics overview: deals={analytics['total_coupons']}, pages={analytics['total_pages']}, blogs={analytics['total_blog_posts']}, links={analytics['total_pretty_links']}")
    
    def test_get_analytics_unauthenticated(self):
        """Test GET /api/analytics/overview without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview")
        assert response.status_code == 401
        print("✓ Unauthenticated analytics request correctly rejected")


class TestAdminCRUDOperations:
    """Admin CRUD operations tests"""
    
    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_category_crud(self, admin_session):
        """Test category CRUD operations"""
        # Create
        new_category = {
            "name": "TEST_Category",
            "slug": "test-category",
            "description": "Test category for automated testing"
        }
        create_response = admin_session.post(f"{BASE_URL}/api/categories", json=new_category)
        assert create_response.status_code == 200
        created = create_response.json()
        assert created["name"] == new_category["name"]
        category_id = created["id"]
        print(f"✓ Created category: {created['name']}")
        
        # Read
        get_response = admin_session.get(f"{BASE_URL}/api/categories/{category_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == new_category["name"]
        print(f"✓ Read category: {fetched['name']}")
        
        # Update
        update_data = {"description": "Updated description"}
        update_response = admin_session.put(f"{BASE_URL}/api/categories/{category_id}", json=update_data)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["description"] == update_data["description"]
        print(f"✓ Updated category description")
        
        # Delete
        delete_response = admin_session.delete(f"{BASE_URL}/api/categories/{category_id}")
        assert delete_response.status_code == 200
        print(f"✓ Deleted category")
        
        # Verify deletion (API returns 404 or 422 for deleted/invalid ID)
        verify_response = admin_session.get(f"{BASE_URL}/api/categories/{category_id}")
        assert verify_response.status_code in [404, 422], f"Expected 404 or 422, got {verify_response.status_code}"
        print(f"✓ Verified category deletion (status: {verify_response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
