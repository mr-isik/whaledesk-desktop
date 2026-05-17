import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, Copy, Search, ChevronDown, CheckCircle } from 'lucide-react';
import { ExecuteRequestWithEnv, ListEnvironments, SetActiveEnvironment } from '../../wailsjs/go/bindings/EnvBinding';
import { ExecuteRequest } from '../../wailsjs/go/bindings/APIBinding';
import { domain } from '../../wailsjs/go/models';

export default function ApiTesterPage() {
  const [url, setUrl] = useState('{{base_url}}/users');
  const [method, setMethod] = useState('GET');
  const [payload, setPayload] = useState('');
  const [response, setResponse] = useState<domain.APIRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Environment state
  const [environments, setEnvironments] = useState<domain.Environment[]>([]);
  const [activeEnv, setActiveEnv] = useState<domain.Environment | null>(null);
  const [showEnvDropdown, setShowEnvDropdown] = useState(false);
  
  // Variables Panel
  const [searchVar, setSearchVar] = useState('');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = async () => {
    try {
      const data = await ListEnvironments();
      setEnvironments(data || []);
      const active = data?.find(e => e.is_active);
      setActiveEnv(active || null);
    } catch (err: any) {
      console.error("Failed to load environments:", err);
    }
  };

  const handleEnvChange = async (id: string) => {
    try {
      await SetActiveEnvironment(id);
      setShowEnvDropdown(false);
      loadEnvironments();
    } catch (err: any) {
      console.error("Failed to set active environment:", err);
    }
  };

  const handleSend = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    
    try {
      // If there's no active environment, use the standard request, otherwise use EnvBinding
      let res;
      if (activeEnv) {
        res = await ExecuteRequestWithEnv(method, url, payload);
      } else {
        res = await ExecuteRequest(method, url, payload);
      }
      setResponse(res);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (key: string) => {
    const formatted = `{{${key}}}`;
    navigator.clipboard.writeText(formatted);
    setCopiedVar(key);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const insertVariable = (key: string) => {
    const formatted = `{{${key}}}`;
    // A simple approach: append to URL if it's empty, otherwise user probably copies it
    navigator.clipboard.writeText(formatted);
    setCopiedVar(key);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const filteredVars = activeEnv?.variables?.filter(v => 
    v.key.toLowerCase().includes(searchVar.toLowerCase()) || 
    v.description?.toLowerCase().includes(searchVar.toLowerCase())
  ) || [];

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%' }}>
      
      {/* MAIN TESTER AREA */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: '4px' }}>API Tester</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>Send HTTP requests and test your services</p>
          </div>

          {/* Environment Selector */}
          <div style={{ position: 'relative' }}>
            <div 
              className="glass-card" 
              style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', background: 'var(--bg-tertiary)' }}
              onClick={() => setShowEnvDropdown(!showEnvDropdown)}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeEnv ? 'var(--success)' : 'var(--text-muted)' }}></div>
              <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{activeEnv ? activeEnv.name : 'No Environment'}</span>
              <ChevronDown size={14} color="var(--text-secondary)" />
            </div>

            {showEnvDropdown && (
              <div className="glass-card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', padding: '8px', zIndex: 10, width: '200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', paddingLeft: '8px' }}>Select Environment</div>
                <div 
                  style={{ padding: '6px 8px', fontSize: '12px', cursor: 'pointer', borderRadius: 'var(--radius-sm)', background: !activeEnv ? 'var(--bg-secondary)' : 'transparent' }}
                  onClick={() => handleEnvChange('')} // Clear env logic can be added if needed, but selecting another is fine. Actually SetActiveEnvironment("") might fail, we will just keep existing. 
                >
                  None
                </div>
                {environments.map(env => (
                  <div 
                    key={env.id}
                    style={{ padding: '6px 8px', fontSize: '12px', cursor: 'pointer', borderRadius: 'var(--radius-sm)', background: activeEnv?.id === env.id ? 'var(--bg-secondary)' : 'transparent', display: 'flex', justifyContent: 'space-between' }}
                    onClick={() => handleEnvChange(env.id)}
                  >
                    <span>{env.name}</span>
                    {activeEnv?.id === env.id && <CheckCircle size={14} color="var(--success)" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
              placeholder="Enter URL (e.g. {{base_url}}/api/data)"
              className="input-field"
              style={{ flex: 1, fontFamily: 'monospace' }}
            />

            <button className="btn-primary" onClick={handleSend} disabled={loading} style={{ padding: '8px 16px' }}>
              <Send size={14} />
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500' }}>Request Body (JSON)</label>
              {activeEnv && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Use {'{{variable}}'} to interpolate</span>}
            </div>
            <textarea 
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder={`{\n  "token": "{{api_key}}"\n}`}
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

      {/* RIGHT SIDEBAR: VARIABLES PANEL */}
      <div className="glass-card" style={{ width: '280px', display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Variables Explorer</h3>
        
        {!activeEnv ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
            Select an environment to view and use variables.
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Search variables..." 
                value={searchVar}
                onChange={e => setSearchVar(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '12px', padding: '6px 12px 6px 32px' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredVars.length === 0 ? (
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>No variables found.</div>
              ) : (
                filteredVars.map(v => (
                  <div key={v.id} style={{ padding: '10px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{v.key}</span>
                      <button 
                        className="btn-outline" 
                        onClick={() => copyToClipboard(v.key)}
                        style={{ padding: '4px 8px', fontSize: '10px', gap: '4px', border: 'none' }}
                        title="Copy to clipboard"
                      >
                        {copiedVar === v.key ? <CheckCircle size={12} color="var(--success)" /> : <Copy size={12} />}
                        {copiedVar === v.key ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: v.is_secret ? 'var(--text-muted)' : 'var(--text-secondary)', fontFamily: v.is_secret ? 'inherit' : 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: v.description ? '4px' : '0' }}>
                      {v.value}
                    </div>
                    {v.description && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {v.description}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Click <strong>Copy</strong> and paste directly into URL or Payload inputs.
            </div>
          </>
        )}
      </div>

    </div>
  );
}
