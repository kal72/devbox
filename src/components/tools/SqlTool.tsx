import { type KeyboardEvent, useState } from 'react';
import { CodeEditor } from '../common/CodeEditor';
import './SqlTool.css';

type CopyStatus = 'idle' | 'copied' | 'failed';

const SQL_EXAMPLE = `select u.id,u.name,u.email,count(o.id) as total_orders,sum(o.total) as revenue from users u left join orders o on o.user_id = u.id where u.active = true and o.created_at >= '2026-01-01' group by u.id,u.name,u.email having count(o.id) > 0 order by revenue desc limit 20;`;

const majorKeywords = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'VALUES',
  'SET',
  'RETURNING',
  'UNION',
  'UNION ALL',
];

const joinKeywords = [
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'LEFT OUTER JOIN',
  'RIGHT OUTER JOIN',
  'FULL OUTER JOIN',
];

const upperKeywords = (sql: string) => {
  const keywords = [
    ...majorKeywords,
    ...joinKeywords,
    'INSERT INTO',
    'UPDATE',
    'DELETE FROM',
    'CREATE TABLE',
    'ALTER TABLE',
    'DROP TABLE',
    'AND',
    'OR',
    'ON',
    'AS',
    'IN',
    'IS',
    'NOT',
    'NULL',
    'TRUE',
    'FALSE',
  ].sort((a, b) => b.length - a.length);

  return keywords.reduce((nextSql, keyword) => {
    const pattern = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    return nextSql.replace(pattern, keyword);
  }, sql);
};

const normalizeSqlWhitespace = (sql: string) => {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;
  let output = '';

  for (const char of sql) {
    if (inSingleQuote || inDoubleQuote) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '\'' && inSingleQuote) {
        inSingleQuote = false;
      } else if (char === '"' && inDoubleQuote) {
        inDoubleQuote = false;
      }
      continue;
    }

    if (char === '\'') {
      inSingleQuote = true;
      output += char;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      output += char;
      continue;
    }

    output += /\s/.test(char) ? ' ' : char;
  }

  return output.replace(/\s+/g, ' ').trim();
};

const indentLines = (sql: string, indentUnit: string) => {
  let level = 0;
  return sql
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      const hasContinuationIndent = /^\s+/.test(line);
      if (/^[);]/.test(trimmed)) level = Math.max(level - 1, 0);
      const indented = `${indentUnit.repeat(level)}${hasContinuationIndent ? indentUnit : ''}${trimmed}`;
      const openCount = (trimmed.match(/\(/g) || []).length;
      const closeCount = (trimmed.match(/\)/g) || []).length;
      level = Math.max(level + openCount - closeCount, 0);
      return indented;
    })
    .join('\n');
};

const formatSql = (sql: string, indentUnit: string) => {
  if (!sql.trim()) return '';

  let formatted = upperKeywords(normalizeSqlWhitespace(sql));
  formatted = formatted.replace(/\s*,\s*/g, `,\n${indentUnit}`);
  formatted = formatted.replace(/\s+(AND|OR)\s+/g, `\n${indentUnit}$1 `);
  formatted = formatted.replace(/\s+(ON)\s+/g, `\n${indentUnit}$1 `);

  [...joinKeywords, ...majorKeywords, 'INSERT INTO', 'UPDATE', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE']
    .sort((a, b) => b.length - a.length)
    .forEach((keyword) => {
      const pattern = new RegExp(`\\s*\\b${keyword.replace(/\s+/g, '\\s+')}\\b\\s*`, 'g');
      formatted = formatted.replace(pattern, `\n${keyword} `);
    });

  formatted = formatted
    .replace(/^\n+/, '')
    .replace(/\n\s*\n/g, '\n')
    .replace(/\s+;/g, ';')
    .trim();

  return indentLines(formatted, indentUnit);
};

const compactSql = (sql: string) => {
  if (!sql.trim()) return '';
  return upperKeywords(normalizeSqlWhitespace(sql))
    .replace(/\s*,\s*/g, ',')
    .replace(/\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*([=<>+\-*/])\s*/g, '$1')
    .replace(/\)\s*(AS)\b/g, ') $1')
    .replace(/\b(SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|OFFSET|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|FULL JOIN|CROSS JOIN|ON|AND|OR|AS|IN|IS|NOT|NULL|TRUE|FALSE)\b/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim();
};

export function SqlTool() {
  const [inputSql, setInputSql] = useState('');
  const [outputSql, setOutputSql] = useState('');
  const [indentSize, setIndentSize] = useState<number | string>(2);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const textToCopy = outputSql || inputSql;
  const workingSql = outputSql || inputSql;

  const getIndentUnit = (nextIndentSize = indentSize) => {
    return nextIndentSize === 'tab' ? '\t' : ' '.repeat(Number(nextIndentSize));
  };

  const indentUnit = getIndentUnit();

  const handleFormat = () => {
    setOutputSql(formatSql(workingSql, indentUnit));
    setCopyStatus('idle');
  };

  const handleIndentChange = (nextIndentSize: number | string) => {
    setIndentSize(nextIndentSize);
    if (workingSql.trim() && outputSql.trim()) {
      setOutputSql(formatSql(workingSql, getIndentUnit(nextIndentSize)));
    }
  };

  const handleCompact = () => {
    setOutputSql(compactSql(workingSql));
    setCopyStatus('idle');
  };

  const handleClear = () => {
    setInputSql('');
    setOutputSql('');
    setCopyStatus('idle');
  };

  const handleResetOutput = () => {
    setOutputSql(inputSql);
    setCopyStatus('idle');
  };

  const handleCopy = () => {
    if (!textToCopy) return;

    const showStatus = (status: CopyStatus) => {
      setCopyStatus(status);
      window.setTimeout(() => setCopyStatus('idle'), 1600);
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
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        return copied;
      } catch (err) {
        console.error('Failed to copy SQL: ', err);
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
        .catch(() => showStatus('failed'));
      return;
    }

    showStatus('failed');
  };

  const handleCopyKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCopy();
    }
  };

  return (
    <div className="sql-tool-container">
      <div className="sql-heading">
        <div>
          <p className="tool-kicker">Database Utility</p>
          <h1>SQL Formatter</h1>
          <p>Format SQL into a readable query layout, or compact formatted SQL back into a single-line statement.</p>
        </div>
      </div>

      <div className="sql-toolbar">
        <div className="toolbar-section">
          <label htmlFor="sql-indent-select" className="toolbar-label">Tab Size:</label>
          <select
            id="sql-indent-select"
            value={indentSize}
            onChange={(event) => handleIndentChange(event.target.value === 'tab' ? 'tab' : Number(event.target.value))}
            className="indent-select"
          >
            <option value={2}>2 Spaces</option>
            <option value={4}>4 Spaces</option>
            <option value="tab">Tab</option>
          </select>
        </div>

        <div className="toolbar-section gap-sm">
          <button onClick={handleFormat} className="btn btn-primary" disabled={!inputSql.trim()}>
            Format SQL
          </button>
          <button onClick={handleCompact} className="btn btn-secondary" disabled={!inputSql.trim()}>
            Compact
          </button>
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              handleCopy();
            }}
            onKeyDown={handleCopyKeyDown}
            className="btn btn-secondary"
            disabled={!textToCopy}
          >
            Copy
          </button>
          <button onClick={handleClear} className="btn btn-danger">
            Clear
          </button>
          <button onClick={handleResetOutput} className="btn btn-secondary" disabled={!inputSql.trim()}>
            Reset
          </button>
          <button
            onClick={() => {
              setInputSql(SQL_EXAMPLE);
              setOutputSql('');
              setCopyStatus('idle');
            }}
            className="btn btn-secondary"
          >
            Load Example
          </button>
        </div>
      </div>

      <div className="sql-panels">
        <div className="sql-panel">
          <div className="sql-panel-header">
            <h3>Input SQL</h3>
            <p>Paste query source</p>
          </div>
          <CodeEditor value={inputSql} onChange={setInputSql} placeholder="Paste SQL query here..." language="sql" tabSize={indentSize} />
        </div>

        <div className="sql-panel">
          <div className="sql-panel-header">
            <h3>Output SQL</h3>
            <p>Formatted or compact result</p>
          </div>
          <CodeEditor value={outputSql} onChange={setOutputSql} placeholder="Output will be shown here..." language="sql" tabSize={indentSize} />
        </div>
      </div>

      {(outputSql || copyStatus !== 'idle') && (
        <div className="sql-footer">
          {outputSql && (
            <>
              <span><strong>Input:</strong> {inputSql.length.toLocaleString()} chars</span>
              <span><strong>Output:</strong> {outputSql.length.toLocaleString()} chars</span>
            </>
          )}
          {copyStatus !== 'idle' && (
            <span className={`sql-copy-status ${copyStatus === 'failed' ? 'is-failed' : ''}`}>
              {copyStatus === 'copied' ? 'Copied to clipboard' : 'Clipboard blocked'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
