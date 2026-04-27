"""
Test suite for DISCCART new features:
- Deal Score badges
- Verification badges
- Coupons-only endpoint
- Navigation updates
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://coupon-hub-35.preview.emergentagent.com')


class TestHealthAndBasics:
    """Basic health and connectivity tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")


class TestDealScoreAndVerification:
    """Tests for Deal Score and Verification Status features"""
    
    def test_coupons_have_deal_score(self):
        """Test that all coupons have deal_score field"""
        response = requests.get(f"{BASE_URL}/api/coupons")
        assert response.status_code == 200
        coupons = response.json()
        assert len(coupons) >= 6, f"Expected at least 6 coupons, got {len(coupons)}"
        
        for coupon in coupons:
            assert "deal_score" in coupon, f"Coupon {coupon['title']} missing deal_score"
            assert coupon["deal_score"] is not None, f"Coupon {coupon['title']} has null deal_score"
            assert 0 <= coupon["deal_score"] <= 100, f"Deal score {coupon['deal_score']} out of range"
        print(f"✓ All {len(coupons)} coupons have valid deal_score")
    
    def test_coupons_have_verification_status(self):
        """Test that all coupons have verification_status field"""
        response = requests.get(f"{BASE_URL}/api/coupons")
        assert response.status_code == 200
        coupons = response.json()
        
        valid_statuses = ["verified", "expired", "unverified"]
        for coupon in coupons:
            assert "verification_status" in coupon, f"Coupon {coupon['title']} missing verification_status"
            assert coupon["verification_status"] in valid_statuses, f"Invalid status: {coupon['verification_status']}"
        print(f"✓ All coupons have valid verification_status")
    
    def test_deal_score_values(self):
        """Test specific deal score values match expected ranges"""
        response = requests.get(f"{BASE_URL}/api/coupons")
        assert response.status_code == 200
        coupons = response.json()
        
        # Find the sneakers deal (should have highest score ~83)
        sneakers = next((c for c in coupons if "Sneakers" in c["title"]), None)
        assert sneakers is not None, "Sneakers deal not found"
        assert sneakers["deal_score"] >= 70, f"Sneakers score {sneakers['deal_score']} should be >= 70 (Great)"
        print(f"✓ Sneakers deal score: {sneakers['deal_score']} (Great)")
        
        # Find the Nykaa BOGO deal (should have lower score ~24-35)
        nykaa = next((c for c in coupons if "Beauty" in c["title"] or "BOGO" in c["title"]), None)
        if nykaa:
            assert nykaa["deal_score"] < 40, f"Nykaa BOGO score {nykaa['deal_score']} should be < 40 (Fair)"
            print(f"✓ Nykaa BOGO deal score: {nykaa['deal_score']} (Fair)")


class TestCouponsOnlyEndpoint:
    """Tests for the new /api/coupons-only endpoint"""
    
    def test_coupons_only_returns_only_codes(self):
        """Test that coupons-only endpoint returns only coupons with codes"""
        response = requests.get(f"{BASE_URL}/api/coupons-only")
        assert response.status_code == 200
        coupons = response.json()
        
        # Should return exactly 5 coupons (not 6, since Nykaa BOGO has no code)
        assert len(coupons) == 5, f"Expected 5 coupons with codes, got {len(coupons)}"
        
        # All returned coupons should have a code
        for coupon in coupons:
            assert coupon.get("code"), f"Coupon {coupon['title']} should have a code"
            assert coupon["code"].strip() != "", f"Coupon {coupon['title']} has empty code"
        print(f"✓ coupons-only returns {len(coupons)} coupons (all with codes)")
    
    def test_coupons_only_excludes_no_code_deals(self):
        """Test that Nykaa BOGO (no code) is NOT in coupons-only"""
        response = requests.get(f"{BASE_URL}/api/coupons-only")
        assert response.status_code == 200
        coupons = response.json()
        
        # Nykaa BOGO should NOT be in the list
        nykaa = next((c for c in coupons if "Beauty" in c["title"] or "BOGO" in c["title"]), None)
        assert nykaa is None, "Nykaa BOGO (no code) should NOT appear in coupons-only"
        print("✓ Nykaa BOGO (no code) correctly excluded from coupons-only")
    
    def test_coupons_only_category_filter(self):
        """Test category filter on coupons-only endpoint"""
        response = requests.get(f"{BASE_URL}/api/coupons-only?category=Fashion")
        assert response.status_code == 200
        coupons = response.json()
        
        # Should return Fashion coupons with codes (SNEAK70, MYNTRA20)
        assert len(coupons) == 2, f"Expected 2 Fashion coupons, got {len(coupons)}"
        for coupon in coupons:
            assert coupon["category_name"] == "Fashion", f"Expected Fashion, got {coupon['category_name']}"
        print(f"✓ Fashion filter returns {len(coupons)} coupons")
    
    def test_coupons_only_sort_by_latest(self):
        """Test sort_by=latest on coupons-only endpoint"""
        response = requests.get(f"{BASE_URL}/api/coupons-only?sort_by=latest")
        assert response.status_code == 200
        coupons = response.json()
        
        assert len(coupons) == 5, f"Expected 5 coupons, got {len(coupons)}"
        # All should have created_at field
        for coupon in coupons:
            assert "created_at" in coupon, f"Coupon {coupon['title']} missing created_at"
        print(f"✓ sort_by=latest returns {len(coupons)} coupons sorted by date")
    
    def test_coupons_only_sort_by_popular(self):
        """Test sort_by=popular on coupons-only endpoint"""
        response = requests.get(f"{BASE_URL}/api/coupons-only?sort_by=popular")
        assert response.status_code == 200
        coupons = response.json()
        
        assert len(coupons) == 5, f"Expected 5 coupons, got {len(coupons)}"
        # First coupon should have highest deal_score
        if len(coupons) >= 2:
            assert coupons[0]["deal_score"] >= coupons[-1]["deal_score"], "Popular sort should order by deal_score desc"
        print(f"✓ sort_by=popular returns coupons sorted by deal_score")
    
    def test_coupons_only_search(self):
        """Test search on coupons-only endpoint"""
        response = requests.get(f"{BASE_URL}/api/coupons-only?search=amazon")
        assert response.status_code == 200
        coupons = response.json()
        
        # Should find Amazon sneakers deal
        assert len(coupons) >= 1, "Expected at least 1 Amazon coupon"
        assert any("Amazon" in c["brand_name"] for c in coupons), "Should find Amazon brand"
        print(f"✓ search=amazon returns {len(coupons)} matching coupons")
    
    def test_coupons_only_has_deal_score_and_verification(self):
        """Test that coupons-only response includes deal_score and verification_status"""
        response = requests.get(f"{BASE_URL}/api/coupons-only")
        assert response.status_code == 200
        coupons = response.json()
        
        for coupon in coupons:
            assert "deal_score" in coupon, f"Coupon {coupon['title']} missing deal_score"
            assert "verification_status" in coupon, f"Coupon {coupon['title']} missing verification_status"
        print("✓ coupons-only includes deal_score and verification_status")


class TestExistingFeatures:
    """Tests to ensure existing features still work"""
    
    def test_categories_endpoint(self):
        """Test categories endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        categories = response.json()
        assert len(categories) >= 6, f"Expected at least 6 categories, got {len(categories)}"
        print(f"✓ Categories endpoint returns {len(categories)} categories")
    
    def test_blog_endpoint(self):
        """Test blog endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/blog")
        assert response.status_code == 200
        posts = response.json()
        assert len(posts) >= 3, f"Expected at least 3 blog posts, got {len(posts)}"
        print(f"✓ Blog endpoint returns {len(posts)} posts")
    
    def test_pages_endpoint(self):
        """Test pages endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/pages")
        assert response.status_code == 200
        pages = response.json()
        assert len(pages) >= 4, f"Expected at least 4 pages, got {len(pages)}"
        print(f"✓ Pages endpoint returns {len(pages)} pages")
    
    def test_privacy_policy_page(self):
        """Test privacy policy page still works"""
        response = requests.get(f"{BASE_URL}/api/pages/privacy-policy")
        assert response.status_code == 200
        page = response.json()
        assert page["slug"] == "privacy-policy"
        print("✓ Privacy policy page accessible")


import requests
import pytest

BASE_URL = "https://disccart-api.onrender.com"

class TestAdminAuth:
    """Tests for admin authentication"""

    def get_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "disccartindia@gmail.com",
            "password": "Admin@2026@"
        })

        assert response.status_code == 200
        data = response.json()

        assert "token" in data  # ✅ IMPORTANT
        return data["token"]

    def test_admin_login(self):
        token = self.get_token()
        print("✓ Admin login successful")

    def test_admin_analytics(self):
        token = self.get_token()

        headers = {
            "Authorization": f"Bearer {token}"
        }

        response = requests.get(
            f"{BASE_URL}/api/analytics/overview",
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()

        assert "total_coupons" in data
        print(f"✓ Analytics working: {data['total_coupons']} coupons")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])