export default function MessageBubble({ msg }) {
  const isOutgoing = msg.type === "outgoing";
  return (
    <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`px-4 py-2 rounded-lg max-w-xs shadow ${
          isOutgoing
            ? "bg-green-500 text-white rounded-br-none"
            : "bg-white text-gray-800 rounded-bl-none"
        }`}
      >
        <p>{msg.text}</p>
        <p className="text-xs mt-1 opacity-70 text-right">{msg.time}</p>
      </div>
    </div>
  );
}
