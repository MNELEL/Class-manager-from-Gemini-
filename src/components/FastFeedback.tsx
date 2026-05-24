import React, { useState } from 'react';
import { Mail, Zap, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { createGmailDraft } from '../lib/workspace';

export const FastFeedback = ({ student, setNotifications }: { student: any, setNotifications: any }) => {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [extraNotes, setExtraNotes] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const feedbackTags = ['השתתפות פעילה', 'עבודה עצמית מצוינת', 'צורך בחיזוק', 'שיפור בריכוז', 'עזרה לחברים'];

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const generateDraft = async () => {
        setIsGenerating(true);
        try {
            const body = `שלום הורים יקרים,
רציתי לשתף אתכם בחוויות של ${student.name} בכיתה.
${selectedTags.length > 0 ? `דגשים שחשוב לי לציין: ${selectedTags.join(', ')}.` : ''}
${extraNotes ? `הערות נוספות: ${extraNotes}` : ''}
בברכה,
המורה`;
            
            await createGmailDraft(student.parentEmail || 'test@example.com', `עדכון על ${student.name}`, body);
            setNotifications((prev: any) => [{ id: Date.now(), text: `טיוטת מייל נוצרה עבור ${student.name}`, type: 'success' }, ...prev]);
        } catch (err: any) {
             setNotifications((prev: any) => [{ id: Date.now(), text: `שגיאה ביצירת הטיוטה: ${err.message}`, type: 'error' }, ...prev]);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black mb-4 flex items-center gap-2"><Zap className="text-amber-500" /> משוב מהיר ל-{student.name}</h3>
            <div className="flex flex-wrap gap-2 mb-4">
                {feedbackTags.map(tag => (
                    <button key={tag} onClick={() => toggleTag(tag)} className={cn("px-3 py-1 rounded-full text-sm font-medium transition-all", selectedTags.includes(tag) ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800")}>
                        {tag}
                    </button>
                ))}
            </div>
            <textarea className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent mb-4" placeholder="הערות אישיות..." value={extraNotes} onChange={e => setExtraNotes(e.target.value)} />
            <button onClick={generateDraft} disabled={isGenerating} className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-700 disabled:opacity-50">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} צור טיוטת מייל
            </button>
        </div>
    );
};
