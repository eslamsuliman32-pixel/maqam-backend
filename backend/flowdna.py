"""
★ محرك بصمة التدفق الجينية (Flow DNA)
يُنشئ توقيعًا رقميًا فريدًا لأسلوب تدفق الفنان
ويُقارنه بقاعدة بيانات الفنانين المرجعيين
"""
from __future__ import annotations
import math
import re
from collections import Counter
from dataclasses import dataclass, field

from .models import Bar, FlowStyle, FlowDNA
from .phonetics import normalizearabic, VOWELCARRIERS
from .rhythm import RhythmEngine

# ══════════════════════════════════════════════════════════════════════════════
# Reference Artists DNA (بيانات مرجعية للمقارنة)
# ══════════════════════════════════════════════════════════════════════════════

REFERENCEDNA: dict[str, dict] = {
    "Eminem": {
        "dominantstyle": FlowStyle.DOUBLETIME,
        "avgsyllables":  18.5,
        "stresssignature": "10101010",
        "tempovariance":   0.35,
    },
    "Kendrick Lamar": {
        "dominantstyle": FlowStyle.SYNCOPATED,
        "avgsyllables":  14.2,
        "stresssignature": "10011010",
        "tempovariance":   0.42,
    },
    "ميجان": {
        "dominantstyle": FlowStyle.STRAIGHT,
        "avgsyllables":  12.0,
        "stresssignature": "10001000",
        "tempovariance":   0.20,
    },
    "توباك": {
        "dominantstyle": FlowStyle.HALFTIME,
        "avgsyllables":  10.5,
        "stresssignature": "10001000",
        "tempovariance":   0.15,
    },
}

# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class FlowDNAReport:
    dna:               FlowDNA
    stylebreakdown:   dict[str, float]     # % لكل نمط
    comparableartists: list[tuple[str, float]]  # (اسم, نسبةتشابه)
    evolutiontips:    list[str]             # توصيات تطوير التدفق
    dnavisualization: str                   # تمثيل بصري

class FlowDNAEngine:
    """★ محرك بصمة التدفق الجينية"""

    def __init__(self) -> None:
        self.rhythm = RhythmEngine()

    def extractdna(self, bars: list[Bar], artist: str = "فنان") -> FlowDNAReport:
        """★ يستخلص البصمة الجينية للتدفق من مجموعة بارات"""
        if not bars:
            return self.emptyreport(artist)

        # تحليل كل بار
        syllablecounts  = [self.rhythm.countsyllables(b.rawtext) for b in bars]
        stresspatterns  = [self.rhythm.detectstresspattern(b.rawtext) for b in bars]
        flowstyles      = [self.classifybarflow(b, sc) for b, sc in zip(bars, syllablecounts)]

        avgsyllables    = sum(syllablecounts) / len(syllablecounts)
        tempovariance   = self.calculatetempovariance(syllablecounts)
        dominantstyle   = Counter(flowstyles).most_common(1)[0][0]
        stresssig       = self.buildstresssignature(stresspatterns)
        styledist       = self.buildstyledistribution(flowstyles)
        uniqueness       = self.calculateuniqueness(stresssig, avgsyllables, tempovariance)

        dna = FlowDNA(
            artist=artist,
            dominantstyle=dominantstyle,
            styledistribution=styledist,
            avgsyllablesperbar=round(avgsyllables, 2),
            stresssignature=stresssig,
            tempovariance=round(tempovariance, 3),
            uniquenessscore=round(uniqueness, 3),
        )

        comparable = self.findcomparableartists(dna)
        tips        = self.generateevolutiontips(dna, styledist)
        viz         = self.visualizedna(dna, styledist)

        return FlowDNAReport(
            dna=dna,
            stylebreakdown=styledist,
            comparableartists=comparable,
            evolutiontips=tips,
            dnavisualization=viz,
        )

    # ─── Private ──────────────────────────────────────────────────────────────

    def classifybarflow(self, bar: Bar, syllablecount: int) -> FlowStyle:
        """يُصنّف نمط تدفق بار واحد"""
        text = bar.rawtext
        if syllablecount >= 20:
            return FlowStyle.DOUBLETIME
        if syllablecount <= 8:
            return FlowStyle.HALFTIME
        if re.search(r"[،,].[،,].[،,]", text):
            return FlowStyle.SYNCOPATED
        if syllablecount in range(12, 18):
            return FlowStyle.STRAIGHT
        return FlowStyle.STRAIGHT

    @staticmethod
    def calculatetempovariance(syllablecounts: list[int]) -> float:
        if len(syllablecounts) < 2:
            return 0.0
        mean = sum(syllablecounts) / len(syllablecounts)
        variance = sum((x - mean) ** 2 for x in syllablecounts) / len(syllablecounts)
        std = math.sqrt(variance)
        return min(std / (mean + 1e-9), 1.0)

    @staticmethod
    def buildstresssignature(patterns: list) -> str:
        """يبني توقيع النبر من أنماط متعددة"""
        if not patterns:
            return "00000000"
        combined = ""
        for p in patterns[:8]:
            combined += p.pattern[:4] if p.pattern else "0000"
        return combined[:16] if combined else "0000000000000000"

    @staticmethod
    def buildstyledistribution(styles: list[FlowStyle]) -> dict[str, float]:
        if not styles:
            return {}
        counter = Counter(styles)
        total   = len(styles)
        return {style.value: round(count / total, 3) for style, count in counter.items()}

    @staticmethod
    def calculateuniqueness(
        stresssig: str, avgsyllables: float, tempovariance: float
    ) -> float:
        """يحسب مؤشر التفرد بناءً على البصمة"""
        # تنوع النبر — كم 0 و1 في التوقيع
        ones  = stresssig.count("1")
        zeros = stresssig.count("0")
        balance = 1.0 - abs(ones - zeros) / max(len(stresssig), 1)
        # تباين السرعة (معتدل = أكثر تفردًا)
        variancescore = 1.0 - abs(tempovariance - 0.3) / 0.3
        # كثافة مقاطع فريدة
        densityscore = min(avgsyllables / 20.0, 1.0)
        return (balance * 0.4 + variancescore * 0.3 + densityscore * 0.3)

    @staticmethod
    def findcomparableartists(dna: FlowDNA) -> list[tuple[str, float]]:
        """يجد الفنانين الأكثر تشابهًا"""
        comparisons: list[tuple[str, float]] = []
        for artist, ref in REFERENCEDNA.items():
            score = 0.0
            # مقارنة النمط السائد
            if ref["dominantstyle"] == dna.dominantstyle:
                score += 0.4
            # مقارنة متوسط المقاطع
            syldiff = abs(ref["avgsyllables"] - dna.avgsyllablesperbar)
            score += max(0.0, 0.3 - syldiff * 0.02)
            # مقارنة تباين السرعة
            vardiff = abs(ref["tempovariance"] - dna.tempovariance)
            score += max(0.0, 0.3 - vardiff)
            comparisons.append((artist, round(score, 3)))
        return sorted(comparisons, key=lambda x: x[1], reverse=True)[:3]

    @staticmethod
    def generateevolutiontips(
        dna: FlowDNA, styledist: dict[str, float]
    ) -> list[str]:
        tips: list[str] = []
        # تنوع الأنماط
        if len(styledist) == 1:
            tips.append(
                f"أسلوبك التدفقي أحادي البُعد ({dna.dominantstyle.value}) "
                "— حاول دمج نمط ثانوي مختلف لإضفاء ديناميكية."
            )
        if dna.avgsyllablesperbar < 10:
            tips.append(
                "متوسط المقاطع منخفض — جرّب تمارين Double-Time لرفع الكثافة."
            )
        elif dna.avgsyllablesperbar > 20:
            tips.append(
                "كثافة مقاطع مرتفعة جدًا — أدخل Half-Time breaks لالتقاط الأنفاس."
            )
        if dna.tempovariance < 0.15:
            tips.append(
                "التدفق رتيب جدًا — التباين السرعي المدروس يُعطي حيوية وإثارة."
            )
        if dna.uniquenessscore < 0.5:
            tips.append(
                "مؤشر التفرد منخفض — طور توقيعًا نبريًا خاصًا بك لتمييز صوتك."
            )
        return tips

    @staticmethod
    def visualizedna(dna: FlowDNA, styledist: dict[str, float]) -> str:
        lines = [
            f"┌─── Flow DNA : {dna.artist} ───────────────────────┐",
            f"│ النمط السائد   : {dna.dominantstyle.value:<20}│",
            f"│ متوسط المقاطع  : {dna.avgsyllablesperbar:<20.1f}│",
            f"│ تباين السرعة   : {dna.tempovariance:<20.3f}│",
            f"│ مؤشر التفرد    : {dna.uniquenessscore:<20.3f}│",
            f"│ توقيع النبر     : {dna.stresssignature[:16]:<20}│",
            "│ توزيع الأنماط  :                          │",
        ]
        for style, pct in styledist.items():
            bar = "█" * int(pct * 20) + "░" * (20 - int(pct * 20))
            lines.append(f"│   {style:<12}: {bar} {pct:.0%}   │")
        lines.append("└──────────────────────────────────────────────────┘")
        return "\n".join(lines)

    @staticmethod
    def emptyreport(artist: str) -> FlowDNAReport:
        dna = FlowDNA(
            artist=artist, dominantstyle=FlowStyle.STRAIGHT,
            styledistribution={}, avgsyllablesperbar=0.0,
            stresssignature="", tempovariance=0.0, uniquenessscore=0.0,
        )
        return FlowDNAReport(
            dna=dna, stylebreakdown={}, comparableartists=[],
            evolutiontips=[], dnavisualization="لا توجد بيانات",
        )
