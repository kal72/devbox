import type { Route } from '../../hooks/useHashRoute';
import './Sidebar.css';

interface SidebarProps {
  currentRoute: Route;
}

export function Sidebar({ currentRoute }: SidebarProps) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ul>
          <li>
            <a
              href="#/formatter"
              className={`nav-item ${currentRoute === 'formatter' ? 'is-active' : ''}`}
            >
              <div className="nav-icon">
                {/* SVG Braces (JSON Formatter) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"></path>
                  <path d="M13 3v6h6"></path>
                  <path d="M9 13h6"></path>
                  <path d="M9 17h6"></path>
                </svg>
              </div>
              <div className="nav-text">
                <span className="nav-title">JSON Formatter</span>
                <span className="nav-desc">Beautify, Minify & Validate</span>
              </div>
            </a>
          </li>
          
          <li>
            <a
              href="#/table"
              className={`nav-item ${currentRoute === 'table' ? 'is-active' : ''}`}
            >
              <div className="nav-icon">
                {/* SVG Table (JSON to Table) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                  <line x1="10" y1="3" x2="10" y2="21"></line>
                </svg>
              </div>
              <div className="nav-text">
                <span className="nav-title">JSON to Table</span>
                <span className="nav-desc">Grid Viewer & CSV Export</span>
              </div>
            </a>
          </li>

          <li>
            <a
              href="#/uuid"
              className={`nav-item ${currentRoute === 'uuid' ? 'is-active' : ''}`}
            >
              <div className="nav-icon">
                {/* SVG Refresh/ID (UUID Generator) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 0 1 15.5-6.2"></path>
                  <path d="M18 2v4h-4"></path>
                  <path d="M21 12a9 9 0 0 1-15.5 6.2"></path>
                  <path d="M6 22v-4h4"></path>
                </svg>
              </div>
              <div className="nav-text">
                <span className="nav-title">UUID Generator</span>
                <span className="nav-desc">Generate v4 & v7 IDs</span>
              </div>
            </a>
          </li>

          <li>
            <a
              href="#/jwt"
              className={`nav-item ${currentRoute === 'jwt' ? 'is-active' : ''}`}
            >
              <div className="nav-icon">
                {/* SVG Key (JWT Tool) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="7.5" cy="15.5" r="4.5"></circle>
                  <path d="M10.7 12.3 21 2"></path>
                  <path d="m16 7 2 2"></path>
                  <path d="m19 4 2 2"></path>
                </svg>
              </div>
              <div className="nav-text">
                <span className="nav-title">JWT Tool</span>
                <span className="nav-desc">Encode, Decode & Verify</span>
              </div>
            </a>
          </li>

          <li>
            <a
              href="#/sql"
              className={`nav-item ${currentRoute === 'sql' ? 'is-active' : ''}`}
            >
              <div className="nav-icon">
                {/* SVG Database (SQL Tool) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <ellipse cx="12" cy="5" rx="8" ry="3"></ellipse>
                  <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"></path>
                  <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"></path>
                </svg>
              </div>
              <div className="nav-text">
                <span className="nav-title">SQL Formatter</span>
                <span className="nav-desc">Format & Compact SQL</span>
              </div>
            </a>
          </li>
          <li>
            <a
              href="#/hash"
              className={`nav-item ${currentRoute === 'hash' ? 'is-active' : ''}`}
            >
              <div className="nav-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" y1="9" x2="20" y2="9"></line>
                  <line x1="4" y1="15" x2="20" y2="15"></line>
                  <line x1="10" y1="3" x2="8" y2="21"></line>
                  <line x1="16" y1="3" x2="14" y2="21"></line>
                </svg>
              </div>
              <div className="nav-text">
                <span className="nav-title">Hash Generator</span>
                <span className="nav-desc">MD5, HMAC & bcrypt</span>
              </div>
            </a>
          </li>
          <li>
            <a
              href="#/encrypt"
              className={`nav-item ${currentRoute === 'encrypt' ? 'is-active' : ''}`}
            >
              <div className="nav-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="11" width="16" height="9" rx="2"></rect>
                  <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
                  <path d="M12 15v2"></path>
                </svg>
              </div>
              <div className="nav-text">
                <span className="nav-title">Crypto Tool</span>
                <span className="nav-desc">AES & RSA encrypt</span>
              </div>
            </a>
          </li>
          <li>
            <a
              href="#/base64"
              className={`nav-item ${currentRoute === 'base64' ? 'is-active' : ''}`}
            >
              <div className="nav-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 7h16"></path>
                  <path d="M4 17h16"></path>
                  <path d="M7 4v16"></path>
                  <path d="M17 4v16"></path>
                  <path d="M10 12h4"></path>
                </svg>
              </div>
              <div className="nav-text">
                <span className="nav-title">Base64 Tool</span>
                <span className="nav-desc">Text & File Encode</span>
              </div>
            </a>
          </li>
          <li>
            <a
              href="#/sql-gorm"
              className={`nav-item ${currentRoute === 'sql-gorm' ? 'is-active' : ''}`}
            >
              <div className="nav-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 5c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2z"></path>
                  <path d="M4 5v6c0 1.1 3.6 2 8 2s8-.9 8-2V5"></path>
                  <path d="M4 11v6c0 1.1 3.6 2 8 2s8-.9 8-2v-6"></path>
                  <path d="M8 15h8"></path>
                </svg>
              </div>
              <div className="nav-text">
                <span className="nav-title">SQL to GORM</span>
                <span className="nav-desc">Table to Go Model</span>
              </div>
            </a>
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <p>Built with React &amp; CSS</p>
      </div>
    </aside>
  );
}
