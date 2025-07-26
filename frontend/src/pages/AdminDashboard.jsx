import { useState } from "react";
import "../styles/dashboard.css";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import ContactPanel from "../components/ContactPanel";

export default function AdminDashboard() {
  const [selectedContact, setSelectedContact] = useState(null);

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <Sidebar />
      </div>
      <div className="chat-area">
        <ChatArea selectedContact={selectedContact} />
      </div>
      <div className="contact-list">
        <ContactPanel setSelectedContact={setSelectedContact} />
      </div>
    </div>
  );
}
