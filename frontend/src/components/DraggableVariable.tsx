import React from 'react';
import { domain } from '../../wailsjs/go/models';

interface DraggableVariableProps {
  variable: domain.EnvVariable;
  children: React.ReactNode;
}

export default function DraggableVariable({ variable, children }: DraggableVariableProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', `{{${variable.key}}}`);
    e.dataTransfer.effectAllowed = 'copy';
    
    // Optional: make it look slightly transparent while dragging
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ cursor: 'grab' }}
      title="Drag me to an input field"
    >
      {children}
    </div>
  );
}
