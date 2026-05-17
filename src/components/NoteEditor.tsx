import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { Save } from 'lucide-react';
import { cn } from '../lib/utils';

export const NoteEditor = ({ studentId }: { studentId: string }) => {
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`pedagogy-note-${studentId}`);
    if (saved) {
      setContent(saved);
      setLastSaved(new Date());
    } else {
        setContent('');
        setLastSaved(null);
    }
  }, [studentId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`pedagogy-note-${studentId}`, content);
      setLastSaved(new Date());
    }, 1000);

    return () => clearTimeout(timer);
  }, [content, studentId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">תיעוד פדגוגי</h3>
        {lastSaved && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Save className="w-3 h-3" />
            נשמר ב: {lastSaved.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
          <ReactQuill 
            theme="snow" 
            value={content} 
            onChange={setContent} 
            className="h-64 mb-12"
            modules={{
                toolbar: [
                  [{ 'header': [1, 2, false] }],
                  ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                  [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                  ['link', 'image'],
                  ['clean']
                ],
            }}
          />
      </div>
    </div>
  );
};
