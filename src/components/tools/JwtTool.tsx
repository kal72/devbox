import { type KeyboardEvent, useState } from 'react';
import { CodeEditor } from '../common/CodeEditor';
import './JwtTool.css';

type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512';
type JwtMode = 'encode' | 'decode';
type CopyStatus = 'idle' | 'copied' | 'failed';

const algorithmHashMap: Record<JwtAlgorithm, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const base64UrlEncode = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlEncodeText = (value: string) => {
  return base64UrlEncode(textEncoder.encode(value));
};

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const base64UrlDecodeText = (value: string) => {
  return textDecoder.decode(base64UrlDecode(value));
};

const signJwt = async (data: string, secret: string, algorithm: JwtAlgorithm) => {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: algorithmHashMap[algorithm] },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(data));
  return base64UrlEncode(new Uint8Array(signature));
};

const safePrettyJson = (value: unknown) => JSON.stringify(value, null, 2);

export function JwtTool() {
  const [mode, setMode] = useState<JwtMode>('decode');
  const [algorithm, setAlgorithm] = useState<JwtAlgorithm>('HS256');
  const [secret, setSecret] = useState('devbox-secret');
  const [showSecret, setShowSecret] = useState(false);
  const [headerJson, setHeaderJson] = useState(safePrettyJson({ alg: 'HS256', typ: 'JWT' }));
  const [payloadJson, setPayloadJson] = useState(safePrettyJson({
    sub: '1234567890',
    name: 'John Doe',
    iat: Math.floor(Date.now() / 1000),
  }));
  const [token, setToken] = useState('');
  const [decodedHeader, setDecodedHeader] = useState('');
  const [decodedPayload, setDecodedPayload] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const showStatus = (type: 'success' | 'error' | 'warning', message: string) => {
    setStatus({ type, message });
  };

  const handleEncode = async () => {
    try {
      const parsedHeader = JSON.parse(headerJson);
      const parsedPayload = JSON.parse(payloadJson);
      const header = { ...parsedHeader, alg: algorithm, typ: parsedHeader.typ || 'JWT' };
      const signingInput = `${base64UrlEncodeText(JSON.stringify(header))}.${base64UrlEncodeText(JSON.stringify(parsedPayload))}`;
      const signature = await signJwt(signingInput, secret, algorithm);
      const nextToken = `${signingInput}.${signature}`;

      setHeaderJson(safePrettyJson(header));
      setToken(nextToken);
      setDecodedHeader('');
      setDecodedPayload('');
      showStatus('success', `Token encoded with ${algorithm}.`);
      setCopyStatus('idle');
    } catch (err: any) {
      showStatus('error', `Encode failed: ${err.message}`);
    }
  };

  const handleDecode = async () => {
    try {
      const parts = token.trim().split('.');
      if (parts.length !== 3) {
        showStatus('error', 'JWT must contain header, payload, and signature segments.');
        return;
      }

      const parsedHeader = JSON.parse(base64UrlDecodeText(parts[0]));
      const parsedPayload = JSON.parse(base64UrlDecodeText(parts[1]));
      setDecodedHeader(safePrettyJson(parsedHeader));
      setDecodedPayload(safePrettyJson(parsedPayload));

      const tokenAlgorithm = parsedHeader.alg as JwtAlgorithm;
      if (!['HS256', 'HS384', 'HS512'].includes(tokenAlgorithm)) {
        showStatus('warning', `Decoded token, but ${parsedHeader.alg || 'unknown alg'} cannot be verified here.`);
        return;
      }

      setAlgorithm(tokenAlgorithm);
      if (!secret) {
        showStatus('warning', 'Decoded token. Add a key to verify the signature.');
        return;
      }

      const expectedSignature = await signJwt(`${parts[0]}.${parts[1]}`, secret, tokenAlgorithm);
      showStatus(
        expectedSignature === parts[2] ? 'success' : 'error',
        expectedSignature === parts[2] ? `Signature verified with ${tokenAlgorithm}.` : 'Signature does not match this key.',
      );
    } catch (err: any) {
      showStatus('error', `Decode failed: ${err.message}`);
    }
  };

  const handleCopy = () => {
    if (!token) return;

    const setTimedCopyStatus = (nextStatus: CopyStatus) => {
      setCopyStatus(nextStatus);
      window.setTimeout(() => setCopyStatus('idle'), 1600);
    };

    const copyWithSelection = () => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = token;
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
        console.error('Failed to copy JWT: ', err);
        return false;
      }
    };

    if (copyWithSelection()) {
      setTimedCopyStatus('copied');
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(token)
        .then(() => setTimedCopyStatus('copied'))
        .catch(() => setTimedCopyStatus('failed'));
      return;
    }

    setTimedCopyStatus('failed');
  };

  const handleCopyKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCopy();
    }
  };

  const renderColoredToken = (value: string) => {
    const [header, payload, signature] = value.split('.');
    if (!header || !payload || !signature) return value;

    return (
      <>
        <span className="jwt-token-header">{header}</span>
        <span className="jwt-token-dot">.</span>
        <span className="jwt-token-payload">{payload}</span>
        <span className="jwt-token-dot">.</span>
        <span className="jwt-token-signature">{signature}</span>
      </>
    );
  };

  return (
    <div className="jwt-tool-container">
      <div className="jwt-heading">
        <div>
          <p className="tool-kicker">Token Utility</p>
          <h1>JWT Encode / Decode</h1>
          <p>Create HMAC-signed JWTs, decode tokens, and verify signatures with a custom key.</p>
        </div>
      </div>

      <div className="jwt-control-card">
        <div className="jwt-mode-control" aria-label="JWT mode">
          <button className={`jwt-segment ${mode === 'decode' ? 'is-active' : ''}`} onClick={() => setMode('decode')}>
            Decode
          </button>
          <button className={`jwt-segment ${mode === 'encode' ? 'is-active' : ''}`} onClick={() => setMode('encode')}>
            Encode
          </button>
        </div>

        <div className="jwt-options">
          <label>
            Algorithm
            <select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as JwtAlgorithm)}>
              <option value="HS256">HS256</option>
              <option value="HS384">HS384</option>
              <option value="HS512">HS512</option>
            </select>
          </label>
          <div className="jwt-secret-field">
            <label htmlFor="jwt-secret-key">Secret key</label>
            <div className="jwt-secret-input-row">
              <input
                id="jwt-secret-key"
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder="Enter secret key"
              />
              <button
                type="button"
                onClick={() => setShowSecret((current) => !current)}
                className="jwt-secret-toggle"
                aria-label={showSecret ? 'Hide secret key' : 'Show secret key'}
                title={showSecret ? 'Hide secret key' : 'Show secret key'}
              >
                {showSecret ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3l18 18"></path>
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path>
                    <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 9 4.7 10 8a11.8 11.8 0 0 1-2.3 3.8"></path>
                    <path d="M6.6 6.6C4.3 8.1 2.8 10.4 2 12c1 3.3 5 8 10 8a10.8 10.8 0 0 0 4.2-.8"></path>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {mode === 'encode' ? (
        <div className="jwt-workspace">
          <div className="jwt-panel">
            <div className="jwt-panel-header">
              <h3>Header</h3>
              <p>Algorithm is synced from selector</p>
            </div>
            <CodeEditor value={headerJson} onChange={setHeaderJson} />
          </div>
          <div className="jwt-panel">
            <div className="jwt-panel-header">
              <h3>Payload</h3>
              <p>Claims as JSON</p>
            </div>
            <CodeEditor value={payloadJson} onChange={setPayloadJson} />
          </div>
        </div>
      ) : (
        <div className="jwt-token-panel">
          <label htmlFor="jwt-token-input">JWT token</label>
          <textarea
            id="jwt-token-input"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste JWT token here..."
            spellCheck={false}
          />
        </div>
      )}

      <div className="jwt-action-row">
        {mode === 'encode' ? (
          <button onClick={handleEncode} className="btn btn-primary">Encode JWT</button>
        ) : (
          <button onClick={handleDecode} className="btn btn-primary">Decode & Verify</button>
        )}
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            handleCopy();
          }}
          onKeyDown={handleCopyKeyDown}
          className="btn btn-secondary"
          disabled={!token}
        >
          {copyStatus === 'copied' ? 'Copied' : 'Copy Token'}
        </button>
      </div>

      {token && (
        <div className="jwt-result-card">
          <div className="jwt-result-header">
            <h3>Token</h3>
            {copyStatus !== 'idle' && (
              <span className={`jwt-copy-status ${copyStatus === 'failed' ? 'is-failed' : ''}`}>
                {copyStatus === 'copied' ? 'Copied to clipboard' : 'Clipboard blocked'}
              </span>
            )}
          </div>
          <code>{renderColoredToken(token)}</code>
        </div>
      )}

      {mode === 'decode' && (decodedHeader || decodedPayload) && (
        <div className="jwt-workspace">
          <div className="jwt-panel">
            <div className="jwt-panel-header">
              <h3>Decoded Header</h3>
              <p>Base64URL decoded JSON</p>
            </div>
            <CodeEditor value={decodedHeader} onChange={() => {}} readOnly />
          </div>
          <div className="jwt-panel">
            <div className="jwt-panel-header">
              <h3>Decoded Payload</h3>
              <p>Claims content</p>
            </div>
            <CodeEditor value={decodedPayload} onChange={() => {}} readOnly />
          </div>
        </div>
      )}

      {status && (
        <div className={`jwt-status is-${status.type}`} role="status" aria-live="polite">
          {status.message}
        </div>
      )}
    </div>
  );
}
