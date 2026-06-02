import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { domain } from '../../wailsjs/go/models';
import VariableAutocomplete from './VariableAutocomplete';

export interface HeaderEntry {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface HeaderEditorProps {
  headers: HeaderEntry[];
  onChange: (headers: HeaderEntry[]) => void;
  variables: domain.EnvVariable[];
}

export default function HeaderEditor({ headers, onChange, variables }: HeaderEditorProps) {
  const handleAdd = () => {
    onChange([...headers, { id: crypto.randomUUID(), key: '', value: '', enabled: true }]);
  };

  const handleUpdate = (id: string, field: keyof HeaderEntry, value: any) => {
    onChange(headers.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const handleRemove = (id: string) => {
    onChange(headers.filter(h => h.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Request Headers</label>
        <button className="btn-outline" onClick={handleAdd} style={{ padding: '4px 8px', fontSize: '10px', height: '24px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Plus size={12} /> Add Header
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {headers.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>
            No headers configured.
          </div>
        ) : (
          headers.map((h, i) => (
            <div key={h.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', opacity: h.enabled ? 1 : 0.5 }}>
              <input 
                type="checkbox" 
                checked={h.enabled} 
                onChange={(e) => handleUpdate(h.id, 'enabled', e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              
              <div style={{ flex: 1, position: 'relative' }}>
                <VariableAutocomplete
                  value={h.key}
                  onChange={(val) => handleUpdate(h.id, 'key', val)}
                  variables={variables}
                  placeholder="Key (e.g. Authorization)"
                  className="input-field"
                  style={{ width: '100%', height: '32px', fontSize: '12px', fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
                />
              </div>

              <div style={{ flex: 2, position: 'relative' }}>
                <VariableAutocomplete
                  value={h.value}
                  onChange={(val) => handleUpdate(h.id, 'value', val)}
                  variables={variables}
                  placeholder="Value (e.g. Bearer {{token}})"
                  className="input-field"
                  style={{ width: '100%', height: '32px', fontSize: '12px', fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
                />
              </div>

              <button 
                className="btn-outline" 
                onClick={() => handleRemove(h.id)}
                style={{ padding: '6px', border: 'none', background: 'transparent' }}
                title="Remove Header"
              >
                <Trash2 size={14} color="var(--danger)" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
