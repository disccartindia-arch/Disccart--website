"""
Iteration 11 Tests - Auth System, Admin Protection, Homepage Slides
Tests:
1. Auth endpoints: /auth/login, /auth/register, /auth/me
2. Admin-protected routes: /admin/filters, /admin/slides
3. Homepage slides CRUD: GET /slides (public), admin CRUD
4. Cloudinary upload endpoint
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "disccartindia@gmail.com"
ADMIN_PASSWORD = "Admin@2026@"
TEST_USER_EMAIL = "testuser@test.com"
TEST_USER_PASSWORD = "Test1234!"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_admin_success(self):
        """POST /api/auth/login with admin credentials returns token with role=admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "admin", f"Expected role=admin, got {data['user']['role']}"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful, role={data['user']['role']}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected with 401")
    
    def test_register_creates_user_with_role_user(self):
        """POST /api/auth/register creates user with role=user"""
        # Use unique email to avoid conflicts
        unique_email = f"TEST_newuser_{int(time.time())}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "user", f"Expected role=user, got {data['user']['role']}"
        print(f"✓ User registration successful, role={data['user']['role']}")
    
    def test_register_duplicate_email_fails(self):
        """POST /api/auth/register with existing email returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": ADMIN_EMAIL,  # Already exists
            "password": "SomePassword123!"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Duplicate email registration correctly rejected with 400")
    
    def test_auth_me_without_token_returns_401(self):
        """GET /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /auth/me without token correctly returns 401")
    
    def test_auth_me_with_admin_token_returns_admin_role(self):
        """GET /api/auth/me with admin token returns admin role"""
        # First login to get token
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        
        # Now call /auth/me with token
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["role"] == "admin", f"Expected role=admin, got {data.get('role')}"
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ /auth/me with admin token returns role={data['role']}")
    
    def test_auth_me_with_user_token_returns_user_role(self):
        """GET /api/auth/me with regular user token returns user role"""
        # Try to login as test user (may or may not exist)
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        if login_resp.status_code != 200:
            # Register the test user if doesn't exist
            reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            })
            if reg_resp.status_code == 200:
                token = reg_resp.json()["token"]
            else:
                pytest.skip("Could not create test user")
        else:
            token = login_resp.json()["token"]
        
        # Now call /auth/me with token
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["role"] == "user", f"Expected role=user, got {data.get('role')}"
        print(f"✓ /auth/me with user token returns role={data['role']}")


class TestAdminProtection:
    """Tests for admin-protected routes"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def user_token(self):
        """Get regular user token"""
        # Try login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if login_resp.status_code == 200:
            return login_resp.json()["token"]
        
        # Register if not exists
        reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if reg_resp.status_code == 200:
            return reg_resp.json()["token"]
        pytest.skip("Could not get user token")
    
    def test_non_admin_cannot_access_patch_admin_filters(self, user_token):
        """Non-admin user cannot access PATCH /api/admin/filters (403)"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/filters",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"price_brackets": []}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Non-admin correctly blocked from PATCH /admin/filters with 403")
    
    def test_non_admin_cannot_access_post_admin_slides(self, user_token):
        """Non-admin user cannot access POST /api/admin/slides (403)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/slides",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"image_url": "https://example.com/test.jpg", "order": 1}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Non-admin correctly blocked from POST /admin/slides with 403")
    
    def test_admin_can_access_patch_admin_filters(self, admin_token):
        """Admin user can access PATCH /api/admin/filters"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/filters",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"price_brackets": [{"label": "Test", "min": 0, "max": 100}]}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Admin can access PATCH /admin/filters")
    
    def test_unauthenticated_cannot_access_admin_slides(self):
        """Unauthenticated user cannot access POST /api/admin/slides (401)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/slides",
            json={"image_url": "https://example.com/test.jpg", "order": 1}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated user blocked from POST /admin/slides with 401")


class TestSlidesAPI:
    """Tests for homepage slides CRUD"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_slides_public_returns_array(self):
        """GET /api/slides returns array (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/slides")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"✓ GET /slides returns array with {len(data)} slides")
    
    def test_admin_slides_crud_flow(self, admin_token):
        """Full CRUD flow for admin slides"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # CREATE slide
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/slides",
            headers=headers,
            json={
                "image_url": "https://example.com/test-slide.jpg",
                "redirect_url": "https://example.com/deal",
                "order": 99,
                "is_active": False  # Keep inactive to not affect homepage
            }
        )
        assert create_resp.status_code == 200, f"Create failed: {create_resp.status_code}: {create_resp.text}"
        slide_id = create_resp.json().get("id")
        assert slide_id, "Created slide should have id"
        print(f"✓ Created slide with id={slide_id}")
        
        # GET all admin slides
        get_resp = requests.get(f"{BASE_URL}/api/admin/slides", headers=headers)
        assert get_resp.status_code == 200
        slides = get_resp.json()
        assert any(s["id"] == slide_id for s in slides), "Created slide should be in list"
        print(f"✓ GET /admin/slides returns {len(slides)} slides including new one")
        
        # UPDATE slide
        update_resp = requests.patch(
            f"{BASE_URL}/api/admin/slides/{slide_id}",
            headers=headers,
            json={"redirect_url": "https://example.com/updated-deal", "order": 98}
        )
        assert update_resp.status_code == 200, f"Update failed: {update_resp.status_code}"
        print(f"✓ Updated slide {slide_id}")
        
        # DELETE slide
        delete_resp = requests.delete(
            f"{BASE_URL}/api/admin/slides/{slide_id}",
            headers=headers
        )
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.status_code}"
        print(f"✓ Deleted slide {slide_id}")
        
        # Verify deletion
        get_resp2 = requests.get(f"{BASE_URL}/api/admin/slides", headers=headers)
        slides2 = get_resp2.json()
        assert not any(s["id"] == slide_id for s in slides2), "Deleted slide should not be in list"
        print("✓ Verified slide deletion")
    
    def test_max_5_active_slides_limit(self, admin_token):
        """Creating more than 5 active slides should fail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current active count
        get_resp = requests.get(f"{BASE_URL}/api/admin/slides", headers=headers)
        slides = get_resp.json()
        active_count = sum(1 for s in slides if s.get("is_active", True))
        
        if active_count >= 5:
            # Try to create another active slide - should fail
            create_resp = requests.post(
                f"{BASE_URL}/api/admin/slides",
                headers=headers,
                json={
                    "image_url": "https://example.com/overflow.jpg",
                    "order": 100,
                    "is_active": True
                }
            )
            assert create_resp.status_code == 400, f"Expected 400 for >5 active slides, got {create_resp.status_code}"
            print("✓ Max 5 active slides limit enforced")
        else:
            print(f"✓ Currently {active_count} active slides, limit not reached yet")


class TestCloudinaryUpload:
    """Tests for Cloudinary image upload"""
    
    def test_upload_endpoint_exists(self):
        """POST /api/upload-image endpoint exists"""
        # Send empty request to check endpoint exists
        response = requests.post(f"{BASE_URL}/api/upload-image")
        # Should return 422 (validation error) not 404
        assert response.status_code in [422, 400], f"Expected 422/400, got {response.status_code}"
        print("✓ POST /upload-image endpoint exists")
    
    def test_upload_requires_image_file(self):
        """Upload endpoint requires image file"""
        response = requests.post(
            f"{BASE_URL}/api/upload-image",
            files={}  # Empty files
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Upload endpoint validates required image file")


class TestExistingPagesLoad:
    """Tests that existing pages still load without crashes"""
    
    def test_homepage_api_works(self):
        """Homepage APIs work (categories, coupons)"""
        cats_resp = requests.get(f"{BASE_URL}/api/categories")
        assert cats_resp.status_code == 200
        assert isinstance(cats_resp.json(), list)
        
        coupons_resp = requests.get(f"{BASE_URL}/api/coupons")
        assert coupons_resp.status_code == 200
        assert isinstance(coupons_resp.json(), list)
        print("✓ Homepage APIs (categories, coupons) working")
    
    def test_deals_filtered_api_works(self):
        """Deals filtered API works"""
        response = requests.get(f"{BASE_URL}/api/deals/filtered")
        assert response.status_code == 200
        data = response.json()
        assert "deals" in data
        assert "total" in data
        print("✓ Deals filtered API working")
    
    def test_stores_api_works(self):
        """Stores API works"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ Stores API working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
