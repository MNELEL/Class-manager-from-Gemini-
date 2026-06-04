import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, X, UserPlus, UserMinus, Sparkles, RefreshCcw } from 'lucide-react';
import { Student } from '../types';

interface ClassroomRaffleProps {
  students: Student[];
  onClose: () => void;
}

export const ClassroomRaffle: React.FC<ClassroomRaffleProps> = ({ students, onClose }) => {
  const [candidates, setCandidates] = useState<string[]>(students.map(s => s.id));
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Student | null>(null);

  const pool = useMemo(() => {
    return students.filter(s => candidates.includes(s.id));
  }, [students, candidates]);

  const toggleCandidate = (id: string) => {
    setCandidates(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const drawWinner = () => {
    if (pool.length === 0 || isSpinning) return;
    
    setIsSpinning(true);
    setWinner(null);

    // Simulate spinning
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * pool.length);
      setWinner(pool[randomIndex]);
      setIsSpinning(false);
    }, 2000);
  };

  const resetRaffle = () => {
    setWinner(null);
    setIsSpinning(false);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100 dark:border-slate-800"
      >
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-600 rounded-2xl shadow-lg shadow-brand-100">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">הגרלה כיתתית</h2>
              <p className="text-slate-500 font-bold text-sm">בחירת תלמיד אקראי מבין המשתתפים</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Candidates List */}
          <div className="w-full md:w-1/3 border-l border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/30 dark:bg-slate-900/30">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest">רשימת משתתפים ({candidates.length})</h3>
                <div className="flex gap-2">
                  <button onClick={() => setCandidates(students.map(s => s.id))} className="text-[10px] font-black text-brand-600 hover:underline">הכל</button>
                  <button onClick={() => setCandidates([])} className="text-[10px] font-black text-rose-500 hover:underline">נקה</button>
                </div>
              </div>
              <div className="relative">
                <UserPlus className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="חיפוש מהיר..." 
                  className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl py-2 px-4 pr-10 text-sm font-bold focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {students.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleCandidate(s.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    candidates.includes(s.id)
                      ? 'bg-brand-50 border-brand-100 dark:bg-brand-900/20 dark:border-brand-800'
                      : 'bg-white border-transparent opacity-50 dark:bg-slate-800 dark:border-slate-800'
                  }`}
                >
                  <span className={`text-sm font-bold ${candidates.includes(s.id) ? 'text-brand-700 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>{s.name}</span>
                  {candidates.includes(s.id) ? <UserMinus className="w-4 h-4 text-brand-600" /> : <UserPlus className="w-4 h-4 text-slate-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Raffle Stage */}
          <div className="flex-1 p-12 flex flex-col items-center justify-center relative bg-white dark:bg-slate-900">
            <AnimatePresence mode="wait">
              {winner ? (
                <motion.div
                  key="winner"
                  initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
                  className="text-center space-y-8"
                >
                  <div className="relative inline-block">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-brand-500/20 rounded-full blur-3xl"
                    />
                    <div className="w-48 h-48 bg-gradient-to-br from-brand-600 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl relative border-8 border-white dark:border-slate-800">
                      <span className="text-7xl font-black text-white">{winner.name[0]}</span>
                    </div>
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-4 -right-4 bg-amber-400 text-white p-4 rounded-3xl shadow-xl border-4 border-white dark:border-slate-800"
                    >
                      <Trophy className="w-8 h-8" />
                    </motion.div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{winner.name}</h3>
                    <p className="text-xl font-bold text-slate-500">הוא המנצח של ההגרלה!</p>
                  </div>
                  <div className="flex gap-4 pt-8">
                    <button 
                      onClick={resetRaffle}
                      className="px-10 py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-[2rem] font-black text-lg flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                      <RefreshCcw className="w-6 h-6" />
                      הגרלה חדשה
                    </button>
                  </div>
                </motion.div>
              ) : isSpinning ? (
                <motion.div
                  key="spinning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-12"
                >
                  <div className="w-64 h-64 relative flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-8 border-slate-100 dark:border-slate-800 border-t-brand-600 rounded-full"
                    />
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-3xl font-black text-brand-600 uppercase tracking-widest"
                    >
                      הגרלה...
                    </motion.div>
                  </div>
                  <p className="text-lg font-bold text-slate-400">המערכת בוחרת תלמיד אקראי...</p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-12"
                >
                  <div className="w-64 h-64 relative flex items-center justify-center group">
                    <div className="absolute inset-0 bg-slate-50 dark:bg-slate-800/50 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-700 animate-[spin_20s_linear_infinite]" />
                    <Trophy className="w-24 h-24 text-slate-200 group-hover:text-brand-200 transition-colors" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white">מוכנים להתחיל?</h3>
                    <p className="text-slate-500 font-bold max-w-sm mx-auto">לחצו על הכפתור למטה כדי להגריל תלמיד אקראי מבין רשימת המשתתפים שבחרתם.</p>
                  </div>
                  <button
                    disabled={pool.length === 0}
                    onClick={drawWinner}
                    className={`px-16 py-6 rounded-[2.5rem] font-black text-2xl flex items-center gap-4 transition-all shadow-2xl active:scale-95 ${
                      pool.length > 0
                        ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-200 dark:shadow-none scale-105'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-8 h-8" />
                    בצע הגרלה!
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
