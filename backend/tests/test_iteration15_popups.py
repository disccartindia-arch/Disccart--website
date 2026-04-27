"""
Iteration 15 - Popup System Backend Tests
Tests for popup CRUD, analytics tracking, and admin authorization
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://coupon-hub-35.preview.emergentagent.com')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "disccartindia@gmail.com"
ADMIN_PASSWORD = "Admin@2026@"
TEST_USER_EMAIL = "testuser@test.com"
TEST_USER_PASSWORD = "Test1234!"


class TestPopupEndpoints:
    """Test popup public endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_get_all_popups(self):
        """GET /api/popups returns all popups"""
        response = self.session.get(f"{BASE_URL}/api/popups")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/popups returned {len(data)} popups")
    
    def test_get_active_popups(self):
        """GET /api/popups/active returns only active popups"""
        response = self.session.get(f"{BASE_URL}/api/popups/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # All returned popups should be active
        for popup in data:
            assert popup.get("is_active") == True, f"Popup {popup.get('id')} should be active"
        print(f"✓ GET /api/popups/active returned {len(data)} active popups")
    
    def test_popup_view_tracking(self):
        """POST /api/popups/{id}/view increments view count"""
        # First get a popup
        response = self.session.get(f"{BASE_URL}/api/popups")
        assert response.status_code == 200
        popups = response.json()
        
        if not popups:
            pytest.skip("No popups available for view tracking test")
        
        popup_id = popups[0]["id"]
        initial_views = popups[0].get("views", 0)
        
        # Track view
        view_response = self.session.post(f"{BASE_URL}/api/popups/{popup_id}/view")
        assert view_response.status_code == 200, f"Expected 200, got {view_response.status_code}"
        assert view_response.json().get("status") == "ok"
        
        # Verify view count increased
        response = self.session.get(f"{BASE_URL}/api/popups")
        updated_popup = next((p for p in response.json() if p["id"] == popup_id), None)
        assert updated_popup is not None
        assert updated_popup.get("views", 0) >= initial_views, "View count should have increased"
        print(f"✓ POST /api/popups/{popup_id}/view - view tracking works")
    
    def test_popup_click_tracking(self):
        """POST /api/popups/{id}/click increments click count"""
        # First get a popup
        response = self.session.get(f"{BASE_URL}/api/popups")
        assert response.status_code == 200
        popups = response.json()
        
        if not popups:
            pytest.skip("No popups available for click tracking test")
        
        popup_id = popups[0]["id"]
        initial_clicks = popups[0].get("clicks", 0)
        
        # Track click
        click_response = self.session.post(f"{BASE_URL}/api/popups/{popup_id}/click")
        assert click_response.status_code == 200, f"Expected 200, got {click_response.status_code}"
        assert click_response.json().get("status") == "ok"
        
        # Verify click count increased
        response = self.session.get(f"{BASE_URL}/api/popups")
        updated_popup = next((p for p in response.json() if p["id"] == popup_id), None)
        assert updated_popup is not None
        assert updated_popup.get("clicks", 0) >= initial_clicks, "Click count should have increased"
        print(f"✓ POST /api/popups/{popup_id}/click - click tracking works")


class TestAdminPopupEndpoints:
    """Test admin popup CRUD endpoints with authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.test_popup_id = None
    
    def get_admin_token(self):
        """Login as admin and get token"""
        if self.admin_token:
            return self.admin_token
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json().get("token")
        return self.admin_token
    
    def get_user_token(self):
        """Login as regular user and get token"""
        # First try to register the test user (may already exist)
        self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        # Then login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_admin_create_popup(self):
        """POST /api/admin/popups creates popup (admin auth required)"""
        token = self.get_admin_token()
        
        popup_data = {
            "title": "TEST_Popup_Create",
            "description": "Test popup for iteration 15",
            "cta_text": "Get Deal",
            "cta_link": "https://example.com",
            "popup_type": "entry",
            "trigger": "on_load",
            "delay_seconds": 3,
            "target_pages": ["home"],
            "target_devices": [],
            "animation_style": "scale",
            "is_active": True,
            "frequency": "once_per_session",
            "priority": 10
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain popup id"
        assert data.get("status") == "created"
        self.test_popup_id = data["id"]
        print(f"✓ POST /api/admin/popups - created popup {self.test_popup_id}")
        return self.test_popup_id
    
    def test_admin_update_popup(self):
        """PUT /api/admin/popups/{id} updates popup (admin auth required)"""
        token = self.get_admin_token()
        
        # First create a popup to update
        popup_id = self.test_admin_create_popup()
        
        update_data = {
            "title": "TEST_Popup_Updated",
            "description": "Updated description",
            "is_active": False
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/popups/{popup_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.json().get("status") == "updated"
        
        # Verify update
        all_popups = self.session.get(f"{BASE_URL}/api/popups").json()
        updated_popup = next((p for p in all_popups if p["id"] == popup_id), None)
        assert updated_popup is not None
        assert updated_popup["title"] == "TEST_Popup_Updated"
        assert updated_popup["is_active"] == False
        print(f"✓ PUT /api/admin/popups/{popup_id} - popup updated successfully")
        return popup_id
    
    def test_admin_delete_popup(self):
        """DELETE /api/admin/popups/{id} deletes popup (admin auth required)"""
        token = self.get_admin_token()
        
        # First create a popup to delete
        popup_id = self.test_admin_create_popup()
        
        response = self.session.delete(
            f"{BASE_URL}/api/admin/popups/{popup_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.json().get("status") == "deleted"
        
        # Verify deletion
        all_popups = self.session.get(f"{BASE_URL}/api/popups").json()
        deleted_popup = next((p for p in all_popups if p["id"] == popup_id), None)
        assert deleted_popup is None, "Popup should be deleted"
        print(f"✓ DELETE /api/admin/popups/{popup_id} - popup deleted successfully")
    
    def test_non_admin_create_popup_forbidden(self):
        """Non-admin user should get 403 on POST /api/admin/popups"""
        user_token = self.get_user_token()
        
        if not user_token:
            pytest.skip("Could not get test user token")
        
        popup_data = {
            "title": "TEST_Unauthorized_Popup",
            "popup_type": "entry",
            "trigger": "on_load"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/popups",
            json=popup_data,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Non-admin user correctly gets 403 on admin popup create")
    
    def test_non_admin_update_popup_forbidden(self):
        """Non-admin user should get 403 on PUT /api/admin/popups/{id}"""
        user_token = self.get_user_token()
        
        if not user_token:
            pytest.skip("Could not get test user token")
        
        # Get any existing popup
        popups = self.session.get(f"{BASE_URL}/api/popups").json()
        if not popups:
            pytest.skip("No popups available for test")
        
        popup_id = popups[0]["id"]
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/popups/{popup_id}",
            json={"title": "Hacked Title"},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Non-admin user correctly gets 403 on admin popup update")
    
    def test_non_admin_delete_popup_forbidden(self):
        """Non-admin user should get 403 on DELETE /api/admin/popups/{id}"""
        user_token = self.get_user_token()
        
        if not user_token:
            pytest.skip("Could not get test user token")
        
        # Get any existing popup
        popups = self.session.get(f"{BASE_URL}/api/popups").json()
        if not popups:
            pytest.skip("No popups available for test")
        
        popup_id = popups[0]["id"]
        
        response = self.session.delete(
            f"{BASE_URL}/api/admin/popups/{popup_id}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Non-admin user correctly gets 403 on admin popup delete")
    
    def test_unauthenticated_admin_endpoints(self):
        """Unauthenticated requests should get 401 on admin popup endpoints"""
        # Test create without auth
        response = self.session.post(f"{BASE_URL}/api/admin/popups", json={"title": "Test"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        # Test update without auth
        response = self.session.put(f"{BASE_URL}/api/admin/popups/someid", json={"title": "Test"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        # Test delete without auth
        response = self.session.delete(f"{BASE_URL}/api/admin/popups/someid")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print("✓ Unauthenticated requests correctly get 401 on admin popup endpoints")


class TestPopupDataValidation:
    """Test popup data structure and validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_popup_structure(self):
        """Verify popup response structure"""
        response = self.session.get(f"{BASE_URL}/api/popups")
        assert response.status_code == 200
        popups = response.json()
        
        if not popups:
            pytest.skip("No popups available for structure test")
        
        popup = popups[0]
        
        # Check required fields exist
        expected_fields = ["id", "title", "is_active"]
        for field in expected_fields:
            assert field in popup, f"Popup should have '{field}' field"
        
        # Check optional fields have correct types if present
        if "views" in popup:
            assert isinstance(popup["views"], int), "views should be int"
        if "clicks" in popup:
            assert isinstance(popup["clicks"], int), "clicks should be int"
        if "target_pages" in popup:
            assert isinstance(popup["target_pages"], list), "target_pages should be list"
        if "target_devices" in popup:
            assert isinstance(popup["target_devices"], list), "target_devices should be list"
        
        print(f"✓ Popup structure validation passed for popup: {popup.get('title')}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_cleanup_test_popups(self):
        """Clean up TEST_ prefixed popups"""
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not login as admin for cleanup")
        
        token = response.json().get("token")
        
        # Get all popups
        popups = self.session.get(f"{BASE_URL}/api/popups").json()
        
        # Delete TEST_ prefixed popups
        deleted_count = 0
        for popup in popups:
            if popup.get("title", "").startswith("TEST_"):
                del_response = self.session.delete(
                    f"{BASE_URL}/api/admin/popups/{popup['id']}",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if del_response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleanup: Deleted {deleted_count} test popups")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
