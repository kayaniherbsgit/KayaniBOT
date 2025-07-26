import { useEffect, useState } from "react";
import axios from "axios";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ contact }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await axios.get(`http://localhost:3000/admin/messages/${contact.wa_id}`);
        setMessages(res.data);
      } catch (err) {
        console.error("❌ Error loading messages:", err);
      }
    }
    fetchMessages();
  }, [contact]);

  async function sendReply() {
    if (!input.trim()) return;

    try {
      await axios.post("http://localhost:3000/admin/send", {
        to: contact.wa_id,
        text: input,
      });
      setMessages((prev) => [
        ...prev,
        { wa_id: contact.wa_id, text: input, type: "outgoing", timestamp: new Date() },
      ]);
      setInput("");
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center p-3 bg-gray-100 border-b">
        <div className="ml-3">
          <h2 className="font-bold text-lg">{contact.name}</h2>
          <p className="text-sm text-gray-500">{contact.wa_id}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-chat-pattern">
        {messages.map((msg, index) => (
          <MessageBubble key={index} msg={msg} />
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-3 bg-gray-100 flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded-full px-4 py-2 focus:outline-none"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendReply()}
        />
        <button
          onClick={sendReply}
          className="bg-green-600 text-white px-4 py-2 rounded-full"
        >
          Send
        </button>
      </div>
    </div>
  );
}
