import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";

export default function ChatWidget({ role, userName }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat"); // 'chat' | 'participants'
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);

  const { emit, on } = useSocket();

  useEffect(() => {
    const offChat = on("chat:message", (payload) => {
      setMessages((prev) => [...prev, payload]);
    });

    const offStudents = on("teacher:students", (list) => {
      setParticipants(list || []);
    });

      if (role === "teacher") {
      emit("teacher:get_students");
    }

    return () => {
      offChat();
      offStudents();
    };
  }, [on, emit, role]);

  const sendMessage = () => {
    if (!message.trim()) return;
    emit("chat:message", {
      from: role,
      name: userName || (role === "teacher" ? "Teacher" : "User"),
      text: message.trim(),
    });
    setMessage("");
  };

  const kickStudent = (id) => {
    if (role !== "teacher") return;
    emit("teacher:kick_student", id);
  };

  return (
    <div className="fixed bottom-6 right-6 z-20">
      {open && (
        <div className="mb-3 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="flex text-xs border-b border-slate-200">
            <button
              className={`flex-1 py-2 text-center ${
                tab === "chat"
                  ? "bg-white font-semibold"
                  : "bg-slate-50 text-gray-500"
              }`}
              onClick={() => setTab("chat")}
            >
              Chat
            </button>
            <button
              className={`flex-1 py-2 text-center ${
                tab === "participants"
                  ? "bg-white font-semibold"
                  : "bg-slate-50 text-gray-500"
              }`}
              onClick={() => {
                setTab("participants");
                if (role === "teacher") emit("teacher:get_students");
              }}
            >
              Participants
            </button>
          </div>

          {tab === "chat" ? (
            <div className="flex flex-col h-64">
              <div className="flex-1 px-3 py-2 overflow-y-auto space-y-1 text-xs">
                {messages.length === 0 && (
                  <p className="text-gray-400 text-center mt-6">
                    Say hi to start the conversation.
                  </p>
                )}
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      m.name === userName ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-2 py-1 ${
                        m.name === userName
                          ? "bg-purple-600 text-white"
                          : "bg-slate-100 text-gray-800"
                      }`}
                    >
                      <div className="text-[10px] opacity-75 mb-0.5">
                        {m.name}
                      </div>
                      <div>{m.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 px-2 py-1.5 flex gap-1">
                <input
                  className="flex-1 border border-slate-200 rounded-md px-2 py-1 text-xs"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                />
                <button
                  onClick={sendMessage}
                  className="px-3 py-1 rounded-md bg-purple-600 text-white text-xs"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="h-64 px-3 py-2 overflow-y-auto text-xs">
              {participants.length === 0 && (
                <p className="text-gray-400 text-center mt-6">
                  No participants yet.
                </p>
              )}
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-1 border-b border-slate-100 last:border-b-0"
                >
                  <span>{p.name}</span>
                  {role === "teacher" && (
                    <button
                      onClick={() => kickStudent(p.id)}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      Kick out
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-11 h-11 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg"
        aria-label="Open chat"
      >
        💬
      </button>
    </div>
  );
}


