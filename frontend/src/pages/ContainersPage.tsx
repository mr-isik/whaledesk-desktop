import React, { useEffect, useState } from 'react';
import { Play, Square, RotateCw, Trash2, Box, Search, Plus, Terminal, RefreshCw, ScrollText, CheckCircle, HelpCircle, StopCircle, ArrowRight } from 'lucide-react';
import { GetContainers, StartContainer, StopContainer, RestartContainer, RemoveContainer } from '../../wailsjs/go/bindings/DockerBinding';
import { domain } from '../../wailsjs/go/models';

type FilterType = "all" | "running" | "stopped";

interface ContainersPageProps {
  onNavigateToLogs?: (id: string) => void;
}

export default function ContainersPage({ onNavigateToLogs }: ContainersPageProps) {
  const [containers, setContainers] = useState<domain.Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchContainers = async () => {
    try {
      const cList = await GetContainers();
      setContainers(cList || []);
    } catch (e) {
      console.error("Failed to fetch containers", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, id: string) => {
    setActionLoadingId(id);
    try {
      switch (action) {
        case 'start': await StartContainer(id); break;
        case 'stop': await StopContainer(id); break;
        case 'restart': await RestartContainer(id); break;
        case 'remove': 
          if (confirm("Are you sure you want to force-remove this container?")) {
            await RemoveContainer(id, true); 
          }
          break;
      }
      fetchContainers();
    } catch (e) {
      alert(`Action failed: ${e}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredContainers = containers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.image.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.short_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === "running") return matchesSearch && c.state === "running";
    if (filter === "stopped") return matchesSearch && c.state !== "running";
    return matchesSearch;
  });

  // Render original Linear-style status indicator
  const renderStatusIcon = (state: string) => {
    switch (state.toLowerCase()) {
      case 'running':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              boxShadow: '0 0 6px var(--accent-primary)',
            }} />
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-primary)' }}>Active</span>
          </div>
        );
      case 'exited':
      case 'stopped':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--text-muted)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }} />
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)' }}>Stopped</span>
          </div>
        );
      case 'paused':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--warning)',
              boxShadow: '0 0 6px var(--warning)',
            }} />
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--warning)' }}>Paused</span>
          </div>
        );
      default:
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--warning)',
              boxShadow: '0 0 6px var(--warning)',
            }} />
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)' }}>{state}</span>
          </div>
        );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Containers</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Manage and monitor local Wails Docker core runtimes</p>
        </div>
      </div>

      {/* Control / Toolbar Row - mimicking Linear filters bar */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        gap: "12px", 
        background: "var(--bg-secondary)", 
        padding: "8px 12px", 
        border: "1px solid var(--border)", 
        borderRadius: "var(--radius-md)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
      }}>
        {/* Search Input */}
        <div style={{ position: "relative", flex: 1, maxWidth: "260px" }}>
          <Search size={12} color="var(--text-muted)" style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", opacity: 0.8 }} />
          <input 
            type="text" 
            placeholder="Search containers..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field" 
            style={{ paddingLeft: "28px", height: "30px", fontSize: "11.5px" }}
          />
        </div>

        {/* View / Filter Selector tabs */}
        <div style={{ display: "flex", gap: "2px", background: "var(--bg-primary)", padding: "2px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
          <button 
            className={`btn-outline ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            style={{ 
              padding: "4px 10px", 
              fontSize: "10.5px", 
              height: "24px",
              background: filter === 'all' ? 'var(--bg-tertiary)' : 'transparent',
              borderColor: filter === 'all' ? 'var(--border)' : 'transparent',
              boxShadow: filter === 'all' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
              color: filter === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            All
          </button>
          <button 
            className={`btn-outline ${filter === 'running' ? 'active' : ''}`}
            onClick={() => setFilter('running')}
            style={{ 
              padding: "4px 10px", 
              fontSize: "10.5px", 
              height: "24px",
              background: filter === 'running' ? 'var(--bg-tertiary)' : 'transparent',
              borderColor: filter === 'running' ? 'var(--border)' : 'transparent',
              boxShadow: filter === 'running' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
              color: filter === 'running' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            Running ({containers.filter(c => c.state === 'running').length})
          </button>
          <button 
            className={`btn-outline ${filter === 'stopped' ? 'active' : ''}`}
            onClick={() => setFilter('stopped')}
            style={{ 
              padding: "4px 10px", 
              fontSize: "10.5px", 
              height: "24px",
              background: filter === 'stopped' ? 'var(--bg-tertiary)' : 'transparent',
              borderColor: filter === 'stopped' ? 'var(--border)' : 'transparent',
              boxShadow: filter === 'stopped' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
              color: filter === 'stopped' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            Stopped ({containers.filter(c => c.state !== 'running').length})
          </button>
        </div>
      </div>

      {/* Grid of containers - formatted as a clean dashboard issue table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)" }}>
        {loading && containers.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "180px", background: "var(--bg-secondary)" }}>
            <div style={{ color: "var(--text-secondary)", fontSize: "12px", display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={13} className="animate-spin" style={{ animation: "spin 1.5s linear infinite" }} />
              Querying Docker services...
            </div>
          </div>
        ) : filteredContainers.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', border: "none", background: "var(--bg-secondary)", borderRadius: 0 }}>
            <Box size={30} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px', color: "var(--text-primary)" }}>No Containers Discovered</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', maxWidth: '300px', margin: '0 auto' }}>
              {searchTerm ? "No containers match your search query." : "You do not have any local Docker runtimes running."}
            </p>
          </div>
        ) : (
          filteredContainers.map((c) => {
            const isRunning = c.state === 'running';
            return (
              <div 
                key={c.id} 
                className="container-row" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '10px 16px',
                  background: "var(--bg-secondary)",
                  transition: "all var(--transition-fast)",
                  borderBottom: "1px solid var(--border)"
                }}
              >
                
                {/* Status indicator bullet + Name + Image details */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  
                  {/* Glowing custom status dot */}
                  <div style={{ width: '60px', flexShrink: 0 }}>
                    {renderStatusIcon(c.state)}
                  </div>

                  {/* ID tag */}
                  <span style={{ 
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)", 
                    fontSize: '9.5px', 
                    color: 'var(--text-muted)',
                    background: 'var(--bg-primary)',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    flexShrink: 0
                  }}>
                    {c.short_id}
                  </span>

                  {/* Container name */}
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: '600', color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.name}
                      </span>
                    </div>
                  </div>

                  {/* Divider arrow */}
                  <ArrowRight size={10} color="var(--text-muted)" style={{ opacity: 0.5, flexShrink: 0 }} />

                  {/* Image tag */}
                  <span style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-secondary)', 
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    opacity: 0.8
                  }}>
                    {c.image}
                  </span>

                </div>

                {/* Actions Button Panel - Sleek Linear-style outlined group */}
                <div className="action-panel" style={{ display: 'flex', gap: '1px', background: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: '1px' }}>
                  {c.state !== 'running' ? (
                    <button 
                      className="btn-outline" 
                      style={{ padding: '0 8px', height: "26px", fontSize: "10.5px", borderRadius: "3px 0 0 3px", border: "none" }} 
                      onClick={() => handleAction('start', c.id)} 
                      title="Start Container"
                      disabled={actionLoadingId === c.id}
                    >
                      <Play size={10} fill="currentColor" style={{ color: "var(--success)" }} />
                    </button>
                  ) : (
                    <button 
                      className="btn-outline" 
                      style={{ padding: '0 8px', height: "26px", fontSize: "10.5px", borderRadius: "3px 0 0 3px", border: "none" }} 
                      onClick={() => handleAction('stop', c.id)} 
                      title="Stop Container"
                      disabled={actionLoadingId === c.id}
                    >
                      <Square size={10} fill="currentColor" style={{ color: "var(--danger)" }} />
                    </button>
                  )}
                  
                  <button 
                    className="btn-outline" 
                    style={{ padding: '0 8px', height: "26px", fontSize: "10.5px", borderRadius: 0, border: "none" }} 
                    onClick={() => handleAction('restart', c.id)} 
                    title="Restart Container"
                    disabled={actionLoadingId === c.id}
                  >
                    <RotateCw size={10} />
                  </button>

                  {onNavigateToLogs && (
                    <button 
                      className="btn-outline" 
                      style={{ padding: '0 8px', height: "26px", fontSize: "10.5px", borderRadius: 0, border: "none" }} 
                      onClick={() => onNavigateToLogs(c.id)} 
                      title="View Console logs"
                    >
                      <ScrollText size={10} />
                    </button>
                  )}
                  
                  <button 
                    className="btn-outline" 
                    style={{ padding: '0 8px', height: "26px", fontSize: "10.5px", borderRadius: "0 3px 3px 0", color: 'var(--danger)', border: "none" }} 
                    onClick={() => handleAction('remove', c.id)} 
                    title="Force Remove"
                    disabled={actionLoadingId === c.id}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Embedded CSS for table row styling and rotation animation */}
      <style>{`
        .container-row:hover {
          background-color: var(--bg-hover) !important;
        }
        .container-row:last-child {
          border-bottom: none !important;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
