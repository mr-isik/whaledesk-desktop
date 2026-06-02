import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ScrollText, Box, RefreshCw, Search, ArrowDown, ChevronDown } from 'lucide-react';
import { GetContainers, GetContainerLogs } from '../../wailsjs/go/bindings/DockerBinding';
import { domain } from '../../wailsjs/go/models';

const TAIL_OPTIONS = ["50", "100", "250", "500", "1000"];

interface ContainerLogsPageProps {
  preselectedContainerId?: string;
  onContainerSelect?: (id: string) => void;
}

export default function ContainerLogsPage({ preselectedContainerId, onContainerSelect }: ContainerLogsPageProps) {
  const [containers, setContainers] = useState<domain.Container[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState<string>(preselectedContainerId || "");
  const [logs, setLogs] = useState<domain.ContainerLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [containersLoading, setContainersLoading] = useState(true);
  const [tail, setTail] = useState("100");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Fetch containers list on mount
  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const cList = await GetContainers();
        setContainers(cList || []);
      } catch (e) {
        console.error("Failed to fetch containers", e);
      } finally {
        setContainersLoading(false);
      }
    };
    fetchContainers();
    const interval = setInterval(fetchContainers, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch logs whenever selectedContainerId or tail changes
  const fetchLogs = useCallback(async () => {
    if (!selectedContainerId) return;
    setLoading(true);
    try {
      const data = await GetContainerLogs(selectedContainerId, tail);
      setLogs(data || []);
    } catch (e) {
      console.error("Failed to fetch container logs", e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedContainerId, tail]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh every 3 seconds if enabled
  useEffect(() => {
    if (!autoRefresh || !selectedContainerId) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs, selectedContainerId]);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const selectedContainer = containers.find(c => c.id === selectedContainerId);

  const filteredLogs = logs.filter(l =>
    l.log.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimestamp = (ts: string) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) +
        '.' + String(d.getMilliseconds()).padStart(3, '0');
    } catch {
      return ts;
    }
  };

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Container Logs</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Stream and inspect stdout/stderr output from Docker containers
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "var(--bg-secondary)",
        padding: "12px 16px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        flexWrap: "wrap"
      }}>
        {/* Container Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1", minWidth: "220px", maxWidth: "360px" }}>
          <Box size={14} color="var(--text-muted)" />
          <select
            className="input-field"
            value={selectedContainerId}
            onChange={(e) => {
              const newId = e.target.value;
              setSelectedContainerId(newId);
              if (onContainerSelect) onContainerSelect(newId);
              setLogs([]);
            }}
            style={{ height: "34px", fontSize: "12px" }}
          >
            <option value="">
              {containersLoading ? "Loading containers..." : "Select a container…"}
            </option>
            {containers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.short_id} ({c.state})
              </option>
            ))}
          </select>
        </div>

        {/* Tail Count */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Tail:</span>
          <select
            className="input-field"
            value={tail}
            onChange={(e) => setTail(e.target.value)}
            style={{ height: "34px", fontSize: "12px", width: "80px" }}
          >
            {TAIL_OPTIONS.map(t => (
              <option key={t} value={t}>{t} lines</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div style={{ position: "relative", flex: "0 1 200px", minWidth: "140px" }}>
          <Search size={13} color="var(--text-secondary)" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Filter logs…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: "30px", height: "34px", fontSize: "12px" }}
          />
        </div>

        {/* Auto-refresh Toggle */}
        <button
          className={`btn-outline`}
          onClick={() => setAutoRefresh(!autoRefresh)}
          style={{
            padding: "6px 12px",
            fontSize: "11px",
            height: "34px",
            gap: "5px",
            background: autoRefresh ? "rgba(52, 211, 153, 0.08)" : "transparent",
            borderColor: autoRefresh ? "var(--accent-primary)" : "var(--border)",
            color: autoRefresh ? "var(--accent-primary)" : "var(--text-secondary)"
          }}
          title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh (3s)"}
        >
          <RefreshCw size={12} style={{ animation: autoRefresh ? "spin 2s linear infinite" : "none" }} />
          {autoRefresh ? "Live" : "Auto"}
        </button>

        {/* Manual Refresh */}
        <button
          className="btn-outline"
          onClick={fetchLogs}
          disabled={!selectedContainerId || loading}
          style={{ padding: "6px 10px", height: "34px", fontSize: "11px" }}
          title="Refresh logs"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Log Viewer */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          position: 'relative'
        }}
      >
        {/* Log Header Bar */}
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(255, 255, 255, 0.015)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ScrollText size={13} color="var(--text-muted)" />
            <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Output
            </span>
            {selectedContainer && (
              <span style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: "10px",
                color: "var(--text-muted)",
                background: "var(--bg-tertiary)",
                padding: "2px 8px",
                borderRadius: "3px",
                border: "1px solid var(--border)"
              }}>
                {selectedContainer.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {filteredLogs.length > 0 && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {filteredLogs.length} {searchTerm ? "matched" : "entries"}
              </span>
            )}
            {autoRefresh && selectedContainerId && (
              <span className="badge success" style={{ fontSize: '8px', padding: '2px 6px' }}>LIVE</span>
            )}
          </div>
        </div>

        {/* Log Body */}
        <div
          ref={logContainerRef}
          style={{
            overflowY: 'auto',
            flex: 1,
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            fontSize: '11.5px',
            lineHeight: '1.7',
            padding: '12px 0',
            background: "var(--bg-primary)"
          }}
        >
          {!selectedContainerId ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '14px',
              padding: '48px 24px'
            }}>
              <Box size={36} style={{ color: 'var(--text-muted)' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Container Selected
              </div>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '12px',
                textAlign: 'center',
                maxWidth: '340px',
                lineHeight: '1.5'
              }}>
                Select a running container from the dropdown above to view its real-time log output.
              </p>
            </div>
          ) : loading && logs.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-secondary)',
              fontSize: '13px'
            }}>
              Fetching logs…
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '12px',
              padding: '48px 24px'
            }}>
              <ScrollText size={32} style={{ color: 'var(--text-muted)' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {searchTerm ? "No Matching Logs" : "No Logs Available"}
              </div>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '12px',
                textAlign: 'center',
                maxWidth: '340px',
                lineHeight: '1.5'
              }}>
                {searchTerm
                  ? "No log entries match your current filter query."
                  : "This container has not produced any log output yet."}
              </p>
            </div>
          ) : (
            filteredLogs.map((entry, idx) => {
              const isStderr = entry.stream === 'stderr';
              return (
                <div
                  key={idx}
                  className="log-row"
                  style={{
                    display: 'flex',
                    padding: '3px 18px',
                    gap: '10px',
                    alignItems: 'flex-start',
                    borderLeft: `2px solid ${isStderr ? 'var(--danger)' : 'rgba(110, 86, 207, 0.2)'}`,
                    background: isStderr ? 'rgba(255, 92, 114, 0.02)' : 'transparent',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  {/* Timestamp */}
                  <span style={{
                    color: 'var(--text-muted)',
                    fontSize: '9.5px',
                    flexShrink: 0,
                    minWidth: '85px',
                    paddingTop: '2px',
                    userSelect: 'none',
                    opacity: 0.8
                  }}>
                    {formatTimestamp(entry.timestamp)}
                  </span>

                  {/* Stream Badge */}
                  <span style={{
                    fontSize: '7.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: isStderr ? 'var(--danger)' : 'var(--accent-primary)',
                    flexShrink: 0,
                    minWidth: '32px',
                    paddingTop: '3px',
                    userSelect: 'none'
                  }}>
                    {entry.stream === 'stderr' ? 'ERR' : 'OUT'}
                  </span>

                  {/* Log Content */}
                  <span style={{
                    color: isStderr ? 'var(--danger)' : 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    flex: 1,
                    letterSpacing: '-0.01em'
                  }}>
                    {entry.log}
                  </span>
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>

        {/* Scroll-to-bottom FAB */}
        {selectedContainerId && filteredLogs.length > 20 && (
          <button
            onClick={scrollToBottom}
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 5,
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
            title="Scroll to bottom"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-primary)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-primary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
            }}
          >
            <ArrowDown size={14} />
          </button>
        )}
      </div>

      {/* Inline keyframe for the spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
