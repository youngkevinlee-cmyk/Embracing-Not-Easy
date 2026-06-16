import React, { useState, useEffect, useRef } from 'react';
import { useSiteContent } from '../lib/SiteContentContext';
import { Image, Link2, Check, X } from 'lucide-react';

interface EditableImageProps {
  id: string;
  defaultUrl: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export default function EditableImage({
  id,
  defaultUrl,
  alt,
  className = '',
  containerClassName = ''
}: EditableImageProps) {
  const { content, isEditingMode, updateText } = useSiteContent();
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(defaultUrl);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const dbUrl = content[id];
  const displayUrl = dbUrl !== undefined && dbUrl.trim() !== '' ? dbUrl : defaultUrl;

  // Sync value when Firestore content or default changes
  useEffect(() => {
    setUrl(displayUrl);
  }, [displayUrl]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!url.trim()) return;
    if (url === displayUrl) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateText(id, url.trim());
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setUrl(displayUrl);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className={`relative group ${containerClassName}`}>
      {/* Actual Image */}
      <img
        src={displayUrl}
        alt={alt}
        className={`${className} ${isEditingMode ? 'transition-all duration-300' : ''}`}
        referrerPolicy="no-referrer"
        onError={(e) => {
          // If external image fails, show a beautiful placeholder card
          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=1000';
        }}
      />

      {/* Admin Controls overlay */}
      {isEditingMode && !isEditing && (
        <div 
          onClick={() => setIsEditing(true)}
          className="absolute inset-0 bg-stone-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer select-none"
        >
          <div className="bg-amber-500 text-stone-950 font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-xs">
            <Image className="w-4 h-4" /> Change Profile Photo
          </div>
        </div>
      )}

      {/* Editor Modal overlay inside image container */}
      {isEditing && (
        <div 
          className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white p-4 rounded-2xl shadow-2xl w-full max-w-sm border border-stone-200">
            <h4 className="text-stone-950 font-serif font-semibold text-sm mb-1 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-amber-500" />
              Update Portrait URL
            </h4>
            <p className="text-[11px] text-stone-500 mb-3">
              Paste an image URL from Unsplash or another web source.
            </p>
            
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://images.unsplash.com/... or public/image.jpg"
              className="w-full bg-stone-50 text-stone-900 text-xs border border-stone-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 mb-3"
            />

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-2.5 py-1.5 border border-stone-200 text-stone-600 rounded-lg text-xs font-semibold hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !url.trim()}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-650 text-stone-950 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
              >
                {isSaving ? 'Saving...' : 'Apply Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
