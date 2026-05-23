import { useState, useEffect } from 'react';
import { CodeEditor } from '../common/CodeEditor';
import './JsonFormatter.css';

export function JsonFormatter() {
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [indentSize, setIndentSize] = useState<number | string>(2);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
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
      const errorMessage = err.message;
      setValidationError(errorMessage);
      
      // Attempt to extract line number from JSON parse error message
      // Node/Chrome typically provides: "at position X" or "at line X column Y"
      let positionMatch = errorMessage.match(/at position (\d+)/);
      if (positionMatch) {
        const pos = parseInt(positionMatch[1], 10);
        const sub = jsonStr.substring(0, pos);
        const line = sub.split('\n').length;
        setErrorLine(line);
      } else {
        setErrorLine(null);
      }
      return false;
    }
  };

  // Run stats on output
  useEffect(() => {
    const jsonStr = outputJson || inputJson;
    if (!jsonStr.trim()) {
      setStats({ lines: 0, sizeBytes: 0, keys: 0 });
      return;
    }

    const lines = jsonStr.split('\n').length;
    const size = getByteSize(jsonStr);
    
    let keysCount = 0;
    try {
      const parsed = JSON.parse(jsonStr);
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
  }, [inputJson, outputJson]);

  const handleFormat = () => {
    if (!inputJson.trim()) return;
    try {
      const parsed = JSON.parse(inputJson);
      const formatted = JSON.stringify(parsed, null, getFormatSpacing() as any);
      setOutputJson(formatted);
      setValidationError(null);
      setErrorLine(null);
    } catch (err: any) {
      validateJson(inputJson);
    }
  };

  const handleMinify = () => {
    if (!inputJson.trim()) return;
    try {
      const parsed = JSON.parse(inputJson);
      const minified = JSON.stringify(parsed);
      setOutputJson(minified);
      setValidationError(null);
      setErrorLine(null);
    } catch (err: any) {
      validateJson(inputJson);
    }
  };

  const handleClear = () => {
    setInputJson('');
    setOutputJson('');
    setValidationError(null);
    setErrorLine(null);
  };

  const handleCopy = () => {
    const textToCopy = outputJson || inputJson;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Temp status indicator could go here
        alert('Copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
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
          <button onClick={handleFormat} className="btn btn-primary" title="Beautify JSON spacing">
            Format
          </button>
          <button onClick={handleMinify} className="btn btn-secondary" title="Remove all whitespace">
            Minify
          </button>
          <button onClick={() => validateJson(inputJson)} className="btn btn-secondary" title="Validate JSON syntax">
            Validate
          </button>
          <button onClick={handleCopy} className="btn btn-secondary" disabled={!outputJson && !inputJson} title="Copy result to clipboard">
            Copy
          </button>
          <button onClick={handleClear} className="btn btn-danger" title="Clear all text fields">
            Clear
          </button>
        </div>
      </div>

      <div className="formatter-panels">
        {/* Input Panel */}
        <div className="panel input-panel">
          <div className="panel-header">
            <div>
              <h3>Input</h3>
              <p>Paste JSON source</p>
            </div>
            {inputJson.trim() && (
              <span className={`status-badge ${validationError ? 'is-invalid' : 'is-valid'}`}>
                {validationError ? 'Invalid JSON' : 'Valid JSON'}
              </span>
            )}
          </div>
          <div className="panel-body">
            <CodeEditor
              value={inputJson}
              onChange={(val) => {
                setInputJson(val);
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

        {/* Output Panel */}
        <div className="panel output-panel">
          <div className="panel-header">
            <div>
              <h3>Output</h3>
              <p>Formatted result</p>
            </div>
            {outputJson && (
              <button onClick={handleCopy} className="btn-text-copy">
                Copy
              </button>
            )}
          </div>
          <div className="panel-body">
            <CodeEditor
              value={outputJson}
              onChange={() => {}}
              placeholder="Output will be shown here..."
              readOnly={true}
            />
          </div>
        </div>
      </div>

      {/* Validation and Statistics Status Footer */}
      {(validationError || stats.lines > 0) && (
        <div className="formatter-footer">
          {validationError ? (
            <div className="status-message error-message">
              <span className="error-icon">⚠️</span>
              <div className="error-details">
                <strong>Syntax Error:</strong> {validationError}
                {errorLine && <span className="error-line-badge">Line {errorLine}</span>}
              </div>
            </div>
          ) : (
            stats.lines > 0 && (
              <div className="status-message success-message">
                <span className="success-icon">✓</span>
                <span>JSON valid and ready.</span>
              </div>
            )
          )}

          {stats.lines > 0 && (
            <div className="stats-container">
              <span className="stat-item"><strong>Size:</strong> {formatSize(stats.sizeBytes)}</span>
              <span className="stat-item"><strong>Lines:</strong> {stats.lines}</span>
              <span className="stat-item"><strong>Keys/Nodes:</strong> {stats.keys}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
