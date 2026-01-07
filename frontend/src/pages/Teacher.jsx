import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import Results from "../components/Results";
import ChatWidget from "../components/ChatWidget";
import { usePollTimer } from "../hooks/usePollTimer";

export default function Teacher() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["Mars", "Venus", "Jupiter", "Saturn"]);
  const [duration, setDuration] = useState(60);
  const [activePoll, setActivePoll] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  const { on, emit } = useSocket();

  const timeLeft = usePollTimer(activePoll?.remainingTime ?? 0);

  useEffect(() => {
    const offStarted = on("poll:started", (payload) => {
      setError("");
      setActivePoll({
        ...payload.poll,
        remainingTime: payload.remainingTime,
      });
      setResults(payload.results || []);
    });

    const offUpdate = on("poll:update", (payload) => {
      setResults(payload.results || []);
    });

    const offEnded = on("poll:ended", (finalResults) => {
      setActivePoll(null);
      setResults(finalResults || []);
    });

    const offResume = on("poll:resume", (state) => {
      if (!state || !state.poll) return;
      setActivePoll({
        ...state.poll,
        remainingTime: state.remainingTime,
      });
      setResults(state.results || []);
    });

    const offPollError = on("poll:error", (e) => {
      setError(e.message || "Something went wrong.");
    });

    emit("get_active_poll");

    return () => {
      offStarted();
      offUpdate();
      offEnded();
      offResume();
      offPollError();
    };
  }, [on, emit]);

  const updateOption = (index, value) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const createPoll = () => {
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }
    if (options.some((o) => !o.trim())) {
      setError("Options cannot be empty.");
      return;
    }
    setError("");
    emit("teacher:create_poll", {
      question,
      options,
      duration,
    });
  };

  const isPollActive = !!activePoll && timeLeft > 0;

  const scrollToHistory = () => {
    const el = document.getElementById("history-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex justify-center pt-20 relative">
      <div className="w-full max-w-3xl px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-purple-600 mb-2">
              INTERVIEW POLL
            </p>
            <h2 className="text-3xl font-semibold mb-1">
              Let&apos;s <span className="font-bold">Get Started</span>
            </h2>
            <p className="text-gray-500 text-sm mb-8 max-w-xl">
              You&apos;ll have the ability to create and manage polls, ask questions,
              and monitor your students&apos; responses in real-time.
            </p>
          </div>
          <button
            onClick={scrollToHistory}
            className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold hover:bg-purple-200"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-purple-600" />
            View Poll history
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow px-6 py-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-semibold">
              Enter your question
            </label>
            <select
              className="border border-slate-200 rounded-md text-xs px-2 py-1"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={30}>30 seconds</option>
              <option value={45}>45 seconds</option>
              <option value={60}>60 seconds</option>
            </select>
          </div>

          <textarea
            className="w-full border border-slate-200 rounded-lg p-3 text-sm mb-4 resize-none"
            rows={3}
            placeholder="Type your question here..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <div className="mt-2">
            <p className="text-xs font-semibold mb-2 text-gray-600">
              Edit Options
            </p>
            {options.map((opt, index) => (
              <div key={index} className="flex items-center gap-3 mb-2">
                <span className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-xs text-gray-500">
                  {index + 1}
                </span>
                <input
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={opt}
                  onChange={(e) => updateOption(index, e.target.value)}
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-500 font-medium">{error}</p>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={createPoll}
              disabled={isPollActive}
              className="px-8 py-2.5 rounded-full bg-purple-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {isPollActive ? "Poll in Progress" : "Ask Question"}
            </button>
          </div>
        </div>

        {isPollActive && (
          <p className="text-sm text-gray-500 mb-4">
            Question is live. Time remaining:{" "}
            <span className="font-semibold text-red-500">{timeLeft}s</span>
          </p>
        )}

        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow px-6 py-6 mt-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-semibold">Live Results</h3>
                {activePoll && (
                  <span className="text-xs text-gray-500">
                    Question: {activePoll.question}
                  </span>
                )}
              </div>
              <button
                onClick={scrollToHistory}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold hover:bg-purple-200"
              >
                <span className="inline-block w-2 h-2 rounded-full bg-purple-600" />
                View Poll history
              </button>
            </div>
            <Results results={results} />
            {!isPollActive && (
              <div className="flex justify-center mt-6">
                <button
                  className="px-8 py-2.5 rounded-full bg-purple-600 text-white text-sm font-semibold"
                  onClick={() => {
                    setQuestion("");
                    setResults([]);
                    setActivePoll(null);
                  }}
                >
                  Ask a new question
                </button>
              </div>
            )}
          </div>
        )}

        <ChatWidget role="teacher" userName="Teacher" />
      </div>
    </div>
  );
}
