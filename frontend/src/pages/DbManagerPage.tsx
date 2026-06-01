import React, { useEffect, useState } from 'react';
import { Server, Database, Table as TableIcon, Play, AlertCircle, Plus, Trash2, Layout, Layers, Terminal, ServerCrash, Check } from 'lucide-react';
import { 
  AddConnection, ListConnections, RemoveConnection, Connect, Disconnect, 
  IsConnected, ListSchemas, ListTables, ExecuteQuery, GetActiveConnection 
} from '../../wailsjs/go/bindings/DbManagerBinding';
import { domain } from '../../wailsjs/go/models';

export default function DbManagerPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connections, setConnections] = useState<domain.DbConnection[]>([]);
  const [activeConn, setActiveConn] = useState<domain.DbConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Connection Wizard Form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Local Postgres', type: 'postgres', host: 'localhost', port: 5432, 
    user: 'postgres', password: '', database: 'postgres', ssl_mode: 'disable'
  });

  // DB Schema & Table trees
  const [schemas, setSchemas] = useState<domain.DbSchema[]>([]);
  const [expandedSchema, setExpandedSchema] = useState<string | null>(null);
  const [tables, setTables] = useState<domain.DbTable[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  
  // SQL Workspace
  const [query, setQuery] = useState('SELECT * FROM information_schema.tables LIMIT 10;');
  const [queryResult, setQueryResult] = useState<domain.QueryResult | null>(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const connected = await IsConnected();
    setIsConnected(connected);
    if (connected) {
      const conn = await GetActiveConnection();
      setActiveConn(conn);
      loadSchemas();
    } else {
      const list = await ListConnections();
      setConnections(list || []);
      setActiveConn(null);
    }
  };

  const handleSaveConnection = async () => {
    try {
      const newConn = new domain.DbConnection({
        ...formData,
        type: formData.type,
      });
      await AddConnection(newConn);
      setShowForm(false);
      checkStatus();
    } catch (e: any) {
      setError(e.toString());
    }
  };

  const handleConnect = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      await Connect(id);
      checkStatus();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await Disconnect();
    setSchemas([]);
    setTables([]);
    setQueryResult(null);
    checkStatus();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this database connection?")) {
      await RemoveConnection(id);
      checkStatus();
    }
  };

  const loadSchemas = async () => {
    try {
      const sc = await ListSchemas();
      setSchemas(sc || []);
      
      // Auto expand public schema if present
      const publicSchema = sc?.find(s => s.name === 'public');
      if (publicSchema) {
        handleSchemaClick('public');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSchemaClick = async (schema: string) => {
    if (expandedSchema === schema && schema !== 'public') {
      setExpandedSchema(null);
      setTables([]);
      return;
    }
    setExpandedSchema(schema);
    try {
      const t = await ListTables(schema);
      setTables(t || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTableClick = (table: string) => {
    setActiveTable(table);
    setQuery(`SELECT * FROM ${expandedSchema}.${table} LIMIT 100;`);
  };

  const handleExecute = async () => {
    if (!query) return;
    setExecuting(true);
    setError('');
    try {
      const res = await ExecuteQuery(query);
      if (res && res.error_message) {
        setError(res.error_message);
      } else {
        setQueryResult(res);
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setExecuting(false);
    }
  };

  // Connected state: Render SQL Database Studio
  if (isConnected && activeConn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', gap: '16px', minHeight: 0 }}>
        
        {/* Connection Header Panel */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '20px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={20} color="var(--accent-primary)" />
              Database Studio
            </h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              Connected to <strong style={{ color: 'var(--text-primary)' }}>{activeConn.name}</strong> • <code>{activeConn.user}@{activeConn.host}:{activeConn.port}/{activeConn.database}</code>
            </p>
          </div>
          <button className="btn-danger" onClick={handleDisconnect} style={{ padding: '6px 12px', fontSize: '12px' }}>
            Disconnect Studio
          </button>
        </div>

        {/* Studio Workspace Area */}
        <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
          
          {/* Left panel: Schema & Table tree explorer (IDE style) */}
          <div 
            className="glass-card" 
            style={{ 
              width: '230px', 
              display: 'flex', 
              flexDirection: 'column', 
              padding: '14px', 
              overflowY: 'auto',
              flexShrink: 0,
              background: 'var(--bg-secondary)',
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
            }}
          >
            <div style={{ fontWeight: '600', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
              <Layers size={12} color="var(--accent-primary)" style={{ opacity: 0.8 }} />
              Schema Explorer
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {schemas.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '10px 0' }}>No database schemas found.</div>
              ) : (
                schemas.map(s => (
                  <div key={s.name}>
                    <div 
                      className={`nav-item ${expandedSchema === s.name ? 'active' : ''}`}
                      style={{ 
                        padding: '5px 8px', 
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11.5px',
                        fontWeight: '500',
                        background: expandedSchema === s.name ? 'linear-gradient(90deg, rgba(110, 86, 207, 0.08) 0%, rgba(110, 86, 207, 0.01) 100%)' : 'transparent',
                        borderColor: expandedSchema === s.name ? 'rgba(110, 86, 207, 0.15)' : 'transparent'
                      }}
                      onClick={() => handleSchemaClick(s.name)}
                    >
                      <Layout size={11} color="var(--text-secondary)" />
                      <span>{s.name}</span>
                    </div>
                    
                    {expandedSchema === s.name && (
                      <div style={{ paddingLeft: '14px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '1px', borderLeft: "1px solid var(--border)", marginLeft: "13px" }}>
                        {tables.length === 0 ? (
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', padding: '5px 8px' }}>No tables in schema</div>
                        ) : (
                          tables.map(t => (
                            <div 
                              key={t.name}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-sm)',
                                background: activeTable === t.name ? 'linear-gradient(90deg, rgba(110, 86, 207, 0.06) 0%, rgba(0,0,0,0) 100%)' : 'transparent',
                                color: activeTable === t.name ? 'var(--text-primary)' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontWeight: activeTable === t.name ? '600' : 'normal',
                                border: activeTable === t.name ? '1px solid rgba(110, 86, 207, 0.1)' : '1px solid transparent',
                                transition: 'all var(--transition-fast)'
                              }}
                              onClick={() => handleTableClick(t.name)}
                            >
                              <TableIcon size={10.5} color={activeTable === t.name ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel: Editor Workspace (top) & Query results (bottom) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0, height: '100%' }}>
            
            {/* SQL Input Area */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', display: "flex", alignItems: "center", gap: "6px" }}>
                  <Terminal size={12} color="var(--accent-primary)" />
                  SQL Editor
                </span>
                <button className="btn-primary" onClick={handleExecute} disabled={executing} style={{ padding: '4px 12px', fontSize: '12px', height: '28px' }}>
                  <Play size={10} fill="currentColor" />
                  Run Query
                </button>
              </div>
              
              <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-field"
                style={{
                  height: '100px',
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: '12px',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-primary)'
                }}
              />
              
              {error && (
                <div style={{ padding: '8px 12px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* SQL Query Results Table Panel */}
            <div className="glass-card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ 
                padding: '12px 18px', 
                borderBottom: '1px solid var(--border)', 
                background: 'rgba(255, 255, 255, 0.015)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span style={{ fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Query Console Results</span>
                {queryResult && <span className="badge neutral" style={{ fontSize: '9px' }}>Rows Affected: {queryResult.rows_affected}</span>}
              </div>
              
              <div style={{ flex: 1, overflow: 'auto', padding: '12px', background: 'var(--bg-primary)' }}>
                {!queryResult ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    Execute an SQL command to display query rows here.
                  </div>
                ) : queryResult.columns.length === 0 ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', fontSize: '12px', gap: '6px', fontWeight: '600' }}>
                    <Check size={16} /> Query executed successfully. No dataset rows returned.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr>
                        {queryResult.columns.map((c, i) => (
                          <th key={i} style={{ 
                            textAlign: 'left', 
                            padding: '8px 12px', 
                            borderBottom: '1px solid var(--border)', 
                            color: 'var(--text-primary)', 
                            fontWeight: '700',
                            position: 'sticky', 
                            top: 0, 
                            background: 'var(--bg-secondary)',
                            fontFamily: "var(--font-mono, 'Geist Mono', monospace)"
                          }}>
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid var(--border)' }} className="log-row">
                          {row.map((val, cIdx) => (
                            <td key={cIdx} style={{ 
                              padding: '8px 12px', 
                              whiteSpace: 'nowrap', 
                              maxWidth: '240px', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              color: 'var(--text-secondary)',
                              fontFamily: "var(--font-mono, 'Geist Mono', monospace)"
                            }}>
                              {val === null ? <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontStyle: 'italic' }}>NULL</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Disconnected state: Saved connections & Wizard onboarding
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">DB Manager</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Create database tunnels and configure connections</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(!showForm)} 
          style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
        >
          <Plus size={14} /> 
          New Connection
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '500' }}>
          <AlertCircle size={15} /> 
          <span>Connection Error: {error}</span>
        </div>
      )}

      {/* Connection Creation Wizard Panel */}
      {showForm && (
        <div className="glass-card" style={{ animation: "fadeIn 0.2s ease" }}>
          <h3 style={{ marginBottom: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Create PostgreSQL Connection</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Alias Name</label>
              <input type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Production DB" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Database Name</label>
              <input type="text" className="input-field" value={formData.database} onChange={e => setFormData({...formData, database: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Host Address</label>
              <input type="text" className="input-field" value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Port Number</label>
              <input type="number" className="input-field" value={formData.port} onChange={e => setFormData({...formData, port: parseInt(e.target.value)})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>User Credentials</label>
              <input type="text" className="input-field" value={formData.user} onChange={e => setFormData({...formData, user: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Password</label>
              <input type="password" className="input-field" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '24px', justifyContent: 'flex-end' }}>
            <button className="btn-outline" onClick={() => setShowForm(false)} style={{ padding: '6px 14px', fontSize: '12px' }}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveConnection} style={{ padding: '6px 14px', fontSize: '12px' }}>Save Endpoint</button>
          </div>
        </div>
      )}

      {/* Grid of Saved Connections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {connections.length === 0 && !showForm && (
          <div className="glass-card" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', gap: '12px', border: "1px dashed var(--border)" }}>
            <ServerCrash size={32} style={{ color: 'var(--text-muted)' }} />
            <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>No Database Endpoints Saved</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: "340px", lineHeight: 1.5 }}>
              Add a PostgreSQL endpoint connection config to launch active database studio query dashboards.
            </p>
          </div>
        )}
        
        {connections.map(conn => (
          <div key={conn.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', minHeight: "150px" }}>
            
            {/* Card Header info */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <div style={{ 
                padding: '8px', 
                background: 'var(--bg-primary)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-sm)', 
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: "2px"
              }}>
                <Server size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: "var(--text-primary)", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conn.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: "var(--font-mono, 'Geist Mono', monospace)", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: "2px" }}>
                  {conn.database}
                </div>
              </div>
            </div>
            
            {/* Credentials subtitle details */}
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: "var(--font-mono, 'Geist Mono', monospace)", marginBottom: '18px', borderTop: "1px solid var(--border)", paddingTop: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {conn.user}@{conn.host}:{conn.port}
            </div>
            
            {/* Actions panel */}
            <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
              <button 
                className="btn-primary" 
                style={{ flex: 1, justifyContent: 'center', padding: '5px 12px', fontSize: '12px', height: '30px' }}
                onClick={() => handleConnect(conn.id)}
                disabled={loading}
              >
                Connect Studio
              </button>
              
              <button 
                className="btn-outline" 
                style={{ color: 'var(--danger)', borderColor: "var(--danger-border)", padding: '6px', height: '30px', width: '30px' }}
                onClick={() => handleDelete(conn.id)}
                title="Remove Endpoint"
              >
                <Trash2 size={13} />
              </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
