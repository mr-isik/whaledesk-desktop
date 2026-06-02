import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, CheckCircle, RefreshCcw, AlertCircle, Upload, Trash2, Folder, ChevronLeft, Search, ChevronDown, Check, Lock, Code2, List } from 'lucide-react';
import { GenerateCollection, ListCollections, DeleteCollection, GetCollectionItems } from '../../wailsjs/go/bindings/AIBinding';
import { domain } from '../../wailsjs/go/models';

interface AIPanelProps {
  onApply: (method: string, url: string, headers: Record<string, string>, payload: string) => void;
  activeUrl: string;
  activeMethod: string;
}

export default function AIPanel({ onApply, activeUrl, activeMethod }: AIPanelProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'collections' | 'browse'>('generate');
  
  // Generate State
  const [docInput, setDocInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Collections State
  const [collections, setCollections] = useState<domain.AICollection[]>([]);
  
  // Browse State
  const [selectedCollection, setSelectedCollection] = useState<domain.AICollection | null>(null);
  const [endpoints, setEndpoints] = useState<domain.AICollectionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'collections') {
      loadCollections();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'browse' && selectedCollection) {
      loadCollectionItems(selectedCollection.id);
    }
  }, [activeTab, selectedCollection]);

  const loadCollections = async () => {
    try {
      const cols = await ListCollections();
      setCollections(cols || []);
    } catch (e: any) {
      console.error("Failed to load collections:", e);
    }
  };

  const loadCollectionItems = async (collectionId: number) => {
    setLoading(true);
    try {
      const items = await GetCollectionItems(collectionId);
      setEndpoints(items || []);
    } catch (e: any) {
      console.error("Failed to load collection items:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!docInput.trim()) return;
    
    const collectionName = window.prompt("Enter a name for this API Collection:");
    if (!collectionName || !collectionName.trim()) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const col = await GenerateCollection(collectionName, docInput);
      setSuccessMsg(`Successfully generated ${col.item_count} endpoints!`);
      setTimeout(() => {
        setSuccessMsg('');
        setSelectedCollection(col);
        setActiveTab('browse');
      }, 1500);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollection = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this collection?")) return;
    try {
      await DeleteCollection(id);
      if (selectedCollection?.id === id) {
        setSelectedCollection(null);
        setActiveTab('collections');
      }
      loadCollections();
    } catch (err: any) {
      console.error("Delete failed:", err);
    }
  };

  const handleApply = (item: domain.AICollectionItem) => {
    let parsedHeaders: Record<string, string> = {};
    if (typeof item.headers === 'string' && item.headers.trim() !== '') {
        try { parsedHeaders = JSON.parse(item.headers); } catch (e) {}
    } else if (typeof item.headers === 'object' && item.headers !== null) {
        parsedHeaders = item.headers as Record<string, string>;
    }
    onApply(item.method, item.url, parsedHeaders, item.payload || '');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setDocInput(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getMethodBadgeStyle = (method: string) => {
    const m = method.toUpperCase();
    if (m === 'GET') {
      return {
        color: 'var(--success)',
        background: 'var(--success-bg)',
        border: '1px solid var(--success-border)'
      };
    }
    if (m === 'POST') {
      return {
        color: 'var(--warning)',
        background: 'var(--warning-bg)',
        border: '1px solid var(--warning-border)'
      };
    }
    if (m === 'PUT') {
      return {
        color: '#3b82f6',
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.12)'
      };
    }
    if (m === 'DELETE') {
      return {
        color: 'var(--danger)',
        background: 'var(--danger-bg)',
        border: '1px solid var(--danger-border)'
      };
    }
    // PATCH, OPTIONS, etc.
    return {
      color: '#a855f7',
      background: 'rgba(168, 85, 247, 0.05)',
      border: '1px solid rgba(168, 85, 247, 0.12)'
    };
  };

  const filteredEndpoints = endpoints.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      item.method.toLowerCase().includes(query) ||
      item.url.toLowerCase().includes(query) ||
      item.name?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
        <Sparkles size={16} color="var(--accent-primary)" style={{ filter: 'drop-shadow(0 0 4px var(--accent-glow))' }} />
        <h3 style={{ fontSize: '13px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>AI Assistant</h3>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          className={`btn-outline ${activeTab === 'generate' ? 'active' : ''}`}
          style={{ flex: 1, padding: '6px', fontSize: '11px', height: '28px', background: activeTab === 'generate' ? 'var(--bg-tertiary)' : 'transparent' }}
          onClick={() => setActiveTab('generate')}
        >
          <Sparkles size={12} style={{ marginRight: '4px' }} /> Generate
        </button>
        <button 
          className={`btn-outline ${activeTab === 'collections' ? 'active' : ''}`}
          style={{ flex: 1, padding: '6px', fontSize: '11px', height: '28px', background: activeTab === 'collections' ? 'var(--bg-tertiary)' : 'transparent' }}
          onClick={() => setActiveTab('collections')}
        >
          <Folder size={12} style={{ marginRight: '4px' }} /> Collections
        </button>
        {selectedCollection && (
          <button 
            className={`btn-outline ${activeTab === 'browse' ? 'active' : ''}`}
            style={{ flex: 1, padding: '6px', fontSize: '11px', height: '28px', background: activeTab === 'browse' ? 'var(--bg-tertiary)' : 'transparent' }}
            onClick={() => setActiveTab('browse')}
          >
            <List size={12} style={{ marginRight: '4px' }} /> Browse
          </button>
        )}
      </div>

      {activeTab === 'generate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Paste or upload OpenAPI doc
            </div>
            <input 
              type="file" 
              accept=".json,.yaml,.yml" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
            />
            <button 
              className="btn-outline" 
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '2px 6px', fontSize: '10px', height: '22px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Upload size={10} /> Upload File
            </button>
          </div>
          
          <textarea
            className="input-field"
            value={docInput}
            onChange={(e) => setDocInput(e.target.value)}
            placeholder="paths:\n  /users:\n    post:\n      summary: Create user..."
            style={{ 
              height: '180px', 
              fontSize: '11.5px', 
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              resize: 'vertical',
              lineHeight: '1.4'
            }}
          />

          <button 
            className="btn-primary" 
            onClick={handleGenerate} 
            disabled={loading || !docInput.trim()}
            style={{ width: '100%', height: '32px', fontSize: '12px' }}
          >
            {loading ? <RefreshCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Generating All Endpoints...' : 'Generate Requests'}
          </button>

          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '8px', borderRadius: 'var(--radius-sm)', fontSize: '11px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ wordBreak: 'break-word' }}>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)', padding: '8px', borderRadius: 'var(--radius-sm)', fontSize: '11px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <CheckCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ wordBreak: 'break-word' }}>{successMsg}</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'collections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {collections.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '20px' }}>
              No collections found. Generate one above!
            </div>
          ) : (
            collections.map(col => (
              <div 
                key={col.id} 
                className="glass-card"
                style={{ 
                  padding: '12px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  cursor: 'pointer',
                  border: '1px solid var(--border)'
                }}
                onClick={() => {
                  setSelectedCollection(col);
                  setSearchQuery('');
                  setActiveTab('browse');
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '600', fontSize: '12.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Folder size={13} color="var(--accent-primary)" style={{ filter: 'drop-shadow(0 0 3px var(--accent-glow))' }} />
                    {col.name}
                  </div>
                  <button 
                    className="btn-outline" 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCollection(col.id); }}
                    style={{ color: 'var(--danger)', border: 'none', background: 'transparent', padding: '4px', height: '22px', width: '22px' }}
                    title="Delete Collection"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  <span>{col.item_count} endpoints</span>
                  <span>{new Date(col.created_at as string).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'browse' && selectedCollection && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
          {/* Header row with back button and collection info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            <button 
              className="btn-outline" 
              onClick={() => setActiveTab('collections')}
              style={{ padding: '4px 8px', height: '28px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={13} />
              <span>Back</span>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedCollection.name}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {endpoints.length} endpoints • AI Collections
              </div>
            </div>
          </div>

          {/* Quick Filter Search Bar */}
          <div style={{ position: 'relative' }}>
            <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search endpoints (e.g. GET users)..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '30px', fontSize: '11px', paddingRight: searchQuery ? '30px' : '10px', height: '30px' }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px', padding: '4px' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Endpoint List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
            {loading ? (
              <div style={{ display: 'flex', height: '80px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px', gap: '8px' }}>
                <RefreshCcw size={12} className="animate-spin" />
                Loading endpoints...
              </div>
            ) : filteredEndpoints.length === 0 ? (
              <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>
                No matching endpoints found.
              </div>
            ) : (
              filteredEndpoints.map(item => {
                const isExpanded = expandedItemId === item.id;
                const isSelected = activeUrl === item.url && activeMethod.toUpperCase() === item.method.toUpperCase(); 
                const badgeStyle = getMethodBadgeStyle(item.method);
                
                return (
                  <div 
                    key={item.id}
                    className="glass-card"
                    style={{
                      padding: '10px 12px',
                      background: isSelected ? 'rgba(110, 86, 207, 0.04)' : 'var(--bg-primary)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all var(--transition-fast)',
                      cursor: 'pointer',
                      boxShadow: isSelected ? 'var(--shadow-card-hover)' : 'none'
                    }}
                    onClick={() => handleApply(item)}
                  >
                    {/* Upper row: Method & Path */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        style={{ 
                          fontSize: '8.5px', 
                          fontWeight: '800', 
                          padding: '2px 5px', 
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          ...badgeStyle
                        }}
                      >
                        {item.method}
                      </span>
                      
                      <span 
                        style={{ 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          color: 'var(--text-primary)',
                          fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={item.url}
                      >
                        {item.url}
                      </span>

                      {/* Small Actions */}
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          className="btn-outline"
                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                          style={{ padding: '3px', border: 'none', background: 'transparent', height: '20px', width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Show details"
                        >
                          <ChevronDown size={11} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                        </button>
                      </div>
                    </div>

                    {/* Quick description line if collapsed */}
                    {!isExpanded && item.name && (
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: '2px' }}>
                        {item.name}
                      </div>
                    )}

                    {/* Active highlight label */}
                    {isSelected && !isExpanded && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', color: 'var(--accent-primary)', fontWeight: '600', paddingLeft: '2px' }}>
                        <Check size={10} strokeWidth={2.5} />
                        Active in Workspace
                      </div>
                    )}

                    {/* Expanded details */}
                    {isExpanded && (
                      <div 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '8px', 
                          paddingTop: '8px', 
                          borderTop: '1px solid var(--border)',
                          cursor: 'default'
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {item.name && (
                          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {item.name}
                          </div>
                        )}
                        {item.description && (
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '1.4' }}>
                            {item.description}
                          </div>
                        )}

                        {/* Headers details */}
                        {item.headers && item.headers !== '{}' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Headers</span>
                            <pre style={{ margin: 0, fontSize: '9.5px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '6px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: "var(--font-mono, 'Geist Mono', monospace)", overflowX: 'auto' }}>
                              {item.headers}
                            </pre>
                          </div>
                        )}

                        {/* Payload details */}
                        {item.payload && item.payload !== '{}' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Body Payload</span>
                            <pre style={{ margin: 0, fontSize: '9.5px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '6px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: "var(--font-mono, 'Geist Mono', monospace)", overflowX: 'auto' }}>
                              {item.payload}
                            </pre>
                          </div>
                        )}
                        
                        <button 
                          className="btn-primary" 
                          onClick={() => handleApply(item)}
                          style={{ width: '100%', height: '24px', fontSize: '10.5px', marginTop: '4px' }}
                        >
                          <CheckCircle size={11} style={{ marginRight: '4px' }} /> Apply to API Tester
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
