interface Props {
  dataPoints: number;
  lastUpdate: string;
}

export default function StatsOverview({ dataPoints, lastUpdate }: Props) {
  return (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-lg shadow-lg p-6">
        <div className="text-3xl font-bold">{dataPoints}</div>
        <div className="text-purple-100 mt-1">Kỳ Quay Được Phân Tích</div>
      </div>
      
      <div className="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-lg shadow-lg p-6">
        <div className="text-3xl font-bold">4</div>
        <div className="text-green-100 mt-1">Phương Pháp Thống Kê</div>
      </div>
      
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg shadow-lg p-6">
        <div className="text-lg font-bold">{new Date(lastUpdate).toLocaleString('vi-VN')}</div>
        <div className="text-blue-100 mt-1">Cập Nhật Lần Cuối</div>
      </div>
    </div>
  );
}
