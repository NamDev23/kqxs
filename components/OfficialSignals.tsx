import React from 'react';
import type { buildSignalPublication } from '@/lib/signal-publication';

export default function OfficialSignals({ publication }: { publication?: ReturnType<typeof buildSignalPublication> }) {
  const products = publication?.status === 'qualified' ? publication.products : [];
  return (
    <section className="research-card p-5 lg:p-6">
      <div className="eyebrow">Quyết định phát tín hiệu · {publication?.targetDate ?? 'Chưa xác minh'}</div>
      <h2 className="mt-2 text-xl font-semibold text-ink">
        {products.length ? 'Danh mục vượt điều kiện kiểm định' : 'Không có tín hiệu đủ điều kiện'}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Không dùng số dự phòng khi thiếu bằng chứng. Tối thiểu 30 ngày chốt trước quay chỉ là điều kiện đầu vào, không bảo đảm mô hình có lợi thế.
      </p>
      {!products.length && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {(publication?.reasons ?? ['Chưa xác minh được quyết định phát tín hiệu.']).join(' ')}
      </div>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {products.map((product) => <article key={product.kind} className="rounded-xl border border-line p-4">
          <h3 className="font-semibold">{product.label}</h3>
          <p className="mt-2 text-lg font-bold tabular-nums">{product.selections.join(' · ')}</p>
          <p className="mt-2 text-xs text-muted">Theo dõi {product.forwardDays} ngày · ROI mô phỏng {product.forwardRoi?.toFixed(2)}%. Không phải xác suất trúng.</p>
        </article>)}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted">Dữ liệu thử nghiệm và dàn cũ nằm riêng trong mục Kiểm định. Không có cam kết trúng hoặc lợi nhuận.</p>
    </section>
  );
}
