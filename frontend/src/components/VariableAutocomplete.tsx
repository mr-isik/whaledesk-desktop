import React, { useState, useEffect, useRef } from 'react';
import { domain } from '../../wailsjs/go/models';
import { Database, Lock } from 'lucide-react';

interface VariableAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  variables: domain.EnvVariable[];
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function VariableAutocomplete({
  value,
  onChange,
  variables,
  placeholder,
  multiline = false,
  className,
  style
}: VariableAutocompleteProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [cursorPos, setCursorPos] = useState({ start: 0, end: 0 });
  
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const filteredVars = variables.filter(v => 
    v.key.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    };
    if (showPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopup]);

  const updatePopupPosition = () => {
    if (!inputRef.current) return;
    
    // Very basic positioning for now. Ideally use getCaretCoordinates package for textarea.
    const rect = inputRef.current.getBoundingClientRect();
    setPopupPos({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const selectionStart = e.target.selectionStart || 0;
    
    // Check if we just typed `{{` or are inside `{{...`
    const beforeCursor = val.substring(0, selectionStart);
    const match = beforeCursor.match(/\{\{([^{}]*)$/);

    if (match) {
      setFilter(match[1]);
      setCursorPos({ start: selectionStart - match[1].length - 2, end: selectionStart });
      updatePopupPosition();
      setShowPopup(true);
      setSelectedIndex(0);
    } else {
      setShowPopup(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPopup) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredVars.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (filteredVars.length > 0) {
        insertVariable(filteredVars[selectedIndex].key);
      }
    } else if (e.key === 'Escape') {
      setShowPopup(false);
    }
  };

  const insertVariable = (key: string) => {
    const before = value.substring(0, cursorPos.start);
    const after = value.substring(cursorPos.end);
    const newValue = `${before}{{${key}}}${after}`;
    onChange(newValue);
    setShowPopup(false);
    
    // Restore focus and cursor position after render
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = cursorPos.start + key.length + 4; // 4 for {{ and }}
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  // Drag and drop handling
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data.startsWith('{{') || !data.endsWith('}}')) return;

    const el = inputRef.current;
    if (!el) return;

    // Insert at cursor or end
    const startPos = el.selectionStart || value.length;
    const endPos = el.selectionEnd || value.length;
    
    const newValue = value.substring(0, startPos) + data + value.substring(endPos);
    onChange(newValue);
  };

  const commonProps = {
    ref: inputRef as any,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onDrop: handleDrop,
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    placeholder,
    className,
    style
  };

  return (
    <>
      {multiline ? (
        <textarea {...commonProps} />
      ) : (
        <input type="text" {...commonProps} />
      )}

      {showPopup && filteredVars.length > 0 && (
        <div
          ref={popupRef}
          className="glass-card"
          style={{
            position: 'absolute',
            top: popupPos.top + 4,
            left: popupPos.left,
            zIndex: 100,
            width: '250px',
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '6px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-active)'
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', paddingLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={10} /> Insert Variable
          </div>
          {filteredVars.map((v, i) => (
            <div
              key={v.id}
              onClick={() => insertVariable(v.key)}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                background: i === selectedIndex ? 'var(--bg-hover)' : 'transparent',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: i === selectedIndex ? 'var(--accent-primary)' : 'var(--text-primary)', fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>
                  {v.key}
                </span>
                {v.is_secret && <Lock size={10} color="var(--text-muted)" />}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {v.is_secret ? '••••••••' : v.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
