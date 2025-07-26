export default function Sidebar() {
  return (
    <>
      <div>
        <div className="profile">
          <img src="https://i.ibb.co/0mPFXnS/avatar.png" alt="Admin" />
          <div>
            <h2>Kayani Admin</h2>
            <p style={{ color: '#22c55e', fontSize: '12px' }}>● Online</p>
          </div>
        </div>
        <ul>
          <li>📩 Messages</li>
          <li>⚙ Settings</li>
          <li>🌙 Dark Mode</li>
        </ul>
      </div>
    </>
  );
}
