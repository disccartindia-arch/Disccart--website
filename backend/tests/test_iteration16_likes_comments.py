"""
Iteration 16 - Like/Comment System Tests
Tests for:
1. POST /api/deals/{id}/like - toggle like
2. GET /api/deals/{id}/likes - get like count
3. POST /api/deals/{id}/comments - create comment
4. GET /api/deals/{id}/comments - get comments
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def test_deal_id():
    """Get a deal ID for testing"""
    response = requests.get(f"{BASE_URL}/api/coupons", params={"limit": 1, "page": 1})
    assert response.status_code == 200
    data = response.json()
    # API returns "deals" not "coupons"
    deals = data.get("deals", [])
    assert len(deals) > 0, "No deals found in database"
    return deals[0].get("id") or deals[0].get("_id")

@pytest.fixture
def unique_user_id():
    """Generate unique user ID for each test"""
    return f"test_user_{uuid.uuid4().hex[:8]}"


class TestLikeEndpoints:
    """Tests for like functionality"""
    
    def test_toggle_like_creates_like(self, test_deal_id, unique_user_id):
        """POST /api/deals/{id}/like should create a like"""
        response = requests.post(
            f"{BASE_URL}/api/deals/{test_deal_id}/like",
            json={"user_id": unique_user_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert "liked" in data
        assert "count" in data
        assert data["liked"] == True
        assert isinstance(data["count"], int)
        assert data["count"] >= 1
        print(f"✓ Like created: liked={data['liked']}, count={data['count']}")
    
    def test_toggle_like_removes_like(self, test_deal_id, unique_user_id):
        """POST /api/deals/{id}/like twice should toggle off"""
        # First like
        response1 = requests.post(
            f"{BASE_URL}/api/deals/{test_deal_id}/like",
            json={"user_id": unique_user_id}
        )
        assert response1.status_code == 200
        assert response1.json()["liked"] == True
        
        # Second like (toggle off)
        response2 = requests.post(
            f"{BASE_URL}/api/deals/{test_deal_id}/like",
            json={"user_id": unique_user_id}
        )
        assert response2.status_code == 200
        data = response2.json()
        assert data["liked"] == False
        print(f"✓ Like toggled off: liked={data['liked']}, count={data['count']}")
    
    def test_get_likes_returns_count(self, test_deal_id):
        """GET /api/deals/{id}/likes should return count"""
        response = requests.get(f"{BASE_URL}/api/deals/{test_deal_id}/likes")
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert "liked" in data
        assert isinstance(data["count"], int)
        assert data["count"] >= 0
        print(f"✓ Get likes: count={data['count']}, liked={data['liked']}")
    
    def test_get_likes_with_user_id(self, test_deal_id, unique_user_id):
        """GET /api/deals/{id}/likes with user_id should return liked status"""
        # First create a like
        requests.post(
            f"{BASE_URL}/api/deals/{test_deal_id}/like",
            json={"user_id": unique_user_id}
        )
        
        # Check liked status
        response = requests.get(
            f"{BASE_URL}/api/deals/{test_deal_id}/likes",
            params={"user_id": unique_user_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["liked"] == True
        print(f"✓ Get likes with user_id: liked={data['liked']}")


class TestCommentEndpoints:
    """Tests for comment functionality"""
    
    def test_create_comment_success(self, test_deal_id):
        """POST /api/deals/{id}/comments should create comment"""
        comment_data = {
            "user_id": f"test_user_{uuid.uuid4().hex[:8]}",
            "user_name": "Test User",
            "text": "This is a test comment"
        }
        response = requests.post(
            f"{BASE_URL}/api/deals/{test_deal_id}/comments",
            json=comment_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["text"] == comment_data["text"]
        assert data["user_name"] == comment_data["user_name"]
        assert data["user_id"] == comment_data["user_id"]
        assert "created_at" in data
        print(f"✓ Comment created: id={data['id']}")
    
    def test_create_comment_requires_user_id(self, test_deal_id):
        """POST /api/deals/{id}/comments without user_id should fail"""
        response = requests.post(
            f"{BASE_URL}/api/deals/{test_deal_id}/comments",
            json={"text": "Test comment without user_id"}
        )
        assert response.status_code == 400
        print("✓ Comment creation correctly requires user_id")
    
    def test_create_comment_requires_text(self, test_deal_id):
        """POST /api/deals/{id}/comments without text should fail"""
        response = requests.post(
            f"{BASE_URL}/api/deals/{test_deal_id}/comments",
            json={"user_id": "test_user_123"}
        )
        assert response.status_code == 400
        print("✓ Comment creation correctly requires text")
    
    def test_get_comments_returns_array(self, test_deal_id):
        """GET /api/deals/{id}/comments should return array"""
        response = requests.get(f"{BASE_URL}/api/deals/{test_deal_id}/comments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get comments: {len(data)} comments found")
    
    def test_get_comments_structure(self, test_deal_id):
        """GET /api/deals/{id}/comments should return proper structure"""
        # First create a comment
        comment_data = {
            "user_id": f"test_user_{uuid.uuid4().hex[:8]}",
            "user_name": "Structure Test User",
            "text": "Comment for structure test"
        }
        requests.post(
            f"{BASE_URL}/api/deals/{test_deal_id}/comments",
            json=comment_data
        )
        
        # Get comments
        response = requests.get(f"{BASE_URL}/api/deals/{test_deal_id}/comments")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        
        # Check structure of first comment
        comment = data[0]
        assert "id" in comment
        assert "user_id" in comment
        assert "user_name" in comment
        assert "text" in comment
        assert "created_at" in comment
        print(f"✓ Comment structure verified: {list(comment.keys())}")


class TestLikeCommentIntegration:
    """Integration tests for like/comment system"""
    
    def test_multiple_users_can_like(self, test_deal_id):
        """Multiple users should be able to like the same deal"""
        user1 = f"user1_{uuid.uuid4().hex[:8]}"
        user2 = f"user2_{uuid.uuid4().hex[:8]}"
        
        # User 1 likes
        r1 = requests.post(f"{BASE_URL}/api/deals/{test_deal_id}/like", json={"user_id": user1})
        assert r1.status_code == 200
        count1 = r1.json()["count"]
        
        # User 2 likes
        r2 = requests.post(f"{BASE_URL}/api/deals/{test_deal_id}/like", json={"user_id": user2})
        assert r2.status_code == 200
        count2 = r2.json()["count"]
        
        # Count should increase
        assert count2 >= count1
        print(f"✓ Multiple users can like: count went from {count1} to {count2}")
    
    def test_comment_text_truncation(self, test_deal_id):
        """Comments should be truncated to 500 characters"""
        long_text = "A" * 600  # 600 characters
        response = requests.post(
            f"{BASE_URL}/api/deals/{test_deal_id}/comments",
            json={
                "user_id": f"test_user_{uuid.uuid4().hex[:8]}",
                "user_name": "Long Comment User",
                "text": long_text
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["text"]) <= 500
        print(f"✓ Comment truncated to {len(data['text'])} characters")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
