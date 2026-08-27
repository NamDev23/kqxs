'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { FrequencyRow } from '@/lib/product-prediction-engine';

interface Props {
  data: FrequencyRow[];
}

export default function FrequencyChart({ data }: Props) {
  const chartData = data.slice(0, 15).map(d => ({
    number: d.number,
    count: d.count,
    percentage: d.percentage.toFixed(1)
  }));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">Tần suất lô 2 số</h3>
        <p className="text-sm text-slate-500">Top số xuất hiện trong dữ liệu thật, tính theo ngày có xuất hiện ít nhất một lần</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="number" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#0f172a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
