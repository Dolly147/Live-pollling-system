
import { useEffect, useState } from "react";
import Results from "../components/Results";

export default function History() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/polls/history")
      .then((res) => res.json())
      .then((data) => setHistory(data));
  }, []);

  return (
    <div className="max-w-3xl mx-auto mt-20 p-4">
      <h2 className="text-2xl font-bold mb-6">
        Poll History
      </h2>

      {history.length === 0 && (
        <p className="text-gray-500">
          No completed polls yet.
        </p>
      )}

      {history.map((poll, index) => (
        <div
          key={index}
          className="border rounded p-4 mb-6 bg-white shadow"
        >
          <h3 className="font-semibold mb-2">
            {poll.question}
          </h3>

          <p className="text-sm text-gray-500 mb-4">
            Total votes: {poll.totalVotes}
          </p>

          <Results results={poll.results} />
        </div>
      ))}
    </div>
  );
}
