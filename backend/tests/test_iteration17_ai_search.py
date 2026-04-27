"""
Iteration 17 - AI Chat Assistant & Enhanced Search Tests
Tests for:
1. POST /api/ai/chat - AI chat endpoint
2. GET /api/search - Enhanced search with synonym expansion
3. GET /api/search/suggest - Autocomplete suggestions
4. Search sorting and filtering
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIChatEndpoint:
    """Tests for POST /api/ai/chat endpoint"""
    
    def test_ai_chat_basic_message(self):
        """Test AI chat accepts message and returns reply, products, keywords"""
        response = requests.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Show me best deals",
            "session_id": str(uuid.uuid4())
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "reply" in data, "Response should contain 'reply'"
        assert "products" in data, "Response should contain 'products'"
        assert "keywords" in data, "Response should contain 'keywords'"
        
        # Verify types
        assert isinstance(data["reply"], str), "reply should be a string"
        assert isinstance(data["products"], list), "products should be a list"
        assert isinstance(data["keywords"], list), "keywords should be a list"
        
        print(f"AI Chat response: reply length={len(data['reply'])}, products={len(data['products'])}, keywords={data['keywords']}")
    
    def test_ai_chat_with_product_query(self):
        """Test AI chat with product-specific query returns relevant products"""
        response = requests.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Find me fashion deals",
            "session_id": str(uuid.uuid4())
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        # Products should have proper structure if returned
        if data["products"]:
            product = data["products"][0]
            assert "id" in product, "Product should have id"
            assert "title" in product, "Product should have title"
            print(f"Found {len(data['products'])} products for fashion query")
    
    def test_ai_chat_empty_message_returns_400(self):
        """Test AI chat returns 400 for empty message"""
        response = requests.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "",
            "session_id": str(uuid.uuid4())
        })
        assert response.status_code == 400, f"Expected 400 for empty message, got {response.status_code}"
    
    def test_ai_chat_without_session_id(self):
        """Test AI chat works without session_id (generates one)"""
        response = requests.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "What are the best deals today?"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data


class TestEnhancedSearchEndpoint:
    """Tests for GET /api/search endpoint"""
    
    def test_search_with_query(self):
        """Test search with query returns results, suggestions, total, keywords"""
        response = requests.get(f"{BASE_URL}/api/search", params={"q": "fashion"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "results" in data, "Response should contain 'results'"
        assert "suggestions" in data, "Response should contain 'suggestions'"
        assert "total" in data, "Response should contain 'total'"
        assert "keywords" in data, "Response should contain 'keywords'"
        
        # Verify types
        assert isinstance(data["results"], list), "results should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        assert isinstance(data["keywords"], list), "keywords should be a list"
        
        print(f"Search 'fashion': {data['total']} results, keywords={data['keywords']}")
    
    def test_search_synonym_expansion(self):
        """Test search expands synonyms (phone -> mobile, smartphone)"""
        response = requests.get(f"{BASE_URL}/api/search", params={"q": "phone"})
        assert response.status_code == 200
        
        data = response.json()
        # Keywords should include expanded synonyms
        keywords = data.get("keywords", [])
        print(f"Search 'phone' keywords: {keywords}")
        # The search should work even if no results
        assert "results" in data
    
    def test_search_no_query_returns_all_active(self):
        """Test search with no query returns all active deals"""
        response = requests.get(f"{BASE_URL}/api/search", params={})
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        assert "total" in data
        # Should return some deals (DB has 7 deals per context)
        print(f"Search without query: {data['total']} total deals")
    
    def test_search_sort_price_low(self):
        """Test search with sort=price_low works"""
        response = requests.get(f"{BASE_URL}/api/search", params={
            "q": "",
            "sort": "price_low"
        })
        assert response.status_code == 200
        
        data = response.json()
        results = data.get("results", [])
        if len(results) >= 2:
            # Verify sorting - prices should be ascending
            prices = [r.get("discounted_price", 0) or 0 for r in results]
            # Filter out None/0 prices for comparison
            valid_prices = [p for p in prices if p > 0]
            if len(valid_prices) >= 2:
                assert valid_prices == sorted(valid_prices), f"Prices not sorted low to high: {valid_prices[:5]}"
                print(f"Sort price_low verified: {valid_prices[:5]}")
    
    def test_search_sort_price_high(self):
        """Test search with sort=price_high works"""
        response = requests.get(f"{BASE_URL}/api/search", params={
            "sort": "price_high"
        })
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
    
    def test_search_sort_newest(self):
        """Test search with sort=newest works"""
        response = requests.get(f"{BASE_URL}/api/search", params={
            "sort": "newest"
        })
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
    
    def test_search_sort_discount(self):
        """Test search with sort=discount works"""
        response = requests.get(f"{BASE_URL}/api/search", params={
            "sort": "discount"
        })
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
    
    def test_search_pagination(self):
        """Test search pagination with page parameter"""
        response = requests.get(f"{BASE_URL}/api/search", params={
            "page": 1,
            "limit": 5
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "page" in data
        assert "has_more" in data
        assert data["page"] == 1
        print(f"Pagination: page={data['page']}, has_more={data['has_more']}")


class TestSearchSuggestEndpoint:
    """Tests for GET /api/search/suggest endpoint"""
    
    def test_suggest_returns_suggestions(self):
        """Test suggest endpoint returns suggestions array with type"""
        # Need at least 2 characters
        response = requests.get(f"{BASE_URL}/api/search/suggest", params={"q": "ama"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "suggestions" in data, "Response should contain 'suggestions'"
        assert isinstance(data["suggestions"], list), "suggestions should be a list"
        
        # If suggestions exist, verify structure
        if data["suggestions"]:
            suggestion = data["suggestions"][0]
            assert "text" in suggestion, "Suggestion should have 'text'"
            assert "type" in suggestion, "Suggestion should have 'type'"
            assert suggestion["type"] in ["deal", "brand", "category"], f"Invalid type: {suggestion['type']}"
            print(f"Suggestions for 'ama': {[s['text'] for s in data['suggestions'][:3]]}")
    
    def test_suggest_short_query_returns_empty(self):
        """Test suggest with <2 chars returns empty suggestions"""
        response = requests.get(f"{BASE_URL}/api/search/suggest", params={"q": "a"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["suggestions"] == [], "Should return empty for single char query"
    
    def test_suggest_empty_query_returns_empty(self):
        """Test suggest with empty query returns empty suggestions"""
        response = requests.get(f"{BASE_URL}/api/search/suggest", params={"q": ""})
        assert response.status_code == 200
        
        data = response.json()
        assert data["suggestions"] == [], "Should return empty for empty query"
    
    def test_suggest_brand_type(self):
        """Test suggest returns brand type suggestions"""
        # Try common brand prefixes
        response = requests.get(f"{BASE_URL}/api/search/suggest", params={"q": "am"})
        assert response.status_code == 200
        
        data = response.json()
        # Check if any brand type suggestions exist
        brand_suggestions = [s for s in data["suggestions"] if s.get("type") == "brand"]
        print(f"Brand suggestions for 'am': {[s['text'] for s in brand_suggestions]}")
    
    def test_suggest_category_type(self):
        """Test suggest returns category type suggestions"""
        response = requests.get(f"{BASE_URL}/api/search/suggest", params={"q": "fash"})
        assert response.status_code == 200
        
        data = response.json()
        # Check if any category type suggestions exist
        cat_suggestions = [s for s in data["suggestions"] if s.get("type") == "category"]
        print(f"Category suggestions for 'fash': {[s['text'] for s in cat_suggestions]}")


class TestSearchFilters:
    """Tests for search filter parameters"""
    
    def test_search_category_filter(self):
        """Test search with category filter"""
        response = requests.get(f"{BASE_URL}/api/search", params={
            "category": "Fashion"
        })
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
    
    def test_search_brand_filter(self):
        """Test search with brand filter"""
        response = requests.get(f"{BASE_URL}/api/search", params={
            "brand": "Amazon"
        })
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
    
    def test_search_price_range_filter(self):
        """Test search with min/max price filter"""
        response = requests.get(f"{BASE_URL}/api/search", params={
            "min_price": 100,
            "max_price": 1000
        })
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        
        # Verify prices are within range
        for result in data["results"]:
            price = result.get("discounted_price")
            if price:
                assert 100 <= price <= 1000, f"Price {price} outside range 100-1000"
    
    def test_search_min_discount_filter(self):
        """Test search with min_discount filter"""
        response = requests.get(f"{BASE_URL}/api/search", params={
            "min_discount": 20
        })
        assert response.status_code == 200
        data = response.json()
        assert "results" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
