import { useAuth } from '../lib/AuthContext';
import { useSiteContent } from '../lib/SiteContentContext';
import { Edit3, CheckCircle, Info } from 'lucide-react';

export default function EditableControls() {
  const { isAdmin } = useAuth();
  const { isEditingMode, setIsEditingMode } = useSiteContent();

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {isEditingMode && (
        <div className="bg-stone-900 border border-amber-500/30 text-amber-500 text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 max-w-xs animate-bounce">
          <Info className="w-4 h-4 shrink-0" />
          <span>Click any dashed-bordered element to edit the text immediately.</span>
        </div>
      )}
      <button
        onClick={() => setIsEditingMode(!isEditingMode)}
        className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold shadow-2xl transition-all hover:scale-105 active:scale-95 text-sm ${
          isEditingMode 
            ? 'bg-amber-500 text-stone-950 font-bold border border-amber-600' 
            : 'bg-stone-900 text-white font-medium border border-stone-800'
        }`}
      >
        {isEditingMode ? (
          <>
            <CheckCircle className="w-4 h-4" /> Editing Active
          </>
        ) : (
          <>
            <Edit3 className="w-4 h-4" /> Enable Site Editing
          </>
        )}
      </button>
    </div>
  );
}
