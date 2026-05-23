import { useEffect, useState, useMemo } from 'react';
import { CodeEditor } from '../common/CodeEditor';
import './JsonToTable.css';

export function JsonToTable() {
  const [jsonInput, setJsonInput] = useState('');
  const [isTableView, setIsTableView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Table search and sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [visibleHeaders, setVisibleHeaders] = useState<string[]>([]);

  // Helper: recursive function to flatten nested objects into dot-separated keys
  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    const flattened: Record<string, any> = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const propName = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, flattenObject(obj[key], propName));
        } else if (Array.isArray(obj[key])) {
          flattened[propName] = JSON.stringify(obj[key]);
        } else {
          flattened[propName] = obj[key];
        }
      }
    }

    return flattened;
  };

  // Parse input and return flat rows list
  const rawRows = useMemo(() => {
    if (!jsonInput.trim()) return [];

    try {
      const parsed = JSON.parse(jsonInput);
      
      // If parsed JSON is an array of objects
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (typeof item === 'object' && item !== null) {
            return flattenObject(item);
          }
          return { value: item };
        });
      }
      
      // If parsed JSON is a single object
      if (typeof parsed === 'object' && parsed !== null) {
        // Can be rendered as single row or a list of properties
        // We'll flatten it and render as a single row
        return [flattenObject(parsed)];
      }

      // If it's a primitive value
      return [{ value: parsed }];
    } catch (e: any) {
      return [];
    }
  }, [jsonInput]);

  // Extract all unique headers/columns from the rows
  const headers = useMemo(() => {
    const headerSet = new Set<string>();
    rawRows.forEach((row) => {
      Object.keys(row).forEach((key) => headerSet.add(key));
    });
    return Array.from(headerSet);
  }, [rawRows]);

  useEffect(() => {
    setVisibleHeaders((currentHeaders) => {
      const availableHeaders = new Set(headers);
      const preservedHeaders = currentHeaders.filter((header) => availableHeaders.has(header));
      const newHeaders = headers.filter((header) => !currentHeaders.includes(header));
      return [...preservedHeaders, ...newHeaders];
    });
  }, [headers]);

  useEffect(() => {
    if (sortConfig && !visibleHeaders.includes(sortConfig.key)) {
      setSortConfig(null);
    }
  }, [sortConfig, visibleHeaders]);

  const toggleHeaderVisibility = (header: string) => {
    setVisibleHeaders((currentHeaders) => {
      if (currentHeaders.includes(header)) {
        return currentHeaders.filter((item) => item !== header);
      }
      return headers.filter((item) => item === header || currentHeaders.includes(item));
    });
  };

  // Process rows with filtering and sorting
  const processedRows = useMemo(() => {
    let rows = [...rawRows];

    // 1. Filter rows by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      rows = rows.filter((row) => {
        return visibleHeaders.some((header) => {
          const val = row[header];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(query);
        });
      });
    }

    // 2. Sort rows if sort config is present
    if (sortConfig) {
      const { key, direction } = sortConfig;
      rows.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];

        if (aVal === undefined || aVal === null) return direction === 'asc' ? 1 : -1;
        if (bVal === undefined || bVal === null) return direction === 'asc' ? -1 : 1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (aStr < bStr) return direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return rows;
  }, [rawRows, searchQuery, sortConfig, visibleHeaders]);

  const handleRenderTable = () => {
    if (!jsonInput.trim()) {
      setError('Please paste some JSON first.');
      return;
    }

    try {
      JSON.parse(jsonInput);
      setError(null);
      setIsTableView(true);
    } catch (e: any) {
      setError(`Invalid JSON: ${e.message}`);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Export to CSV string
  const generateCSV = (): string => {
    if (visibleHeaders.length === 0) return '';
    
    // Header row
    const csvHeader = visibleHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
    
    // Data rows
    const csvRows = rawRows.map(row => {
      return visibleHeaders.map(header => {
        const val = row[header];
        if (val === undefined || val === null) return '';
        const strVal = String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(',');
    });

    return [csvHeader, ...csvRows].join('\n');
  };

  const handleCopyCSV = () => {
    const csv = generateCSV();
    if (!csv) return;
    navigator.clipboard.writeText(csv)
      .then(() => alert('Copied CSV to clipboard!'))
      .catch(err => console.error('Failed to copy CSV: ', err));
  };

  const handleDownloadCSV = () => {
    const csv = generateCSV();
    if (!csv) return;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `devbox_export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyHTMLTable = () => {
    const tableElement = document.getElementById('interactive-extracted-table');
    if (!tableElement) return;

    // Direct string copy of table markup
    const html = tableElement.outerHTML;
    navigator.clipboard.writeText(html)
      .then(() => alert('Copied HTML table layout! Ready to paste into Excel/Sheets.'))
      .catch(err => console.error('Failed to copy table: ', err));
  };

  return (
    <div className="table-tool-container">
      {!isTableView ? (
        /* JSON input screen */
        <div className="input-view-container">
          <div className="tool-intro">
            <h2>JSON to Table Extractor</h2>
            <p>Paste a JSON object or array of objects. Devbox will flatten nested schemas and extract them into a clean, searchable, and exportable grid view.</p>
          </div>
          
          <div className="editor-wrapper">
            <CodeEditor
              value={jsonInput}
              onChange={(val) => {
                setJsonInput(val);
                if (error) setError(null);
              }}
              placeholder={`Example array input:\n[\n  { "id": 1, "user": { "name": "Alice", "role": "Admin" } },\n  { "id": 2, "user": { "name": "Bob", "role": "Member" } }\n]`}
            />
          </div>

          <div className="action-row">
            <button onClick={handleRenderTable} className="btn btn-primary btn-large">
              Extract to Table
            </button>
            <button 
              onClick={() => {
                setJsonInput(`[\n  { "id": 101, "product": "Premium Mouse", "price": 49.99, "stock": { "warehouse": 120, "retail": 15 } },\n  { "id": 102, "product": "Mechanical Keyboard", "price": 129.99, "stock": { "warehouse": 45, "retail": 8 } },\n  { "id": 103, "product": "UltraWide Monitor", "price": 399.99, "stock": { "warehouse": 12, "retail": 2 } }\n]`);
                setError(null);
              }} 
              className="btn btn-secondary"
            >
              Load Example
            </button>
          </div>

          {error && (
            <div className="error-panel">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          )}
        </div>
      ) : (
        /* Table visualization screen */
        <div className="table-view-container">
          <div className="table-header-toolbar">
            <button onClick={() => setIsTableView(false)} className="btn btn-secondary btn-icon-left">
              ← Edit JSON
            </button>

            <div className="table-actions-group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rows..."
                className="table-search-input"
              />
              <button onClick={handleCopyCSV} className="btn btn-secondary btn-sm" title="Copy as CSV">
                Copy CSV
              </button>
              <button onClick={handleDownloadCSV} className="btn btn-secondary btn-sm" title="Download CSV File">
                Download CSV
              </button>
              <button onClick={handleCopyHTMLTable} className="btn btn-secondary btn-sm" title="Copy clean HTML table for Excel">
                Copy Excel Table
              </button>
            </div>
          </div>

          <div className="grid-summary">
            <span>Showing {processedRows.length} of {rawRows.length} items parsed</span>
            <span>{visibleHeaders.length} of {headers.length} columns visible</span>
            {searchQuery && <button onClick={() => setSearchQuery('')} className="clear-search-btn">Clear search</button>}
          </div>

          <div className="column-filter-panel">
            <div className="column-filter-header">
              <span>Visible headers</span>
              <div className="column-filter-actions">
                <button onClick={() => setVisibleHeaders(headers)} className="clear-search-btn">
                  Select all
                </button>
                <button onClick={() => setVisibleHeaders([])} className="clear-search-btn">
                  Hide all
                </button>
              </div>
            </div>
            <div className="column-filter-list">
              {headers.map((header) => (
                <label key={header} className="column-filter-option">
                  <input
                    type="checkbox"
                    checked={visibleHeaders.includes(header)}
                    onChange={() => toggleHeaderVisibility(header)}
                  />
                  <span>{header}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="table-wrapper">
            {visibleHeaders.length === 0 ? (
              <div className="empty-results">
                <p>Select at least one header to show the table.</p>
              </div>
            ) : processedRows.length > 0 ? (
              <table id="interactive-extracted-table" className="extracted-table">
                <thead>
                  <tr>
                    {visibleHeaders.map((header) => {
                      const isSorted = sortConfig?.key === header;
                      return (
                        <th 
                          key={header} 
                          onClick={() => handleSort(header)}
                          className={`sortable-header ${isSorted ? 'is-sorted' : ''}`}
                        >
                          <div className="th-content">
                            <span>{header}</span>
                            <span className="sort-icon">
                              {isSorted ? (sortConfig?.direction === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {processedRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {visibleHeaders.map((header) => {
                        const cellValue = row[header];
                        return (
                          <td key={header}>
                            {cellValue === null || cellValue === undefined ? (
                              <span className="cell-null">null</span>
                            ) : typeof cellValue === 'boolean' ? (
                              <span className={`cell-bool ${cellValue ? 'is-true' : 'is-false'}`}>
                                {cellValue.toString()}
                              </span>
                            ) : (
                              String(cellValue)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-results">
                <p>No matching rows found for your search query.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
