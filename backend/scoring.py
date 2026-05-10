"""
★ محرك التسجيل والتقييم (Scoring Engine)
يُقيم أداء الرابر على أساس معايير متنوعة (القافية، الإيقاع، الكلمات، التدفق)
"""
from typing import Dict
from .models import Bar, MultiDimensionalScore, SkillLevel

class ScoringEngine:
    def evaluate(self, bars: list, bpm: int = 90) -> MultiDimensionalScore:
        """يقيّم البارات ويرجع درجة متعددة الأبعاد"""
        if not bars:
            return MultiDimensionalScore(0, 0, 0, 0, 0, 0.0, SkillLevel.AMATEUR)
            
        rhyme_score = sum(b.rhymedensity for b in bars) / len(bars)
        flow_score = sum(b.flowcomplexity for b in bars) / len(bars)
        vocab_score = sum(b.vocabscore for b in bars) / len(bars)
        lyricism_score = sum(b.lyricismscore for b in bars) / len(bars)
        
        # وزن إجمالي
        overall = (rhyme_score * 0.3 + flow_score * 0.3 + vocab_score * 0.2 + lyricism_score * 0.2)
        
        # تدرج المهارة
        if overall >= 0.9: skill = SkillLevel.GOD_TIER
        elif overall >= 0.75: skill = SkillLevel.ELITE
        elif overall >= 0.6: skill = SkillLevel.PRO
        elif overall >= 0.4: skill = SkillLevel.INTERMEDIATE
        else: skill = SkillLevel.AMATEUR
        
        return MultiDimensionalScore(
            rhyme=round(rhyme_score, 2),
            flow=round(flow_score, 2),
            vocabulary=round(vocab_score, 2),
            lyricism=round(lyricism_score, 2),
            overall=round(overall, 2),
            industrypercentile=round(overall * 100, 1),
            estimatedlevel=skill
        )
