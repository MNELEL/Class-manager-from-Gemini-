import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Monitor, Mic, UploadCloud, Play, Square, 
  Loader2, FileText, CheckCircle2, ChevronRight, 
  Save, ListChecks, Sparkles, HelpCircle, BookOpen, Edit3
} from 'lucide-react';
import { transcribeAndSummarize } from '../lib/lessons.functions';

export const LessonAnalyzer = ({ onBack, currentConfig, updateCurrentConfig, currentUser }: any) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        chunksRef.current = [];
        
        // Convert to Buffer and call transcribed function
        const arrayBuffer = await audioBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        setIsAnalyzing(true);
        try {
            const lessonId = await transcribeAndSummarize(buffer, currentConfig.id || 'default', currentUser.uid);
            alert('השיעור הוקלט וסונכרן בהצלחה! (ID: ' + lessonId + ')');
        } catch(e) {
            console.error(e);
            alert('שגיאה בתמלול השיעור בשרת');
        } finally {
            setIsAnalyzing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setAnalysisResult(null);
      setTranscript('');
    } catch (err) {
      console.error(err);
      alert('לא ניתן לגשת למיקרופון');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setAnalysisResult(null);
      // Mock transcript for uploaded file
      setTranscript("סימולציה עבור תמלול של קובץ מוקלט. היום דיברנו על שברים עשרוניים. היו כמה שאלות מצוינות של דני. נדרש לחזור על חיבור שברים עשרוניים בשיעור הבא כי ניכר שחלק לא הבינו היטב.");
    }
  };

  const analyzeTranscript = async () => {
    if (!transcript) return;
    setIsAnalyzing(true);
    try {
      const text = await generateContent(
        `נתח את תמליל השיעור הבא בצורה מקצועית ויסודית ביותר.
זהו שיעור אמיתי שנמסר, ואנחנו זקוקים לסיכום אמיתי, מדויק ומבוסס עובדות מהתמליל, ללא פשרות.
כמו כן, עליך לחבר שאלות הבנה מעמיקות ביותר, הבודקות ישירות ובאופן ספציפי את פרטי התוכן והחומר שנמסרו בתוך התמליל עצמו כדי לוודא הטמעה והגשמה פדגוגית של הלמידה. אל תשאל שאלות כלליות או טריוויה פשוטה המבוססת על כותרת הנושא; יש לשאול שאלות הבנה המבוססות על המידע הספציפי שנאמר בשיעור.

חבר בנוסף דף עבודה פדגוגי מפורט להבנת השיעור בנוי בפורמט Markdown הכולל שאלות עומק, שרטוטי הבנה (מתוארים בטקסט), ותרגילי הגשמה.

אנא החזר תגובת JSON תקנית בדיוק לפי הסכימה הבאה:
{
  "summary": "סיכום מקיף ומבני של החומר האמיתי שנאמר בשיעור",
  "key_points": ["נקודת מפתח עובדתית 1 מהשיעור", "נקודת מפתח עובדתית 2 מהשיעור"],
  "target_audience": "קהל היעד של השיעור",
  "suggested_title": "כותרת מפורטת ומתאימה לנושא",
  "improvement_suggestions": ["המלצה 1 למינוף הפדגוגיה בכיתה", "המלצה 2 לשיפור הקשב וההבנה"],
  "estimated_level": "רמת הפדגוגיה והעומק",
  "comprehension_questions": [
     {
       "question": "שאלת הבנה עמוקה על חומר ספציפי שנמסר בשיעור (לגופו של עניין)",
       "answer": "תשובה מלאה ומודל לתשובת התלמיד מתוך הפרטים המדויקים שנמסרו"
     },
     {
       "question": "שאלת יישום והגשמה מעמיקה נוספת (מבוססת על תוכן השיעור בלבד)",
       "answer": "תשובה מולטי-שלבית מנחה עבור המורה"
     }
  ],
  "worksheet_content": "תוכן דף עבודה עשיר ומפורט ביותר ב-Markdown הכולל תרגילי הבנה יישומיים של החומר הספציפי שהועבר בשיעור"
}

תמליל השיעור:
"${transcript}"`,
        "אנא החזר ערך בפורמט JSON תקני ובלבד, ללא שום טקסט מקדים או עוטף קוד (ללא markdown)."
      );
      
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        // Fallback to extraction in case model wrapped with Markdown codeblock
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/([\{\[][\s\S]*[\}\]])/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          throw parseErr;
        }
      }
      setAnalysisResult(parsed);
    } catch (err) {
      console.error(err);
      alert('שגיאה בניתוח השיעור');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveToLibrary = () => {
    if (!analysisResult) return;
    const newItem = {
      id: String(Date.now()),
      title: analysisResult.suggested_title,
      source_type: 'audio_recording',
      ai_summary: analysisResult.summary,
      ai_key_points: analysisResult.key_points,
      transcript: transcript,
      created_at: new Date().toISOString(),
      comprehension_questions: analysisResult.comprehension_questions || []
    };
    
    const libItems = currentConfig.libraryItems || [];
    updateCurrentConfig({ libraryItems: [...libItems, newItem] });

    // Also push to master materials catalog for perfect app synchronization!
    const savedMaterialsStr = localStorage.getItem('pedagogy_library_materials') || '[]';
    try {
      const savedMaterials = JSON.parse(savedMaterialsStr);
      const newMaterialObj = {
        id: 'mat-trans-' + Date.now(),
        title: analysisResult.suggested_title || 'סיכום שיעור מוקלט',
        type: 'summary',
        topic: 'ניתוח שיעורים',
        subtopic: analysisResult.suggested_title,
        tags: ['שיעור מוקלט', 'תמלול', 'יישומי הבנה'],
        difficulty: 'medium',
        gradeLevel: 'כללי',
        estimatedTime: '45 דקות',
        details: `${analysisResult.summary}\n\n### ❓ שאלות הבנה לגופו של עניין:\n${(analysisResult.comprehension_questions || []).map((q: any, i: number) => `**שאלת הבנה קריטית ${i+1}: ${q.question}**\n*תשובת מודל:* ${q.answer}`).join('\n\n')}\n\n### 📝 דף עבודה פדגוגי מבוסס תמלול:\n${analysisResult.worksheet_content || ''}`,
        understandings: analysisResult.key_points || ["הבנת מושגים מתוך השיעור האמיתי"],
        sections: ['סיכום עיוני', 'שאלות הבנה מעמיקות', 'דף עבודה לביצוע'],
        order: 'סדר מהלך שיעור מובנה',
        status: 'analyzed',
        attachments: []
      };
      localStorage.setItem('pedagogy_library_materials', JSON.stringify([newMaterialObj, ...savedMaterials]));
    } catch(e) {
      console.error(e);
    }
    
    alert('השיעור ודפי העבודה נשמרו בהצלחה לספריית החומרים הכללית!');
  };

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-6 h-full overflow-y-auto no-scrollbar pb-32">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm hover:bg-slate-50 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Monitor className="w-8 h-8 text-primary" />
            ניתוח שיעור בזמן אמת
          </h2>
          <p className="text-slate-500 font-medium">הקלט שיעור וקבל משוב פדגוגי, סיכום אוטומטי ומשימות להמשך בעזרת AI.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Record/Upload Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-border p-6 shadow-sm space-y-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">שיטת קלט</h3>
            <p className="text-slate-500 text-sm">בחר להקליט לייב או להעלות קובץ</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                isRecording 
                  ? 'border-red-500 bg-red-50 text-red-600 animate-pulse' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {isRecording ? <Square className="w-8 h-8 mb-2" /> : <Mic className="w-8 h-8 mb-2 text-slate-400" />}
              <span className="font-bold">{isRecording ? 'עצור הקלטה' : 'התחל הקלטה'}</span>
            </button>
            
            <label className="flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
              <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
              <span className="font-bold">העלה קובץ</span>
              <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {audioUrl && (
            <div className="w-full max-w-sm mt-4">
              <audio src={audioUrl} controls className="w-full h-10" />
            </div>
          )}
        </div>

        {/* Transcript Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-border p-6 shadow-sm flex flex-col h-full text-right" dir="rtl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              תמליל השיעור המעשי
            </h3>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 px-2 py-0.5 rounded font-black">ניתן לעריכה והדבקה</span>
          </div>

          <div className="mb-4 text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">הקליטו, העלו קובץ או בחרו שיעור לדוגמא:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setTranscript("היום נעסוק בחיבור שברים עשרוניים במאונך. החוק החשוב ביותר הוא לסדר את המספרים כך שהנקודה העשרונית תהיה בדיוק מתחת לנקודה העשרונית השנייה. למשל, בחיבור של 12.3 ועוד 4.56, נכתוב את 12.3 כ-12.30 כדי ליישר את העמודות. השלב הבא הוא לחבר מימין לשמאל: מאית, עשירית, יחידות ועשרות. נשאלנו על ידי דני מה קורה כאשר הסכום מעבר ל-10; התשובה היא שאנו מעבירים 1 בדיוק כמו בחיבור רגיל. למשל, 0.7 ועוד 0.5 נותן 1.2 והנקודה נשארת במקומה הישר לחלק השלמים.")}
                className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-slate-850 dark:text-brand-300 rounded-lg text-[10px] font-black transition-all"
              >
                🔢 חיבור שברים עשרוניים
              </button>
              <button
                onClick={() => setTranscript("בשיעור של היום נעמיק בחוק הראשון והשני של ניوتن. החוק הראשון, הידוע גם כחוק ההתמדה, קובע כי גוף יתמיד במצבו - מנוחה או תנועה במהירות קבועה בקו ישר - כל עוד לא פועל עליו כוח חיצוני. נתנו את הדוגמא של שטיח שנפתח מתחת לכוס מים מונחת, או נוסע באוטובוס שעוצר פתאומית ונזרק קדימה. החוק השני מגדיר שהתאוצה של גוף עומדת ביחס ישר לכוח הפועל עליו וביחס הפוך למסתו, כלומר F=m*a. ראינו שאם דוחפים כדור טניס מול דחיפת משאית באותו כוח, התאוצה של כדור הטניס תהיה עצומה בגלל מסתו הקטנה.")}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-slate-850 dark:text-emerald-350 rounded-lg text-[10px] font-black transition-all"
              >
                ⚡ חוקי התנועה של ניوتن
              </button>
              <button
                onClick={() => setTranscript("חברים, היום נדבר על הצהרת כורש שניתנה בשנת 538 לפני הספירה. כורש מלך פרס פנה לגולים בבבל והציע להם לחזור ליהודה ולבנות מחדש את בית המקדש בירושלים. למדנו שההצהרה משקפת את המדיניות הסובלנית של האימפריה הפרסית כלפי העמים המשועבדים לה, המאפשרת אוטונומיה דתית בתמורה לנאמנות פוליטית ותשלום מיסים. ניתחנו את השלכות ההצהרה - קבוצה קטנה של עולי בבל תחת מנהיגות ששבצר וזרובבל הקימה את 'שיבת ציון' והחלה בתהליך הבנייה הקשה שנתקל בקשיים כלכליים רציניים ובעוינות מצד השומרונים.")}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-slate-850 dark:text-amber-350 rounded-lg text-[10px] font-black transition-all"
              >
                📜 הצהרת כורש ושיבת ציון
              </button>
            </div>
          </div>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="תמליל השיעור המשוער או האמיתי שלכם יופיע כאן לאחר דיבור/העלאה, או הקלידו/הדביקו אותו ידנית פה..."
            className="flex-1 w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-4 border border-border text-slate-700 dark:text-slate-300 min-h-[150px] text-xs font-semibold leading-relaxed outline-none focus:ring-2 focus:ring-primary inline-block text-right"
            dir="rtl"
          />

          <button 
            onClick={analyzeTranscript}
            disabled={!transcript || isAnalyzing}
            className="w-full py-3 bg-primary text-white font-black rounded-xl hover:bg-primary/95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isAnalyzing ? 'מנתח שיעור פדגוגית ב-AI...' : 'נתח ועצב פעילויות ב-AI'}
          </button>
        </div>
      </div>

      {/* Analysis Result */}
      {analysisResult && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-border p-6 md:p-8 card-academic space-y-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">{analysisResult.suggested_title || 'סיכום שיעור'}</h3>
              <p className="text-slate-500 font-medium">הוערך כרמת פדגוגיה: {analysisResult.estimated_level || 'כללי'}</p>
            </div>
            <button 
              onClick={saveToLibrary}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <Save className="w-4 h-4" />
              שמור לספרייה
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl text-slate-700 dark:text-slate-300 leading-relaxed border border-border/50">
            {analysisResult.summary}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-indigo-500" />
                נקודות מפתח שעלו בשיעור
              </h4>
              <ul className="space-y-3">
                {analysisResult.key_points?.map((pt: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600 dark:text-slate-400">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                המלצות פדגוגיות לשיפור
              </h4>
              <ul className="space-y-3">
                {analysisResult.improvement_suggestions?.map((sug: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 font-bold text-sm">
                      {idx+1}
                    </div>
                    <span className="text-amber-900 dark:text-amber-200/80">{sug}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CONTENT-BASED COMPREHENSION QUESTIONS */}
          {analysisResult.comprehension_questions && analysisResult.comprehension_questions.length > 0 && (
            <div className="border-t border-slate-150/60 dark:border-slate-800 pt-6 space-y-4 text-right" dir="rtl">
              <h4 className="font-black text-lg text-slate-850 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brand-600" />
                שאלות הבנה מעמיקות לגופו של עניין (מבוסס תוכן השיעור המעשי):
              </h4>
              <p className="text-xs text-slate-400 font-bold">שאלות אלו נוצרו במיוחד כדי לוודא את הגשמת מטרות השיעור והבנת התוכן העובדתי שנמסר.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisResult.comprehension_questions.map((q: any, i: number) => (
                  <div key={i} className="p-4 bg-brand-50/20 dark:bg-slate-850 border border-brand-100/50 dark:border-slate-800 rounded-2xl space-y-2 text-right">
                    <span className="text-[10px] bg-brand-600 text-white px-2 py-0.5 rounded font-black">שאלה {i+1}</span>
                    <h5 className="text-xs font-black text-slate-800 dark:text-white leading-relaxed">{q.question}</h5>
                    <div className="bg-white dark:bg-slate-900 border border-slate-50 dark:border-slate-800 rounded-xl p-3 text-[11px] text-slate-500 dark:text-slate-350 leading-relaxed font-semibold">
                      <strong>תשובת מודל:</strong> {q.answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DYNAMIC WORKSHEET BLOCK */}
          {analysisResult.worksheet_content && (
            <div className="border-t border-slate-150/60 dark:border-slate-800 pt-6 space-y-3 text-right" dir="rtl">
              <h4 className="font-black text-lg text-slate-850 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                טיוטת דף עבודה מבוססת חומרי השיעור:
              </h4>
              <div className="bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 md:p-6 text-right">
                <div className="prose dark:prose-invert text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans font-medium text-right" dir="rtl">
                  {analysisResult.worksheet_content}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
