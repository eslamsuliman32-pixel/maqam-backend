"""
★ محرك مصفوفة القوافي ثلاثية الأبعاد
يُمثّل شبكة القوافي كـ graph ويكشف الأنماط المعقدة:
• القوافي الفسيفسائية (Mosaic)
• القوافي متعددة المقاطع
• كثافة الشبكة الصوتية
"""
from __future__ import annotations
import re
from dataclasses import dataclass, field
from collections import defaultdict
from typing import NamedTuple
import math

from .models import Bar, RhymeNode, RhymeType
from .phonetics import normalizearabic, sonicsimilarity, extractconsonants

# ══════════════════════════════════════════════════════════════════════════════

class RhymeEdge(NamedTuple):
    nodea:     int    # barindex
    nodeb:     int
    worda:     str
    wordb:     str
    rhymetype: RhymeType
    strength:   float

@dataclass
class RhymeMatrix:
    """★ المصفوفة الكاملة لشبكة القوافي"""
    nodes:              list[RhymeNode]
    edges:              list[RhymeEdge]
    density:            float           # كثافة الشبكة 0–1
    mosaiccount:       int             # عدد القوافي الفسيفسائية
    triplecount:       int             # عدد القوافي الثلاثية
    strongestchain:    list[int]       # سلسلة البارات الأقوى ارتباطًا
    networkscore:      float           # درجة الشبكة الكلية 0–10

    def toadjacencydict(self) -> dict[int, list[int]]:
        """يُحوّل الشبكة إلى قاموس تجاور"""
        adj: dict[int, list[int]] = defaultdict(list)
        for edge in self.edges:
            adj[edge.nodea].append(edge.nodeb)
            adj[edge.nodeb].append(edge.nodea)
        return dict(adj)

@dataclass
class MultisyllabicRhyme:
    """★ قافية متعددة المقاطع"""
    barindexa: int
    barindexb: int
    phrasea:    str    # العبارة الكاملة
    phraseb:    str
    syllablecount: int  # عدد المقاطع المتطابقة
    strength:    float

# ══════════════════════════════════════════════════════════════════════════════

class RhymeMatrixEngine:
    """
    ★ محرك مصفوفة القوافي — يبني شبكة قوافي كاملة ويحللها
    """

    RHYMETHRESHOLD        = 0.55
    STRONGRHYMETHRESHOLD = 0.80
    MOSAICMINSYLLABLES   = 2     # حد أدنى للقافية الفسيفسائية

    # ─── Public API ───────────────────────────────────────────────────────────

    def buildmatrix(self, bars: list[Bar]) -> RhymeMatrix:
        """يبني مصفوفة القوافي الكاملة"""
        nodes = self.buildnodes(bars)
        edges = self.buildedges(nodes, bars)

        density       = self.calculatedensity(len(nodes), len(edges))
        mosaic        = self.countmosaicrhymes(bars)
        triple        = self.counttriplerhymes(bars)
        chain         = self.findstrongestchain(edges, len(bars))
        networkscore = self.calculatenetworkscore(
            density, mosaic, triple, len(edges)
        )

        return RhymeMatrix(
            nodes=nodes,
            edges=edges,
            density=density,
            mosaiccount=mosaic,
            triplecount=triple,
            strongestchain=chain,
            networkscore=networkscore,
        )

    def findmultisyllabicrhymes(
        self, bars: list[Bar], minsyllables: int = 2
    ) -> list[MultisyllabicRhyme]:
        """★ يكتشف القوافي متعددة المقاطع بين البارات"""
        results: list[MultisyllabicRhyme] = []

        for i, bara in enumerate(bars):
            phrasesa = self.extractrhymephrases(bara.rawtext, minsyllables)

            for barb in bars[i + 1: i + 6]:
                phrasesb = self.extractrhymephrases(barb.rawtext, minsyllables)

                for pa in phrasesa:
                    for pb in phrasesb:
                        score = self.phrasesimilarity(pa, pb)
                        if score >= self.RHYMETHRESHOLD:
                            syllables = min(
                                self.countsyllablesinphrase(pa),
                                self.countsyllablesinphrase(pb),
                            )
                            if syllables >= minsyllables:
                                results.append(MultisyllabicRhyme(
                                    barindexa=bara.index,
                                    barindexb=barb.index,
                                    phrasea=pa,
                                    phraseb=pb,
                                    syllablecount=syllables,
                                    strength=round(score, 3),
                                ))
        return sorted(results, key=lambda x: x.strength, reverse=True)

    def generaterhymevisualization(self, matrix: RhymeMatrix) -> str:
        """★ يُنشئ تمثيلًا بصريًا نصيًا لشبكة القوافي"""
        if not matrix.nodes:
            return "لا توجد بيانات"

        lines: list[str] = []
        lines.append("╔══ شبكة القوافي ══╗")

        adj = matrix.toadjacencydict()
        maxbar = max(n.barindex for n in matrix.nodes) + 1

        for i in range(min(maxbar, 20)):   # أول 20 بار
            connections = adj.get(i, [])
            connstr = " → ".join(f"[{c}]" for c in sorted(connections)[:5])
            strengthbar = self.minibar(
                len(connections) / max(maxbar, 1)
            )
            lines.append(f"  بار {i:>3}: {strengthbar} {connstr}")

        lines.append(f"╚══ كثافة الشبكة: {matrix.density:.3f} ║ درجة: {matrix.networkscore:.2f}/10 ══╝")
        return "\n".join(lines)

    # ─── Private ──────────────────────────────────────────────────────────────

    def buildnodes(self, bars: list[Bar]) -> list[RhymeNode]:
        nodes: list[RhymeNode] = []
        for bar in bars:
            words = bar.rawtext.split()
            for pos, word in enumerate(words):
                norm = normalizearabic(word)
                if len(norm) >= 2:
                    tail = extractconsonants(norm)[-2:] if len(extractconsonants(norm)) >= 2 else norm
                    nodes.append(RhymeNode(
                        word=norm,
                        barindex=bar.index,
                        position=pos,
                        phonemetail=tail,
                        strength=1.0,
                    ))
        return nodes

    def buildedges(
        self, nodes: list[RhymeNode], bars: list[Bar]
    ) -> list[RhymeEdge]:
        edges: list[RhymeEdge] = []
        endwords = [(b.index, b.rawtext.split()[-1] if b.rawtext.split() else "") for b in bars]

        for i, (idxa, worda) in enumerate(endwords):
            for idxb, wordb in endwords[i + 1: i + 8]:
                if not worda or not wordb:
                    continue
                score = sonicsimilarity(worda, wordb)
                if score >= self.RHYMETHRESHOLD:
                    rtype = (
                        RhymeType.ENDRHYME
                        if score >= self.STRONGRHYMETHRESHOLD
                        else RhymeType.NEARRHYME
                    )
                    edges.append(RhymeEdge(
                        nodea=idxa, nodeb=idxb,
                        worda=worda, wordb=wordb,
                        rhymetype=rtype, strength=round(score, 3),
                    ))
        return edges

    @staticmethod
    def calculatedensity(nodecount: int, edgecount: int) -> float:
        if nodecount < 2:
            return 0.0
        maxedges = nodecount * (nodecount - 1) / 2
        return round(min(edgecount / maxedges, 1.0), 4)

    def countmosaicrhymes(self, bars: list[Bar]) -> int:
        """يعد القوافي الفسيفسائية (متعددة المقاطع ≥2)"""
        return len(self.findmultisyllabicrhymes(bars, minsyllables=2))

    def counttriplerhymes(self, bars: list[Bar]) -> int:
        """يعد القوافي الثلاثية (3 نقاط قافية في بار واحد)"""
        count = 0
        for bar in bars:
            words = bar.rawtext.split()
            if len(words) < 6:
                continue
            # تقسيم البار لثلاثة أثلاث وفحص القافية
            third = len(words) // 3
            w1 = words[third - 1] if third > 0 else ""
            w2 = words[2 * third - 1] if 2 * third > 0 else ""
            w3 = words[-1]
            if w1 and w2 and w3:
                s12 = sonicsimilarity(w1, w2)
                s23 = sonicsimilarity(w2, w3)
                if s12 >= self.RHYMETHRESHOLD and s23 >= self.RHYMETHRESHOLD:
                    count += 1
        return count

    @staticmethod
    def findstrongestchain(edges: list[RhymeEdge], barcount: int) -> list[int]:
        """يجد أطول سلسلة بارات مترابطة بالقوافي"""
        if not edges:
            return []
        adj: dict[int, list[tuple[int, float]]] = defaultdict(list)
        for e in edges:
            adj[e.nodea].append((e.nodeb, e.strength))
            adj[e.nodeb].append((e.nodea, e.strength))

        bestchain: list[int] = []
        visited = set()

        def dfs(node: int, chain: list[int]) -> None:
            nonlocal bestchain
            chain.append(node)
            if len(chain) > len(bestchain):
                bestchain = chain[:]
            visited.add(node)
            for neighbor, _ in sorted(adj[node], key=lambda x: x[1], reverse=True):
                if neighbor not in visited:
                    dfs(neighbor, chain)
            chain.pop()
            visited.discard(node)

        for start in range(min(barcount, 10)):
            if start in adj:
                dfs(start, [])

        return bestchain

    @staticmethod
    def calculatenetworkscore(
        density: float, mosaic: int, triple: int, edgecount: int
    ) -> float:
        score = (
            density * 3.0
            + min(mosaic * 0.5, 3.0)
            + min(triple * 0.7, 2.0)
            + min(edgecount * 0.1, 2.0)
        )
        return round(min(score, 10.0), 3)

    @staticmethod
    def extractrhymephrases(text: str, minsyllables: int) -> list[str]:
        """يستخرج العبارات القابلة للقافية من النص"""
        words = normalizearabic(text).split()
        phrases: list[str] = []
        for size in range(minsyllables, min(5, len(words) + 1)):
            for i in range(len(words) - size + 1):
                phrase = " ".join(words[i: i + size])
                phrases.append(phrase)
        return phrases

    @staticmethod
    def phrasesimilarity(p1: str, p2: str) -> float:
        """يحسب تشابه عبارتين"""
        words1 = p1.split()
        words2 = p2.split()
        if not words1 or not words2:
            return 0.0
        scores = [
            sonicsimilarity(w1, w2)
            for w1, w2 in zip(reversed(words1), reversed(words2))
        ]
        return sum(scores) / len(scores) if scores else 0.0

    @staticmethod
    def countsyllablesinphrase(phrase: str) -> int:
        from .phonetics import VOWELCARRIERS
        return sum(1 for c in phrase if c in VOWELCARRIERS)

    @staticmethod
    def minibar(value: float, width: int = 10) -> str:
        filled = int(value * width)
        return "█" * filled + "░" * (width - filled)
