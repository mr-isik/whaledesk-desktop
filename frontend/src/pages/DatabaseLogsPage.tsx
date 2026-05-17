import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { GetRequestHistory, ClearHistory, DeleteRequest } from '../../wailsjs/go/bindings/DatabaseBinding';
import { domain } from '../../wailsjs/go/models';

export default function DatabaseLogsPage() {
  const [logs, setLogs] = useState<domain.APIRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await GetRequestHistory();
      setLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear all history?')) {
      await ClearHistory();
      fetchLogs();
    }
  };

  const handleDelete = async (id: number) => {
    await DeleteRequest(id);
    fetchLogs();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 className="page-title">Database Logs</h1>
          <p className="page-subtitle">History of API requests sent through Dockit</p>
        </div>
        <button className="btn-danger" onClick={handleClear} disabled={logs.length === 0} style={{ padding: '6px 12px', fontSize: '12px' }}>
          <Trash2 size={14} /> Clear All
        </button>
      </div>

      <div className="glass-card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          padding: '12px 20px', 
          borderBottom: '1px solid var(--border)', 
          display: 'grid', 
          gridTemplateColumns: '80px 80px 1fr 180px 50px', 
          gap: '12px', 
          fontSize: '12px',
          fontWeight: '500', 
          color: 'var(--text-secondary)' 
        }}>
          <div>Status</div>
          <div>Method</div>
          <div>URL</div>
          <div>Date</div>
          <div></div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No logs found. Use the API Tester to send requests.
            </div>
          ) : (
            logs.map(log => {
              const date = new Date(log.created_at as unknown as string);
              return (
                <div key={log.id} style={{ 
                  padding: '12px 20px', 
                  borderBottom: '1px solid var(--border)', 
                  display: 'grid', 
                  gridTemplateColumns: '80px 80px 1fr 180px 50px', 
                  gap: '12px',
                  alignItems: 'center',
                  fontSize: '13px'
                }}
                className="log-row"
                >
                  <div>
                    <span className={`badge ${log.status >= 200 && log.status < 300 ? 'success' : log.status === 0 ? 'warning' : 'danger'}`} style={{ fontSize: '10px' }}>
                      {log.status === 0 ? 'ERR' : log.status}
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{log.method}</div>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {log.url}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {date.toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-outline" style={{ padding: '4px 6px', border: 'none', background: 'transparent', color: 'var(--text-muted)' }} onClick={() => handleDelete(log.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
