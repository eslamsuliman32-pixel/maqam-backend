import * as tf from '@tensorflow/tfjs';
import { useRepositoryStore } from '../store/repositoryStore';
import { 
  buildDataset, 
  createModel, 
  trainModel, 
  predictNextFingerprintVector, 
  decodePrediction 
} from './neuralTransitionModel';

let trainedModel: tf.Sequential | null = null;

/**
 * Trains the neural sequence engine on the current repository data.
 */
export const trainNeuralEngine = async (): Promise<void> => {
  const { bars } = useRepositoryStore.getState();
  if (bars.length < 2) return;

  const dataset = buildDataset(bars);
  const model = createModel();

  trainedModel = await trainModel(model, dataset);
};

/**
 * Predicts the next fingerprint code using the trained neural network.
 */
export const neuralPredictNext = (fingerprint: string): string | null => {
  if (!trainedModel) return null;

  const { bars } = useRepositoryStore.getState();
  const vec = predictNextFingerprintVector(trainedModel, fingerprint);
  return decodePrediction(vec, bars);
};
