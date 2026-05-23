import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import './UuidGenerator.css';

type UuidVersion = 'v4' | 'v7';

const getRandomBytes = (length: number) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const bytesToUuid = (bytes: Uint8Array) => {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const generateUuidV4 = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = getRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
};

const generateUuidV7 = () => {
  const bytes = getRandomBytes(16);
  const timestamp = Date.now();

  bytes[0] = Math.floor(timestamp / 0x10000000000) & 0xff;
  bytes[1] = Math.floor(timestamp / 0x100000000) & 0xff;
  bytes[2] = Math.floor(timestamp / 0x1000000) & 0xff;
  bytes[3] = Math.floor(timestamp / 0x10000) & 0xff;
  bytes[4] = Math.floor(timestamp / 0x100) & 0xff;
  bytes[5] = timestamp & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUuid(bytes);
};

const generateUuid = (version: UuidVersion) => {
  if (version === 'v7') return generateUuidV7();
  return generateUuidV4();
};

export function UuidGenerator() {
  const [version, setVersion] = useState<UuidVersion>('v4');
  const [uuid, setUuid] = useState(() => generateUuid('v4'));
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const uuidInputRef = useRef<HTMLInputElement>(null);

  const refreshUuid = (nextVersion = version) => {
    setUuid(generateUuid(nextVersion));
    setCopyStatus('idle');
  };

  useEffect(() => {
    refreshUuid(version);
  }, [version]);

  const handleVersionChange = (nextVersion: UuidVersion) => {
    setVersion(nextVersion);
  };

  const handleCopy = () => {
    const showStatus = (status: 'copied' | 'failed') => {
      setCopyStatus(status);
      window.setTimeout(() => setCopyStatus('idle'), 1600);
    };

    const copyWithSelection = () => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = uuid;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.width = '1px';
        textarea.style.height = '1px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, uuid.length);

        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        return copied;
      } catch (err) {
        console.error('Failed to copy UUID: ', err);
        return false;
      }
    };

    if (copyWithSelection()) {
      showStatus('copied');
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(uuid)
        .then(() => showStatus('copied'))
        .catch(() => {
          uuidInputRef.current?.focus();
          uuidInputRef.current?.select();
          showStatus('failed');
        });
      return;
    }

    uuidInputRef.current?.focus();
    uuidInputRef.current?.select();
    showStatus('failed');
  };

  const handleCopyKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCopy();
    }
  };

  return (
    <div className="uuid-tool-container">
      <div className="uuid-heading">
        <div>
          <p className="tool-kicker">Identifier Utility</p>
          <h1>UUID Generator</h1>
          <p>Generate fresh UUIDs for database keys, fixtures, request IDs, and development workflows.</p>
        </div>
      </div>

      <div className="uuid-card">
        <div className="uuid-toolbar">
          <div className="uuid-version-control" aria-label="UUID version">
            <button
              type="button"
              className={`uuid-segment ${version === 'v4' ? 'is-active' : ''}`}
              onClick={() => handleVersionChange('v4')}
            >
              UUID v4
            </button>
            <button
              type="button"
              className={`uuid-segment ${version === 'v7' ? 'is-active' : ''}`}
              onClick={() => handleVersionChange('v7')}
            >
              UUID v7
            </button>
          </div>

          <button onClick={() => refreshUuid()} className="btn btn-primary uuid-refresh-btn" title="Generate new UUID">
            Refresh
          </button>
        </div>

        <div className="uuid-output-panel">
          <label htmlFor="generated-uuid">Generated UUID</label>
          <div className="uuid-output-row">
            <input id="generated-uuid" ref={uuidInputRef} value={uuid} readOnly className="uuid-output-input" />
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                handleCopy();
              }}
              onKeyDown={handleCopyKeyDown}
              className="btn btn-secondary uuid-copy-btn"
            >
              {copyStatus === 'copied' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {copyStatus !== 'idle' && (
          <div className={`uuid-copy-notice ${copyStatus === 'failed' ? 'is-failed' : ''}`} role="status" aria-live="polite">
              {copyStatus === 'copied' ? 'UUID copied to clipboard' : 'Clipboard blocked. UUID selected, press Cmd/Ctrl+C.'}
          </div>
        )}

        <div className="uuid-meta">
          <span>Current type: UUID {version.toUpperCase()}</span>
          <span>Refresh or reload creates a new value</span>
        </div>
      </div>
    </div>
  );
}
