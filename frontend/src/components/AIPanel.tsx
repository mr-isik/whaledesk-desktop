import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, History, CheckCircle, RefreshCcw, AlertCircle, Upload } from 'lucide-react';
import { GenerateRequest, GetHistory } from '../../wailsjs/go/bindings/AIBinding';
import { domain, ports } from '../../wailsjs/go/models';

interface AIPanelProps {
  onApply: (method: string, url: string, headers: Record<string, string>, payload: string) => void;
}

export default function AIPanel({ onApply }: AIPanelProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  
  // Generate State
  const [docInput, setDocInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ports.AIGenerateResponse | null>(null);

  // History State
  const [history, setHistory] = useState<domain.AIHistory[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    try {
      const hist = await GetHistory();
      setHistory(hist || []);
    } catch (e: any) {
      console.error("Failed to load AI history:", e);
    }
  };

  const handleGenerate = async () => {
    if (!docInput.trim()) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await GenerateRequest(docInput);
      setResult(res);
      // Background load history to keep it fresh
      loadHistory();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (method: string, url: string, headers: any, payload: string) => {
    // Determine headers format (map or json string depending on where it comes from)
    let parsedHeaders = headers;
    if (typeof headers === 'string' && headers.trim() !== '') {
        try { parsedHeaders = JSON.parse(headers); } catch (e) {}
    }
    
    onApply(method, url, parsedHeaders || {}, payload || '');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setDocInput(content);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
        <Sparkles size={16} color="var(--warning)" />
        <h3 style={{ fontSize: '13px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>AI Assistant</h3>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          className={`btn-outline ${activeTab === 'generate' ? 'active' : ''}`}
          style={{ flex: 1, padding: '6px', fontSize: '11px', height: '28px', background: activeTab === 'generate' ? 'var(--bg-tertiary)' : 'transparent' }}
          onClick={() => setActiveTab('generate')}
        >
          <Sparkles size={12} style={{ marginRight: '4px' }} /> Generate
        </button>
        <button 
          className={`btn-outline ${activeTab === 'history' ? 'active' : ''}`}
          style={{ flex: 1, padding: '6px', fontSize: '11px', height: '28px', background: activeTab === 'history' ? 'var(--bg-tertiary)' : 'transparent' }}
          onClick={() => setActiveTab('history')}
        >
          <History size={12} style={{ marginRight: '4px' }} /> History
        </button>
      </div>

      {activeTab === 'generate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Paste or upload OpenAPI doc
            </div>
            <input 
              type="file" 
              accept=".json,.yaml,.yml" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
            />
            <button 
              className="btn-outline" 
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '2px 6px', fontSize: '10px', height: '22px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Upload size={10} /> Upload File
            </button>
          </div>
          
          <textarea
            className="input-field"
            value={docInput}
            onChange={(e) => setDocInput(e.target.value)}
            placeholder="paths:\n  /users:\n    post:\n      summary: Create user..."
            style={{ 
              height: '120px', 
              fontSize: '11px', 
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              resize: 'vertical'
            }}
          />

          <button 
            className="btn-primary" 
            onClick={handleGenerate} 
            disabled={loading || !docInput.trim()}
            style={{ width: '100%', height: '32px', fontSize: '12px' }}
          >
            {loading ? <RefreshCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Generating...' : 'Generate Request'}
          </button>

          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '8px', borderRadius: 'var(--radius-sm)', fontSize: '11px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ wordBreak: 'break-word' }}>{error}</span>
            </div>
          )}

          {result && (
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge success`} style={{ fontSize: '10px' }}>{result.method}</span>
                <button 
                  className="btn-primary" 
                  onClick={() => handleApply(result.method, result.url, result.headers, result.body)}
                  style={{ padding: '4px 8px', fontSize: '10px', height: '24px' }}
                >
                  <CheckCircle size={12} style={{ marginRight: '4px' }} /> Apply
                </button>
              </div>
              <div style={{ fontSize: '11px', fontFamily: "var(--font-mono, 'Geist Mono', monospace)", wordBreak: 'break-all', color: 'var(--accent-primary)' }}>
                {result.url}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>
              No history found.
            </div>
          ) : (
            history.map(item => (
              <div key={item.id} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="badge" style={{ fontSize: '9px', background: 'var(--bg-secondary)' }}>{item.method}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      {new Date(item.created_at as string).toLocaleDateString()}
                    </span>
                  </div>
                  <button 
                    className="btn-outline" 
                    onClick={() => handleApply(item.method, item.url, item.headers, item.payload)}
                    style={{ padding: '2px 6px', fontSize: '9px', height: '20px' }}
                  >
                    Apply
                  </button>
                </div>
                <div style={{ fontSize: '10px', fontFamily: "var(--font-mono, 'Geist Mono', monospace)", color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.url}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
