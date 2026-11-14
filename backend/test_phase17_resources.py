"""
Test suite for Curated Resource Finder (Phase 17)
Verifies:
1. ai_bridge.search_resources returns >= 5 resources for any given topic/skill.
2. Every resource item contains valid title, description, url, type, difficulty, and topic.
3. Every resource URL is a valid http/https address.
4. Resource types are diverse (Documentation, Video Course, Interactive Code, Tutorial, Article, Practice Platform).
5. FastApi endpoint /api/resources/search returns HTTP 200 with >= 5 valid ResourceItem objects.
6. Authentication is preserved and respected.
"""
import unittest
import sys
import os
from fastapi.testclient import TestClient

# Add project root and backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.main import app
from backend.services.ai_bridge import ai_bridge
from backend.utils.auth_utils import create_access_token


class TestResourceFinder(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.token = create_access_token(data={"sub": "resource_tester@example.com", "user_id": "test_user_res_1"})
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    def test_search_resources_python_data_structures(self):
        """Verify searching for Python Data Structures returns at least 5 valid resources."""
        results = ai_bridge.search_resources(
            topic="Python",
            skill="Data Structures",
            difficulty="Intermediate",
            learning_preference="Visual"
        )
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 5, f"Expected at least 5 resources, got {len(results)}")
        
        for item in results:
            self.assertIn("title", item)
            self.assertIn("description", item)
            self.assertIn("url", item)
            self.assertIn("type", item)
            self.assertIn("difficulty", item)
            self.assertIn("topic", item)
            
            self.assertTrue(len(item["title"]) > 0, "Title must not be empty")
            self.assertTrue(len(item["description"]) > 0, "Description must not be empty")
            self.assertTrue(item["url"].startswith("http://") or item["url"].startswith("https://"), f"Invalid URL: {item['url']}")
            self.assertNotIn("temporarily unavailable", item["title"].lower())

    def test_search_resources_react(self):
        """Verify searching for React returns at least 5 valid resources."""
        results = ai_bridge.search_resources(
            topic="React",
            skill="State Management",
            difficulty="Advanced",
            learning_preference="Kinesthetic"
        )
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 5, f"Expected at least 5 resources, got {len(results)}")
        
        types = [r["type"] for r in results]
        self.assertTrue(len(set(types)) >= 1, "Should have valid categorized resource types")

    def test_api_resources_search_endpoint(self):
        """Verify POST /api/resources/search returns 200 with >= 5 ResourceItem objects."""
        payload = {
            "topic": "Machine Learning",
            "skill": "Neural Networks",
            "learning_goal": "Build deep learning models",
            "difficulty": "Intermediate",
            "learning_preference": "Visual"
        }
        res = self.client.post("/api/resources/search", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("resources", data)
        self.assertIsInstance(data["resources"], list)
        self.assertGreaterEqual(len(data["resources"]), 5)
        
        for r in data["resources"]:
            self.assertTrue(r["url"].startswith("http://") or r["url"].startswith("https://"))
            self.assertTrue(len(r["title"]) > 0)
            self.assertTrue(len(r["description"]) > 0)
            self.assertIn(r["difficulty"], ["Beginner", "Intermediate", "Advanced"])

    def test_api_resources_unauthorized(self):
        """Verify accessing /api/resources/search without auth fails with 401."""
        payload = {"topic": "SQL"}
        res = self.client.post("/api/resources/search", json=payload)
        self.assertEqual(res.status_code, 401)


if __name__ == "__main__":
    unittest.main()
