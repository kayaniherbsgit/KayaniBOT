import { useEffect, useState } from "react";
import axios from "axios";

export default function ContactPanel({ setSelectedContact }) {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:3000/admin/contacts")
      .then(res => setContacts(res.data))
      .catch(err => console.error("Error fetching contacts:", err));
  }, []);

  return (
    <>
      <div className="contact-search">
        <input type="text" placeholder="Search contacts..." />
      </div>

      {contacts.map(contact => (
        <div
          key={contact.wa_id}
          className="contact-item"
          onClick={() => setSelectedContact(contact)}
        >
          <div className="contact-name">{contact.name}</div>
          <div className="contact-last-message">{contact.lastMessage}</div>
        </div>
      ))}
    </>
  );
}
