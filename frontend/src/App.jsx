import { useState } from "react";
import History from "./pages/History";
import Teacher from "./pages/Teacher.jsx";
import Student from "./pages/Student.jsx";

const ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
};

function App() {
  const [role, setRole] = useState(null);

  const renderContent = () => {
    if (role === ROLES.TEACHER) return <Teacher />;
    if (role === ROLES.STUDENT) return <Student />;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-3xl bg-white shadow-xl rounded-2xl px-10 py-12">
          <p className="text-xs font-semibold tracking-[0.2em] text-purple-600 mb-4 text-center">
            INTERVIEW POLL
          </p>
          <h1 className="text-center text-3xl font-semibold mb-2">
            Welcome to the <span className="font-bold">Live Polling System</span>
          </h1>
          <p className="text-center text-gray-500 mb-8 max-w-xl mx-auto text-sm">
            Please select the role that best describes you to begin using the live
            polling system.
          </p>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <button
              className="flex-1 border border-slate-200 rounded-xl px-6 py-5 text-left hover:border-purple-500 transition"
              onClick={() => setRole(ROLES.STUDENT)}
            >
              <div className="font-semibold mb-1">I&apos;m a Student</div>
              <p className="text-xs text-gray-500">
                Submit answers and view live poll results in real-time.
              </p>
            </button>
            <button
              className="flex-1 border border-slate-200 rounded-xl px-6 py-5 text-left hover:border-purple-500 transition"
              onClick={() => setRole(ROLES.TEACHER)}
            >
              <div className="font-semibold mb-1">I&apos;m a Teacher</div>
              <p className="text-xs text-gray-500">
                Create and manage polls, ask questions, and monitor responses in
                real-time.
              </p>
            </button>
          </div>

          <div className="flex justify-center">
            <button
              className="px-10 py-2.5 rounded-full bg-purple-600 text-white text-sm font-semibold shadow-sm hover:bg-purple-700 transition"
              onClick={() => {
                if (!role) {
                  setRole(ROLES.STUDENT);
                }
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {renderContent()}
      {role && role === ROLES.TEACHER && (
        <div id="history-section" className="mt-16">
          <History />
        </div>
      )}
    </div>
  );
}

export default App;
