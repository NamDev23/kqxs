import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getOrCreateProductPrediction,
  getRuntimeTarget,
  loadProductAnalysis
} from '@/lib/prediction-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const runtimeTarget = getRuntimeTarget();
    const requestedTarget = typeof req.query.date === 'string'
      ? req.query.date
      : runtimeTarget.targetDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedTarget) || Number.isNaN(new Date(`${requestedTarget}T00:00:00.000Z`).getTime())) {
      return res.status(400).json({ success: false, error: 'date must use a valid YYYY-MM-DD value' });
    }
    const analysis = requestedTarget === runtimeTarget.targetDate
      ? (await getOrCreateProductPrediction(runtimeTarget)).analysis
      : await loadProductAnalysis(requestedTarget);

    res.status(200).json({
      success: true,
      data: {
        predictions: analysis.sets,
        prediction: analysis.prediction,
        sets: analysis.sets,
        singles: analysis.singles,
        frequency: analysis.analysis.frequency,
        hotCold: analysis.analysis.hotCold,
        backtest: analysis.backtest,
        dataQuality: analysis.dataQuality,
        lastUpdate: analysis.meta.generatedAt,
        dataPoints: analysis.dataQuality.dataPoints,
        method: analysis.meta.method
      }
    });
  } catch (error) {
    console.error('Analysis API Error:', error);
    res.status(500).json({ success: false, error: 'Analysis failed' });
  }
}
