import React, { useRef, useEffect } from 'react';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, placeholder, readOnly = false }: CodeEditorProps) {
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
      const spaces = '  '; // 2 spaces for tab
      
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
    <div className="code-editor-container">
      <div className="line-numbers-container" ref={lineNumbersRef}>
        {Array.from({ length: lineCount }).map((_, index) => (
          <div key={index} className="line-number">
            {index + 1}
          </div>
        ))}
      </div>
      <div className="code-editor-main">
        {value && (
          <pre className="code-editor-highlight" ref={highlightRef} aria-hidden="true">
            {renderHighlightedJson(value)}
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
          className={`code-editor-textarea ${value ? 'has-highlight' : ''}`}
          style={{
            resize: 'none',
          }}
        />
      </div>
    </div>
  );
}
