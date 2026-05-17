import React, { useEffect, useState } from 'react';
import { Play, Square, RotateCw, Trash2, Box } from 'lucide-react';
import { GetContainers, StartContainer, StopContainer, RestartContainer, RemoveContainer } from '../../wailsjs/go/bindings/DockerBinding';
import { domain } from '../../wailsjs/go/models';

export default function ContainersPage() {
  const [containers, setContainers] = useState<domain.Container[]>([]);
  const [loading, setLoading] = useState(true);

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
    try {
      switch (action) {
        case 'start': await StartContainer(id); break;
        case 'stop': await StopContainer(id); break;
        case 'restart': await RestartContainer(id); break;
        case 'remove': await RemoveContainer(id, true); break;
      }
      fetchContainers();
    } catch (e) {
      alert(`Action failed: ${e}`);
    }
  };

  return (
    <div>
      <h1 className="page-title">Containers</h1>
      <p className="page-subtitle">Manage your local Docker containers</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && containers.length === 0 ? (
          <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Loading containers...</div>
        ) : containers.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', border: "1px dashed var(--border)" }}>
            <Box size={32} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>No Containers Found</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>You don't have any Docker containers on this machine.</p>
          </div>
        ) : (
          containers.map((c) => (
            <div key={c.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
              
              {/* Info Area */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px', letterSpacing: "-0.01em" }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{c.image} • {c.short_id}</div>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                <span className={`badge ${c.state === 'running' ? 'success' : 'danger'}`} style={{ fontSize: '10px' }}>
                  {c.state}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {c.state !== 'running' ? (
                  <button className="btn-outline" style={{ padding: '6px 10px' }} onClick={() => handleAction('start', c.id)} title="Start">
                    <Play size={14} fill="currentColor" />
                  </button>
                ) : (
                  <button className="btn-outline" style={{ padding: '6px 10px' }} onClick={() => handleAction('stop', c.id)} title="Stop">
                    <Square size={14} fill="currentColor" />
                  </button>
                )}
                
                <button className="btn-outline" style={{ padding: '6px 10px' }} onClick={() => handleAction('restart', c.id)} title="Restart">
                  <RotateCw size={14} />
                </button>
                
                <button className="btn-outline" style={{ padding: '6px 10px', color: 'var(--danger)' }} onClick={() => handleAction('remove', c.id)} title="Remove (Force)">
                  <Trash2 size={14} />
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}
