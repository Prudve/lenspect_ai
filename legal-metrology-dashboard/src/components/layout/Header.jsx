import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

function Header({ title, subtitle }) {
  const { user, logout } = useAuth();

  const fullName = user?.fullName || '';
  const roleName = user?.role || '';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'LM';

  return (
    <header className="top-header">
      {/* Page Title & Subtitle */}
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
        {subtitle && <span className="header-subtitle">{subtitle}</span>}
      </div>

      {/* Right Controls & Profile */}
      <div className="header-right">
        {/* Jurisdiction / Zone tag */}
        <div className="jurisdiction-badge" title="Active Enforcement Zone">
          <span className="jurisdiction-badge-dot" />
          <span>National Enforcement Grid</span>
        </div>



        <div className="header-divider" />

        {/* Supervisor Profile Area */}
        <div className="profile-pill">
          <div className="profile-avatar" title={fullName}>
            {initials}
          </div>
          <div className="profile-info">
            <span className="profile-name">{fullName}</span>
            <span className="profile-role">{roleName}</span>
          </div>
        </div>

        {/* Logout Action */}
        <button
          type="button"
          className="logout-btn"
          onClick={logout}
          title="Sign out of Enforcement Portal"
          aria-label="Sign out"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

export default Header;

