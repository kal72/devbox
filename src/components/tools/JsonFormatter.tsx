import { type KeyboardEvent, useState, useEffect } from 'react';
import { CodeEditor } from '../common/CodeEditor';
import './JsonFormatter.css';

export function JsonFormatter() {
  const [json, setJson] = useState('');
  const [indentSize, setIndentSize] = useState<number | string>(2);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [isLooseFormatted, setIsLooseFormatted] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [stats, setStats] = useState({
    lines: 0,
    sizeBytes: 0,
    keys: 0,
  });

  const getByteSize = (str: string) => {
    return new Blob([str]).size;
  };

  const getFormatSpacing = (): number | string => {
    if (indentSize === 'tab') return '\t';
    return Number(indentSize);
  };

  const getIndentUnit = (): string => {
    if (indentSize === 'tab') return '\t';
    return ' '.repeat(Number(indentSize));
  };

  const setJsonError = (jsonStr: string, errorMessage: string) => {
    setValidationError(errorMessage);

    // Attempt to extract line number from JSON parse error message
    // Node/Chrome typically provides: "at position X" or "at line X column Y"
    const positionMatch = errorMessage.match(/at position (\d+)/);
    if (positionMatch) {
      const pos = parseInt(positionMatch[1], 10);
      const sub = jsonStr.substring(0, pos);
      const line = sub.split('\n').length;
      setErrorLine(line);
    } else {
      setErrorLine(null);
    }
  };

  const looseFormatJson = (source: string): string => {
    const indentUnit = getIndentUnit();
    const output: string[] = [];
    let indentLevel = 0;
    let inString = false;
    let isEscaped = false;
    let pendingSpace = false;

    const appendIndent = () => {
      output.push(indentUnit.repeat(Math.max(indentLevel, 0)));
    };

    const trimTrailingInlineSpace = () => {
      while (output.length > 0 && output[output.length - 1] === ' ') {
        output.pop();
      }
    };

    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];

      if (inString) {
        output.push(char);
        if (isEscaped) {
          isEscaped = false;
        } else if (char === '\\') {
          isEscaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        if (pendingSpace && output.length > 0 && output[output.length - 1] !== '\n') {
          output.push(' ');
        }
        pendingSpace = false;
        inString = true;
        output.push(char);
        continue;
      }

      if (/\s/.test(char)) {
        pendingSpace = output.length > 0 && output[output.length - 1] !== '\n';
        continue;
      }

      pendingSpace = false;

      if (char === '{' || char === '[') {
        trimTrailingInlineSpace();
        output.push(char, '\n');
        indentLevel += 1;
        appendIndent();
        continue;
      }

      if (char === '}' || char === ']') {
        trimTrailingInlineSpace();
        if (output.length > 0 && output[output.length - 1] !== '\n') {
          output.push('\n');
        }
        indentLevel -= 1;
        appendIndent();
        output.push(char);
        continue;
      }

      if (char === ',') {
        trimTrailingInlineSpace();
        output.push(char, '\n');
        appendIndent();
        continue;
      }

      if (char === ':') {
        trimTrailingInlineSpace();
        output.push(': ');
        continue;
      }

      output.push(char);
    }

    return output.join('').trim();
  };

  const validateJson = (jsonStr: string): boolean => {
    if (!jsonStr.trim()) {
      setValidationError(null);
      setErrorLine(null);
      return true;
    }
    
    try {
      JSON.parse(jsonStr);
      setValidationError(null);
      setErrorLine(null);
      return true;
    } catch (err: any) {
      setJsonError(jsonStr, err.message);
      return false;
    }
  };

  // Run stats on json content
  useEffect(() => {
    if (!json.trim()) {
      setStats({ lines: 0, sizeBytes: 0, keys: 0 });
      return;
    }

    const lines = json.split('\n').length;
    const size = getByteSize(json);
    
    let keysCount = 0;
    try {
      const parsed = JSON.parse(json);
      const countKeys = (obj: any): number => {
        if (typeof obj !== 'object' || obj === null) return 0;
        let count = 0;
        if (Array.isArray(obj)) {
          obj.forEach(item => {
            count += countKeys(item);
          });
        } else {
          const keys = Object.keys(obj);
          count += keys.length;
          keys.forEach(key => {
            count += countKeys(obj[key]);
          });
        }
        return count;
      };
      keysCount = countKeys(parsed);
    } catch (e) {
      // Ignore key counting if invalid JSON
    }

    setStats({
      lines,
      sizeBytes: size,
      keys: keysCount,
    });
  }, [json]);

  const handleFormat = () => {
    if (!json.trim()) return;
    try {
      const parsed = JSON.parse(json);
      const formatted = JSON.stringify(parsed, null, getFormatSpacing() as any);
      setJson(formatted);
      setValidationError(null);
      setErrorLine(null);
      setIsLooseFormatted(false);
    } catch (err: any) {
      const looseFormatted = looseFormatJson(json);
      setJsonError(json, err.message);
      setJson(looseFormatted);
      setIsLooseFormatted(true);
    }
  };

  const handleMinify = () => {
    if (!json.trim()) return;
    try {
      const parsed = JSON.parse(json);
      const minified = JSON.stringify(parsed);
      setJson(minified);
      setValidationError(null);
      setErrorLine(null);
      setIsLooseFormatted(false);
    } catch (err: any) {
      validateJson(json);
    }
  };

  const handleClear = () => {
    setJson('');
    setValidationError(null);
    setErrorLine(null);
    setIsLooseFormatted(false);
    setCopyStatus('idle');
  };

  const handleCopy = () => {
    const textToCopy = json;
    if (!textToCopy) return;

    const showStatus = (status: 'copied' | 'failed') => {
      setCopyStatus(status);
      window.setTimeout(() => setCopyStatus('idle'), 1800);
    };

    const selectVisibleText = () => {
      const textarea = document.querySelector<HTMLTextAreaElement>('.panel-body textarea');
      if (!textarea) return;
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textToCopy.length);
    };

    const copyWithSelection = () => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.width = '1px';
        textarea.style.height = '1px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textToCopy.length);

        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        return copied;
      } catch (err) {
        console.error('Failed to copy text: ', err);
        return false;
      }
    };

    if (copyWithSelection()) {
      showStatus('copied');
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => showStatus('copied'))
        .catch(() => {
          selectVisibleText();
          showStatus('failed');
        });
      return;
    }

    selectVisibleText();
    showStatus('failed');
  };

  const handleCopyKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCopy();
    }
  };

  const handleLoadExample = () => {
    const exampleJson = {
      name: "John Doe",
      age: 30,
      email: "john.doe@example.com",
      isDeveloper: true,
      skills: ["JavaScript", "TypeScript", "React", "Node.js"],
      address: {
        street: "123 Main St",
        city: "San Francisco",
        state: "CA",
        zip: "94105"
      },
      projects: [
        { name: "Devbox", status: "active" },
        { name: "Website", status: "completed" }
      ]
    };
    setJson(JSON.stringify(exampleJson, null, getFormatSpacing() as any));
    setValidationError(null);
    setErrorLine(null);
    setIsLooseFormatted(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="formatter-container">
      <div className="formatter-heading">
        <div>
          <p className="tool-kicker">Formatter Workspace</p>
          <h1>JSON Formatter</h1>
        </div>
        <div className="heading-stats" aria-label="Document statistics">
          <span>{formatSize(stats.sizeBytes)}</span>
          <span>{stats.lines} lines</span>
          <span>{stats.keys} keys</span>
        </div>
      </div>

      <div className="formatter-toolbar">
        <div className="toolbar-section">
          <label htmlFor="indent-select" className="toolbar-label">Tab Size:</label>
          <select
            id="indent-select"
            value={indentSize}
            onChange={(e) => setIndentSize(e.target.value === 'tab' ? 'tab' : Number(e.target.value))}
            className="indent-select"
          >
            <option value={2}>2 Spaces</option>
            <option value={4}>4 Spaces</option>
            <option value="tab">Tab</option>
          </select>
        </div>

        <div className="toolbar-section gap-sm">
          <button onClick={handleLoadExample} className="btn btn-secondary" title="Load example JSON content">
            Example
          </button>
          <button onClick={handleFormat} className="btn btn-primary" title="Format valid JSON, or loosely format invalid JSON for readability">
            Format
          </button>
          <button onClick={handleMinify} className="btn btn-secondary" title="Remove all whitespace">
            Minify
          </button>
          <button onClick={() => validateJson(json)} className="btn btn-secondary" title="Validate JSON syntax">
            Validate
          </button>
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              handleCopy();
            }}
            onKeyDown={handleCopyKeyDown}
            className="btn btn-secondary"
            disabled={!json}
            title="Copy result to clipboard"
          >
            Copy
          </button>
          <button onClick={handleClear} className="btn btn-danger" title="Clear all text fields">
            Clear
          </button>
        </div>
      </div>

      <div className="formatter-panels">
        {/* Editor Panel */}
        <div className="panel editor-panel">
          <div className="panel-header">
            <div>
              <h3>JSON Editor</h3>
              <p>Type, paste, or format JSON</p>
            </div>
            {json.trim() && (
              <span className={`status-badge ${validationError ? 'is-invalid' : 'is-valid'}`}>
                {validationError ? 'Invalid JSON' : 'Valid JSON'}
              </span>
            )}
          </div>
          <div className="panel-body">
            <CodeEditor
              value={json}
              onChange={(val) => {
                setJson(val);
                setIsLooseFormatted(false);
                // Clear validation error when editing
                if (validationError) {
                  setValidationError(null);
                  setErrorLine(null);
                }
              }}
              placeholder="Paste or type your JSON here..."
            />
          </div>
        </div>
      </div>

      {/* Validation and Statistics Status Footer */}
      <div className="formatter-footer">
        {validationError ? (
          <div className="status-message error-message">
            <span className="error-icon">⚠️</span>
            <div className="error-details">
              <strong>Syntax Error:</strong> {validationError}
              {errorLine && <span className="error-line-badge">Line {errorLine}</span>}
              {isLooseFormatted && <span className="loose-format-badge">Loosely formatted</span>}
            </div>
          </div>
        ) : json.trim() ? (
          <div className="status-message success-message">
            <span className="success-icon">✓</span>
            <span>JSON valid and ready.</span>
          </div>
        ) : (
          <div className="status-message" style={{ color: 'var(--text-muted)' }}>
            <span>Ready. Input JSON to format.</span>
          </div>
        )}

        <div className="stats-container">
          <span className="stat-item"><strong>Size:</strong> {formatSize(stats.sizeBytes)}</span>
          <span className="stat-item"><strong>Lines:</strong> {stats.lines}</span>
          <span className="stat-item"><strong>Keys/Nodes:</strong> {stats.keys}</span>
        </div>

        {copyStatus !== 'idle' && (
          <div className={`copy-status-message ${copyStatus === 'failed' ? 'is-failed' : ''}`} role="status" aria-live="polite">
            {copyStatus === 'copied' ? 'Copied to clipboard' : 'Clipboard blocked. Text selected, press Cmd/Ctrl+C.'}
          </div>
        )}
      </div>
    </div>
  );
}
