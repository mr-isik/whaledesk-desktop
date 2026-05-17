import React, { useEffect, useState } from 'react';
import { Layers, Plus, Trash2, CheckCircle, Lock, Edit2, X, ShieldAlert } from 'lucide-react';
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

  
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');

  
  const [showVarForm, setShowVarForm] = useState(false);
  const [editingVar, setEditingVar] = useState<domain.EnvVariable | null>(null);
  const [varForm, setVarForm] = useState({ key: '', value: '', description: '', is_secret: false });

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
      
      
      if (!selectedEnvId && data && data.length > 0) {
        setSelectedEnvId(active ? active.id : data[0].id);
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
    if (!confirm('Are you sure you want to delete this environment?')) return;
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
      setVarForm({ key: v.key, value: '', description: v.description, is_secret: v.is_secret });
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
    if (!confirm('Delete this variable?')) return;
    try {
      await DeleteVariable(id);
      loadData();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const selectedEnv = environments.find(e => e.id === selectedEnvId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div>
        <h1 className="page-title" style={{ fontSize: '20px', marginBottom: '4px' }}>Environments</h1>
        <p className="page-subtitle" style={{ marginBottom: 0 }}>Manage environment-specific API variables and secrets</p>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        
        {}
        <div className="glass-card" style={{ width: '260px', display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>Environments</span>
            <button className="btn-outline" onClick={() => setShowAddEnv(!showAddEnv)} style={{ padding: '4px 8px', fontSize: '11px' }}>
              <Plus size={12} /> Add
            </button>
          </div>

          {showAddEnv && (
            <div style={{ marginBottom: '12px', display: 'flex', gap: '6px' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Name (e.g. Prod)" 
                value={newEnvName} 
                onChange={e => setNewEnvName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateEnv()}
                style={{ padding: '6px 10px', fontSize: '12px' }}
                autoFocus
              />
              <button className="btn-primary" onClick={handleCreateEnv} style={{ padding: '6px 10px' }}><CheckCircle size={14}/></button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {environments.map(env => (
              <div 
                key={env.id}
                onClick={() => setSelectedEnvId(env.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedEnvId === env.id ? 'var(--bg-tertiary)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid',
                  borderColor: selectedEnvId === env.id ? 'var(--border)' : 'transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <Layers size={14} color={activeEnvId === env.id ? 'var(--success)' : 'var(--text-secondary)'} />
                  <span style={{ fontSize: '13px', fontWeight: selectedEnvId === env.id ? '500' : 'normal', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {env.name}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '4px', opacity: selectedEnvId === env.id ? 1 : 0.4 }}>
                  {activeEnvId !== env.id && (
                    <button className="btn-outline" onClick={(e) => handleSetActive(env.id, e)} style={{ padding: '4px', border: 'none' }} title="Set Active">
                      <CheckCircle size={13} />
                    </button>
                  )}
                  <button className="btn-outline" onClick={(e) => handleDeleteEnv(env.id, e)} style={{ padding: '4px', border: 'none', color: 'var(--danger)' }} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {environments.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px', color: 'var(--text-muted)' }}>No environments</div>
            )}
          </div>
        </div>

        {}
        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, minWidth: 0, overflow: 'hidden' }}>
          {selectedEnv ? (
            <>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedEnv.name} Variables
                    {activeEnvId === selectedEnv.id && <span className="badge success" style={{ fontSize: '9px', padding: '2px 6px' }}>ACTIVE</span>}
                  </h3>
                </div>
                <button className="btn-primary" onClick={() => openVarForm()} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  <Plus size={14} /> Add Variable
                </button>
              </div>

              {showVarForm && (
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '13px', margin: 0, fontWeight: '600' }}>{editingVar ? 'Edit Variable' : 'New Variable'}</h4>
                    <button className="btn-outline" onClick={() => setShowVarForm(false)} style={{ padding: '4px', border: 'none' }}><X size={14}/></button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Key (e.g. base_url)</label>
                      <input type="text" className="input-field" value={varForm.key} onChange={e => setVarForm({...varForm, key: e.target.value})} placeholder="API_KEY" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Value {varForm.is_secret && '(Hidden after save)'}</label>
                      <input type={varForm.is_secret ? 'password' : 'text'} className="input-field" value={varForm.value} onChange={e => setVarForm({...varForm, value: e.target.value})} placeholder={editingVar && varForm.is_secret && !varForm.value ? "Leave empty to keep current secret" : "Value"} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Description (Optional)</label>
                      <input type="text" className="input-field" value={varForm.description} onChange={e => setVarForm({...varForm, description: e.target.value})} />
                    </div>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer', marginTop: '16px' }}>
                      <input type="checkbox" checked={varForm.is_secret} onChange={e => setVarForm({...varForm, is_secret: e.target.checked})} />
                      <ShieldAlert size={14} color="var(--warning)" /> Secret
                    </label>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <button className="btn-outline" onClick={() => setShowVarForm(false)} style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                    <button className="btn-primary" onClick={handleSaveVariable} style={{ padding: '6px 12px', fontSize: '12px' }}>Save Variable</button>
                  </div>
                </div>
              )}

              <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                {(!selectedEnv.variables || selectedEnv.variables.length === 0) ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '40px' }}>No variables defined in this environment.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: '600' }}>Key</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: '600' }}>Value</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: '600' }}>Description</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: '600' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEnv.variables.map((v) => (
                        <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }} className="log-row">
                          <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontWeight: '500' }}>{v.key}</td>
                          <td style={{ padding: '8px 12px', color: v.is_secret ? 'var(--text-muted)' : 'var(--text-secondary)', fontFamily: v.is_secret ? 'inherit' : 'monospace' }}>
                            {v.is_secret ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Lock size={12}/> {v.value}</span> : v.value}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{v.description}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button className="btn-outline" onClick={() => openVarForm(v)} style={{ padding: '4px', border: 'none' }}><Edit2 size={13}/></button>
                              <button className="btn-outline" onClick={() => handleDeleteVariable(v.id)} style={{ padding: '4px', border: 'none', color: 'var(--danger)' }}><Trash2 size={13}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Select an environment to view variables
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
