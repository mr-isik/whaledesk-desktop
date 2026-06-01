import React, { useEffect, useState } from 'react';
import { Layers, Plus, Trash2, CheckCircle, Lock, Edit2, X, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { 
  ListEnvironments, CreateEnvironment, DeleteEnvironment, SetActiveEnvironment,
  AddVariable, UpdateVariable, DeleteVariable 
} from '../../wailsjs/go/bindings/EnvBinding';
import { domain } from '../../wailsjs/go/models';

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<domain.Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Add environment wizard
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');

  // Variable editor wizard
  const [showVarForm, setShowVarForm] = useState(false);
  const [editingVar, setEditingVar] = useState<domain.EnvVariable | null>(null);
  const [varForm, setVarForm] = useState({ key: '', value: '', description: '', is_secret: false });
  const [rowRevealState, setRowRevealState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await ListEnvironments();
      setEnvironments(data || []);
      const active = data?.find(e => e.is_active);
      if (active) setActiveEnvId(active.id);
      
      // Default select active environment, or first environment
      if (data && data.length > 0) {
        if (selectedEnvId) {
          const stillExists = data.some(e => e.id === selectedEnvId);
          if (!stillExists) setSelectedEnvId(active ? active.id : data[0].id);
        } else {
          setSelectedEnvId(active ? active.id : data[0].id);
        }
      } else {
        setSelectedEnvId(null);
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEnv = async () => {
    if (!newEnvName.trim()) return;
    try {
      await CreateEnvironment(newEnvName);
      setNewEnvName('');
      setShowAddEnv(false);
      loadData();
    } catch (e: any) {
      setError(e.toString());
    }
  };

  const handleDeleteEnv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this environment and all its configured variables?')) return;
    try {
      await DeleteEnvironment(id);
      if (selectedEnvId === id) setSelectedEnvId(null);
      loadData();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const handleSetActive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await SetActiveEnvironment(id);
      loadData();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const openVarForm = (v?: domain.EnvVariable) => {
    if (v) {
      setEditingVar(v);
      setVarForm({ key: v.key, value: v.value, description: v.description, is_secret: v.is_secret });
    } else {
      setEditingVar(null);
      setVarForm({ key: '', value: '', description: '', is_secret: false });
    }
    setShowVarForm(true);
  };

  const handleSaveVariable = async () => {
    if (!selectedEnvId || !varForm.key.trim()) return;
    try {
      if (editingVar) {
        await UpdateVariable(editingVar.id, varForm.key, varForm.value, varForm.description, varForm.is_secret);
      } else {
        await AddVariable(selectedEnvId, varForm.key, varForm.value, varForm.description, varForm.is_secret);
      }
      setShowVarForm(false);
      loadData();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const handleDeleteVariable = async (id: string) => {
    if (!confirm('Are you sure you want to delete this variable?')) return;
    try {
      await DeleteVariable(id);
      loadData();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const toggleRowReveal = (id: string) => {
    setRowRevealState(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectedEnv = environments.find(e => e.id === selectedEnvId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', gap: '16px', minHeight: 0 }}>
      {/* Title */}
      <div>
        <h1 className="page-title">Environments</h1>
        <p className="page-subtitle" style={{ marginBottom: 0 }}>Manage API environment variables, secrets, and configuration maps</p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '500' }}>
          Error: {error}
        </div>
      )}

      {/* Two-Column Panel Layout */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Environments Directory selector */}
        <div 
          className="glass-card" 
          style={{ 
            width: '260px', 
            display: 'flex', 
            flexDirection: 'column', 
            padding: '16px', 
            overflowY: 'auto',
            flexShrink: 0,
            background: "var(--bg-secondary)"
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
            <span style={{ fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Environments</span>
            <button className="btn-outline" onClick={() => setShowAddEnv(!showAddEnv)} style={{ padding: '4px 8px', fontSize: '11px', height: "24px" }}>
              <Plus size={11} /> 
              Add
            </button>
          </div>

          {showAddEnv && (
            <div style={{ marginBottom: '12px', display: 'flex', gap: '6px', animation: "fadeIn 0.15s ease" }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Production" 
                value={newEnvName} 
                onChange={e => setNewEnvName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateEnv()}
                style={{ padding: '6px 10px', fontSize: '12px', height: '30px' }}
                autoFocus
              />
              <button className="btn-primary" onClick={handleCreateEnv} style={{ padding: '6px 10px', height: '30px' }}><CheckCircle size={13}/></button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {environments.map(env => {
              const isSelected = selectedEnvId === env.id;
              const isActive = activeEnvId === env.id;
              return (
                <div 
                  key={env.id}
                  onClick={() => setSelectedEnvId(env.id)}
                  className={`nav-item ${isSelected ? 'active' : ''}`}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Layers size={13} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} style={{ filter: isActive ? 'drop-shadow(0 0 4px var(--accent-glow))' : 'none' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isSelected ? '600' : 'normal' }}>
                      {env.name}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px', opacity: isSelected ? 1 : 0.4 }}>
                    {!isActive && (
                      <button className="btn-outline" onClick={(e) => handleSetActive(env.id, e)} style={{ padding: '3px', border: 'none', background: 'transparent' }} title="Set Active">
                        <CheckCircle size={12} />
                      </button>
                    )}
                    <button className="btn-outline" onClick={(e) => handleDeleteEnv(env.id, e)} style={{ padding: '3px', border: 'none', color: 'var(--danger)', background: 'transparent' }} title="Delete Environment">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
            {environments.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: '11px', color: 'var(--text-muted)' }}>No configurations.</div>
            )}
          </div>
        </div>

        {/* Right Column: Variables database catalog */}
        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, minWidth: 0, overflow: 'hidden' }}>
          {selectedEnv ? (
            <>
              {/* Active environment table header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.015)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                    {selectedEnv.name} Catalog
                  </h3>
                  {activeEnvId === selectedEnv.id && (
                    <span className="badge success" style={{ fontSize: '8px', padding: '2px 6px' }}>
                      Active Configuration
                    </span>
                  )}
                </div>
                <button className="btn-primary" onClick={() => openVarForm()} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  <Plus size={13} /> 
                  Add Variable
                </button>
              </div>

              {/* collapsible New/Edit Variable details panel */}
              {showVarForm && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: '14px', animation: "fadeIn 0.2s ease" }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '12px', margin: 0, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                      {editingVar ? 'Edit Variable Profile' : 'Configure New Variable'}
                    </h4>
                    <button className="btn-outline" onClick={() => setShowVarForm(false)} style={{ padding: '4px', border: 'none', background: 'transparent' }}><X size={14}/></button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Variable Key</label>
                      <input type="text" className="input-field" value={varForm.key} onChange={e => setVarForm({...varForm, key: e.target.value})} placeholder="API_ENDPOINT_URL" style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Value {varForm.is_secret && '(Hidden after save)'}</label>
                      <input type={varForm.is_secret ? 'password' : 'text'} className="input-field" value={varForm.value} onChange={e => setVarForm({...varForm, value: e.target.value})} placeholder={editingVar && varForm.is_secret && !varForm.value ? "Leave empty to keep original secret" : "Variable Value"} style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Description (Optional)</label>
                      <input type="text" className="input-field" value={varForm.description} onChange={e => setVarForm({...varForm, description: e.target.value})} placeholder="Database endpoint server locator" />
                    </div>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer', marginTop: '18px', userSelect: "none" }}>
                      <input type="checkbox" checked={varForm.is_secret} onChange={e => setVarForm({...varForm, is_secret: e.target.checked})} style={{ accentColor: "var(--accent-primary)", width: "14px", height: "14px" }} />
                      <ShieldAlert size={13} color="var(--warning)" /> 
                      <span style={{ fontWeight: '500' }}>Mask as Secret</span>
                    </label>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <button className="btn-outline" onClick={() => setShowVarForm(false)} style={{ padding: '6px 14px', fontSize: '12px' }}>Cancel</button>
                    <button className="btn-primary" onClick={handleSaveVariable} style={{ padding: '6px 14px', fontSize: '12px' }}>Save Variable</button>
                  </div>
                </div>
              )}

              {/* Variables List/Table Catalog */}
              <div style={{ flex: 1, overflow: 'auto', padding: '12px', background: "var(--bg-primary)" }}>
                {(!selectedEnv.variables || selectedEnv.variables.length === 0) ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No environment variables defined. Configure one to get started.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: '700', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Key</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: '700', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Value</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: '700', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Description</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: '700', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEnv.variables.map((v) => {
                        const isRevealed = !!rowRevealState[v.id];
                        return (
                          <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }} className="log-row">
                            {/* Key */}
                            <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: '700', fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>
                              {v.key}
                            </td>
                            
                            {/* Value */}
                            <td style={{ padding: '10px 12px', color: v.is_secret && !isRevealed ? 'var(--text-muted)' : 'var(--text-secondary)', fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>
                              {v.is_secret && !isRevealed ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Lock size={11} color="var(--text-muted)" /> 
                                  <span>••••••••</span>
                                </span>
                              ) : (
                                v.value
                              )}
                            </td>
                            
                            {/* Description */}
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                              {v.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px' }}>none</span>}
                            </td>
                            
                            {/* Actions panel */}
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                {v.is_secret && (
                                  <button 
                                    className="btn-outline" 
                                    onClick={() => toggleRowReveal(v.id)}
                                    style={{ padding: '4px', border: 'none', background: 'transparent' }}
                                    title={isRevealed ? "Hide Secret" : "Reveal Secret"}
                                  >
                                    {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                                  </button>
                                )}
                                <button className="btn-outline" onClick={() => openVarForm(v)} style={{ padding: '4px', border: 'none', background: 'transparent' }} title="Edit"><Edit2 size={12}/></button>
                                <button className="btn-outline" onClick={() => handleDeleteVariable(v.id)} style={{ padding: '4px', border: 'none', color: 'var(--danger)', background: 'transparent' }} title="Delete"><Trash2 size={12}/></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              Select an environment configuration on the left to edit variable registries.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
