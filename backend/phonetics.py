"""
★ المحلل الصوتي واللفظي (Phonetics)
يقوم بتحليل الكلمات العربية واستخراج الحروف الصوتية وحروف العلة
"""

import re
from typing import List, Tuple

VOWELCARRIERS = ["ا", "و", "ي", "ى", "ئ", "ؤ", "ء"]

def normalizearabic(text: str) -> str:
    """تنظيف النص وتوحيد أشكال الحروف"""
    text = re.sub(r"[أإآ]", "ا", text)
    text = re.sub(r"ة", "ه", text)
    text = re.sub(r"ى", "ي", text)
    text = re.sub(r"ّ", "", text) # إزالة الشدة
    text = re.sub(r"[ًٌٍَُِْ]", "", text) # إزالة التشكيل
    text = re.sub(r"[^\w\s]", "", text) # إزالة علامات الترقيم
    return text.strip()

def extract_end_rhyme(word: str) -> str:
    """استخراج القافية النهائية للكلمة"""
    if not word: return ""
    norm = normalizearabic(word)
    if len(norm) <= 2: return norm
    # ابحث عن آخر حرف علة وما بعده
    for i in range(len(norm)-1, -1, -1):
        if norm[i] in VOWELCARRIERS:
            # خذ العلة وما بعدها، وإذا كان آخر حرف، خذ الحرف الذي قبله أيضاً
            if i == len(norm) - 1 and len(norm) >= 2:
                return norm[i-1:]
            return norm[i:]
    return norm[-2:] # افتراضي آخر حرفين

def detect_multi_syllable_rhyme(word1: str, word2: str) -> Tuple[bool, int]:
    """اكتشاف القوافي متعددة المقاطع بين كلمتين"""
    norm1 = normalizearabic(word1)
    norm2 = normalizearabic(word2)
    syls1 = get_syllables(norm1)
    syls2 = get_syllables(norm2)
    
    if len(syls1) < 2 or len(syls2) < 2:
        return False, 0
    
    match_count = 0
    min_len = min(len(syls1), len(syls2))
    
    # نقارن المقاطع من النهاية للبداية
    for i in range(1, min_len + 1):
        if syls1[-i] == syls2[-i]:
            match_count += 1
        else:
            break
            
    return match_count >= 2, match_count

def get_syllables(word: str) -> List[str]:
    """تقسيم الكلمة إلى مقاطع صوتية بشكل مبسط"""
    syllables = []
    current_syllable = ""
    for char in word:
        current_syllable += char
        if char in VOWELCARRIERS:
            syllables.append(current_syllable)
            current_syllable = ""
    if current_syllable:
        if syllables:
            syllables[-1] += current_syllable
        else:
            syllables.append(current_syllable)
    return syllables
