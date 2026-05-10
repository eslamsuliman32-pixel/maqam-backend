"""
★ محرك الإيقاع (Rhythm Engine)
يحلل البنى الإيقاعية والنبر للمقاطع عبر النصوص
"""

import re
from dataclasses import dataclass
from typing import List
from .phonetics import normalizearabic, get_syllables

@dataclass
class StressPattern:
    pattern: str # e.g. "1010" where 1 is stressed, 0 is unstressed
    count: int

class RhythmEngine:
    def countsyllables(self, text: str) -> int:
        """يعد عدد المقاطع في النص الممرر له"""
        words = normalizearabic(text).split()
        return sum(len(get_syllables(word)) for word in words)

    def detectstresspattern(self, text: str) -> StressPattern:
        """يستنتج نمط النبر الصوتي بناءً على المقاطع الطويلة والقصيرة"""
        words = normalizearabic(text).split()
        pattern = ""
        count = 0
        for word in words:
            syls = get_syllables(word)
            for syl in syls:
                # محاكاة بسيطة للتشديد: المقطع الذي يليه مقطع ساكن أو ينتهي بحرف علة طويل نعتبره مشدداً بشكل دوري
                if len(syl) > 2:
                    pattern += "1"
                else:
                    pattern += "0"
                count += 1
        return StressPattern(pattern=pattern, count=count)

    def calculaterhythmdensity(self, text: str, seconds: float = 2.0) -> float:
        """يحسب الكثافة الإيقاعية (مقاطع لكل ثانية)"""
        syls = self.countsyllables(text)
        return syls / max(seconds, 0.1)
