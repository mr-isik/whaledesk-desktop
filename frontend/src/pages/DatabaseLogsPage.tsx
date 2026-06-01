import React, { useEffect, useState } from 'react';
import { Trash2, Database, AlertCircle, Clock, Calendar } from 'lucide-react';
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
    if (confirm('Are you sure you want to permanently clear the request database history logs?')) {
      await ClearHistory();
      fetchLogs();
    }
  };

  const handleDelete = async (id: number) => {
    await DeleteRequest(id);
    fetchLogs();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: "20px" }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Database Logs</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>SQLite logs of HTTP transaction requests sent through Dockit</p>
        </div>
        <button 
          className="btn-danger" 
          onClick={handleClear} 
          disabled={logs.length === 0} 
          style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
        >
          <Trash2 size={13} /> 
          Clear Console Log
        </button>
      </div>

      {/* Main Table Card */}
      <div className="glass-card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Table Column Headers */}
        <div style={{ 
          padding: '12px 20px', 
          borderBottom: '1px solid var(--border)', 
          background: 'rgba(255, 255, 255, 0.015)',
          display: 'grid', 
          gridTemplateColumns: '90px 90px 1fr 180px 50px', 
          gap: '16px', 
          fontSize: '11px',
          fontWeight: '600', 
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary)' 
        }}>
          <div>Status</div>
          <div>Method</div>
          <div>Request Endpoint</div>
          <div>Timestamp</div>
          <div></div>
        </div>

        {/* Table Rows Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Querying database log files...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: '12px', height: '100%' }}>
              <Database size={32} style={{ color: 'var(--text-muted)' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: "var(--text-primary)" }}>No Log Entries Found</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', maxWidth: "340px", lineHeight: "1.5" }}>
                Send requests using the API Studio and their metadata history logs will populate here automatically.
              </p>
            </div>
          ) : (
            logs.map(log => {
              const date = new Date(log.created_at as unknown as string);
              const isSuccess = log.status >= 200 && log.status < 300;
              const isError = log.status === 0 || log.status >= 400;
              
              let statusBadgeClass = "neutral";
              if (isSuccess) statusBadgeClass = "success";
              else if (isError) statusBadgeClass = "danger";
              else if (log.status === 0) statusBadgeClass = "warning";

              return (
                <div key={log.id} style={{ 
                  padding: '10px 20px', 
                  borderBottom: '1px solid var(--border)', 
                  display: 'grid', 
                  gridTemplateColumns: '90px 90px 1fr 180px 50px', 
                  gap: '16px',
                  alignItems: 'center',
                  fontSize: '12px'
                }}
                className="log-row"
                >
                  {/* Status Badging */}
                  <div>
                    <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '9px', minWidth: "46px", justifyContent: "center" }}>
                      {log.status === 0 ? 'ERR' : log.status}
                    </span>
                  </div>

                  {/* Method Coloring */}
                  <div style={{ 
                    fontWeight: '700', 
                    color: log.method === "GET" ? "var(--accent-primary)" : 
                           log.method === "POST" ? "#a78bfa" : 
                           log.method === "PUT" ? "#f472b6" : 
                           log.method === "DELETE" ? "var(--danger)" : "var(--text-primary)"
                  }}>
                    {log.method}
                  </div>

                  {/* Endpoint details */}
                  <div style={{ 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)", 
                    color: 'var(--text-secondary)', 
                    fontSize: '11px',
                    background: "rgba(255,255,255,0.01)",
                    padding: "3px 8px",
                    borderRadius: "3px",
                    border: "1px solid var(--border)",
                    width: "fit-content",
                    maxWidth: "100%"
                  }}>
                    {log.url}
                  </div>

                  {/* Date details */}
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={12} color="var(--text-muted)" />
                    <span>{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
                  </div>

                  {/* Single Delete Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn-outline" 
                      style={{ 
                        padding: '4px', 
                        border: 'none', 
                        background: 'transparent', 
                        color: 'var(--text-muted)',
                        height: '24px',
                        width: '24px'
                      }} 
                      onClick={() => handleDelete(log.id)}
                      title="Delete Entry"
                    >
                      <Trash2 size={12} />
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
