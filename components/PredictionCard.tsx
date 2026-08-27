import { PredictionResult } from '@/lib/statistical-analyzer';

interface Props {
  prediction: PredictionResult;
}

export default function PredictionCard({ prediction }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-600">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{prediction.method}</h3>
          <p className="text-sm text-gray-600 mt-1">{prediction.reasoning}</p>
        </div>
        <div className="bg-green-100 px-3 py-1 rounded-full">
          <span className="text-green-800 font-semibold text-sm">
            {(prediction.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-5 gap-2 mt-4">
        {prediction.numbers.map((num, idx) => (
          <div
            key={idx}
            className="bg-gradient-to-br from-red-500 to-red-700 text-white font-bold text-center py-3 rounded-lg shadow-sm"
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
}
