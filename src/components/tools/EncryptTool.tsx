import { type KeyboardEvent, useState } from 'react';
import { CodeEditor } from '../common/CodeEditor';
import './EncryptTool.css';

type EncryptMode = 'encrypt' | 'decrypt';
type EncryptAlgorithm = 'AES-CBC' | 'RSA-OAEP';
type AesKeySize = 128 | 192 | 256;
type CopyStatus = 'idle' | 'copied' | 'failed';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const bufferToBase64 = (buffer: ArrayBuffer) => bytesToBase64(new Uint8Array(buffer));

const base64ToArrayBuffer = (value: string) => base64ToBytes(value).buffer;

const arrayBufferToPem = (buffer: ArrayBuffer, label: string) => {
  const base64 = bufferToBase64(buffer);
  const lines = base64.match(/.{1,64}/g)?.join('\n') ?? base64;
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
};

const pemToArrayBuffer = (pem: string) => {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s/g, '');
  return base64ToArrayBuffer(base64);
};

const deriveAesKey = async (secret: string, keySize: AesKeySize) => {
  const digest = await crypto.subtle.digest('SHA-512', encoder.encode(secret));
  const keyBytes = new Uint8Array(digest).slice(0, keySize / 8);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
};

const importRsaPublicKey = (pem: string) => crypto.subtle.importKey(
  'spki',
  pemToArrayBuffer(pem),
  { name: 'RSA-OAEP', hash: 'SHA-256' },
  false,
  ['encrypt'],
);

const importRsaPrivateKey = (pem: string) => crypto.subtle.importKey(
  'pkcs8',
  pemToArrayBuffer(pem),
  { name: 'RSA-OAEP', hash: 'SHA-256' },
  false,
  ['decrypt'],
);

export function EncryptTool() {
  const [mode, setMode] = useState<EncryptMode>('encrypt');
  const [algorithm, setAlgorithm] = useState<EncryptAlgorithm>('AES-CBC');
  const [keySize, setKeySize] = useState<AesKeySize>(256);
  const [secret, setSecret] = useState('devbox-secret');
  const [showSecret, setShowSecret] = useState(false);
  const [ivText, setIvText] = useState('');
  const [rsaPublicKey, setRsaPublicKey] = useState('');
  const [rsaPrivateKey, setRsaPrivateKey] = useState('');
  const [inputText, setInputText] = useState('Hello from Devbox');
  const [outputText, setOutputText] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>({
    type: 'warning',
    message: 'AES-CBC uses Secret Key and IV. RSA-OAEP uses public/private PEM keys.',
  });
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const handleAesEncrypt = async () => {
    try {
      if (!secret) throw new Error('Secret key is required.');
      const iv = crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveAesKey(secret, keySize);
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, encoder.encode(inputText));
      setIvText(bytesToBase64(iv));
      setOutputText(bytesToBase64(new Uint8Array(encrypted)));
      setStatus({ type: 'success', message: `Text encrypted with AES-${keySize}-CBC. Keep the IV for decrypt.` });
      setCopyStatus('idle');
    } catch (err: any) {
      setStatus({ type: 'error', message: `Encrypt failed: ${err.message}` });
    }
  };

  const handleAesDecrypt = async () => {
    try {
      if (!secret) throw new Error('Secret key is required.');
      if (!ivText.trim()) throw new Error('IV is required for AES-CBC decrypt.');
      const iv = base64ToBytes(ivText.trim());
      if (iv.length !== 16) throw new Error('IV must be a 16-byte Base64 value.');
      const key = await deriveAesKey(secret, keySize);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        key,
        base64ToBytes(inputText.trim()),
      );
      setOutputText(decoder.decode(decrypted));
      setStatus({ type: 'success', message: `Ciphertext decrypted with AES-${keySize}-CBC.` });
      setCopyStatus('idle');
    } catch (err: any) {
      setStatus({ type: 'error', message: `Decrypt failed: ${err.message}` });
    }
  };

  const handleRsaEncrypt = async () => {
    try {
      if (!rsaPublicKey.trim()) throw new Error('RSA public key is required.');
      const key = await importRsaPublicKey(rsaPublicKey);
      const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, encoder.encode(inputText));
      setOutputText(bufferToBase64(encrypted));
      setStatus({ type: 'success', message: 'Text encrypted with RSA-OAEP SHA-256.' });
      setCopyStatus('idle');
    } catch (err: any) {
      setStatus({ type: 'error', message: `Encrypt failed: ${err.message}` });
    }
  };

  const handleRsaDecrypt = async () => {
    try {
      if (!rsaPrivateKey.trim()) throw new Error('RSA private key is required.');
      const key = await importRsaPrivateKey(rsaPrivateKey);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        key,
        base64ToArrayBuffer(inputText.trim()),
      );
      setOutputText(decoder.decode(decrypted));
      setStatus({ type: 'success', message: 'Ciphertext decrypted with RSA-OAEP SHA-256.' });
      setCopyStatus('idle');
    } catch (err: any) {
      setStatus({ type: 'error', message: `Decrypt failed: ${err.message}` });
    }
  };

  const handleGenerateRsaKeys = async () => {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt'],
      );
      const [publicKey, privateKey] = await Promise.all([
        crypto.subtle.exportKey('spki', keyPair.publicKey),
        crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
      ]);
      setRsaPublicKey(arrayBufferToPem(publicKey, 'PUBLIC KEY'));
      setRsaPrivateKey(arrayBufferToPem(privateKey, 'PRIVATE KEY'));
      setStatus({ type: 'success', message: 'RSA 2048-bit key pair generated.' });
    } catch (err: any) {
      setStatus({ type: 'error', message: `Key generation failed: ${err.message}` });
    }
  };

  const handleRun = () => {
    if (algorithm === 'RSA-OAEP') {
      if (mode === 'encrypt') {
        void handleRsaEncrypt();
        return;
      }
      void handleRsaDecrypt();
      return;
    }

    if (mode === 'encrypt') {
      void handleAesEncrypt();
      return;
    }
    void handleAesDecrypt();
  };

  const handleUseOutput = () => {
    setInputText(outputText);
    setOutputText('');
    setMode('decrypt');
    setCopyStatus('idle');
  };

  const activeRsaKey = mode === 'encrypt' ? rsaPublicKey : rsaPrivateKey;
  const setActiveRsaKey = mode === 'encrypt' ? setRsaPublicKey : setRsaPrivateKey;
  const runLabel = mode === 'encrypt'
    ? `Encrypt ${algorithm === 'AES-CBC' ? 'AES' : 'RSA'}`
    : `Decrypt ${algorithm === 'AES-CBC' ? 'AES' : 'RSA'}`;
  const textToCopy = outputText || inputText;

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
        console.error('Failed to copy encrypted text: ', err);
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

  return (
    <div className="encrypt-tool-container">
      <div className="encrypt-heading">
        <div>
          <p className="tool-kicker">Crypto Utility</p>
          <h1>Crypto Tool</h1>
          <p>Encrypt and decrypt text payloads with AES-CBC or RSA-OAEP.</p>
        </div>
      </div>

      <div className="encrypt-control-card">
        <label className="encrypt-algorithm-field">
          Algorithm
          <select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as EncryptAlgorithm)}>
            <option value="AES-CBC">AES-CBC</option>
            <option value="RSA-OAEP">RSA-OAEP</option>
          </select>
        </label>

        <div className="encrypt-control-field">
          <span aria-hidden="true">Mode</span>
          <div className="encrypt-mode-control" aria-label="Encrypt tool mode">
            <button className={`encrypt-segment ${mode === 'encrypt' ? 'is-active' : ''}`} onClick={() => setMode('encrypt')}>
              Encrypt
            </button>
            <button className={`encrypt-segment ${mode === 'decrypt' ? 'is-active' : ''}`} onClick={() => setMode('decrypt')}>
              Decrypt
            </button>
          </div>
        </div>
      </div>

      <div className="encrypt-config-card">
        {algorithm === 'AES-CBC' ? (
          <div className="encrypt-options">
            <label>
              Key size
              <select value={keySize} onChange={(event) => setKeySize(Number(event.target.value) as AesKeySize)}>
                <option value={128}>128-bit</option>
                <option value={192}>192-bit</option>
                <option value={256}>256-bit</option>
              </select>
            </label>

            <div className="encrypt-secret-field">
              <label htmlFor="encrypt-secret-key">Secret key</label>
              <div className="encrypt-secret-input-row">
                <input
                  id="encrypt-secret-key"
                  type={showSecret ? 'text' : 'password'}
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  placeholder="Enter secret key"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((current) => !current)}
                  className="encrypt-secret-toggle"
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

            <label className="encrypt-iv-field">
              IV
              <input
                value={ivText}
                onChange={(event) => setIvText(event.target.value)}
                placeholder="Leave empty to auto-generate a random IV"
              />
            </label>
          </div>
        ) : (
          <div className="encrypt-rsa-config">
            <div className="encrypt-options">
              <label>
                Key size
                <select value="2048" disabled>
                  <option value="2048">2048-bit</option>
                </select>
              </label>
              <div className="encrypt-control-field">
                <span aria-hidden="true">Action</span>
                <button type="button" onClick={handleGenerateRsaKeys} className="btn btn-secondary">
                  Generate Key Pair
                </button>
              </div>
            </div>

            <div className="encrypt-rsa-active-key">
              <div className="encrypt-rsa-key-label">
                <div>
                  <h4>{mode === 'encrypt' ? 'Public Key' : 'Private Key'}</h4>
                  <p>{mode === 'encrypt' ? 'Used for encrypt' : 'Used for decrypt'}</p>
                </div>
              </div>
              <textarea
                key={mode}
                value={activeRsaKey}
                onChange={(event) => setActiveRsaKey(event.target.value)}
                placeholder={mode === 'encrypt'
                  ? 'Paste RSA public key PEM or generate a key pair...'
                  : 'Paste RSA private key PEM or generate a key pair...'}
                className="encrypt-rsa-key-textarea"
                spellCheck={false}
                wrap="soft"
              />
            </div>
          </div>
        )}
      </div>

      <div className="encrypt-panels">
        <div className="encrypt-panel">
          <div className="encrypt-panel-header">
            <h3>{mode === 'encrypt' ? 'Plain Text' : 'Ciphertext'}</h3>
            <p>{mode === 'encrypt' ? 'Text to encrypt' : 'Paste Base64 encrypted result'}</p>
          </div>
          <CodeEditor value={inputText} onChange={setInputText} placeholder={mode === 'encrypt' ? 'Enter plain text...' : 'Paste encrypted Base64 ciphertext...'} language="plain" />
        </div>

        <div className="encrypt-panel">
          <div className="encrypt-panel-header">
            <h3>{mode === 'encrypt' ? 'Encrypted Output' : 'Decrypted Text'}</h3>
            <p>{mode === 'encrypt' ? 'Base64 ciphertext' : 'Plain text result'}</p>
          </div>
          <CodeEditor value={outputText} onChange={setOutputText} placeholder="Output will be shown here..." language="plain" />
        </div>
      </div>

      <div className="encrypt-action-row encrypt-work-actions">
        <button onClick={handleRun} className="btn btn-primary" disabled={!inputText.trim()}>
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
        <button onClick={handleUseOutput} className="btn btn-secondary" disabled={!outputText.trim()}>
          Move to Input
        </button>
        <button
          onClick={() => {
            setInputText('');
            setOutputText('');
            setIvText('');
            setCopyStatus('idle');
          }}
          className="btn btn-danger"
        >
          Clear
        </button>
      </div>

      {algorithm === 'RSA-OAEP' && (
        <div className="encrypt-rsa-key-summary">
          <span>Stored keys:</span>
          <strong>{rsaPublicKey.trim() ? 'Public ready' : 'Public empty'}</strong>
          <strong>{rsaPrivateKey.trim() ? 'Private ready' : 'Private empty'}</strong>
        </div>
      )}

      {(status || copyStatus !== 'idle') && (
        <div className="encrypt-footer">
          {status && <span className={`encrypt-status is-${status.type}`}>{status.message}</span>}
          {copyStatus !== 'idle' && (
            <span className={`encrypt-copy-status ${copyStatus === 'failed' ? 'is-failed' : ''}`}>
              {copyStatus === 'copied' ? 'Copied to clipboard' : 'Clipboard blocked'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
