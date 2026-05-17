import React, { useEffect, useState } from 'react';
import { Server, Database, Table as TableIcon, Play, AlertCircle, Plus, Trash2, Layout } from 'lucide-react';
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

  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Local Postgres', type: 'postgres', host: 'localhost', port: 5432, 
    user: 'postgres', password: '', database: 'postgres', ssl_mode: 'disable'
  });

  
  const [schemas, setSchemas] = useState<domain.DbSchema[]>([]);
  const [expandedSchema, setExpandedSchema] = useState<string | null>(null);
  const [tables, setTables] = useState<domain.DbTable[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  
  
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
    await RemoveConnection(id);
    checkStatus();
  };

  
  const loadSchemas = async () => {
    try {
      const sc = await ListSchemas();
      setSchemas(sc || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSchemaClick = async (schema: string) => {
    if (expandedSchema === schema) {
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

  if (isConnected && activeConn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '20px', marginBottom: '4px' }}>Database Studio</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>Connected to {activeConn.name} ({activeConn.database})</p>
          </div>
          <button className="btn-danger" onClick={handleDisconnect} style={{ padding: '6px 12px', fontSize: '12px' }}>
            Disconnect
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
          {}
          <div className="glass-card" style={{ width: '240px', display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto' }}>
            <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Database size={15} /> Schemas
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {schemas.map(s => (
                <div key={s.name}>
                  <div 
                    style={{ 
                      padding: '6px 8px', 
                      background: expandedSchema === s.name ? 'rgba(255,255,255,0.04)' : 'transparent', 
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      fontWeight: expandedSchema === s.name ? '500' : 'normal',
                      color: 'var(--text-primary)'
                    }}
                    onClick={() => handleSchemaClick(s.name)}
                  >
                    <Layout size={13} color="var(--text-secondary)" />
                    {s.name}
                  </div>
                  
                  {expandedSchema === s.name && (
                    <div style={{ paddingLeft: '18px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {tables.length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 8px' }}>No tables found.</div>
                      ) : (
                        tables.map(t => (
                          <div 
                            key={t.name}
                            style={{
                              padding: '5px 8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              borderRadius: 'var(--radius-sm)',
                              background: activeTable === t.name ? 'var(--bg-tertiary)' : 'transparent',
                              color: activeTable === t.name ? 'var(--text-primary)' : 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onClick={() => handleTableClick(t.name)}
                          >
                            <TableIcon size={12} />
                            {t.name}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            {}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500', fontSize: '13px', color: 'var(--text-secondary)' }}>SQL Workspace</span>
                <button className="btn-primary" onClick={handleExecute} disabled={executing} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  <Play size={12} fill="currentColor" />
                  Run
                </button>
              </div>
              <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-field"
                style={{
                  height: '110px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  resize: 'vertical',
                  color: 'var(--text-primary)'
                }}
              />
              {error && (
                <div style={{ padding: '8px 12px', background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>

            {}
            <div className="glass-card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '13px' }}>Query Results</span>
                {queryResult && <span className="badge neutral" style={{ fontSize: '10px' }}>Rows: {queryResult.rows_affected}</span>}
              </div>
              
              <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                {!queryResult ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '40px' }}>Run a query to see results</div>
                ) : queryResult.columns.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--success)', fontSize: '13px', marginTop: '40px' }}>Query executed successfully.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        {queryResult.columns.map((c, i) => (
                          <th key={i} style={{ 
                            textAlign: 'left', 
                            padding: '8px 12px', 
                            borderBottom: '1px solid var(--border)', 
                            color: 'var(--text-secondary)', 
                            fontWeight: '600',
                            position: 'sticky', 
                            top: 0, 
                            background: 'var(--bg-secondary)' 
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
                            <td key={cIdx} style={{ padding: '8px 12px', whiteSpace: 'nowrap', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>
                              {val === null ? <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>null</span> : String(val)}
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

  
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">DB Manager</h1>
          <p className="page-subtitle">Manage your database connections</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ padding: '6px 12px', fontSize: '12px' }}>
          <Plus size={14} /> New Connection
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {showForm && (
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Add PostgreSQL Connection</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>Name</label>
              <input type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>Database</label>
              <input type="text" className="input-field" value={formData.database} onChange={e => setFormData({...formData, database: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>Host</label>
              <input type="text" className="input-field" value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>Port</label>
              <input type="number" className="input-field" value={formData.port} onChange={e => setFormData({...formData, port: parseInt(e.target.value)})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>User</label>
              <input type="text" className="input-field" value={formData.user} onChange={e => setFormData({...formData, user: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>Password</label>
              <input type="password" className="input-field" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
            <button className="btn-outline" onClick={() => setShowForm(false)} style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveConnection} style={{ padding: '6px 12px', fontSize: '12px' }}>Save</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {connections.length === 0 && !showForm && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No connections found. Add one to get started.
          </div>
        )}
        
        {connections.map(conn => (
          <div key={conn.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ 
                padding: '8px', 
                background: 'var(--bg-primary)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-sm)', 
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Server size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conn.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conn.user}@{conn.host}:{conn.port}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
              <button 
                className="btn-primary" 
                style={{ flex: 1, justifyContent: 'center', padding: '6px 12px', fontSize: '12px' }}
                onClick={() => handleConnect(conn.id)}
                disabled={loading}
              >
                Connect
              </button>
              <button 
                className="btn-outline" 
                style={{ color: 'var(--danger)', padding: '6px' }}
                onClick={() => handleDelete(conn.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
