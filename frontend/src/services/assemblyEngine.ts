import { EncodedBar } from '../types/accent';

export class AssemblyEngine {
  public static assemble3Plus1(bars: EncodedBar[]): EncodedBar[] {
    const setup = bars.filter(b =>
      b.fingerprint.dominantFoot !== 'Spondee' &&
      b.fingerprint.syllableCount <= 12
    );

    const punch = bars.filter(b =>
      b.fingerprint.dominantFoot === 'Spondee'
    );

    return [
      ...setup.slice(0, 3),
      punch[0]
    ].filter(Boolean) as EncodedBar[];
  }

  public static applyABAB(bars: EncodedBar[]): EncodedBar[] {
    const grouped = new Map<string, EncodedBar[]>();

    bars.forEach(bar => {
      const key = bar.fingerprint.bits.slice(-2).join('');
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(bar);
    });

    const keys = Array.from(grouped.keys());

    if (keys.length < 2) return bars;

    return [
      grouped.get(keys[0])?.[0],
      grouped.get(keys[1])?.[0],
      grouped.get(keys[0])?.[1],
      grouped.get(keys[1])?.[1],
    ].filter(Boolean) as EncodedBar[];
  }
}
