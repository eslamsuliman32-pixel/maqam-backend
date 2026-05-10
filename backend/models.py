"""
نماذج البيانات الأساسية — الإصدار 2.0
إضافة: FlowDNA, RhymeNode, SentimentPoint, StyleFingerprint
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import re

# ══════════════════════════════════════════════════════════════════════════════
# Enums
# ══════════════════════════════════════════════════════════════════════════════

class SkillLevel(Enum):
    BEGINNER     = "مبتدئ"
    INTERMEDIATE = "متوسط"
    ADVANCED     = "متقدم"
    ELITE        = "نخبة"
    LEGENDARY    = "أسطوري"   # ★ مستوى جديد فوق النخبة

class TechniqueCategory(Enum):
    SONIC      = "صوتي"
    RHYTHMIC   = "إيقاعي"
    SEMANTIC   = "دلالي"
    NARRATIVE  = "سردي"
    HYBRID     = "هجين"
    EMOTIONAL  = "عاطفي"     # ★ جديد
    STRUCTURAL = "هيكلي"     # ★ جديد

class RhymeType(Enum):
    ENDRHYME      = "قافيةنهائية"
    INTERNALRHYME = "قافيةداخلية"
    MULTIRHYME    = "قافيةمتشابكة"
    NEARRHYME     = "قافيةتقريبية"
    ASSONANCE      = "تجانسحركي"
    CONSONANCE     = "تجانسساكن"
    MOSAICRHYME   = "قافيةفسيفساء"   # ★ قافية متعددة المقاطع
    TRIPLERHYME   = "قافيةثلاثية"    # ★ ثلاث نقاط قافية في بار واحد

class EmotionalTone(Enum):
    AGGRESSIVE   = "عدواني"
    MELANCHOLIC  = "حزين"
    TRIUMPHANT   = "منتصر"
    INTROSPECTIVE = "تأملي"
    DEFIANT      = "تحدي"
    EUPHORIC     = "نشوة"
    NEUTRAL      = "محايد"

class FlowStyle(Enum):
    STRAIGHT    = "مستقيم"
    DOUBLETIME = "مضاعف"
    TRIPLET     = "ثلاثي"
    HALFTIME   = "نصفي"
    SYNCOPATED  = "متشابك"
    POLYRHYTHM  = "متعددالإيقاع"
    RUBATO      = "حر"         # ★ تدفق خارج الإيقاع عمدًا

# ══════════════════════════════════════════════════════════════════════════════
# Core Data Models
# ══════════════════════════════════════════════════════════════════════════════

@dataclass(frozen=True)
class Syllable:
    text:        str
    phoneme:     str
    isstressed: bool  = False
    duration:    float = 1.0   # مدة نسبية (1.0 = طبيعي، 0.5 = سريع)
    weight:      float = 1.0

    def __post_init__(self) -> None:
        if not self.text.strip():
            raise ValueError("نص المقطع لا يمكن أن يكون فارغًا.")
        if not 0.0 <= self.weight <= 2.0:
            raise ValueError(f"الوزن يجب أن يكون بين 0 و2: {self.weight}")

@dataclass
class RhymeNode:
    """★ عقدة في شبكة القوافي — تُمثّل نقطة قافية واحدة"""
    word:       str
    barindex:  int
    position:   int          # موقع الكلمة في البار (0-based)
    phonemetail: str        # ذيل الصوتيم (مثل: "اب", "ير")
    strength:   float        # قوة القافية 0–1
    connections: list[int] = field(default_factory=list)  # barindices المرتبطة

@dataclass
class SentimentPoint:
    """★ نقطة في منحنى المشاعر"""
    barindex:     int
    tone:          EmotionalTone
    intensity:     float   # 0–1
    valence:       float   # -1 (سلبي) → +1 (إيجابي)
    arousal:       float   # 0 (هادئ) → 1 (متحمس)

@dataclass
class Bar:
    index:               int
    rawtext:            str
    syllables:           list[Syllable]  = field(default_factory=list)
    rhymescheme:        str             = ""
    flowpattern:        str             = ""
    flowstyle:          FlowStyle       = FlowStyle.STRAIGHT
    semanticdensity:    float           = 0.0
    sonicdensity:       float           = 0.0
    rhythmiccomplexity: float           = 0.0
    emotionaltone:      EmotionalTone   = EmotionalTone.NEUTRAL
    # ★ جديد
    multisyllabicrhymecount: int       = 0   # عدد القوافي متعددة المقاطع
    internalrhymedensity:    float     = 0.0
    breathpoints:             list[int] = field(default_factory=list)  # مواقع التنفس

    def __post_init__(self) -> None:
        if not isinstance(self.index, int) or self.index < 0:
            raise ValueError("مؤشر البار يجب أن يكون عددًا صحيحًا موجبًا.")
        text = self.rawtext.strip()
        if re.search(r"[<>\"';]", text):
            raise ValueError("النص يحتوي على رموز غير مسموح بها.")
        self.rawtext = text

    @property
    def wordcount(self) -> int:
        return len(self.rawtext.split())

    @property
    def syllablecount(self) -> int:
        return len(self.syllables)

    @property
    def compositescore(self) -> float:
        return round(
            0.40 * self.sonicdensity
            + 0.35 * self.rhythmiccomplexity
            + 0.25 * self.semanticdensity,
            3,
        )

    @property
    def elitescore(self) -> float:
        """★ درجة النخبة الموسّعة تشمل القوافي متعددة المقاطع"""
        base = self.compositescore
        bonus = min(self.multisyllabicrhymecount * 0.15, 1.5)
        return round(min(base + bonus, 10.0), 3)

@dataclass
class FlowDNA:
    """★ البصمة الجينية للتدفق — توقيع فريد لأسلوب الفنان"""
    artist:            str
    dominantstyle:    FlowStyle
    styledistribution: dict[str, float]   # % لكل نمط تدفق
    avgsyllablesperbar: float
    stresssignature:  str                 # نمط النبر المميز مثل "10101100"
    tempovariance:    float               # تباين السرعة 0–1
    uniquenessscore:  float               # 0–1
    comparableartists: list[str] = field(default_factory=list)

@dataclass
class StyleFingerprint:
    """★ البصمة الأسلوبية الكاملة للفنان"""
    artist:            str
    sonicsignature:   dict[str, float]    # أوزان المجموعات الصوتية
    semanticclusters: list[str]           # الحقول الدلالية المفضلة
    flowdna:          FlowDNA | None      = None
    rhymecomplexity:  float               = 0.0   # مؤشر تعقيد القوافي
    vocabularyrichness: float             = 0.0   # ثراء المفردات
    originalityindex: float               = 0.0   # مؤشر الأصالة 0–1

@dataclass
class Verse:
    versetype:    str
    bars:          list[Bar]       = field(default_factory=list)
    overallarc:   str             = ""
    tensioncurve: list[float]     = field(default_factory=list)  # ★ منحنى التوتر
    dominanttone: EmotionalTone   = EmotionalTone.NEUTRAL         # ★

    def __post_init__(self) -> None:
        allowed = {"verse", "hook", "bridge", "outro", "intro"}
        if self.versetype not in allowed:
            raise ValueError(
                f"نوع المقطع '{self.versetype}' غير مدعوم. المسموح: {allowed}"
            )

    def averagecompositescore(self) -> float:
        if not self.bars:
            return 0.0
        return round(sum(b.compositescore for b in self.bars) / len(self.bars), 3)

    def peakbar(self) -> Bar | None:
        """★ يُعيد البار الأعلى درجةً في المقطع"""
        return max(self.bars, key=lambda b: b.elitescore) if self.bars else None

@dataclass
class Track:
    title:   str
    artist:  str
    verses:  list[Verse]    = field(default_factory=list)
    bpm:     Optional[int]  = None
    key:     Optional[str]  = None
    # ★ جديد
    genretags:    list[str] = field(default_factory=list)
    referenceartists: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.title  = self.title.strip()[:120]
        self.artist = self.artist.strip()[:80]
        if self.bpm is not None and not (40 <= self.bpm <= 300):
            raise ValueError(f"BPM خارج النطاق (40–300): {self.bpm}")

    @property
    def allbars(self) -> list[Bar]:
        return [bar for verse in self.verses for bar in verse.bars]

    @property
    def versesections(self) -> list[Verse]:
        return [v for v in self.verses if v.versetype == "verse"]

    @property
    def hooksections(self) -> list[Verse]:
        return [v for v in self.verses if v.versetype == "hook"]

    def trackscore(self) -> float:
        bars = self.allbars
        if not bars:
            return 0.0
        return round(sum(b.elitescore for b in bars) / len(bars), 3)

    def structuralbalance(self) -> float:
        """★ مؤشر التوازن الهيكلي بين الفيرسات والكورسات"""
        verses = len(self.versesections)
        hooks  = len(self.hooksections)
        if verses == 0:
            return 0.0
        idealratio = 2.0   # فيرسان لكل كورس مثالي
        actualratio = verses / max(hooks, 1)
        deviation = abs(actualratio - idealratio) / idealratio
        return round(max(0.0, 1.0 - deviation), 3)

@dataclass
class ArtistProfile:
    name:             str
    skilllevel:      SkillLevel
    strongareas:     list[TechniqueCategory] = field(default_factory=list)
    weakareas:       list[TechniqueCategory] = field(default_factory=list)
    styleindex:      float                   = 0.0
    tracksanalyzed:  int                     = 0
    fingerprint:      StyleFingerprint | None  = None   # ★
    goallevel:       SkillLevel               = SkillLevel.ELITE  # ★

    def __post_init__(self) -> None:
        if not 0.0 <= self.styleindex <= 1.0:
            raise ValueError("styleindex يجب بين 0 و1.")
