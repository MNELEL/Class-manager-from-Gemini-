import React, { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { createGmailDraft } from '../lib/workspace';

export const DailySummaryGenerator = ({ students, events, setNotifications }: any) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDailySummaryForStudent = async (student: any) => {
    setIsGenerating(true);
    try {
      // Filter events for today
      const today = new Date().toISOString().split('T')[0];
      const studentEvents = events.filter((e: any) => e.studentId === student.id && e.timestamp?.startsWith(today));
      
      const summary = `
סיכום יום פדגוגי עבור ${student.name}:
- אירועי התנהגות: ${studentEvents.length > 0 ? studentEvents.map((e: any) => e.description).join(', ') : 'לא נרשמו אירועים מיוחדים היום.'}
- מצב נוכחות: ${student.attendance?.some((a: any) => a.date === today) ? 'נוכח' : 'לא מוגדר'}

בברכה,
מורה ${student.name || ''}
      `;
      
      await createGmailDraft(student.parentEmail || 'test@example.com', `סיכום יום - ${student.name}`, summary);
      setNotifications((prev: any) => [{ id: Date.now(), text: `טיוטת מייל יומית נוצרה עבור ${student.name}`, type: 'success' }, ...prev]);
    } catch (err: any) {
      setNotifications((prev: any) => [{ id: Date.now(), text: `שגיאה ביצירת הטיוטה: ${err.message}`, type: 'error' }, ...prev]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
      <h3 className="text-xl font-black mb-6">סיכום פדגוגי יומי להורים</h3>
      <div className="space-y-4">
        {students.map((student: any) => (
          <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <span className="font-bold">{student.name}</span>
            <button 
              onClick={() => generateDailySummaryForStudent(student)}
              disabled={isGenerating}
              className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand-700 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              שלח סיכום להורים
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
