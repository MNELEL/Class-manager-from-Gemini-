import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Monitor, Mic, UploadCloud, Play, Square, 
  Loader2, FileText, CheckCircle2, ChevronRight, 
  Save, ListChecks, Sparkles
} from 'lucide-react';
import { generateContent } from '../lib/ai';

export const LessonAnalyzer = ({ onBack, currentConfig, updateCurrentConfig }: any) => {
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
      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        chunksRef.current = [];
        // In a real app we'd transcribe the blob here, for now we mock the transcript
        setTranscript("זהו סימולציה של תמלול. המורה דיבר על חוקי ניוטון. קודם הסביר על כך שגוף מתמיד במצבו... חלק מהתלמידים קצת הפריעו. יש לשפר את זמן התרגול העצמאי.");
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
        `נתח את תמליל השיעור הבא ותחזיר JSON מסודר שתואם בדיוק לסכימה הבאה:
{
  "summary": "סיכום מקיף של השיעור",
  "key_points": ["נקודת מפתח 1", "נקודת מפתח 2"],
  "target_audience": "קהל היעד של השיעור",
  "suggested_title": "כותרת מוצעת ומעניינת לשיעור",
  "improvement_suggestions": ["המלצה פדגוגית לשיפור 1", "המלצה פדגוגית לשיפור 2"],
  "estimated_level": "רמת הפדגוגיה"
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
      created_at: new Date().toISOString()
    };
    
    const libItems = currentConfig.libraryItems || [];
    updateCurrentConfig({ libraryItems: [...libItems, newItem] });
    alert('השיעור נשמר בהצלחה לספרייה!');
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
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-border p-6 shadow-sm flex flex-col h-full">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            תמליל (Live)
          </h3>
          <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 overflow-y-auto mb-4 border border-border/50 text-slate-700 dark:text-slate-300 min-h-[150px]">
            {transcript || <span className="text-slate-400 italic">התמליל יופיע כאן...</span>}
          </div>
          <button 
            onClick={analyzeTranscript}
            disabled={!transcript || isAnalyzing}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isAnalyzing ? 'מנתח שיעור...' : 'נתח שיעור עם AI'}
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
        </motion.div>
      )}
    </div>
  );
};
