import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, History, CheckCircle, RefreshCcw, AlertCircle, Upload, Trash2, Folder, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { GenerateCollection, ListCollections, DeleteCollection, GetCollectionItemPage } from '../../wailsjs/go/bindings/AIBinding';
import { domain, bindings } from '../../wailsjs/go/models';

interface AIPanelProps {
  onApply: (method: string, url: string, headers: Record<string, string>, payload: string) => void;
}

export default function AIPanel({ onApply }: AIPanelProps) {
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
  const [pageData, setPageData] = useState<bindings.CollectionPageResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 1; // 1 endpoint per page for Postman-like browse feel, or 1 for simplicity of Apply

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'collections') {
      loadCollections();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'browse' && selectedCollection) {
      loadCollectionPage(selectedCollection.id, currentPage);
    }
  }, [activeTab, selectedCollection, currentPage]);

  const loadCollections = async () => {
    try {
      const cols = await ListCollections();
      setCollections(cols || []);
    } catch (e: any) {
      console.error("Failed to load collections:", e);
    }
  };

  const loadCollectionPage = async (collectionId: number, page: number) => {
    try {
      const data = await GetCollectionItemPage(collectionId, page, pageSize);
      setPageData(data);
    } catch (e: any) {
      console.error("Failed to load collection items:", e);
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
      // Optionally switch to collections tab
      setTimeout(() => {
        setSuccessMsg('');
        setActiveTab('collections');
      }, 2000);
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
      loadCollections();
    } catch (err: any) {
      console.error("Delete failed:", err);
    }
  };

  const handleApply = (method: string, url: string, headers: any, payload: string) => {
    let parsedHeaders = headers;
    if (typeof headers === 'string' && headers.trim() !== '') {
        try { parsedHeaders = JSON.parse(headers); } catch (e) {}
    }
    onApply(method, url, parsedHeaders || {}, payload || '');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
        <Sparkles size={16} color="var(--warning)" />
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
              fontSize: '11px', 
              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              resize: 'vertical'
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
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>
              No collections found.
            </div>
          ) : (
            collections.map(col => (
              <div 
                key={col.id} 
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '10px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setSelectedCollection(col);
                  setCurrentPage(1);
                  setActiveTab('browse');
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Folder size={12} color="var(--accent-primary)" />
                    {col.name}
                  </div>
                  <button 
                    className="btn-icon" 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCollection(col.id); }}
                    style={{ color: 'var(--danger)', padding: '2px' }}
                    title="Delete Collection"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span>{col.item_count} endpoints</span>
                  <span>{new Date(col.created_at as string).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'browse' && pageData && selectedCollection && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {selectedCollection.name}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <button 
                className="btn-icon" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              <span>{currentPage} / {Math.ceil(pageData.total / pageSize) || 1}</span>
              <button 
                className="btn-icon"
                disabled={currentPage >= Math.ceil(pageData.total / pageSize)}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {pageData.items && pageData.items.length > 0 ? (
            pageData.items.map(item => (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge success`} style={{ fontSize: '10px' }}>{item.method}</span>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{item.name}</span>
                </div>
                
                {item.description && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {item.description}
                  </div>
                )}
                
                <div style={{ fontSize: '11px', fontFamily: "var(--font-mono, 'Geist Mono', monospace)", wordBreak: 'break-all', color: 'var(--accent-primary)', background: 'var(--bg-tertiary)', padding: '6px', borderRadius: '4px' }}>
                  {item.url}
                </div>

                <button 
                  className="btn-primary" 
                  onClick={() => handleApply(item.method, item.url, item.headers, item.payload)}
                  style={{ width: '100%', height: '28px', fontSize: '11px' }}
                >
                  <CheckCircle size={12} style={{ marginRight: '6px' }} /> Apply to API Tester
                </button>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>
              No endpoints found in this collection.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
