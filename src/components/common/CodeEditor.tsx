import React, { useRef, useEffect } from 'react';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  language?: 'json' | 'sql' | 'go' | 'plain';
  softWrap?: boolean;
  tabSize?: number | string;
}

export function CodeEditor({ value, onChange, placeholder, readOnly = false, language = 'json', softWrap = false, tabSize = 2 }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  // Split lines to calculate line numbers
  const lines = value.split('\n');
  const lineCount = Math.max(lines.length, 1);

  const renderHighlightedJson = (source: string) => {
    const tokenPattern = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\bnull\b|([{}\[\],:])/g;
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(source)) !== null) {
      if (match.index > cursor) {
        nodes.push(source.slice(cursor, match.index));
      }

      const [token, stringToken, keySuffix, numberToken, booleanToken, punctuationToken] = match;

      if (stringToken) {
        nodes.push(
          <span key={`${match.index}-string`} className={keySuffix ? 'json-token-key' : 'json-token-string'}>
            {stringToken}
          </span>,
        );

        if (keySuffix) {
          const colonIndex = keySuffix.lastIndexOf(':');
          nodes.push(keySuffix.slice(0, colonIndex));
          nodes.push(
            <span key={`${match.index}-colon`} className="json-token-punctuation">
              :
            </span>,
          );
        }
      } else if (numberToken) {
        nodes.push(
          <span key={`${match.index}-number`} className="json-token-number">
            {numberToken}
          </span>,
        );
      } else if (booleanToken) {
        nodes.push(
          <span key={`${match.index}-boolean`} className="json-token-boolean">
            {booleanToken}
          </span>,
        );
      } else if (punctuationToken) {
        nodes.push(
          <span key={`${match.index}-punctuation`} className="json-token-punctuation">
            {punctuationToken}
          </span>,
        );
      } else {
        nodes.push(
          <span key={`${match.index}-null`} className="json-token-null">
            {token}
          </span>,
        );
      }

      cursor = match.index + token.length;
    }

    if (cursor < source.length) {
      nodes.push(source.slice(cursor));
    }

    return nodes;
  };

  const renderHighlightedSql = (source: string) => {
    const sqlKeywords = [
      'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET',
      'JOIN', 'LEFT', 'RIGHT', 'INNER', 'FULL', 'OUTER', 'CROSS', 'ON', 'AS',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'ALTER', 'DROP',
      'TABLE', 'VIEW', 'INDEX', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'LIKE',
      'BETWEEN', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'TRUE', 'FALSE',
      'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'RETURNING', 'UNION', 'ALL',
    ];
    const tokenPattern = /(--.*$|\/\*[\s\S]*?\*\/)|('(?:''|\\.|[^'\\])*'|"(?:\\"|[^"])*")|(\b\d+(?:\.\d+)?\b)|([(),.;=*<>+\-/])|\b([A-Za-z_][A-Za-z0-9_$]*)\b/gm;
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(source)) !== null) {
      if (match.index > cursor) {
        nodes.push(source.slice(cursor, match.index));
      }

      const [token, commentToken, stringToken, numberToken, operatorToken, wordToken] = match;
      const upperWord = wordToken?.toUpperCase();

      if (commentToken) {
        nodes.push(<span key={`${match.index}-sql-comment`} className="sql-token-comment">{commentToken}</span>);
      } else if (stringToken) {
        nodes.push(<span key={`${match.index}-sql-string`} className="sql-token-string">{stringToken}</span>);
      } else if (numberToken) {
        nodes.push(<span key={`${match.index}-sql-number`} className="sql-token-number">{numberToken}</span>);
      } else if (operatorToken) {
        nodes.push(<span key={`${match.index}-sql-operator`} className="sql-token-operator">{operatorToken}</span>);
      } else if (upperWord && sqlKeywords.includes(upperWord)) {
        nodes.push(<span key={`${match.index}-sql-keyword`} className="sql-token-keyword">{wordToken}</span>);
      } else {
        nodes.push(<span key={`${match.index}-sql-identifier`} className="sql-token-identifier">{wordToken}</span>);
      }

      cursor = match.index + token.length;
    }

    return nodes;
  };

  const renderHighlightedGo = (source: string) => {
    const goKeywords = [
      'package', 'import', 'type', 'struct', 'interface', 'func', 'return',
      'string', 'int', 'int8', 'int16', 'int32', 'int64',
      'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uintptr',
      'float32', 'float64', 'bool', 'byte', 'rune', 'any', 'map', 'chan', 'var', 'const'
    ];
    const tokenPattern = /(\/\/.*$|\/\*[\s\S]*?\*\/)|(`[^`]*`)|("(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?\b)|([{}*\[\](),.:])|\b([A-Za-z_][A-Za-z0-9_]*)\b/gm;
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(source)) !== null) {
      if (match.index > cursor) {
        nodes.push(source.slice(cursor, match.index));
      }

      const [token, commentToken, tagToken, stringToken, numberToken, punctuationToken, wordToken] = match;

      if (commentToken) {
        nodes.push(<span key={`${match.index}-go-comment`} className="go-token-comment">{commentToken}</span>);
      } else if (tagToken) {
        nodes.push(<span key={`${match.index}-go-tag`} className="go-token-tag">{tagToken}</span>);
      } else if (stringToken) {
        nodes.push(<span key={`${match.index}-go-string`} className="go-token-string">{stringToken}</span>);
      } else if (numberToken) {
        nodes.push(<span key={`${match.index}-go-number`} className="go-token-number">{numberToken}</span>);
      } else if (punctuationToken) {
        nodes.push(<span key={`${match.index}-go-punctuation`} className="go-token-punctuation">{punctuationToken}</span>);
      } else if (wordToken) {
        if (goKeywords.includes(wordToken)) {
          nodes.push(<span key={`${match.index}-go-keyword`} className="go-token-keyword">{wordToken}</span>);
        } else {
          const isCapitalized = wordToken[0] === wordToken[0].toUpperCase();
          nodes.push(
            <span key={`${match.index}-go-identifier`} className={isCapitalized ? 'go-token-type' : 'go-token-identifier'}>
              {wordToken}
            </span>,
          );
        }
      }

      cursor = match.index + token.length;
    }

    if (cursor < source.length) {
      nodes.push(source.slice(cursor));
    }

    return nodes;
  };

  const renderHighlightedCode = (source: string) => {
    if (language === 'sql') return renderHighlightedSql(source);
    if (language === 'go') return renderHighlightedGo(source);
    if (language === 'plain') return source;
    return renderHighlightedJson(source);
  };

  // Sync scrolling of textarea and line numbers
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Support Tab key inside the editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !readOnly) {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const spaces = tabSize === 'tab' ? '\t' : ' '.repeat(Number(tabSize));
      
      const newValue = value.substring(0, start) + spaces + value.substring(end);
      onChange(newValue);
      
      // Reset cursor position (need to defer slightly until React updates state)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + spaces.length;
        }
      }, 0);
    }
  };

  // Ensure scroll is synced on load or content change
  useEffect(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, [value]);

  return (
    <div className={`code-editor-container ${softWrap ? 'is-soft-wrap' : ''}`}>
      <div className="line-numbers-container" ref={lineNumbersRef}>
        {Array.from({ length: lineCount }).map((_, index) => (
          <div key={index} className="line-number">
            {index + 1}
          </div>
        ))}
      </div>
      <div className="code-editor-main">
        {value && language !== 'plain' && (
          <pre className="code-editor-highlight" ref={highlightRef} aria-hidden="true">
            {renderHighlightedCode(value)}
          </pre>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={readOnly}
          spellCheck={false}
          wrap={softWrap ? 'soft' : 'off'}
        className={`code-editor-textarea ${value && language !== 'plain' ? 'has-highlight' : ''}`}
        style={{
          resize: 'none',
          tabSize: tabSize === 'tab' ? 4 : Number(tabSize),
        }}
      />
      </div>
    </div>
  );
}
