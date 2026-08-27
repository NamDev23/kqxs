import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { normalizeLotteryDraws } from '@/lib/product-prediction-engine';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const requestedDays = Number.parseInt(String(req.query.days ?? '30'), 10);
    const take = Math.min(Math.max(Number.isFinite(requestedDays) ? requestedDays : 30, 1), 730);
    const rows = await prisma.lotteryResult.findMany({
      orderBy: { date: 'desc' },
      take
    });
    const data = normalizeLotteryDraws(rows).sort((a, b) => b.date.localeCompare(a.date));

    res.status(200).json({
      success: true,
      data,
      total: data.length,
      source: 'database'
    });
  } catch (error) {
    console.error('History API Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
}
