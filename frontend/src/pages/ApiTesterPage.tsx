import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, Copy, Search, ChevronDown, CheckCircle, Database, Lock, Eye, EyeOff, Code2, List } from 'lucide-react';
import { ExecuteRequestWithEnv, ListEnvironments, SetActiveEnvironment } from '../../wailsjs/go/bindings/EnvBinding';
import { ExecuteRequest } from '../../wailsjs/go/bindings/APIBinding';
import { domain } from '../../wailsjs/go/models';
import VariableAutocomplete from '../components/VariableAutocomplete';
import DraggableVariable from '../components/DraggableVariable';
import HeaderEditor, { HeaderEntry } from '../components/HeaderEditor';
import AIPanel from '../components/AIPanel';

export default function ApiTesterPage() {
  const [url, setUrl] = useState('{{base_url}}/users');
  const [method, setMethod] = useState('GET');
  const [payload, setPayload] = useState('{\n  "name": "Alex",\n  "role": "Developer"\n}');
  const [headers, setHeaders] = useState<HeaderEntry[]>([
    { id: crypto.randomUUID(), key: 'Content-Type', value: 'application/json', enabled: true }
  ]);
  const [response, setResponse] = useState<domain.APIRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tabs
  const [activeReqTab, setActiveReqTab] = useState<'headers' | 'body'>('body');
  const [activeSideTab, setActiveSideTab] = useState<'variables' | 'ai'>('variables');

  // Environments
  const [environments, setEnvironments] = useState<domain.Environment[]>([]);
  const [activeEnv, setActiveEnv] = useState<domain.Environment | null>(null);
  const [showEnvDropdown, setShowEnvDropdown] = useState(false);
  
  // Variables Explorer
  const [searchVar, setSearchVar] = useState('');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

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
    
    // Prepare headers mapping
    const headersMap: Record<string, string> = {};
    headers.forEach(h => {
      if (h.enabled && h.key) {
        headersMap[h.key] = h.value;
      }
    });
    const headersJSON = JSON.stringify(headersMap);
    
    try {
      let res;
      if (activeEnv) {
        res = await ExecuteRequestWithEnv(method, url, payload, headersJSON);
      } else {
        res = await ExecuteRequest(method, url, payload, headersJSON);
      }
      setResponse(res);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(key);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const filteredVars = activeEnv?.variables?.filter(v => 
    v.key.toLowerCase().includes(searchVar.toLowerCase()) || 
    v.description?.toLowerCase().includes(searchVar.toLowerCase())
  ) || [];

  const formatJSON = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return raw;
    }
  };

  const handleAIApply = (aiMethod: string, aiUrl: string, aiHeaders: Record<string, string>, aiPayload: string) => {
    setMethod(aiMethod);
    setUrl(aiUrl);
    setPayload(aiPayload);
    
    const newHeaders: HeaderEntry[] = Object.entries(aiHeaders).map(([key, value]) => ({
      id: crypto.randomUUID(),
      key,
      value,
      enabled: true
    }));
    setHeaders(newHeaders);
    setActiveReqTab(aiPayload ? 'body' : 'headers');
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 100px)', minHeight: 0 }}>
      
      {/* Left Area: Request Configuration & Response */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: "16px", height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '20px', marginBottom: '2px' }}>API Studio</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>Send HTTP requests and monitor network outputs</p>
          </div>

          <div style={{ position: 'relative' }}>
            <div 
              className="btn-outline" 
              style={{ 
                padding: '6px 12px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer', 
                fontSize: '12px', 
                background: 'var(--bg-secondary)',
                height: '32px'
              }}
              onClick={() => setShowEnvDropdown(!showEnvDropdown)}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeEnv ? 'var(--accent-primary)' : 'var(--text-muted)', boxShadow: activeEnv ? '0 0 6px var(--accent-primary)' : 'none' }}></div>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{activeEnv ? activeEnv.name : 'No Environment'}</span>
              <ChevronDown size={12} color="var(--text-secondary)" />
            </div>

            {showEnvDropdown && (
              <div 
                className="glass-card" 
                style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  right: 0, 
                  marginTop: '8px', 
                  padding: '6px', 
                  zIndex: 20, 
                  width: '220px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '4px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  background: 'var(--bg-secondary)'
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Environment</div>
                <div 
                  className="nav-item"
                  style={{ padding: '6px 8px', fontSize: '12px', borderRadius: 'var(--radius-sm)' }}
                  onClick={() => handleEnvChange('')} 
                >
                  None
                </div>
                {environments.map(env => (
                  <div 
                    key={env.id}
                    className={`nav-item ${activeEnv?.id === env.id ? 'active' : ''}`}
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => handleEnvChange(env.id)}
                  >
                    <span>{env.name}</span>
                    {activeEnv?.id === env.id && <CheckCircle size={12} color="var(--accent-primary)" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select 
              value={method} 
              onChange={(e) => setMethod(e.target.value)}
              className="input-field"
              style={{ width: '100px', height: '38px', fontWeight: '700', color: 'var(--accent-primary)' }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
            
            <div style={{ flex: 1, position: 'relative' }}>
              <VariableAutocomplete
                value={url}
                onChange={setUrl}
                variables={activeEnv?.variables || []}
                placeholder="Enter request URL (e.g. {{base_url}}/v1/users)"
                className="input-field"
                style={{ width: '100%', fontFamily: "var(--font-mono, 'Geist Mono', monospace)", height: '38px', fontSize: '13px' }}
              />
            </div>

            <button className="btn-primary" onClick={handleSend} disabled={loading} style={{ padding: '0 18px', height: '38px' }}>
              <Send size={14} />
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '140px' }}>
            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
              <button 
                className="nav-item" 
                style={{ padding: '4px 8px', fontSize: '12px', background: activeReqTab === 'headers' ? 'var(--bg-hover)' : 'transparent', color: activeReqTab === 'headers' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                onClick={() => setActiveReqTab('headers')}
              >
                <List size={12} /> Headers ({headers.length})
              </button>
              <button 
                className="nav-item" 
                style={{ padding: '4px 8px', fontSize: '12px', background: activeReqTab === 'body' ? 'var(--bg-hover)' : 'transparent', color: activeReqTab === 'body' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                onClick={() => setActiveReqTab('body')}
              >
                <Code2 size={12} /> Body
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              {activeReqTab === 'headers' ? (
                <HeaderEditor 
                  headers={headers} 
                  onChange={setHeaders} 
                  variables={activeEnv?.variables || []} 
                />
              ) : (
                <div style={{ height: '100%', position: 'relative' }}>
                  <VariableAutocomplete
                    value={payload}
                    onChange={setPayload}
                    variables={activeEnv?.variables || []}
                    multiline
                    placeholder={`{\n  "key": "{{variable}}"\n}`}
                    className="input-field"
                    style={{ width: '100%', height: '100%', fontFamily: "var(--font-mono, 'Geist Mono', monospace)", resize: 'none', fontSize: '12px', background: 'var(--bg-primary)' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="glass-card" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px' }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '12px', fontWeight: '500', wordBreak: 'break-word' }}>{error}</span>
          </div>
        )}

        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0, overflow: 'hidden' }}>
          <div style={{ 
            padding: '12px 18px', 
            borderBottom: '1px solid var(--border)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.01)'
          }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: "var(--text-primary)" }}>Response Stream</h3>
            
            {response && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={`badge ${response.status >= 200 && response.status < 300 ? 'success' : 'danger'}`} style={{ fontSize: '9px' }}>
                  Status: {response.status === 0 ? "ERROR" : response.status}
                </span>
                
                {response.response && (
                  <button 
                    className="btn-outline" 
                    onClick={() => copyToClipboard('response-text', response.response)}
                    style={{ padding: '4px 8px', fontSize: '10px', border: 'none', height: '22px' }}
                    title="Copy Response"
                  >
                    <Copy size={11} />
                    Copy
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div style={{ flex: 1, overflow: 'auto', padding: '12px', background: 'var(--bg-primary)' }}>
            {!response && !error ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                Awaiting request dispatch. Enter a URL and click Send.
              </div>
            ) : response && (
              <pre style={{ 
                margin: 0,
                color: 'var(--text-primary)',
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: '12px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
              }}>
                {formatJSON(response.response)}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Right Area: Sidebar Panels */}
      <div 
        className="glass-card" 
        style={{ 
          width: '320px', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '16px', 
          overflow: 'hidden',
          flexShrink: 0,
          height: '100%'
        }}
      >
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
          <button 
            className={`btn-outline ${activeSideTab === 'variables' ? 'active' : ''}`}
            onClick={() => setActiveSideTab('variables')}
            style={{ flex: 1, padding: '6px', fontSize: '12px', background: activeSideTab === 'variables' ? 'var(--bg-tertiary)' : 'transparent' }}
          >
            Variables
          </button>
          <button 
            className={`btn-outline ${activeSideTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveSideTab('ai')}
            style={{ flex: 1, padding: '6px', fontSize: '12px', background: activeSideTab === 'ai' ? 'var(--bg-tertiary)' : 'transparent' }}
          >
            AI Assistant
          </button>
        </div>
        
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeSideTab === 'ai' ? (
            <AIPanel 
              onApply={handleAIApply} 
              activeUrl={url} 
              activeMethod={method} 
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {!activeEnv ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', padding: "0 10px", lineHeight: 1.6 }}>
                  Select an environment from the header dropdown to view and copy active variables.
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Search variables..." 
                      value={searchVar}
                      onChange={e => setSearchVar(e.target.value)}
                      style={{ paddingLeft: '30px', fontSize: '11px', padding: '6px 12px 6px 30px', height: "30px" }}
                    />
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: "4px" }}>
                    {filteredVars.length === 0 ? (
                      <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>No matching variables.</div>
                    ) : (
                      filteredVars.map(v => {
                        const showVal = !v.is_secret || showSecrets[v.key];
                        return (
                          <DraggableVariable key={v.id} variable={v}>
                            <div 
                              style={{ 
                                padding: '10px', 
                                background: 'var(--bg-primary)', 
                                borderRadius: 'var(--radius-sm)', 
                                border: '1px solid var(--border)',
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px"
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>
                                  {v.key}
                                </span>
                                
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {v.is_secret && (
                                    <button 
                                      className="btn-outline"
                                      onClick={() => toggleSecret(v.key)}
                                      style={{ padding: '3px', border: 'none', height: '18px', width: '18px', background: "transparent" }}
                                      title={showVal ? "Hide secret" : "Reveal secret"}
                                    >
                                      {showVal ? <EyeOff size={10} /> : <Eye size={10} />}
                                    </button>
                                  )}
                                  <button 
                                    className="btn-outline" 
                                    onClick={() => copyToClipboard(v.key, `{{${v.key}}}`)}
                                    style={{ padding: '2px 6px', fontSize: '9px', border: 'none', height: '18px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                    title="Copy variable reference"
                                  >
                                    {copiedVar === v.key ? <CheckCircle size={10} color="var(--accent-primary)" /> : <Copy size={10} />}
                                    {copiedVar === v.key ? 'Copied' : 'Ref'}
                                  </button>
                                </div>
                              </div>
                              
                              <div style={{ 
                                fontSize: '11px', 
                                color: v.is_secret && !showVal ? 'var(--text-muted)' : 'var(--text-secondary)', 
                                fontFamily: v.is_secret && !showVal ? 'inherit' : "var(--font-mono, 'Geist Mono', monospace)", 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                background: "rgba(255,255,255,0.01)",
                                padding: "3px 6px",
                                border: "1px solid var(--border)",
                                borderRadius: "2px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px"
                              }}>
                                {v.is_secret && !showVal ? (
                                  <>
                                    <Lock size={10} style={{ color: "var(--text-muted)" }} />
                                    <span>••••••••</span>
                                  </>
                                ) : (
                                  v.value
                                )}
                              </div>
                              
                              {v.description && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: "1.3" }}>
                                  {v.description}
                                </div>
                              )}
                            </div>
                          </DraggableVariable>
                        );
                      })
                    )}
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', borderTop: "1px solid var(--border)", paddingTop: "10px", lineHeight: "1.4" }}>
                    Drag cards to inputs or click <strong>Ref</strong> to copy.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
