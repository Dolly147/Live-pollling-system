import { useEffect, useState } from "react";
import { socket } from "../hooks/useSocket";
import { usePollTimer } from "../hooks/usePollTimer";
import Results from "../components/Results";

/**
 * Student Page
 */
export default function Student() {
  const [student, setStudent] = useState(() => {
    const savedStudent = sessionStorage.getItem("student");
    return savedStudent ? JSON.parse(savedStudent) : null;
  });
  const [nameInput, setNameInput] = useState("");
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    socket.on("student:registered", (student) => {
      sessionStorage.setItem("student", JSON.stringify(student));
      setStudent(student);
    });

    socket.on("poll:resume", setPoll);
    socket.on("poll:started", setPoll);
    socket.on("poll:results", setResults);

    socket.emit("get_active_poll");

    return () => socket.off();
  }, []);

  useEffect(() => {
    socket.on("poll:ended", (finalResults) => {
      setResults(finalResults);
      setSubmitted(true);
    });

    return () => socket.off("poll:ended");
  }, []);

  /**
   * Handle name submit
   */
  const submitName = () => {
    if (!nameInput.trim()) return;
    socket.emit("student:join", nameInput);
  };

  const time = usePollTimer(poll?.remainingTime ?? 0 );

  // If student not registered → show onboarding
  if (!student) {
    return (
      <div className="flex flex-col items-center mt-40">
        <h2 className="text-xl font-semibold mb-4">
          Enter your name
        </h2>
        <input
          className="border p-2 rounded w-64 mb-4"
          placeholder="Your name"
          onChange={(e) => setNameInput(e.target.value)}
        />
        <button
          onClick={submitName}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Join
        </button>
      </div>
    );
  }

  // No poll yet
  if (!poll) {
    return (
      <div className="text-center mt-40">
        Wait for the teacher to ask a question…
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-20 p-4">
      <h2 className="text-xl font-bold mb-4">
        {poll.question}
      </h2>

      {!submitted ? (
        <>
          {poll.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full border p-3 mb-2 rounded 
              ${selected === i ? "border-purple-600" : ""}`}
            >
              {opt}
            </button>
          ))}

          <button
          disabled={selected === null || time <= 0}
          className="bg-purple-600 text-white px-4 py-2 rounded w-full disabled:opacity-50">
          Submit
        </button>

        </>
      ) : (
        <Results results={results} />
      )}

      <p className="mt-4 text-gray-500 text-sm">
        Time left: {time}s
      </p>
    </div>
  );
}
