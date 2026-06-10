import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, MessageSquare, FileText, Send, PhoneCall, 
  Search, CheckCircle2, AlertCircle, ChevronRight, Loader2
} from 'lucide-react';
import { Student } from '../types';

export const ParentsView = ({ students, onBack, updateCurrentConfig }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // States for interactive visual responsiveness
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const filteredStudents = (students || []).filter((s: Student) => 
    s.name.includes(searchTerm)
  );

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const message = fd.get('message') as string;
    const type = fd.get('type') as string;
    
    if (!selectedStudent || !message) return;

    setIsSending(true);
    // Simulate beautiful visual sending state for 850 milliseconds
    await new Promise(resolve => setTimeout(resolve, 850));

    const newComm = {
      id: String(Date.now()),
      date: new Date().toISOString(),
      type: type,
      summary: message,
      toParent: true
    };

    const updatedStudents = students.map((s: Student) => {
      if (s.id === selectedStudent.id) {
        return {
          ...s,
          communications: [...(s.communications || []), newComm]
        };
      }
      return s;
    });

    updateCurrentConfig({ students: updatedStudents });
    setSelectedStudent(updatedStudents.find((s: Student) => s.id === selectedStudent.id));
    (e.target as HTMLFormElement).reset();
    setIsSending(false);

    setToast({ text: `התקשורת עם הורי ${selectedStudent.name} נשמרה ותועדה בהצלחה!`, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-6 h-full overflow-y-auto no-scrollbar pb-32 flex flex-col relative">
      <div className="flex items-center gap-4 shrink-0">
        <button onClick={onBack} className="p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 cursor-pointer">
          <ChevronRight className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Mail className="w-8 h-8 text-primary" />
            קשר עם הורים
          </h2>
          <p className="text-slate-500 font-medium mt-1">תיעוד תקשורת, דוחות ומעקב הודעות.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] flex-1 min-h-0 gap-6">
        {/* Sidebar: Student List */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-border p-4 flex flex-col h-full shadow-sm">
          <div className="relative mb-4 shrink-0">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="חפש תלמיד..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
            {filteredStudents.map((s: Student) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudent(s)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right cursor-pointer hover:scale-[1.015] active:scale-98 ${
                  selectedStudent?.id === s.id 
                    ? 'bg-primary/10 border border-primary/25 text-primary font-bold shadow-xs' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs transition-colors ${
                  selectedStudent?.id === s.id ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 truncate">
                  <span className="block truncate">{s.name}</span>
                  {s.communications && s.communications.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      {s.communications.length} הודעות
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Panel: Communication Log & Send Message */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-border overflow-hidden flex flex-col shadow-sm">
          {selectedStudent ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-border bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-black shadow-inner">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">תיק תקשורת: {selectedStudent.name}</h3>
                    <p className="text-sm text-slate-500">
                      {selectedStudent.communications?.length || 0} תיעודי שיחות עבר
                    </p>
                  </div>
                </div>
                <button 
                   onClick={() => setToast({ text: "הדוח מוכן לייצוא במערכת הפנימית!", type: "info" })}
                   className="hidden md:flex px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl items-center gap-2 font-bold text-sm text-slate-600 dark:text-slate-300 transition-all hover:scale-102 active:scale-95 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  הפק דוח מצב
                </button>
              </div>

              {/* History */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/10">
                {!selectedStudent.communications || selectedStudent.communications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <MessageSquare className="w-16 h-16 mb-4" />
                    <p>אין תיעוד שיחות לתלמיד זה מעולם.</p>
                  </div>
                ) : (
                  selectedStudent.communications.map((comm: any) => (
                    <div key={comm.id} className={`flex ${comm.toParent ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm transition-all hover:shadow-md ${
                        comm.toParent 
                          ? 'bg-white dark:bg-slate-800 border border-border rounded-tr-none' 
                          : 'bg-primary/10 text-primary dark:bg-primary/20 rounded-tl-none'
                      }`}>
                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500">
                          {comm.type === 'phone' ? <PhoneCall className="w-3 h-3 text-amber-500" /> : <Mail className="w-3 h-3 text-primary" />}
                          {new Date(comm.date).toLocaleDateString('he-IL', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {comm.summary}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Compose */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-border shrink-0">
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-32 shrink-0">
                      <select name="type" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer">
                        <option value="email">הודעה / Email</option>
                        <option value="phone">שיחת טלפון</option>
                        <option value="meeting">פגישה</option>
                        <option value="letter">מכתב</option>
                      </select>
                    </div>
                    <div className="flex-1 relative">
                      <textarea 
                        name="message" 
                        required 
                        rows={2}
                        disabled={isSending}
                        placeholder="תעד את השיחה או ההודעה כאן..." 
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none resize-none text-sm disabled:opacity-65"
                      />
                      <button 
                        type="submit" 
                        disabled={isSending}
                        className="absolute bottom-2 left-2 p-2 bg-primary text-white rounded-xl hover:bg-primary/95 transition-all shadow-md hover:scale-105 active:scale-90 cursor-pointer disabled:opacity-50"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 rtl:-scale-x-100" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
              <Mail className="w-20 h-20 mb-6 opacity-10" />
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">בחר תלמיד מהרשימה</h3>
              <p className="text-sm mt-2">כדי לצפות בתיעוד השיחות ולשלוח עדכונים חדשים.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modern custom toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-6 z-[300] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-sm border border-slate-200/10"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
