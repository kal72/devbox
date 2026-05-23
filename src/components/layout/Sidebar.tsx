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
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <p>Built with React &amp; CSS</p>
      </div>
    </aside>
  );
}
