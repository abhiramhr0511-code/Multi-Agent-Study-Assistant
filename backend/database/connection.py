import os
import json
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.config import settings

# Attempt to import pymongo
try:
    from pymongo import MongoClient
    HAS_PYMONGO = True
except ImportError:
    HAS_PYMONGO = False


class LocalJsonDB:
    """
    Fallback lightweight document database stored in local JSON files.
    Used automatically if MongoDB server is unavailable or not running.
    """
    def __init__(self, storage_dir: str = "./local_db_store"):
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)

    def _get_collection_path(self, collection_name: str) -> str:
        return os.path.join(self.storage_dir, f"{collection_name}.json")

    def _load_data(self, collection_name: str) -> List[Dict[str, Any]]:
        path = self._get_collection_path(collection_name)
        if not os.path.exists(path):
            return []
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_data(self, collection_name: str, data: List[Dict[str, Any]]):
        path = self._get_collection_path(collection_name)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)

    def insert_one(self, collection_name: str, document: Dict[str, Any]) -> Dict[str, Any]:
        data = self._load_data(collection_name)
        if "_id" not in document:
            document["_id"] = str(uuid.uuid4())
        data.append(document)
        self._save_data(collection_name, data)
        return document

    def _matches_query(self, doc: Dict[str, Any], query: Optional[Dict[str, Any]]) -> bool:
        if not query:
            return True
        if "$or" in query:
            return any(self._matches_query(doc, sub_q) for sub_q in query["$or"])
        if "$and" in query:
            return all(self._matches_query(doc, sub_q) for sub_q in query["$and"])
        for k, v in query.items():
            doc_val = doc.get(k)
            if doc_val is None and k == "id" and "_id" in doc:
                doc_val = doc["_id"]
            if doc_val is None and k == "_id" and "id" in doc:
                doc_val = doc["id"]
            if str(doc_val) != str(v) and doc_val != v:
                return False
        return True

    def find_one(self, collection_name: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        data = self._load_data(collection_name)
        for doc in data:
            if self._matches_query(doc, query):
                return doc
        return None

    def find(self, collection_name: str, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        data = self._load_data(collection_name)
        if not query:
            return data
        results = []
        for doc in data:
            if self._matches_query(doc, query):
                results.append(doc)
        return results

    def update_one(self, collection_name: str, query: Dict[str, Any], update: Dict[str, Any]):
        data = self._load_data(collection_name)
        set_fields = update.get("$set", {})
        updated = False
        for doc in data:
            if self._matches_query(doc, query):
                doc.update(set_fields)
                updated = True
                break
        if updated:
            self._save_data(collection_name, data)

    def delete_one(self, collection_name: str, query: Dict[str, Any]) -> bool:
        data = self._load_data(collection_name)
        new_data = [doc for doc in data if not self._matches_query(doc, query)]
        if len(new_data) != len(data):
            self._save_data(collection_name, new_data)
            return True
        return False

    def delete_many(self, collection_name: str, query: Dict[str, Any]) -> int:
        data = self._load_data(collection_name)
        new_data = [doc for doc in data if not self._matches_query(doc, query)]
        deleted_count = len(data) - len(new_data)
        self._save_data(collection_name, new_data)
        return deleted_count

    def count_documents(self, collection_name: str, query: Optional[Dict[str, Any]] = None) -> int:
        return len(self.find(collection_name, query))


class DatabaseManager:
    """
    Manages MongoDB connection with transparent, resilient local JSON fallback.
    """
    def __init__(self):
        self.db = None
        self.client = None
        self.is_mongo = False
        # Use absolute path so data is always stored in the same location
        # regardless of which directory uvicorn/python is run from
        _this_dir = os.path.dirname(os.path.abspath(__file__))
        _storage_dir = os.path.join(_this_dir, "..", "local_db_store")
        _storage_dir = os.path.normpath(_storage_dir)
        self.fallback = LocalJsonDB(storage_dir=_storage_dir)
        self._connect()

    def _connect(self):
        if HAS_PYMONGO and settings.MONGODB_URI and "your_" not in settings.MONGODB_URI:
            try:
                # Fast timeout (1.5s) to test if remote cluster / DNS is reachable
                self.client = MongoClient(
                    settings.MONGODB_URI,
                    serverSelectionTimeoutMS=1500,
                    connectTimeoutMS=1500,
                    socketTimeoutMS=1500
                )
                self.client.admin.command('ping')
                self.db = self.client[settings.DB_NAME]
                self.is_mongo = True
                print(f"✅ Connected to MongoDB: {settings.MONGODB_URI} (DB: {settings.DB_NAME})")
                return
            except Exception as e:
                print(f"ℹ️ MongoDB Atlas unavailable or DNS unreachable ({e}). Using persistent local JSON database fallback.")
        else:
            print("ℹ️ Using local persistent JSON database fallback.")
        
        self.is_mongo = False
        self.client = None
        self.db = None

    def handle_mongo_failure(self, err: Exception):
        """Marks MongoDB as unreachable and triggers transparent local JSON fallback."""
        if self.is_mongo:
            print(f"⚠️ [Database Connection] MongoDB disconnected or unreachable ({err}). Switching transparently to local JSON database.")
            self.is_mongo = False
            self.db = None
            self.client = None

    def get_collection(self, name: str):
        return RobustCollectionWrapper(self, name)


class RobustCollectionWrapper:
    """
    Wraps MongoDB collection with transparent automatic fallback to LocalJsonDB on network/DNS errors.
    """
    def __init__(self, manager: DatabaseManager, name: str):
        self.manager = manager
        self.name = name

    def insert_one(self, document: Dict[str, Any]):
        if self.manager.is_mongo and self.manager.db is not None:
            try:
                return self.manager.db[self.name].insert_one(document)
            except Exception as e:
                self.manager.handle_mongo_failure(e)

        doc = dict(document)
        created = self.manager.fallback.insert_one(self.name, doc)
        class InsertResult:
            inserted_id = created["_id"]
        return InsertResult()

    def find_one(self, query: Dict[str, Any]):
        if self.manager.is_mongo and self.manager.db is not None:
            try:
                return self.manager.db[self.name].find_one(query)
            except Exception as e:
                self.manager.handle_mongo_failure(e)

        return self.manager.fallback.find_one(self.name, query)

    def find(self, query: Optional[Dict[str, Any]] = None):
        if self.manager.is_mongo and self.manager.db is not None:
            try:
                return self.manager.db[self.name].find(query or {})
            except Exception as e:
                self.manager.handle_mongo_failure(e)

        docs = self.manager.fallback.find(self.name, query)
        class Cursor:
            def __init__(self, documents):
                self._docs = documents
            def sort(self, key, direction=-1):
                reverse = (direction == -1)
                self._docs = sorted(self._docs, key=lambda x: x.get(key, ""), reverse=reverse)
                return self
            def limit(self, n):
                self._docs = self._docs[:n]
                return self
            def __iter__(self):
                return iter(self._docs)
            def to_list(self):
                return self._docs
        return Cursor(docs)

    def update_one(self, query: Dict[str, Any], update: Dict[str, Any]):
        if self.manager.is_mongo and self.manager.db is not None:
            try:
                return self.manager.db[self.name].update_one(query, update)
            except Exception as e:
                self.manager.handle_mongo_failure(e)

        self.manager.fallback.update_one(self.name, query, update)

    def delete_one(self, query: Dict[str, Any]):
        if self.manager.is_mongo and self.manager.db is not None:
            try:
                return self.manager.db[self.name].delete_one(query)
            except Exception as e:
                self.manager.handle_mongo_failure(e)

        deleted = self.manager.fallback.delete_one(self.name, query)
        class DeleteResult:
            deleted_count = 1 if deleted else 0
        return DeleteResult()

    def delete_many(self, query: Dict[str, Any]):
        if self.manager.is_mongo and self.manager.db is not None:
            try:
                return self.manager.db[self.name].delete_many(query)
            except Exception as e:
                self.manager.handle_mongo_failure(e)

        count = self.manager.fallback.delete_many(self.name, query)
        class DeleteResult:
            deleted_count = count
        return DeleteResult()

    def count_documents(self, query: Optional[Dict[str, Any]] = None):
        if self.manager.is_mongo and self.manager.db is not None:
            try:
                return self.manager.db[self.name].count_documents(query or {})
            except Exception as e:
                self.manager.handle_mongo_failure(e)

        return self.manager.fallback.count_documents(self.name, query or {})


db_manager = DatabaseManager()

def get_db_collection(collection_name: str):
    return db_manager.get_collection(collection_name)

