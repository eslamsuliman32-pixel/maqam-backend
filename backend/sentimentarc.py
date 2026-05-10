"""
★ محرك تحليل منحنى المشاعر والتوتر الدرامي
يُتتبع التحولات العاطفية عبر الأغنية ويُقيّم القوس الدرامي
"""
from __future__ import annotations
import re
from dataclasses import dataclass, field
from collections import Counter

from .models import Bar, EmotionalTone, SentimentPoint
from .phonetics import normalizearabic

# ══════════════════════════════════════════════════════════════════════════════
# Lexicons
# ══════════════════════════════════════════════════════════════════════════════

EMOTIONLEXICON: dict[EmotionalTone, list[str]] = {
    EmotionalTone.AGGRESSIVE: [
        "أكسر", "أضرب", "أدمر", "أسحق", "حرب", "معركة", "عدو", "خصم",
        "نار", "دمار", "غضب", "ثأر", "انتقام", "أفتك", "أقتل"
    ],
    EmotionalTone.MELANCHOLIC: [
        "حزن", "دموع", "وحدة", "ألم", "جرح", "فراق", "غياب", "ذكرى",
        "بكاء", "خسارة", "وجع", "ماضي", "حنين", "ندم", "تعب"
    ],
    EmotionalTone.TRIUMPHANT: [
        "نصر", "فوز", "قمة", "إنجاز", "بطل", "ملك", "تاج", "فخر",
        "وصلت", "حققت", "نجحت", "تفوقت", "ربحت", "أسطورة", "خلّد"
    ],
    EmotionalTone.INTROSPECTIVE: [
        "أفكر", "أتأمل", "أسأل", "أبحث", "عقلي", "روحي", "وعي",
        "حقيقة", "معنى", "وجود", "ذاتي", "نفسي", "أعمق", "فلسفة"
    ],
    EmotionalTone.DEFIANT: [
        "لن", "لا أخاف", "تحدي", "مستحيل", "رغم", "لكن", "أثبت",
        "صمود", "مقاومة", "أبى", "رفض", "لا أخضع", "ثابت"
    ],
    EmotionalTone.EUPHORIC: [
        "حلم", "جنة", "نشوة", "طاير", "أعلى", "سعادة", "بهجة",
        "ضحكة", "حب", "نور", "حياة", "أمل", "جمال", "حرية"
    ],
}

# كلمات التصعيد الدرامي
ESCALATIONMARKERS = [
    "الآن", "اليوم", "أخيرًا", "الحقيقة", "اسمع", "انتهى", "بدأ",
    "تحول", "غيّر", "قرر", "لحظة"
]

# كلمات التهدئة الدرامية
DEESCALATIONMARKERS = [
    "ولكن", "لكن", "رغم", "إلا أن", "بينما", "في النهاية", "أخيرًا"
]

# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class SentimentArc:
    """★ القوس العاطفي الكامل للأغنية"""
    points:            list[SentimentPoint]
    dominanttone:     EmotionalTone
    emotionalrange:   float          # نطاق التقلب العاطفي 0–1
    dramaticarc:      str            # وصف القوس الدرامي
    climaxbar:        int            # البار الذروة
    tensioncurve:     list[float]    # منحنى التوتر الرقمي
    arcquality:       float          # جودة القوس الدرامي 0–10
    transitions:       list[tuple[int, EmotionalTone, EmotionalTone]]  # (bar, from, to)

class SentimentEngine:
    """★ محرك تحليل المشاعر والقوس الدرامي"""

    INTENSITYAMPLIFIERS = frozenset(["جدًا", "كثيرًا", "تمامًا", "للغاية", "بشدة"])
    INTENSITYDAMPENERS  = frozenset(["قليلًا", "نوعًا", "نسبيًا", "بعض"])

    def analyzebarsentiment(self, bar: Bar) -> SentimentPoint:
        """يُحلّل المشاعر في بار واحد"""
        words   = normalizearabic(bar.rawtext).split()
        tone    = self.detecttone(words)
        intensity = self.calculateintensity(words, tone)
        valence   = self.calculatevalence(tone, intensity)
        arousal   = self.calculatearousal(words, intensity)

        return SentimentPoint(
            barindex=bar.index,
            tone=tone,
            intensity=intensity,
            valence=valence,
            arousal=arousal,
        )

    def buildsentimentarc(self, bars: list[Bar]) -> SentimentArc:
        """★ يبني القوس العاطفي الكامل"""
        if not bars:
            return self.emptyarc()

        points = [self.analyzebarsentiment(b) for b in bars]
        tensioncurve = [p.arousal * p.intensity for p in points]

        dominant   = self.dominanttone(points)
        emrange   = self.emotionalrange(points)
        climaxbar = self.findclimax(tensioncurve)
        transitions = self.findtransitions(points)
        arcdesc   = self.describearc(tensioncurve, transitions)
        arcquality = self.evaluatearcquality(
            tensioncurve, transitions, emrange
        )

        return SentimentArc(
            points=points,
            dominanttone=dominant,
            emotionalrange=emrange,
            dramaticarc=arcdesc,
            climaxbar=climaxbar,
            tensioncurve=tensioncurve,
            arcquality=arcquality,
            transitions=transitions,
        )

    def generatearcvisualization(self, arc: SentimentArc) -> str:
        """★ تمثيل بصري نصي للقوس العاطفي"""
        if not arc.tensioncurve:
            return "لا توجد بيانات"

        BARS  = " ▁▂▃▄▅▆▇█"
        maxv = max(arc.tensioncurve) or 1.0
        mini  = "".join(BARS[int(v / maxv * 8)] for v in arc.tensioncurve[:32])

        lines = [
            f"◈ القوس الدرامي : {arc.dramaticarc}",
            f"◈ النبرة السائدة: {arc.dominanttone.value}",
            f"◈ نطاق المشاعر  : {arc.emotionalrange:.2f}",
            f"◈ بار الذروة    : #{arc.climaxbar}",
            f"◈ جودة القوس    : {arc.arcquality:.1f}/10",
            f"◈ منحنى التوتر  : {mini}",
        ]

        if arc.transitions:
            lines.append("◈ التحولات العاطفية:")
            for bari, fromtone, totone in arc.transitions[:5]:
                lines.append(
                    f"   بار {bari}: {fromtone.value} ──▶ {totone.value}"
                )
        return "\n".join(lines)

    # ─── Private ──────────────────────────────────────────────────────────────

    def detecttone(self, words: list[str]) -> EmotionalTone:
        wordset = set(words)
        scores: dict[EmotionalTone, int] = {}
        for tone, lexicon in EMOTIONLEXICON.items():
            scores[tone] = len(wordset & set(lexicon))
        best = max(scores, key=lambda t: scores[t])
        return best if scores[best] > 0 else EmotionalTone.NEUTRAL

    def calculateintensity(self, words: list[str], tone: EmotionalTone) -> float:
        wordset = set(words)
        lexicon  = set(EMOTIONLEXICON.get(tone, []))
        base     = len(wordset & lexicon) / max(len(words), 1)
        amplifier = 0.2 if wordset & self.INTENSITYAMPLIFIERS else 0.0
        dampener  = -0.1 if wordset & self.INTENSITYDAMPENERS else 0.0
        return round(min(1.0, max(0.0, base * 3.0 + amplifier + dampener)), 3)

    @staticmethod
    def calculatevalence(tone: EmotionalTone, intensity: float) -> float:
        VALENCEMAP = {
            EmotionalTone.AGGRESSIVE:    -0.6,
            EmotionalTone.MELANCHOLIC:   -0.8,
            EmotionalTone.TRIUMPHANT:    +0.9,
            EmotionalTone.INTROSPECTIVE: +0.1,
            EmotionalTone.DEFIANT:       -0.2,
            EmotionalTone.EUPHORIC:      +0.95,
            EmotionalTone.NEUTRAL:       +0.0,
        }
        return round(VALENCEMAP.get(tone, 0.0) * intensity, 3)

    @staticmethod
    def calculatearousal(words: list[str], intensity: float) -> float:
        escalation = sum(1 for w in words if w in ESCALATIONMARKERS)
        deescal   = sum(1 for w in words if w in DEESCALATIONMARKERS)
        base = intensity * 0.7 + min(escalation * 0.1, 0.3)
        base -= min(deescal * 0.05, 0.2)
        return round(min(1.0, max(0.0, base)), 3)

    @staticmethod
    def dominanttone(points: list[SentimentPoint]) -> EmotionalTone:
        counts = Counter(p.tone for p in points)
        return counts.most_common(1)[0][0]

    @staticmethod
    def emotionalrange(points: list[SentimentPoint]) -> float:
        if len(points) < 2:
            return 0.0
        valences = [p.valence for p in points]
        return round(max(valences) - min(valences), 3)

    @staticmethod
    def findclimax(curve: list[float]) -> int:
        if not curve:
            return 0
        return curve.index(max(curve))

    @staticmethod
    def findtransitions(
        points: list[SentimentPoint],
    ) -> list[tuple[int, EmotionalTone, EmotionalTone]]:
        transitions = []
        for i in range(1, len(points)):
            if points[i].tone != points[i - 1].tone:
                transitions.append((
                    points[i].barindex,
                    points[i - 1].tone,
                    points[i].tone,
                ))
        return transitions

    @staticmethod
    def describearc(
        curve: list[float],
        transitions: list[tuple],
    ) -> str:
        if not curve:
            return "غير محدد"
        firsthalf  = sum(curve[: len(curve) // 2]) / max(len(curve) // 2, 1)
        secondhalf = sum(curve[len(curve) // 2 :]) / max(len(curve) - len(curve) // 2, 1)
        peakpos    = curve.index(max(curve)) / max(len(curve), 1)

        if peakpos < 0.3:
            return "تصاعدي مع تراجع — ذروة مبكرة ثم انحدار تأملي"
        elif peakpos > 0.7:
            return "بناء تدريجي — تصاعد مستمر نحو ذروة في النهاية"
        elif secondhalf > firsthalf * 1.2:
            return "U-Shape — انطلاق قوي، تراجع، ثم صعود ختامي"
        elif abs(secondhalf - firsthalf) < 0.1:
            return "مستوي — طاقة متسقة طوال الأغنية"
        else:
            return "جبلي كلاسيكي — بناء، ذروة، وهبوط مدروس"

    @staticmethod
    def evaluatearcquality(
        curve: list[float],
        transitions: list[tuple],
        emrange: float,
    ) -> float:
        if not curve:
            return 0.0
        # التنوع العاطفي مكافأة
        varietyscore = min(len(transitions) * 0.8, 3.0)
        # نطاق عاطفي واسع مكافأة
        rangescore   = emrange * 3.0
        # وجود ذروة واضحة مكافأة
        maxv  = max(curve)
        meanv = sum(curve) / len(curve)
        peakprominence = (maxv - meanv) * 4.0
        total = varietyscore + rangescore + peakprominence
        return round(min(total, 10.0), 3)

    @staticmethod
    def emptyarc() -> SentimentArc:
        return SentimentArc(
            points=[], dominanttone=EmotionalTone.NEUTRAL,
            emotionalrange=0.0, dramaticarc="لا توجد بيانات",
            climaxbar=0, tensioncurve=[], arcquality=0.0, transitions=[],
        )
