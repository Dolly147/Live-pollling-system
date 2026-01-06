import { useEffect, useState } from "react";
import { socket } from "../hooks/useSocket";
import Results from "../components/Results";

export default function Teacher() {
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    socket.on("poll:ended", setResults);
    return () => socket.off("poll:ended");
  }, []);
  const createPoll = () => {
    socket.emit("teacher:create_poll", {
      question,
      options: ["Mars", "Venus", "Jupiter", "Saturn"],
      duration: 60,
    });
  };

  return (
    <div className="max-w-xl mx-auto mt-20">
      <input
        className="border w-full p-2 rounded"
        placeholder="Enter question"
        onChange={(e) => setQuestion(e.target.value)}
      />

      <button
        onClick={createPoll}
        className="mt-4 bg-purple-600 text-white px-4 py-2 rounded w-full"
      >
        Ask Question
      </button>

      {results.length > 0 && <Results results={results} />}
    </div>
  );
}
