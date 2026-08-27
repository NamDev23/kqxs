interface Props {
  hot: { number: string; frequency: number }[];
  cold: { number: string; frequency: number }[];
}

export default function HotColdNumbers({ hot, cold }: Props) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="mb-1 text-lg font-semibold text-slate-950">Tăng tần suất gần đây</h3>
        <p className="mb-4 text-sm text-slate-500">30 kỳ gần nhất</p>
        <div className="grid grid-cols-5 gap-2">
          {hot.map((item, idx) => (
            <div key={idx} className="rounded border border-slate-200 bg-slate-50 px-2 py-3 text-center">
              <div className="font-bold tabular-nums text-slate-950">{item.number}</div>
              <div className="text-xs text-slate-500">{item.frequency}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="mb-1 text-lg font-semibold text-slate-950">Giảm tần suất gần đây</h3>
        <p className="mb-4 text-sm text-slate-500">Bao gồm cả số không xuất hiện trong 30 kỳ</p>
        <div className="grid grid-cols-5 gap-2">
          {cold.map((item, idx) => (
            <div key={idx} className="rounded border border-slate-200 bg-slate-50 px-2 py-3 text-center">
              <div className="font-bold tabular-nums text-slate-950">{item.number}</div>
              <div className="text-xs text-slate-500">{item.frequency}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
