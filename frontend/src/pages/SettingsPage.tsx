import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { GetSetting, SaveSetting } from '../../wailsjs/go/bindings/SettingsBinding';

export default function SettingsPage() {
  const [openAiKey, setOpenAiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const key = await GetSetting('OPENAI_API_KEY');
      if (key) {
        setOpenAiKey(key);
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await SaveSetting('OPENAI_API_KEY', openAiKey);
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflow: 'auto', paddingBottom: '20px' }}>
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure application-wide settings and integrations</p>
      </div>

      <div className="glass-card" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={16} color="var(--accent-primary)" />
          AI Integrations
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            OpenAI API Key
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type={showKey ? "text" : "password"} 
              value={openAiKey}
              onChange={(e) => setOpenAiKey(e.target.value)}
              placeholder="sk-..."
              className="input-field"
              style={{ width: '100%', paddingRight: '40px', fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}
            />
            <button 
              className="btn-outline"
              style={{ position: 'absolute', right: '4px', padding: '4px', border: 'none', background: 'transparent' }}
              onClick={() => setShowKey(!showKey)}
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff size={14} color="var(--text-muted)" /> : <Eye size={14} color="var(--text-muted)" />}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Used for generating API requests from documentation in the API Tester. The key is encrypted before being stored locally in the database.
          </p>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
            <AlertCircle size={14} />
            <span style={{ fontSize: '12px', fontWeight: '500' }}>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>{success}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
