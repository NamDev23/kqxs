import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildRealtimeResponse,
  getOrCreateProductPrediction,
  getRuntimeTarget
} from '@/lib/prediction-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const target = getRuntimeTarget();
    const resolved = await getOrCreateProductPrediction(target);
    const { analysis, prediction, actualResult } = resolved;

    res.status(200).json({
      success: true,
      data: buildRealtimeResponse(
        analysis,
        resolved.target ?? target,
        prediction,
        actualResult ? { special: actualResult.special } : null
      )
    });
  } catch (error) {
    console.error('Today Prediction API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load today prediction'
    });
  }
}
