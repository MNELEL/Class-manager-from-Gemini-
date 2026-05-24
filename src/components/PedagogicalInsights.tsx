import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export const PedagogicalInsights = ({ students }: { students: any[] }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyze = async () => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/ai/analyze-pedagogy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classData: students.map(s => ({ name: s.name, notes: s.notes, pedagogicalDiagnoses: s.pedagogicalDiagnoses })) })
        });
        const data = await response.json();
        setInsights(data.analysis);
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-black mb-4">תובנות פדגוגיות קבוצתיות</h3>
        <button onClick={analyze} disabled={isLoading} className="bg-brand-600 text-white rounded-xl px-4 py-2 font-bold flex gap-2 hover:bg-brand-700 transition-all disabled:opacity-50">
            {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
            נתח נתונים
        </button>
        {insights && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl whitespace-pre-line text-slate-700 dark:text-slate-300">
                {insights}
            </div>
        )}
    </div>
  )
}
