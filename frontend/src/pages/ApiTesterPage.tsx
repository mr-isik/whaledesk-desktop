import React, { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { ExecuteRequest } from '../../wailsjs/go/bindings/APIBinding';
import { domain } from '../../wailsjs/go/models';

export default function ApiTesterPage() {
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [method, setMethod] = useState('GET');
  const [payload, setPayload] = useState('');
  const [response, setResponse] = useState<domain.APIRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await ExecuteRequest(method, url, payload);
      setResponse(res);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h1 className="page-title">API Tester</h1>
      <p className="page-subtitle">Send HTTP requests and test your services</p>

      <div className="glass-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <select 
            value={method} 
            onChange={(e) => setMethod(e.target.value)}
            className="input-field"
            style={{ width: '100px' }}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
          
          <input 
            type="text" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL (e.g. https://api.example.com/data)"
            className="input-field"
            style={{ flex: 1, fontFamily: 'monospace' }}
          />

          <button className="btn-primary" onClick={handleSend} disabled={loading} style={{ padding: '8px 16px' }}>
            <Send size={14} />
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500' }}>Request Body (JSON)</label>
          <textarea 
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="{}"
            className="input-field"
            style={{ 
              height: '90px', 
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* Response Area */}
      {error && (
        <div className="glass-card" style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', marginBottom: '16px' }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {response && !error && (
        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Response</h3>
            <span className={`badge ${response.status >= 200 && response.status < 300 ? 'success' : 'danger'}`} style={{ fontSize: '10px' }}>
              Status: {response.status}
            </span>
          </div>
          
          <pre style={{ 
            flex: 1,
            margin: 0,
            padding: '12px', 
            background: 'var(--bg-primary)', 
            borderRadius: 'var(--radius-sm)', 
            overflow: 'auto',
            color: 'var(--text-primary)',
            fontFamily: 'monospace',
            fontSize: '13px',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            border: '1px solid var(--border)'
          }}>
            {response.response}
          </pre>
        </div>
      )}
    </div>
  );
}
