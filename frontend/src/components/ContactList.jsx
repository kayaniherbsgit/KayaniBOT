import { useEffect, useState } from "react";
import axios from "axios";

export default function ContactList({ onSelectContact }) {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const res = await axios.get("http://localhost:3000/admin/contacts");
        setContacts(res.data);
      } catch (err) {
        console.error("❌ Error loading contacts:", err);
      }
    }
    fetchContacts();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      {contacts.length === 0 && (
        <p className="text-center text-gray-400 mt-4">
          📭 No contacts yet
        </p>
      )}
      {contacts.map((contact) => (
        <div
          key={contact.wa_id}
          onClick={() => onSelectContact(contact)}
          className="p-4 border-b hover:bg-gray-100 cursor-pointer flex flex-col"
        >
          <p className="font-semibold text-gray-800">{contact.name || "Unnamed"}</p>
          <p className="text-gray-500 text-sm truncate">{contact.lastMessage}</p>
        </div>
      ))}
    </div>
  );
}
