import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { buildModelOutcomeMonitor } from '@/lib/model-outcome-monitor';
import { PRODUCT_METHOD } from '@/lib/product-prediction-engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const days = clamp(Number(req.query.days ?? 180), 30, 365);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);
    const [evaluations, reviews] = await Promise.all([
      prisma.predictionEvaluation.findMany({
        where: {
          method: PRODUCT_METHOD,
          issuedBeforeDraw: true,
          date: { gte: since }
        },
        orderBy: [{ date: 'asc' }, { issuedAt: 'asc' }]
      }),
      prisma.modelReview.findMany({
        where: { method: PRODUCT_METHOD },
        orderBy: { reviewDate: 'desc' },
        take: 12
      })
    ]);
    const monitor = buildModelOutcomeMonitor(evaluations);

    res.status(200).json({
      success: true,
      method: PRODUCT_METHOD,
      windowDays: days,
      monitor,
      reviews: reviews.map((review) => ({
        reviewDate: review.reviewDate.toISOString().slice(0, 10),
        dataThrough: review.dataThrough.toISOString().slice(0, 10),
        liveDays: review.liveDays,
        status: review.status,
        decision: review.decision,
        stabilityMetrics: review.stabilityMetrics
      }))
    });
  } catch (error) {
    console.error('Model performance API error:', error);
    res.status(500).json({ success: false, error: 'Failed to load model performance' });
  }
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
