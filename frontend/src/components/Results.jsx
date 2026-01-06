
export default function Results({ results }) {
  return (
    <div className="mt-6 space-y-4">
      {results.map((r, i) => (
        <div key={i}>
          <div className="flex justify-between text-sm mb-1">
            <span>{r.option}</span>
            <span>{r.percentage}%</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-purple-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${r.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
