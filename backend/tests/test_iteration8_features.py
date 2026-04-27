"""
Iteration 8 Backend Tests - DISCCART Admin Finalization
Tests for:
1. Multi-select offer_type (comma-separated string)
2. Bulk delete endpoint
3. Image upload with timestamp prefix
4. Category count with regex match
5. Coupon filtering by offer_type and category
6. CouponUpdate model with offer_type, expires_at fields
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Basic health and auth tests"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"API not accessible: {response.status_code}"
        print("✓ API health check passed")
    
    def test_admin_login(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "disccartindia@gmail.com",
            "password": "Admin@2026@"
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        print("✓ Admin login successful")


class TestMultiSelectOfferType:
    """Tests for multi-select offer_type stored as comma-separated string"""
    
    def test_create_deal_with_single_offer_type(self):
        """Create deal with single offer_type"""
        response = requests.post(f"{BASE_URL}/api/coupons", json={
            "title": "TEST_Single_Type_Deal",
            "brand_name": "TestBrand",
            "category_name": "Electronics",
            "affiliate_url": "https://example.com/single",
            "offer_type": "deal"
        })
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data, "No ID returned"
        print(f"✓ Created deal with single offer_type, ID: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{data['id']}")
    
    def test_create_deal_with_multi_offer_type(self):
        """Create deal with comma-separated offer_type (deal,limited)"""
        response = requests.post(f"{BASE_URL}/api/coupons", json={
            "title": "TEST_Multi_Type_Deal",
            "brand_name": "TestBrand",
            "category_name": "Electronics",
            "affiliate_url": "https://example.com/multi",
            "offer_type": "deal,limited"
        })
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        deal_id = data['id']
        print(f"✓ Created deal with multi offer_type, ID: {deal_id}")
        
        # Verify the deal was saved correctly
        coupons = requests.get(f"{BASE_URL}/api/coupons?isAdmin=true").json()
        created_deal = next((c for c in coupons if c['id'] == deal_id), None)
        assert created_deal is not None, "Deal not found after creation"
        assert created_deal['offer_type'] == "deal,limited", f"offer_type mismatch: {created_deal['offer_type']}"
        print(f"✓ Verified deal has offer_type='deal,limited'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{deal_id}")
    
    def test_update_deal_offer_type(self):
        """Test PUT /api/coupons/{id} accepts offer_type field"""
        # Create a deal first
        create_resp = requests.post(f"{BASE_URL}/api/coupons", json={
            "title": "TEST_Update_Offer_Type",
            "brand_name": "TestBrand",
            "category_name": "Fashion",
            "affiliate_url": "https://example.com/update",
            "offer_type": "coupon"
        })
        deal_id = create_resp.json()['id']
        
        # Update offer_type to multi-select
        update_resp = requests.put(f"{BASE_URL}/api/coupons/{deal_id}", json={
            "title": "TEST_Update_Offer_Type",
            "brand_name": "TestBrand",
            "category_name": "Fashion",
            "affiliate_url": "https://example.com/update",
            "offer_type": "coupon,limited"
        })
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        print(f"✓ Updated deal offer_type to 'coupon,limited'")
        
        # Verify update
        coupons = requests.get(f"{BASE_URL}/api/coupons?isAdmin=true").json()
        updated_deal = next((c for c in coupons if c['id'] == deal_id), None)
        assert updated_deal['offer_type'] == "coupon,limited", f"offer_type not updated: {updated_deal['offer_type']}"
        print(f"✓ Verified offer_type update persisted")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{deal_id}")
    
    def test_update_deal_expires_at(self):
        """Test PUT /api/coupons/{id} accepts expires_at field"""
        # Create a deal first
        create_resp = requests.post(f"{BASE_URL}/api/coupons", json={
            "title": "TEST_Expires_At",
            "brand_name": "TestBrand",
            "category_name": "Fashion",
            "affiliate_url": "https://example.com/expires"
        })
        deal_id = create_resp.json()['id']
        
        # Update with expires_at
        update_resp = requests.put(f"{BASE_URL}/api/coupons/{deal_id}", json={
            "title": "TEST_Expires_At",
            "brand_name": "TestBrand",
            "category_name": "Fashion",
            "affiliate_url": "https://example.com/expires",
            "expires_at": "2026-12-31"
        })
        assert update_resp.status_code == 200, f"Update with expires_at failed: {update_resp.text}"
        print(f"✓ Updated deal with expires_at field")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{deal_id}")


class TestBulkDelete:
    """Tests for POST /api/coupons/bulk-delete endpoint"""
    
    def test_bulk_delete_multiple_deals(self):
        """Test bulk delete with multiple IDs"""
        # Create 3 test deals
        deal_ids = []
        for i in range(3):
            resp = requests.post(f"{BASE_URL}/api/coupons", json={
                "title": f"TEST_Bulk_Delete_{i}",
                "brand_name": "TestBrand",
                "category_name": "Electronics",
                "affiliate_url": f"https://example.com/bulk{i}"
            })
            deal_ids.append(resp.json()['id'])
        print(f"✓ Created 3 test deals: {deal_ids}")
        
        # Bulk delete
        bulk_resp = requests.post(f"{BASE_URL}/api/coupons/bulk-delete", json={
            "ids": deal_ids
        })
        assert bulk_resp.status_code == 200, f"Bulk delete failed: {bulk_resp.text}"
        data = bulk_resp.json()
        assert data.get('deleted') == 3, f"Expected 3 deleted, got {data.get('deleted')}"
        assert data.get('status') == 'success', f"Status not success: {data}"
        print(f"✓ Bulk deleted 3 deals successfully")
        
        # Verify deals are gone
        coupons = requests.get(f"{BASE_URL}/api/coupons?isAdmin=true").json()
        remaining = [c for c in coupons if c['id'] in deal_ids]
        assert len(remaining) == 0, f"Deals still exist after bulk delete: {remaining}"
        print(f"✓ Verified deals no longer exist")
    
    def test_bulk_delete_empty_ids(self):
        """Test bulk delete with empty IDs returns error"""
        resp = requests.post(f"{BASE_URL}/api/coupons/bulk-delete", json={
            "ids": []
        })
        assert resp.status_code == 400, f"Expected 400 for empty IDs, got {resp.status_code}"
        print(f"✓ Bulk delete with empty IDs returns 400")
    
    def test_bulk_delete_invalid_ids(self):
        """Test bulk delete with invalid IDs doesn't crash"""
        resp = requests.post(f"{BASE_URL}/api/coupons/bulk-delete", json={
            "ids": ["invalid_id_123", "another_invalid"]
        })
        # Should return 200 with deleted=0 (graceful handling)
        assert resp.status_code == 200, f"Expected 200 for invalid IDs, got {resp.status_code}"
        data = resp.json()
        assert data.get('deleted') == 0, f"Expected 0 deleted for invalid IDs"
        print(f"✓ Bulk delete with invalid IDs handled gracefully")


class TestImageUpload:
    """Tests for POST /api/upload-image with timestamp prefix"""
    
    def test_upload_image_returns_timestamped_url(self):
        """Test image upload adds timestamp prefix to filename"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal valid PNG
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {'image': ('test_image.png', png_data, 'image/png')}
        resp = requests.post(f"{BASE_URL}/api/upload-image", files=files)
        assert resp.status_code == 200, f"Upload failed: {resp.text}"
        
        data = resp.json()
        assert 'url' in data, "No URL in response"
        url = data['url']
        
        # Check URL format: /uploads/{timestamp}_{filename}
        assert url.startswith('/uploads/'), f"URL doesn't start with /uploads/: {url}"
        filename = url.split('/uploads/')[1]
        
        # Should have timestamp prefix (digits followed by underscore)
        parts = filename.split('_', 1)
        assert len(parts) == 2, f"Filename doesn't have timestamp prefix: {filename}"
        timestamp_part = parts[0]
        assert timestamp_part.isdigit(), f"Timestamp part is not numeric: {timestamp_part}"
        assert parts[1] == 'test_image.png', f"Original filename not preserved: {parts[1]}"
        
        print(f"✓ Image uploaded with timestamp prefix: {url}")


class TestCategoryCountRegex:
    """Tests for GET /api/categories returning coupon_count using regex match"""
    
    def test_category_count_with_comma_separated_category(self):
        """Test category count handles comma-separated category_name"""
        # Create a deal with multiple categories
        create_resp = requests.post(f"{BASE_URL}/api/coupons", json={
            "title": "TEST_Multi_Category_Deal",
            "brand_name": "TestBrand",
            "category_name": "Electronics,Fashion",  # Comma-separated
            "affiliate_url": "https://example.com/multicat"
        })
        deal_id = create_resp.json()['id']
        print(f"✓ Created deal with category_name='Electronics,Fashion'")
        
        # Get categories and check counts
        cats_resp = requests.get(f"{BASE_URL}/api/categories")
        assert cats_resp.status_code == 200
        categories = cats_resp.json()
        
        # Find Electronics and Fashion categories
        electronics = next((c for c in categories if c['name'] == 'Electronics'), None)
        fashion = next((c for c in categories if c['name'] == 'Fashion'), None)
        
        # Both should have at least 1 count (from our test deal)
        if electronics:
            assert electronics.get('coupon_count', 0) >= 1, f"Electronics count should be >= 1: {electronics}"
            print(f"✓ Electronics category count: {electronics.get('coupon_count')}")
        if fashion:
            assert fashion.get('coupon_count', 0) >= 1, f"Fashion count should be >= 1: {fashion}"
            print(f"✓ Fashion category count: {fashion.get('coupon_count')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{deal_id}")


class TestCouponFiltering:
    """Tests for coupon filtering by category and offer_type"""
    
    def test_filter_by_category_slug(self):
        """Test GET /api/coupons?category=fashion returns Fashion deals"""
        resp = requests.get(f"{BASE_URL}/api/coupons?category=fashion")
        assert resp.status_code == 200, f"Filter failed: {resp.text}"
        coupons = resp.json()
        
        # All returned coupons should have Fashion in category_name
        for c in coupons:
            cat_name = c.get('category_name', '').lower()
            assert 'fashion' in cat_name, f"Non-fashion deal returned: {c['title']} - {cat_name}"
        
        print(f"✓ Category filter by slug 'fashion' works, returned {len(coupons)} deals")
    
    def test_filter_by_offer_type_limited(self):
        """Test GET /api/coupons?offer_type=limited returns limited deals"""
        # Create a limited deal first
        create_resp = requests.post(f"{BASE_URL}/api/coupons", json={
            "title": "TEST_Limited_Filter",
            "brand_name": "TestBrand",
            "category_name": "Electronics",
            "affiliate_url": "https://example.com/limited",
            "offer_type": "limited"
        })
        deal_id = create_resp.json()['id']
        
        # Filter by offer_type=limited
        resp = requests.get(f"{BASE_URL}/api/coupons?offer_type=limited")
        assert resp.status_code == 200, f"Filter failed: {resp.text}"
        coupons = resp.json()
        
        # Should find our test deal
        test_deal = next((c for c in coupons if c['id'] == deal_id), None)
        assert test_deal is not None, "Test limited deal not found in filtered results"
        
        # All returned coupons should have 'limited' in offer_type
        for c in coupons:
            offer_type = c.get('offer_type', '').lower()
            assert 'limited' in offer_type, f"Non-limited deal returned: {c['title']} - {offer_type}"
        
        print(f"✓ offer_type filter 'limited' works, returned {len(coupons)} deals")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{deal_id}")
    
    def test_filter_by_offer_type_regex_match(self):
        """Test offer_type filter uses regex to match comma-separated values"""
        # Create a deal with multi offer_type
        create_resp = requests.post(f"{BASE_URL}/api/coupons", json={
            "title": "TEST_Multi_Offer_Filter",
            "brand_name": "TestBrand",
            "category_name": "Electronics",
            "affiliate_url": "https://example.com/multifilter",
            "offer_type": "deal,limited"  # Has both
        })
        deal_id = create_resp.json()['id']
        
        # Filter by offer_type=limited should find this deal
        resp = requests.get(f"{BASE_URL}/api/coupons?offer_type=limited")
        coupons = resp.json()
        test_deal = next((c for c in coupons if c['id'] == deal_id), None)
        assert test_deal is not None, "Multi-offer deal not found when filtering by 'limited'"
        print(f"✓ Regex filter found deal with offer_type='deal,limited' when filtering by 'limited'")
        
        # Filter by offer_type=deal should also find this deal
        resp2 = requests.get(f"{BASE_URL}/api/coupons?offer_type=deal")
        coupons2 = resp2.json()
        test_deal2 = next((c for c in coupons2 if c['id'] == deal_id), None)
        assert test_deal2 is not None, "Multi-offer deal not found when filtering by 'deal'"
        print(f"✓ Regex filter found deal with offer_type='deal,limited' when filtering by 'deal'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{deal_id}")


class TestResolveImageUrl:
    """Tests for image URL resolution (frontend helper, but we can test backend serves images)"""
    
    def test_uploads_endpoint_accessible(self):
        """Test /uploads/ static files endpoint is accessible"""
        # First upload an image
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        files = {'image': ('test_resolve.png', png_data, 'image/png')}
        upload_resp = requests.post(f"{BASE_URL}/api/upload-image", files=files)
        url_path = upload_resp.json()['url']
        
        # Try to access the uploaded image
        full_url = f"{BASE_URL}{url_path}"
        img_resp = requests.get(full_url)
        assert img_resp.status_code == 200, f"Cannot access uploaded image: {img_resp.status_code}"
        assert 'image' in img_resp.headers.get('content-type', ''), "Response is not an image"
        
        print(f"✓ Uploaded image accessible at {full_url}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
