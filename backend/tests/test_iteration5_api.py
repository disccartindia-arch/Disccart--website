"""
Iteration 5 API Tests - DISCCART Admin Panel
Tests for: Search/filter, Pretty Links CRUD, Pages CRUD, Blog CRUD, Categories coupon count
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('VITE_BACKEND_URL', 'https://coupon-hub-35.preview.emergentagent.com')

class TestAuthentication:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "disccartindia@gmail.com",
            "password": "Admin@2026@"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "disccartindia@gmail.com"
        print("✓ Login successful")

    def test_login_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected")


class TestCouponsSearch:
    """Tests for coupons/deals - search functionality relies on frontend filtering"""
    
    def test_get_coupons(self):
        """Test getting all coupons"""
        response = requests.get(f"{BASE_URL}/api/coupons")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} coupons")
        
        # Verify coupon structure
        if len(data) > 0:
            coupon = data[0]
            assert "id" in coupon
            assert "title" in coupon
            assert "brand_name" in coupon
            print(f"✓ Coupon structure valid: {coupon.get('title', 'N/A')}")

    def test_coupons_have_searchable_fields(self):
        """Verify coupons have fields needed for search (title, brand_name, code, category_name)"""
        response = requests.get(f"{BASE_URL}/api/coupons")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            coupon = data[0]
            # These fields are used for frontend search
            searchable_fields = ['title', 'brand_name', 'category_name']
            for field in searchable_fields:
                assert field in coupon, f"Missing searchable field: {field}"
            print("✓ All searchable fields present in coupons")


class TestPrettyLinksCRUD:
    """CRUD tests for Pretty Links"""
    
    def test_get_pretty_links(self):
        """Test getting all pretty links"""
        response = requests.get(f"{BASE_URL}/api/pretty-links")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} pretty links")
        
        # Verify link structure
        if len(data) > 0:
            link = data[0]
            assert "id" in link
            assert "slug" in link
            assert "destination_url" in link
            print(f"✓ Pretty link structure valid: /{link.get('slug', 'N/A')}")

    def test_create_pretty_link(self):
        """Test creating a new pretty link"""
        test_link = {
            "slug": "test-iteration5-link",
            "destination_url": "https://example.com/test-iteration5",
            "title": "Test Link Iteration 5",
            "description": "Test description",
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/api/pretty-links", json=test_link)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data.get("status") == "created"
        print(f"✓ Created pretty link with ID: {data['id']}")
        return data["id"]

    def test_delete_pretty_link(self):
        """Test deleting a pretty link"""
        # First create a link to delete
        test_link = {
            "slug": "test-delete-link",
            "destination_url": "https://example.com/delete",
            "title": "Link to Delete"
        }
        create_response = requests.post(f"{BASE_URL}/api/pretty-links", json=test_link)
        assert create_response.status_code == 200
        link_id = create_response.json()["id"]
        
        # Delete the link
        delete_response = requests.delete(f"{BASE_URL}/api/pretty-links/{link_id}")
        assert delete_response.status_code == 200
        print(f"✓ Deleted pretty link: {link_id}")


class TestPagesCRUD:
    """CRUD tests for Pages"""
    
    def test_get_pages(self):
        """Test getting all pages"""
        response = requests.get(f"{BASE_URL}/api/pages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} pages")
        
        # Verify page structure
        if len(data) > 0:
            page = data[0]
            assert "id" in page
            assert "title" in page
            assert "slug" in page
            print(f"✓ Page structure valid: {page.get('title', 'N/A')}")

    def test_create_page(self):
        """Test creating a new page"""
        test_page = {
            "title": "Test Page Iteration 5",
            "slug": "test-page-iteration5",
            "meta_description": "Test meta description",
            "content": "# Test Page\n\nThis is test content.",
            "is_published": False
        }
        response = requests.post(f"{BASE_URL}/api/pages", json=test_page)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data.get("status") == "created"
        print(f"✓ Created page with ID: {data['id']}")
        return data["id"]

    def test_get_page_by_slug(self):
        """Test getting a page by slug"""
        # First create a page
        test_page = {
            "title": "Test Slug Page",
            "slug": "test-slug-page-iter5",
            "content": "Test content"
        }
        create_response = requests.post(f"{BASE_URL}/api/pages", json=test_page)
        assert create_response.status_code == 200
        
        # Get by slug
        response = requests.get(f"{BASE_URL}/api/pages/test-slug-page-iter5")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "test-slug-page-iter5"
        print(f"✓ Got page by slug: {data['title']}")

    def test_delete_page(self):
        """Test deleting a page"""
        # First create a page to delete
        test_page = {
            "title": "Page to Delete",
            "slug": "page-to-delete-iter5",
            "content": "Delete me"
        }
        create_response = requests.post(f"{BASE_URL}/api/pages", json=test_page)
        assert create_response.status_code == 200
        page_id = create_response.json()["id"]
        
        # Delete the page
        delete_response = requests.delete(f"{BASE_URL}/api/pages/{page_id}")
        assert delete_response.status_code == 200
        print(f"✓ Deleted page: {page_id}")


class TestBlogCRUD:
    """CRUD tests for Blog Posts"""
    
    def test_get_blog_posts(self):
        """Test getting all blog posts"""
        response = requests.get(f"{BASE_URL}/api/blog?published_only=false")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} blog posts")
        
        # Verify post structure
        if len(data) > 0:
            post = data[0]
            assert "id" in post
            assert "title" in post
            assert "slug" in post
            print(f"✓ Blog post structure valid: {post.get('title', 'N/A')}")

    def test_create_blog_post(self):
        """Test creating a new blog post"""
        test_post = {
            "title": "Test Blog Post Iteration 5",
            "slug": "test-blog-post-iteration5",
            "meta_description": "Test blog meta",
            "content": "# Test Blog\n\nThis is test blog content.",
            "published": False
        }
        response = requests.post(f"{BASE_URL}/api/blog", json=test_post)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data.get("status") == "created"
        print(f"✓ Created blog post with ID: {data['id']}")
        return data["id"]

    def test_get_blog_post_by_slug(self):
        """Test getting a blog post by slug"""
        # First create a post
        test_post = {
            "title": "Test Slug Blog",
            "slug": "test-slug-blog-iter5",
            "content": "Test content",
            "published": True
        }
        create_response = requests.post(f"{BASE_URL}/api/blog", json=test_post)
        assert create_response.status_code == 200
        
        # Get by slug
        response = requests.get(f"{BASE_URL}/api/blog/test-slug-blog-iter5")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "test-slug-blog-iter5"
        print(f"✓ Got blog post by slug: {data['title']}")

    def test_delete_blog_post(self):
        """Test deleting a blog post"""
        # First create a post to delete
        test_post = {
            "title": "Blog to Delete",
            "slug": "blog-to-delete-iter5",
            "content": "Delete me"
        }
        create_response = requests.post(f"{BASE_URL}/api/blog", json=test_post)
        assert create_response.status_code == 200
        post_id = create_response.json()["id"]
        
        # Delete the post
        delete_response = requests.delete(f"{BASE_URL}/api/blog/{post_id}")
        assert delete_response.status_code == 200
        print(f"✓ Deleted blog post: {post_id}")


class TestCategoriesCouponCount:
    """Tests for categories with coupon count"""
    
    def test_get_categories_with_coupon_count(self):
        """Test that categories include coupon_count field"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify each category has coupon_count
        for cat in data:
            assert "id" in cat
            assert "name" in cat
            assert "coupon_count" in cat, f"Category {cat.get('name')} missing coupon_count"
            assert isinstance(cat["coupon_count"], int)
            print(f"  - {cat['name']}: {cat['coupon_count']} coupons")
        
        print(f"✓ All {len(data)} categories have coupon_count field")


class TestAnalytics:
    """Tests for analytics overview"""
    
    def test_get_analytics_overview(self):
        """Test analytics overview endpoint"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields
        expected_fields = ['total_coupons', 'active_coupons', 'total_clicks', 'total_users', 'total_categories']
        for field in expected_fields:
            assert field in data, f"Missing analytics field: {field}"
        
        print(f"✓ Analytics: {data['total_coupons']} deals, {data['active_coupons']} active, {data['total_clicks']} clicks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
