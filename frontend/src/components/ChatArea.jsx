import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "../styles/Messages.css";
import { motion } from "framer-motion";

const socket = io("http://localhost:3000");

export default function ChatArea({ selectedContact }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // ✅ Fetch history when selecting a contact
  useEffect(() => {
    if (selectedContact) {
      axios
        .get(`http://localhost:3000/admin/messages/${selectedContact.wa_id}`)
        .then((res) => setMessages(res.data))
        .catch((err) => console.error("Error fetching messages:", err));
    }
  }, [selectedContact]);

  // ✅ Live updates
  useEffect(() => {
    // New message (temp OR incoming)
    socket.on("newMessage", (msg) => {
      if (selectedContact && msg.wa_id === selectedContact.wa_id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // TEMP → REAL replacement
    socket.on("replaceTempMessage", ({ tempId, realId, status }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === tempId ? { ...m, message_id: realId, status } : m
        )
      );
    });

    // Tick updates
    socket.on("messageStatusUpdate", ({ message_id, status }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === message_id ? { ...m, status } : m
        )
      );
    });

    return () => {
      socket.off("newMessage");
      socket.off("replaceTempMessage");
      socket.off("messageStatusUpdate");
    };
  }, [selectedContact]);

  // ✅ Send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // 🔥 Don’t push temp here (backend emits it instantly)
    await axios.post("http://localhost:3000/admin/send", {
      to: selectedContact.wa_id,
      text: newMessage,
    });

    setNewMessage("");
  };

  // ✅ Decide tick icon
  const getTickIcon = (status) => {
    switch (status) {
      case "pending":
        return "🕓"; // clock
      case "sent":
        return "✓"; // one tick
      case "delivered":
        return "✓✓"; // double gray ticks
      case "read":
        return "✓✓"; // double blue ticks (styled in CSS)
      default:
        return "";
    }
  };

  if (!selectedContact) {
    return (
      <div style={{ padding: "20px" }}>
        👈 Select a contact to start chatting
      </div>
    );
  }

  return (
    <>
      {/* ✅ HEADER */}
      <div className="chat-header">
        <h3>{selectedContact.name}</h3>
        <p style={{ color: "#22c55e" }}>Online</p>
      </div>

      {/* ✅ MESSAGES */}
      <div className="messages">
        {messages.map((msg, idx) => (
          <motion.div
            key={msg.message_id || idx}
            className={`message-bubble ${
              msg.type === "incoming" ? "message-incoming" : "message-outgoing"
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p>{msg.text}</p>
            <div className="message-meta">
              <span className="time">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {msg.type === "outgoing" && (
                <span
                  className={`tick ${msg.status === "read" ? "tick-read" : ""}`}
                >
                  {getTickIcon(msg.status)}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ✅ INPUT */}
      <div className="chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>➤</button>
      </div>
    </>
  );
}
