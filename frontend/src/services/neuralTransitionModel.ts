import * as tf from '@tensorflow/tfjs';
import { Bar } from '../store/repositoryStore';

/**
 * Encodes a fingerprint string into a fixed-size numeric vector.
 */
export const encodeFingerprint = (fp: string): number[] => {
  let hash = 0;
  for (let i = 0; i < fp.length; i++) {
    hash = (hash << 5) - hash + fp.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  // Map to fixed-size vector (16 bits)
  return new Array(16).fill(0).map((_, i) => ((hash >> (i % 16)) & 1));
};

export const buildDataset = (bars: Bar[]) => {
  const xs: number[][] = [];
  const ys: number[][] = [];

  for (let i = 0; i < bars.length - 1; i++) {
    const current = encodeFingerprint(bars[i].fingerprintCode || '');
    const next = encodeFingerprint(bars[i + 1].fingerprintCode || '');

    xs.push(current);
    ys.push(next);
  }

  return {
    xs: tf.tensor2d(xs),
    ys: tf.tensor2d(ys)
  };
};

export const createModel = (): tf.Sequential => {
  const model = tf.sequential();

  model.add(tf.layers.dense({ inputShape: [16], units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 16, activation: 'sigmoid' }));

  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: 'meanSquaredError'
  });

  return model;
};

export const trainModel = async (model: tf.Sequential, dataset: { xs: tf.Tensor2D, ys: tf.Tensor2D }): Promise<tf.Sequential> => {
  await model.fit(dataset.xs, dataset.ys, {
    epochs: 25,
    batchSize: 8,
    shuffle: true
  });

  return model;
};

export const predictNextFingerprintVector = (model: tf.LayersModel, fingerprint: string): Float32Array | Int32Array | Uint8Array => {
  const input = tf.tensor2d([encodeFingerprint(fingerprint)]);
  const output = model.predict(input) as tf.Tensor;
  return output.dataSync();
};

/**
 * Closest match between a predicted vector and real fingerprints in the repository.
 */
export const decodePrediction = (vector: Float32Array | Int32Array | Uint8Array, bars: Bar[]): string | null => {
  const distance = (a: number[], b: Float32Array | Int32Array | Uint8Array) => {
    return a.reduce((acc, v, i) => acc + Math.abs(v - b[i]), 0);
  };

  let best: string | null = null;
  let min = Infinity;

  const uniqueFPs = Array.from(new Set(bars.map(b => b.fingerprintCode).filter(Boolean)));

  uniqueFPs.forEach(fp => {
    const enc = encodeFingerprint(fp!);
    const d = distance(enc, vector);
    if (d < min) {
      min = d;
      best = fp!;
    }
  });

  return best;
};
