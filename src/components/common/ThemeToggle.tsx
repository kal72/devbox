import { useTheme } from '../../hooks/useTheme';
import './ThemeToggle.css';

export function ThemeToggle() {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      className={`theme-toggle ${theme === 'system' ? 'is-system' : 'is-pinned'}`}
      onClick={toggleTheme}
      title={
        theme === 'system'
          ? `System Theme (${isDark ? 'Dark' : 'Light'}) - Click to toggle to ${isDark ? 'Light' : 'Dark'}`
          : `Pinned ${isDark ? 'Dark' : 'Light'} Theme - Click to reset to System`
      }
      aria-label="Toggle Theme"
    >
      <div className="icon-container">
        {/* Sun Icon */}
        <svg
          className="icon icon-sun"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2"></path>
          <path d="M12 20v2"></path>
          <path d="M4.93 4.93l1.41 1.41"></path>
          <path d="M17.66 17.66l1.41 1.41"></path>
          <path d="M2 12h2"></path>
          <path d="M20 12h2"></path>
          <path d="M6.34 17.66l-1.41 1.41"></path>
          <path d="M19.07 4.93l-1.41 1.41"></path>
        </svg>

        {/* Moon Icon */}
        <svg
          className="icon icon-moon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
        </svg>
      </div>

      <span className="theme-label">
        {theme === 'system' ? 'System' : isDark ? 'Dark' : 'Light'}
      </span>
      
      {theme === 'system' && (
        <span className="system-indicator" />
      )}
    </button>
  );
}
