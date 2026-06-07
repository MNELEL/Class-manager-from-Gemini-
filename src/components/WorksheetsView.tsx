import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Sparkles, Download, Printer, Settings2, Loader2, ChevronRight, CheckCircle2 
} from 'lucide-react';
import { generateContent } from '../lib/ai';

export const WorksheetsView = ({ onBack }: any) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [worksheet, setWorksheet] = useState<any>(null);

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const subject = fd.get('subject') as string;
    const topic = fd.get('topic') as string;
    const gradeLevel = fd.get('gradeLevel') as string;
    const difficulty = fd.get('difficulty') as string;
    const numQuestions = parseInt(fd.get('numQuestions') as string) || 5;

    setIsGenerating(true);
    try {
      const responseText = await generateContent(
        `יצר דף עבודה בנושא "${topic}" במקצוע "${subject}" עבור כיתה "${gradeLevel}".
         רמת קושי: ${difficulty}.
         מספר שאלות: ${numQuestions}.
         אנא החזר את דף העבודה במבנה ה-JSON הבא בדיוק:
{
  "title": "כותרת דף העבודה",
  "instructions": "הוראות כלליות לתלמיד",
  "questions": [
    {
      "id": "מזהה ייחודי קצר, למשל q1",
      "type": "open או multiple_choice או true_false",
      "question": "תוכן השאלה",
      "options": ["אפשרות א", "אפשרות ב", "אפשרות ג", "אפשרות ד (רק עבור multiple_choice)"],
      "answer": "תשובה מומלצת או נכונה"
    }
  ]
}`,
        "אנא החזר פלט בפורמט JSON בלבד, ללא שום טקסט מקדים או עוטף קוד (ללא markdown)."
      );
      
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/([\{\[][\s\S]*[\}\]])/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          throw parseErr;
        }
      }
      
      setWorksheet(parsed);
    } catch (err) {
      console.error(err);
      alert('אירעה שגיאה ביצירת דף העבודה');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-6 h-full overflow-y-auto no-scrollbar pb-32">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm hover:bg-slate-50 transition-colors hidden-print">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary hidden-print" />
              מחולל דפי עבודה חכם
            </h2>
            <p className="text-slate-500 font-medium hidden-print">צור דפי עבודה ותרגילים מותאמים אישית בקליק בעזרת AI.</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[350px_1fr] gap-6">
        {/* Form Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-border p-6 shadow-sm h-fit hidden-print">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2 border-b border-border pb-4 mb-4">
            <Settings2 className="w-5 h-5 text-slate-400" />
            הגדרות דף העבודה
          </h3>
          <form className="space-y-4" onSubmit={handleGenerate}>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">מקצוע</label>
              <input name="subject" required placeholder="לדוגמא: מתמטיקה, תנ״ך, מדעים" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">נושא מדויק</label>
              <input name="topic" required placeholder="לדוגמא: משוואות ממעלה ראשונה" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">כיתה</label>
                <input name="gradeLevel" required placeholder="לדוגמא: ח' 3" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">מספר שאלות</label>
                <input name="numQuestions" type="number" min="1" max="20" defaultValue="5" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">רמת קושי</label>
              <select name="difficulty" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none">
                <option value="קל">קל</option>
                <option value="בינוני">בינוני</option>
                <option value="קשה">קשה</option>
                <option value="אתגר מחשבתי">אתגר מחשבתי</option>
              </select>
            </div>
            
            <button 
              type="submit" 
              disabled={isGenerating}
              className="w-full mt-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isGenerating ? 'מייצר דף עבודה...' : 'חולל דף עם AI'}
            </button>
          </form>
        </div>

        {/* Preview Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-border shadow-sm min-h-[500px] flex flex-col print-container">
          {worksheet ? (
            <div className="p-8">
              <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 mb-2">{worksheet.title}</h1>
                  <p className="text-slate-600 font-medium">{worksheet.instructions}</p>
                </div>
                <div className="flex gap-2 hidden-print">
                  <button onClick={handlePrint} className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors shrink-0">
                    <Printer className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-8">
                {worksheet.questions?.map((q: any, idx: number) => (
                  <div key={q.id || idx} className="space-y-3">
                    <div className="flex gap-3">
                      <span className="font-bold text-slate-400 select-none">{idx + 1}.</span>
                      <h3 className="font-bold text-lg text-slate-800">{q.question}</h3>
                    </div>
                    
                    {q.type === 'multiple_choice' && q.options && (
                      <div className="pr-8 space-y-2">
                        {q.options.map((opt: string, i: number) => (
                          <label key={i} className="flex items-center gap-3">
                            <input type="radio" name={`q_${q.id}`} className="w-4 h-4 accent-slate-600" />
                            <span className="text-slate-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'true_false' && (
                      <div className="pr-8 flex gap-6">
                        <label className="flex items-center gap-2 border border-slate-200 rounded-lg px-4 py-2 w-32 justify-center">
                          <input type="radio" name={`q_${q.id}`} className="w-4 h-4 accent-slate-600" />
                          <span className="font-bold text-slate-700">נכון</span>
                        </label>
                        <label className="flex items-center gap-2 border border-slate-200 rounded-lg px-4 py-2 w-32 justify-center">
                          <input type="radio" name={`q_${q.id}`} className="w-4 h-4 accent-slate-600" />
                          <span className="font-bold text-slate-700">לא נכון</span>
                        </label>
                      </div>
                    )}

                    {q.type === 'open' && (
                      <div className="pr-8 mt-2">
                        <div className="border-b-2 border-dotted border-slate-300 w-full mt-8"></div>
                        <div className="border-b-2 border-dotted border-slate-300 w-full mt-8"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 hidden-print">
              <FileText className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">מלא את ההגדרות ולחץ על "חולל דף משחמ" כדי להתחיל.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
