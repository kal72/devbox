import { type ChangeEvent, type KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { CodeEditor } from '../common/CodeEditor';
import './Base64Tool.css';

type Base64Mode = 'encode' | 'decode';
type Base64Source = 'text' | 'file';
type CopyStatus = 'idle' | 'copied' | 'failed';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const normalized = value.replace(/^data:[^,]+,/, '').replace(/\s/g, '');
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function Base64Tool() {
  const [mode, setMode] = useState<Base64Mode>('encode');
  const [source, setSource] = useState<Base64Source>('text');
  const [inputText, setInputText] = useState('Hello from Devbox');
  const [outputText, setOutputText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileMime, setFileMime] = useState('application/octet-stream');
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const currentInput = source === 'file' && mode === 'decode' ? inputText : inputText;
  const textToCopy = outputText || currentInput;
  const runLabel = mode === 'encode' ? 'Encode Base64' : 'Decode Base64';
  const outputTitle = mode === 'encode' ? 'Base64 Output' : source === 'text' ? 'Decoded Text' : 'Decoded File';

  const clearDownload = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl('');
  };

  const handleTextRun = () => {
    try {
      clearDownload();
      if (mode === 'encode') {
        setOutputText(bytesToBase64(encoder.encode(inputText)));
        setStatus({ type: 'success', message: 'Text encoded to Base64.' });
      } else {
        setOutputText(decoder.decode(base64ToBytes(inputText)));
        setStatus({ type: 'success', message: 'Base64 decoded to text.' });
      }
      setCopyStatus('idle');
    } catch (err: any) {
      setStatus({ type: 'error', message: `Base64 ${mode} failed: ${err.message}` });
    }
  };

  const handleFileEncode = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      clearDownload();
      const bytes = new Uint8Array(await file.arrayBuffer());
      setFileName(file.name);
      setFileMime(file.type || 'application/octet-stream');
      setFileSize(file.size);
      setOutputText(bytesToBase64(bytes));
      setStatus({ type: 'success', message: `${file.name} encoded to Base64.` });
      setCopyStatus('idle');
    } catch (err: any) {
      setStatus({ type: 'error', message: `File encode failed: ${err.message}` });
    }
  };

  const handleFileDecode = () => {
    try {
      clearDownload();
      const bytes = base64ToBytes(inputText);
      const blob = new Blob([bytes], { type: fileMime || 'application/octet-stream' });
      setDownloadUrl(URL.createObjectURL(blob));
      setFileSize(bytes.length);
      setOutputText(`${fileName || 'decoded-file'} ready to download (${formatBytes(bytes.length)})`);
      setStatus({ type: 'success', message: 'Base64 decoded to file.' });
      setCopyStatus('idle');
    } catch (err: any) {
      setStatus({ type: 'error', message: `File decode failed: ${err.message}` });
    }
  };

  const handleRun = () => {
    if (source === 'file' && mode === 'encode') {
      setStatus(outputText
        ? { type: 'success', message: `${fileName || 'File'} encoded to Base64.` }
        : { type: 'warning', message: 'Select a file to encode.' });
      return;
    }
    if (source === 'file' && mode === 'decode') {
      handleFileDecode();
      return;
    }
    handleTextRun();
  };

  const handleMoveToInput = () => {
    setInputText(outputText);
    setOutputText('');
    setMode('decode');
    clearDownload();
    setCopyStatus('idle');
  };

  const handleCopy = () => {
    if (!textToCopy) return;

    const showCopyStatus = (nextStatus: CopyStatus) => {
      setCopyStatus(nextStatus);
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
        console.error('Failed to copy Base64 text: ', err);
        return false;
      }
    };

    if (copyWithSelection()) {
      showCopyStatus('copied');
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => showCopyStatus('copied'))
        .catch(() => showCopyStatus('failed'));
      return;
    }

    showCopyStatus('failed');
  };

  const handleCopyKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCopy();
    }
  };

  const handleClear = () => {
    clearDownload();
    setInputText('');
    setOutputText('');
    setFileName('');
    setFileMime('application/octet-stream');
    setFileSize(null);
    setStatus(null);
    setCopyStatus('idle');
  };

  const fileSummary = useMemo(() => {
    if (!fileName) return 'No file selected';
    const size = fileSize === null ? '' : ` · ${formatBytes(fileSize)}`;
    return `${fileName}${size}`;
  }, [fileName, fileSize]);

  return (
    <div className="base64-tool-container">
      {copyStatus !== 'idle' && (
        <div className={`base64-toast ${copyStatus === 'failed' ? 'is-failed' : ''}`}>
          {copyStatus === 'copied' ? 'Copied to clipboard' : 'Clipboard blocked'}
        </div>
      )}

      <div className="base64-heading">
        <div>
          <p className="tool-kicker">Encoding Utility</p>
          <h1>Base64 Tool</h1>
          <p>Encode and decode Base64 for text or files.</p>
        </div>
      </div>

      <div className="base64-control-card">
        <div className="base64-control-field">
          <span>Mode</span>
          <div className="base64-mode-control" aria-label="Base64 mode">
            <button className={`base64-segment ${mode === 'encode' ? 'is-active' : ''}`} onClick={() => setMode('encode')}>
              Encode
            </button>
            <button className={`base64-segment ${mode === 'decode' ? 'is-active' : ''}`} onClick={() => setMode('decode')}>
              Decode
            </button>
          </div>
        </div>

        <div className="base64-control-field">
          <span>Source</span>
          <div className="base64-mode-control" aria-label="Base64 source">
            <button className={`base64-segment ${source === 'text' ? 'is-active' : ''}`} onClick={() => setSource('text')}>
              Text
            </button>
            <button className={`base64-segment ${source === 'file' ? 'is-active' : ''}`} onClick={() => setSource('file')}>
              File
            </button>
          </div>
        </div>
      </div>

      {source === 'file' && (
        <div className="base64-file-card">
          {mode === 'encode' ? (
            <>
              <label className="base64-file-picker">
                File
                <input type="file" onChange={handleFileEncode} />
              </label>
              <span className="base64-file-summary">{fileSummary}</span>
            </>
          ) : (
            <>
              <label>
                Output filename
                <input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="decoded-file.bin" />
              </label>
              <label>
                MIME type
                <input value={fileMime} onChange={(event) => setFileMime(event.target.value)} placeholder="application/octet-stream" />
              </label>
              {downloadUrl && (
                <a className="btn btn-primary base64-download-link" href={downloadUrl} download={fileName || 'decoded-file.bin'}>
                  Download File
                </a>
              )}
            </>
          )}
        </div>
      )}

      <div className="base64-panels">
        <div className="base64-panel">
          <div className="base64-panel-header">
            <h3>{mode === 'encode' ? (source === 'text' ? 'Text Input' : 'File Input') : 'Base64 Input'}</h3>
            <p>{source === 'file' && mode === 'encode' ? 'Select a file above' : mode === 'encode' ? 'Text to encode' : 'Base64 to decode'}</p>
          </div>
          {source === 'file' && mode === 'encode' ? (
            <div className="base64-file-placeholder">
              <strong>{fileSummary}</strong>
            </div>
          ) : (
            <CodeEditor
              value={inputText}
              onChange={setInputText}
              placeholder={mode === 'encode' ? 'Enter text...' : 'Paste Base64...'}
              language="plain"
              softWrap
            />
          )}
        </div>

        <div className="base64-panel">
          <div className="base64-panel-header">
            <h3>{outputTitle}</h3>
            <p>{mode === 'encode' ? 'Base64 result' : source === 'text' ? 'Decoded UTF-8 text' : 'Decoded file result'}</p>
          </div>
          <CodeEditor value={outputText} onChange={setOutputText} placeholder="Output will be shown here..." language="plain" softWrap />
        </div>
      </div>

      <div className="base64-action-row">
        <button onClick={handleRun} className="btn btn-primary" disabled={source === 'file' && mode === 'encode' ? !outputText : !inputText.trim()}>
          {runLabel}
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
          {copyStatus === 'copied' ? 'Copied' : 'Copy'}
        </button>
        <button onClick={handleMoveToInput} className="btn btn-secondary" disabled={!outputText.trim()}>
          Move to Input
        </button>
        <button onClick={handleClear} className="btn btn-danger">
          Clear
        </button>
        {status && <span className={`base64-status is-${status.type}`}>{status.message}</span>}
      </div>
    </div>
  );
}
