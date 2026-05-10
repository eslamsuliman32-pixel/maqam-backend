"""
★ نظام التخبئة (Cache)
يستخدم لتخزين النتائج بهدف تسريع التحليلات المكررة
"""
from typing import Any, Dict
import time

class LRUCache:
    def __init__(self, capacity: int = 100):
        self.capacity = capacity
        self.cache: Dict[str, Any] = {}
        self.access_times: Dict[str, float] = {}

    def get(self, key: str) -> Any:
        if key in self.cache:
            self.access_times[key] = time.time()
            return self.cache[key]
        return None

    def put(self, key: str, value: Any):
        if len(self.cache) >= self.capacity:
            # إزالة العنصر الأقل استخداماً
            lru_key = min(self.access_times, key=self.access_times.get) # type: ignore
            del self.cache[lru_key]
            del self.access_times[lru_key]
        self.cache[key] = value
        self.access_times[key] = time.time()
