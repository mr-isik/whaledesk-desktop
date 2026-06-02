import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, KeyRound, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { GetSetting, SaveSetting } from '../../wailsjs/go/bindings/SettingsBinding';

export default function SettingsPage() {
  const [openAiKey, setOpenAiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('dockit-theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const currentTheme = (localStorage.getItem('dockit-theme') as 'light' | 'dark') || 'dark';
      setTheme(currentTheme);
    };
    window.addEventListener('dockit-theme-change', handleThemeChange);
    return () => window.removeEventListener('dockit-theme-change', handleThemeChange);
  }, []);

  const handleThemeToggle = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('dockit-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    window.dispatchEvent(new Event('dockit-theme-change'));
  };

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

      {/* Appearance Settings Card */}
      <div className="glass-card" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sun size={16} color="var(--accent-primary)" />
          Appearance Settings
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '12.5px', fontWeight: '500', color: 'var(--text-secondary)' }}>
            Application Theme
          </label>
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button
              onClick={() => handleThemeToggle('dark')}
              className={`btn-outline ${theme === 'dark' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: theme === 'dark' ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                background: theme === 'dark' ? 'rgba(110, 86, 207, 0.04)' : 'var(--bg-tertiary)',
                color: theme === 'dark' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '12.5px'
              }}
            >
              <Moon size={15} color={theme === 'dark' ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
              Dark Mode (Cosmic Developer)
            </button>
            <button
              onClick={() => handleThemeToggle('light')}
              className={`btn-outline ${theme === 'light' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: theme === 'light' ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                background: theme === 'light' ? 'rgba(110, 86, 207, 0.04)' : 'var(--bg-tertiary)',
                color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '12.5px'
              }}
            >
              <Sun size={15} color={theme === 'light' ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
              Light Mode (Cosmic Clean)
            </button>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Choose between Dockit's dark, linear-inspired developer workspace or a crisp, high-contrast light mode.
          </p>
        </div>
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
