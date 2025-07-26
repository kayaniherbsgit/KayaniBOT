import { useEffect, useState } from "react";
import axios from "axios";

export default function RightPanel({ onSelectContact }) {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    async function fetchContacts() {
      const res = await axios.get("http://localhost:3000/admin/contacts");
      setContacts(res.data);
    }
    fetchContacts();
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-3 border-b">
        <input
          type="text"
          placeholder="Search"
          className="w-full p-2 rounded-lg border focus:outline-none"
        />
      </div>

      {/* Contacts */}
      <div className="flex-1 overflow-y-auto">
        {contacts.map((c) => (
          <div
            key={c.wa_id}
            className="p-4 border-b hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelectContact(c)}
          >
            <div className="font-semibold">{c.name}</div>
            <div className="text-sm text-gray-500 truncate">{c.lastMessage}</div>
          </div>
        ))}
      </div>
    </div>
  );
}