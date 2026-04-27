#!/usr/bin/env python3
"""
DISCCART Backend API Testing Suite
Tests all backend endpoints for the coupon & deals platform
"""

import requests
import sys
import json
from datetime import datetime

class DisccartAPITester:
    def __init__(self, base_url="https://coupon-hub-35.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(response_data) <= 5:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")

            return success, response.json() if response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_admin_login(self):
        """Test admin login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            200,
            data={
                "email": "admin@disccart.in",
                "password": "DisccartAdmin2024!"
            }
        )
        
        if success and response.get('role') == 'admin':
            print(f"   ✅ Admin login successful - Role: {response.get('role')}")
            return True
        else:
            print(f"   ❌ Admin login failed or wrong role")
            return False

    def test_get_categories(self):
        """Test categories endpoint"""
        success, response = self.run_test("Get Categories", "GET", "api/categories", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} categories")
            if response:
                print(f"   Sample category: {response[0].get('name', 'Unknown')}")
        return success

    def test_get_coupons(self):
        """Test coupons endpoint"""
        success, response = self.run_test("Get All Coupons", "GET", "api/coupons", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} coupons")
            if response:
                print(f"   Sample coupon: {response[0].get('title', 'Unknown')}")
        return success

    def test_get_featured_coupons(self):
        """Test featured coupons"""
        success, response = self.run_test(
            "Get Featured Coupons", 
            "GET", 
            "api/coupons?featured=true&limit=4", 
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} featured coupons")
        return success

    def test_search_coupons(self):
        """Test coupon search"""
        success, response = self.run_test(
            "Search Coupons (Amazon)", 
            "GET", 
            "api/coupons?search=amazon&limit=10", 
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} Amazon coupons")
        return success

    def test_category_filter(self):
        """Test category filtering"""
        success, response = self.run_test(
            "Filter by Fashion Category", 
            "GET", 
            "api/coupons?category=fashion&limit=10", 
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} fashion coupons")
        return success

    def test_analytics_overview(self):
        """Test analytics endpoint (admin required)"""
        success, response = self.run_test("Analytics Overview", "GET", "api/analytics/overview", 200)
        if success:
            print(f"   Total coupons: {response.get('total_coupons', 0)}")
            print(f"   Active coupons: {response.get('active_coupons', 0)}")
            print(f"   Total clicks: {response.get('total_clicks', 0)}")
        return success

    def test_seo_page_data(self):
        """Test SEO page data"""
        success, response = self.run_test(
            "SEO Page Data (Amazon Coupons)", 
            "GET", 
            "api/seo/amazon-coupons", 
            200
        )
        if success:
            print(f"   Page title: {response.get('title', 'Unknown')}")
            print(f"   Coupons count: {len(response.get('coupons', []))}")
        return success

    def test_click_tracking(self):
        """Test click tracking"""
        # First get a coupon ID
        success, coupons = self.run_test("Get Coupons for Click Test", "GET", "api/coupons?limit=1", 200)
        if not success or not coupons:
            print("   ❌ No coupons available for click tracking test")
            return False
        
        coupon_id = coupons[0].get('id')
        if not coupon_id:
            print("   ❌ No coupon ID found")
            return False
        
        success, response = self.run_test(
            "Track Click",
            "POST",
            "api/clicks",
            200,
            data={
                "coupon_id": coupon_id,
                "source": "test"
            }
        )
        if success:
            print(f"   Click tracked for coupon: {coupon_id}")
            print(f"   Redirect URL: {response.get('redirect_url', 'Unknown')}")
        return success

    def test_invalid_endpoints(self):
        """Test invalid endpoints return proper errors"""
        success, _ = self.run_test("Invalid Coupon ID", "GET", "api/coupons/invalid-id", 422)
        return success

def main():
    print("🚀 Starting DISCCART Backend API Tests")
    print("=" * 50)
    
    tester = DisccartAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("Admin Login", tester.test_admin_login),
        ("Get Categories", tester.test_get_categories),
        ("Get All Coupons", tester.test_get_coupons),
        ("Get Featured Coupons", tester.test_get_featured_coupons),
        ("Search Coupons", tester.test_search_coupons),
        ("Category Filter", tester.test_category_filter),
        ("Analytics Overview", tester.test_analytics_overview),
        ("SEO Page Data", tester.test_seo_page_data),
        ("Click Tracking", tester.test_click_tracking),
        ("Invalid Endpoints", tester.test_invalid_endpoints)
    ]
    
    print(f"\n📋 Running {len(tests)} test suites...")
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())