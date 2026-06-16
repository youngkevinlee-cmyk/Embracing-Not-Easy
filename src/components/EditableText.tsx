import React, { useState, useEffect, useRef } from 'react';
import { useSiteContent } from '../lib/SiteContentContext';
import { Edit2, Check, X } from 'lucide-react';

interface EditableTextProps {
  id: string;
  defaultValue: string;
  className?: string;
  tag?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div';
  multiline?: boolean;
}

export default function EditableText({
  id,
  defaultValue,
  className = '',
  tag = 'span',
  multiline = false
}: EditableTextProps) {
  const { content, isEditingMode, updateText } = useSiteContent();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const dbValue = content[id];
  const displayValue = dbValue !== undefined ? dbValue : defaultValue;

  // Sync value when Firestore content or default changes
  useEffect(() => {
    setValue(displayValue);
  }, [displayValue]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Put cursor at the end
      if (typeof inputRef.current.selectionStart === 'number') {
        inputRef.current.selectionStart = inputRef.current.selectionEnd = inputRef.current.value.length;
      }
    }
  }, [isEditing]);

  if (!isEditingMode) {
    // Normal view mode
    return React.createElement(tag, { className }, displayValue);
  }

  const handleSave = async () => {
    if (value === displayValue) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateText(id, value);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setValue(displayValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!multiline || e.metaKey || e.ctrlKey) {
        e.preventDefault();
        handleSave();
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Editing state UI
  if (isEditing) {
    const inputClasses = `w-full bg-stone-100 text-stone-900 border-2 border-amber-500 rounded px-2 py-1 focus:outline-none focus:ring-0 ${className}`;
    
    return (
      <div className="relative inline-block w-full" onClick={(e) => e.stopPropagation()}>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={inputClasses}
            rows={4}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={inputClasses}
          />
        )}
        <div className="absolute right-2 bottom-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded shadow border border-stone-200 z-10 text-[10px] text-stone-500">
          <span>{multiline ? 'Ctrl+Enter' : 'Enter'} to save · Esc to cancel</span>
        </div>
      </div>
    );
  }

  // Admin Highlight / Trigger State
  return React.createElement(
    tag,
    {
      className: `${className} relative group cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-amber-500 hover:bg-amber-500/10 rounded px-1 -mx-1 transition-all`,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsEditing(true);
      },
      title: "Click to edit text"
    },
    <>
      {displayValue}
      <span className="absolute -top-3 -right-3 hidden group-hover:flex items-center gap-1 bg-amber-500 text-stone-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm scale-90 z-20 pointer-events-none">
        <Edit2 className="w-2.5 h-2.5" /> Edit
      </span>
    </>
  );
}
