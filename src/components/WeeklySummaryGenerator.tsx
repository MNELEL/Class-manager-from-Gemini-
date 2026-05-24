import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { createGmailDraft } from '../lib/workspace';

export const WeeklySummaryGenerator = ({ students, setNotifications }: any) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSummary = async (student: any) => {
    setIsGenerating(true);
    try {
      const summary = `
סיכום שבועי עבור ${student.name}:
- התנהגות: ${student.behavior || 'לא נרשמו אירועים מיוחדים.'}
- ציוני השבוע: ${student.grades || 'אין ציונים חדשים השבוע.'}
- נושאי לימוד השבוע: ${student.studies || 'אין נתוני לימודים לשבוע זה.'}

בברכה,
מורה ${student.name}
      `;
      
      await createGmailDraft(student.parentEmail || 'test@example.com', `סיכום שבועי - ${student.name}`, summary);
      setNotifications((prev: any) => [{ id: Date.now(), text: `טיוטת מייל נוצרה עבור ${student.name}`, type: 'success' }, ...prev]);
    } catch (err: any) {
      setNotifications((prev: any) => [{ id: Date.now(), text: `שגיאה ביצירת הטיוטה: ${err.message}`, type: 'error' }, ...prev]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
      <h3 className="text-xl font-black mb-6">יצירת סיכומים שבועיים להורים</h3>
      <div className="space-y-4">
        {students.map((student: any) => (
          <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <span className="font-bold">{student.name}</span>
            <button 
              onClick={() => generateSummary(student)}
              disabled={isGenerating}
              className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand-700 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              צור טיוטת מייל
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
