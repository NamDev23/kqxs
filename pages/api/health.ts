import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { PRODUCT_METHOD } from '@/lib/product-prediction-engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const [latest, resultCount, latestPrediction, latestEvaluation, latestReview] = await Promise.all([
      prisma.lotteryResult.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true }
      }),
      prisma.lotteryResult.count(),
      prisma.prediction.findFirst({
        where: { method: PRODUCT_METHOD },
        orderBy: [{ predictionFor: 'desc' }, { createdAt: 'desc' }],
        select: { predictionFor: true, createdAt: true, snapshotHash: true }
      }),
      prisma.predictionEvaluation.findFirst({
        where: { method: PRODUCT_METHOD, issuedBeforeDraw: true },
        orderBy: [{ date: 'desc' }, { issuedAt: 'asc' }],
        select: { date: true }
      }),
      prisma.modelReview.findFirst({
        where: { method: PRODUCT_METHOD },
        orderBy: { reviewDate: 'desc' },
        select: { reviewDate: true, liveDays: true, status: true, decision: true }
      })
    ]);
    const today = vietnamDateKey();
    const latestDate = latest?.date.toISOString().slice(0, 10) ?? null;
    const lagDays = latestDate ? daysBetween(latestDate, today) : null;
    const predictionFor = latestPrediction?.predictionFor.toISOString().slice(0, 10) ?? null;
    const predictionReady = Boolean(predictionFor && predictionFor >= today);
    const dataReady = lagDays !== null && lagDays <= 1;

    res.status(200).json({
      ok: true,
      status: dataReady && predictionReady ? 'ready' : 'degraded',
      database: 'connected',
      method: PRODUCT_METHOD,
      data: {
        resultCount,
        latestDate,
        lagDays
      },
      prediction: {
        ready: predictionReady,
        predictionFor,
        issuedAt: latestPrediction?.createdAt ?? null,
        snapshotHash: latestPrediction?.snapshotHash?.slice(0, 12) ?? null
      },
      evaluation: {
        latestEligibleDate: latestEvaluation?.date.toISOString().slice(0, 10) ?? null
      },
      modelReview: latestReview
        ? {
            reviewDate: latestReview.reviewDate.toISOString().slice(0, 10),
            liveDays: latestReview.liveDays,
            status: latestReview.status,
            decision: latestReview.decision
          }
        : null,
      gates: { dataReady, predictionReady },
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      ok: false,
      status: 'unavailable',
      database: 'disconnected',
      checkedAt: new Date().toISOString()
    });
  }
}

function vietnamDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function daysBetween(from: string, to: string) {
  return Math.round(
    (new Date(`${to}T00:00:00.000Z`).getTime() - new Date(`${from}T00:00:00.000Z`).getTime()) /
      86_400_000
  );
}
