import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import { usePollTimer } from "../hooks/usePollTimer";
import Results from "../components/Results";
import ChatWidget from "../components/ChatWidget";


export default function Student() {
  const [student, setStudent] = useState(() => {
    const savedStudent = sessionStorage.getItem("student");
    return savedStudent ? JSON.parse(savedStudent) : null;
  });
  const [nameInput, setNameInput] = useState("");
  const [pollState, setPollState] = useState(null); // { poll, remainingTime, results }
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [kicked, setKicked] = useState(false);

  const { emit, on } = useSocket();

  useEffect(() => {
    const offRegistered = on("student:registered", (registered) => {
      sessionStorage.setItem("student", JSON.stringify(registered));
      setStudent(registered);
      // After successful registration, ask server for any active poll
      emit("get_active_poll");
    });

    const offResume = on("poll:resume", (state) => {
      if (!state || !state.poll) return;
      setPollState(state);
      setSubmitted(false);
      setSelected(null);
    });

    const offStarted = on("poll:started", (payload) => {
      setPollState({
        poll: payload.poll,
        remainingTime: payload.remainingTime,
        results: payload.results || [],
      });
      setSubmitted(false);
      setSelected(null);
    });

    const offResults = on("poll:update", (payload) => {
      setPollState((prev) =>
        prev
          ? {
              ...prev,
              results: payload.results || [],
            }
          : prev
      );
    });

    const offEnded = on("poll:ended", (finalResults) => {
      setPollState((prev) =>
        prev
          ? {
              ...prev,
              remainingTime: 0,
              results: finalResults || prev.results,
            }
          : prev
      );
      setSubmitted(true);
    });

    const offVoteError = on("vote:error", (e) => {
      setError(e.message || "Unable to submit vote.");
      setSubmitted(false);
    });

    const offKicked = on("student:kicked", (payload) => {
      if (payload && payload.studentId && payload.studentId !== student?.id)
        return;
      sessionStorage.removeItem("student");
      setStudent(null);
      setKicked(true);
    });

    emit("get_active_poll");

    return () => {
      offRegistered();
      offResume();
      offStarted();
      offResults();
      offEnded();
      offVoteError();
      offKicked();
    };
  }, [on, emit, student?.id]);

  const time = usePollTimer(pollState?.remainingTime ?? 0);

  const submitName = () => {
    if (!nameInput.trim()) return;
    emit("student:join", nameInput.trim());
    // Immediately request active poll so late joiners sync as soon as they enter.
    emit("get_active_poll");
  };

  const poll = pollState?.poll;

  if (kicked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow px-10 py-16 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-purple-600 mb-4">
            INTERVIEW POLL
          </p>
          <p className="text-2xl font-semibold mb-3">
            You&apos;ve been Kicked out !
          </p>
          <p className="text-sm text-gray-500">
            Looks like the teacher has removed you from the poll system. Please
            try again sometime.
          </p>
        </div>
      </div>
    );
  }

  // Onboarding
  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow px-10 py-12">
          <p className="text-xs font-semibold tracking-[0.2em] text-purple-600 mb-3 text-center">
            INTERVIEW POLL
          </p>
          <h2 className="text-3xl font-semibold text-center mb-2">
            Let&apos;s <span className="font-bold">Get Started</span>
          </h2>
          <p className="text-gray-500 text-sm text-center mb-8">
            If you&apos;re a student, you&apos;ll be able to submit your answers,
            participate in live polls, and see how your responses compare with
            your classmates.
          </p>

          <label className="block text-sm font-medium mb-2 text-gray-700 text-center">
            Enter your Name
          </label>
          <input
            className="border border-slate-200 rounded-lg px-4 py-2.5 w-full mb-6 text-sm"
            placeholder="Your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
          <div className="flex justify-center">
            <button
              onClick={submitName}
              className="px-10 py-2.5 rounded-full bg-purple-600 text-white text-sm font-semibold"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No poll
  if (!poll) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow px-10 py-16 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-purple-600 mb-4">
            INTERVIEW POLL
          </p>
          <p className="text-lg font-medium mb-2">
            Wait for the teacher to ask questions..
          </p>
        </div>
      </div>
    );
  }

  const hasTime = time > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow px-8 py-8 relative">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-semibold">Question 1</div>
          <div className="flex items-center gap-2 text-xs text-red-500">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            <span>{String(time).padStart(2, "0")}s</span>
          </div>
        </div>

        <div className="bg-slate-800 text-white rounded-t-lg px-4 py-3 text-sm mb-2">
          {poll.question}
        </div>

        {!submitted && hasTime ? (
          <div className="border-x border-b border-slate-200 rounded-b-lg p-4">
            {poll.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`w-full flex items-center gap-3 mb-2 px-3 py-2 rounded-lg border text-left text-sm ${
                  selected === i
                    ? "border-purple-600 bg-purple-50"
                    : "border-slate-200 hover:border-purple-400"
                }`}
              >
                <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-gray-500">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </button>
            ))}

            {error && (
              <p className="text-xs text-red-500 font-medium mt-2 mb-1">
                {error}
              </p>
            )}

            <button
              disabled={selected === null || !hasTime}
              onClick={() => {
                setSubmitted(true);
                setError("");
                emit("student:vote", {
                  pollId: poll.id,
                  studentId: student.id,
                  optionIndex: selected,
                });
              }}
              className="mt-4 w-full rounded-full bg-purple-600 text-white text-sm font-semibold py-2.5 disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        ) : (
          <div className="border-x border-b border-slate-200 rounded-b-lg p-4">
            <Results results={pollState?.results || []} />
            <p className="mt-4 text-center text-sm text-gray-500">
              Wait for the teacher to ask a new question..
            </p>
          </div>
        )}
        <ChatWidget role="student" userName={student.name} />
      </div>
    </div>
  );
}
