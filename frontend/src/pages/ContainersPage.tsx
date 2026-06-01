import React, { useEffect, useState } from 'react';
import { Play, Square, RotateCw, Trash2, Box, Search, ExternalLink, ScrollText } from 'lucide-react';
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Containers</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Manage and monitor local Docker services</p>
        </div>
      </div>

      {/* Control / Toolbar Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", background: "var(--bg-secondary)", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <Search size={14} color="var(--text-secondary)" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
          <input 
            type="text" 
            placeholder="Search containers..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field" 
            style={{ paddingLeft: "32px", height: "34px" }}
          />
        </div>

        {/* Filter Buttons */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button 
            className={`btn-outline ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            style={{ 
              padding: "6px 12px", 
              fontSize: "12px", 
              background: filter === 'all' ? 'var(--bg-tertiary)' : 'transparent',
              borderColor: filter === 'all' ? 'var(--accent-primary)' : 'var(--border)' 
            }}
          >
            All
          </button>
          <button 
            className={`btn-outline ${filter === 'running' ? 'active' : ''}`}
            onClick={() => setFilter('running')}
            style={{ 
              padding: "6px 12px", 
              fontSize: "12px", 
              background: filter === 'running' ? 'var(--bg-tertiary)' : 'transparent',
              borderColor: filter === 'running' ? 'var(--accent-primary)' : 'var(--border)' 
            }}
          >
            Running ({containers.filter(c => c.state === 'running').length})
          </button>
          <button 
            className={`btn-outline ${filter === 'stopped' ? 'active' : ''}`}
            onClick={() => setFilter('stopped')}
            style={{ 
              padding: "6px 12px", 
              fontSize: "12px", 
              background: filter === 'stopped' ? 'var(--bg-tertiary)' : 'transparent',
              borderColor: filter === 'stopped' ? 'var(--accent-primary)' : 'var(--border)' 
            }}
          >
            Stopped ({containers.filter(c => c.state !== 'running').length})
          </button>
        </div>
      </div>

      {/* Grid of containers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && containers.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
            <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Loading containers...</div>
          </div>
        ) : filteredContainers.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', border: "1px dashed var(--border)", background: "rgba(255,255,255,0.01)" }}>
            <Box size={36} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', color: "var(--text-primary)" }}>No Containers Found</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              {searchTerm ? "No containers match your search query." : "You do not have any local Docker containers active."}
            </p>
          </div>
        ) : (
          filteredContainers.map((c) => {
            const isRunning = c.state === 'running';
            return (
              <div 
                key={c.id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '16px 20px',
                  borderLeft: `3px solid ${isRunning ? "var(--accent-primary)" : "var(--border)"}`
                }}
              >
                
                {/* Left Info Area */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ 
                    padding: "10px", 
                    background: "var(--bg-primary)", 
                    border: "1px solid var(--border)", 
                    borderRadius: "var(--radius-sm)", 
                    color: isRunning ? "var(--accent-primary)" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Box size={18} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', letterSpacing: "-0.015em", color: "var(--text-primary)" }}>{c.name}</span>
                      <span style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)", fontSize: '10px', color: 'var(--text-muted)' }}>{c.short_id}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>{c.image}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span className={`badge ${isRunning ? 'success' : 'neutral'}`} style={{ fontSize: '9px', padding: "3px 8px" }}>
                    {c.state}
                  </span>
                </div>

                {/* Actions Button Panel */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {c.state !== 'running' ? (
                    <button 
                      className="btn-outline" 
                      style={{ padding: '6px 10px', height: "32px" }} 
                      onClick={() => handleAction('start', c.id)} 
                      title="Start Container"
                      disabled={actionLoadingId === c.id}
                    >
                      <Play size={12} fill="currentColor" />
                    </button>
                  ) : (
                    <button 
                      className="btn-outline" 
                      style={{ padding: '6px 10px', height: "32px" }} 
                      onClick={() => handleAction('stop', c.id)} 
                      title="Stop Container"
                      disabled={actionLoadingId === c.id}
                    >
                      <Square size={12} fill="currentColor" />
                    </button>
                  )}
                  
                  <button 
                    className="btn-outline" 
                    style={{ padding: '6px 10px', height: "32px" }} 
                    onClick={() => handleAction('restart', c.id)} 
                    title="Restart Container"
                    disabled={actionLoadingId === c.id}
                  >
                    <RotateCw size={12} />
                  </button>

                  {onNavigateToLogs && (
                    <button 
                      className="btn-outline" 
                      style={{ padding: '6px 10px', height: "32px" }} 
                      onClick={() => onNavigateToLogs(c.id)} 
                      title="View Logs"
                    >
                      <ScrollText size={12} />
                    </button>
                  )}
                  
                  <button 
                    className="btn-outline" 
                    style={{ padding: '6px 10px', height: "32px", color: 'var(--danger)', borderColor: "var(--danger-border)" }} 
                    onClick={() => handleAction('remove', c.id)} 
                    title="Force Remove"
                    disabled={actionLoadingId === c.id}
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
  );
}
