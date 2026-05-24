import { type KeyboardEvent, useState } from 'react';
import { CodeEditor } from '../common/CodeEditor';
import './SqlGormTool.css';

type CopyStatus = 'idle' | 'copied' | 'failed';

interface ParsedColumn {
  name: string;
  sqlType: string;
  nullable: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  unique: boolean;
  defaultValue?: string;
}

const SAMPLE_SQL = `CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  age INT,
  active BOOLEAN DEFAULT true,
  balance DECIMAL(12,2),
  profile JSON,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);`;

const constraintStarters = ['primary', 'foreign', 'unique', 'key', 'index', 'constraint', 'check', 'exclude'];
const constraintWords = ['not', 'null', 'default', 'primary', 'unique', 'references', 'check', 'constraint', 'collate', 'comment', 'auto_increment', 'identity', 'generated'];
const initialisms = new Set(['id', 'uuid', 'url', 'api', 'ip', 'http', 'https', 'json', 'xml', 'sql']);

const cleanIdentifier = (value: string) => value
  .replace(/^[`"[]/, '')
  .replace(/[`"\]]$/, '')
  .split('.')
  .pop() || value;

const toPascalCase = (value: string) => cleanIdentifier(value)
  .split(/[_\s-]+/)
  .filter(Boolean)
  .map((part) => {
    const lower = part.toLowerCase();
    if (initialisms.has(lower)) return lower.toUpperCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  })
  .join('');

const singularize = (value: string) => {
  const cleaned = cleanIdentifier(value);
  if (cleaned.endsWith('ies')) return `${cleaned.slice(0, -3)}y`;
  if (cleaned.endsWith('ses')) return cleaned.slice(0, -2);
  if (cleaned.endsWith('s') && !cleaned.endsWith('ss')) return cleaned.slice(0, -1);
  return cleaned;
};

const splitTopLevel = (value: string) => {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const prev = value[index - 1];

    if (quote) {
      current += char;
      if (char === quote && prev !== '\\') quote = null;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(depth - 1, 0);

    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
};

const extractCreateTableBody = (sql: string) => {
  const tableMatch = sql.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([`"\[]?[\w.]+[`"\]]?)/i);
  if (!tableMatch || tableMatch.index === undefined) {
    throw new Error('CREATE TABLE statement not found.');
  }

  const tableName = cleanIdentifier(tableMatch[1]);
  const openIndex = sql.indexOf('(', tableMatch.index);
  if (openIndex === -1) throw new Error('CREATE TABLE body not found.');

  let depth = 0;
  let quote: string | null = null;
  for (let index = openIndex; index < sql.length; index += 1) {
    const char = sql[index];
    const prev = sql[index - 1];

    if (quote) {
      if (char === quote && prev !== '\\') quote = null;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return { tableName, body: sql.slice(openIndex + 1, index) };
      }
    }
  }

  throw new Error('CREATE TABLE closing parenthesis not found.');
};

const parseColumnLine = (line: string): ParsedColumn | null => {
    const match = line.match(/^([`"\[]?[\w]+[`"\]]?)\s+(.+)$/);
    if (!match) return null;

    const name = cleanIdentifier(match[1]);
    const rest = match[2];
    const tokens = rest.split(/\s+/);
    const typeTokens: string[] = [];

    for (const token of tokens) {
      const normalized = token.toLowerCase().replace(/[(),]/g, '');
      if (constraintWords.includes(normalized)) break;
      typeTokens.push(token);
    }

    const sqlType = typeTokens.join(' ');
    const defaultMatch = rest.match(/\bdefault\s+((?:'[^']*')|(?:"[^"]*")|[^\s,]+)/i);

    return {
      name,
      sqlType,
      nullable: !/\bnot\s+null\b/i.test(rest) && !/\bprimary\s+key\b/i.test(rest),
      primaryKey: /\bprimary\s+key\b/i.test(rest),
      autoIncrement: /\b(auto_increment|serial|bigserial|identity)\b/i.test(rest),
      unique: /\bunique\b/i.test(rest),
      defaultValue: defaultMatch?.[1],
    };
};

const parseColumns = (body: string): ParsedColumn[] => splitTopLevel(body)
  .map((line) => line.replace(/\s+/g, ' ').trim())
  .filter(Boolean)
  .filter((line) => !constraintStarters.includes(line.split(/\s+/)[0].toLowerCase()))
  .map(parseColumnLine)
  .filter((column): column is ParsedColumn => Boolean(column?.name && column.sqlType));

const goTypeForSqlType = (column: ParsedColumn, useNullablePointers: boolean) => {
  const sqlType = column.sqlType.toLowerCase();
  let goType = 'string';

  if (/\b(bigserial|bigint|int8)\b/.test(sqlType)) goType = column.primaryKey ? 'uint' : 'int64';
  else if (/\b(serial|integer|int|int4|mediumint)\b/.test(sqlType)) goType = column.primaryKey ? 'uint' : 'int';
  else if (/\b(smallint|int2)\b/.test(sqlType)) goType = 'int16';
  else if (/\b(tinyint)\b/.test(sqlType)) goType = sqlType.includes('tinyint(1)') ? 'bool' : 'int8';
  else if (/\b(bool|boolean)\b/.test(sqlType)) goType = 'bool';
  else if (/\b(decimal|numeric|double|float|real|money)\b/.test(sqlType)) goType = 'float64';
  else if (/\b(date|time|timestamp|datetime|timestamptz)\b/.test(sqlType)) goType = 'time.Time';
  else if (/\b(json|jsonb)\b/.test(sqlType)) goType = 'datatypes.JSON';
  else if (/\b(blob|bytea|binary|varbinary)\b/.test(sqlType)) goType = '[]byte';
  else if (/\b(uuid|char|varchar|text|citext|enum|set)\b/.test(sqlType)) goType = 'string';

  if (useNullablePointers && column.nullable && !column.primaryKey && !goType.startsWith('[]') && goType !== 'datatypes.JSON') {
    return `*${goType}`;
  }

  return goType;
};

const buildGormTag = (column: ParsedColumn) => {
  const parts = [`column:${column.name}`];
  if (column.primaryKey) parts.push('primaryKey');
  if (column.autoIncrement) parts.push('autoIncrement');
  if (!column.nullable) parts.push('not null');
  if (column.unique) parts.push('unique');
  if (column.defaultValue) parts.push(`default:${column.defaultValue.replace(/^['"]|['"]$/g, '')}`);
  return parts.join(';');
};

const generateGormStruct = (sql: string, packageName: string, useNullablePointers: boolean, includeTableName: boolean) => {
  const { tableName, body } = extractCreateTableBody(sql);
  const columns = parseColumns(body);
  if (!columns.length) throw new Error('No table columns found.');

  const structName = toPascalCase(singularize(tableName));
  const fields = columns.map((column) => {
    const fieldName = toPascalCase(column.name);
    const goType = goTypeForSqlType(column, useNullablePointers);
    return `\t${fieldName} ${goType} \`gorm:"${buildGormTag(column)}" json:"${column.name}"\``;
  });

  const imports = new Set<string>();
  const outputBody = fields.join('\n');
  if (outputBody.includes('time.Time')) imports.add('"time"');
  if (outputBody.includes('datatypes.JSON')) imports.add('"gorm.io/datatypes"');

  const importBlock = imports.size
    ? `\nimport (\n${Array.from(imports).map((item) => `\t${item}`).join('\n')}\n)\n`
    : '';

  const tableNameMethod = includeTableName
    ? `\nfunc (${structName}) TableName() string {\n\treturn "${tableName}"\n}\n`
    : '';

  return `package ${packageName || 'models'}\n${importBlock}\ntype ${structName} struct {\n${outputBody}\n}\n${tableNameMethod}`.replace(/\n{3,}/g, '\n\n').trim();
};

export function SqlGormTool() {
  const [inputSql, setInputSql] = useState(SAMPLE_SQL);
  const [outputGo, setOutputGo] = useState('');
  const [packageName, setPackageName] = useState('models');
  const [useNullablePointers, setUseNullablePointers] = useState(true);
  const [includeTableName, setIncludeTableName] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const textToCopy = outputGo || inputSql;

  const handleGenerate = () => {
    try {
      setOutputGo(generateGormStruct(inputSql, packageName, useNullablePointers, includeTableName));
      setStatus({ type: 'success', message: 'GORM model generated.' });
      setCopyStatus('idle');
    } catch (err: any) {
      setStatus({ type: 'error', message: `Generate failed: ${err.message}` });
    }
  };

  const handleClear = () => {
    setInputSql('');
    setOutputGo('');
    setStatus(null);
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
        console.error('Failed to copy GORM output: ', err);
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
    <div className="sql-gorm-tool-container">
      {copyStatus !== 'idle' && (
        <div className={`sql-gorm-toast ${copyStatus === 'failed' ? 'is-failed' : ''}`}>
          {copyStatus === 'copied' ? 'Copied to clipboard' : 'Clipboard blocked'}
        </div>
      )}

      <div className="sql-gorm-heading">
        <div>
          <p className="tool-kicker">Code Generator</p>
          <h1>SQL to GORM</h1>
          <p>Convert SQL CREATE TABLE statements into Go structs with GORM tags.</p>
        </div>
      </div>

      <div className="sql-gorm-control-card">
        <label>
          Package
          <input value={packageName} onChange={(event) => setPackageName(event.target.value)} placeholder="models" />
        </label>

        <label className="sql-gorm-check">
          <input type="checkbox" checked={useNullablePointers} onChange={(event) => setUseNullablePointers(event.target.checked)} />
          Nullable as pointers
        </label>

        <label className="sql-gorm-check">
          <input type="checkbox" checked={includeTableName} onChange={(event) => setIncludeTableName(event.target.checked)} />
          TableName method
        </label>
      </div>

      <div className="sql-gorm-panels">
        <div className="sql-gorm-panel">
          <div className="sql-gorm-panel-header">
            <h3>SQL Table</h3>
            <p>Paste CREATE TABLE schema</p>
          </div>
          <CodeEditor value={inputSql} onChange={setInputSql} placeholder="CREATE TABLE users (...)" language="sql" />
        </div>

        <div className="sql-gorm-panel">
          <div className="sql-gorm-panel-header">
            <h3>GORM Model</h3>
            <p>Editable Go output</p>
          </div>
          <CodeEditor value={outputGo} onChange={setOutputGo} placeholder="Generated Go struct will appear here..." language="plain" />
        </div>
      </div>

      <div className="sql-gorm-action-row">
        <button onClick={handleGenerate} className="btn btn-primary" disabled={!inputSql.trim()}>
          Generate GORM
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
        <button onClick={handleClear} className="btn btn-danger">
          Clear
        </button>
        {status && <span className={`sql-gorm-status is-${status.type}`}>{status.message}</span>}
      </div>
    </div>
  );
}
