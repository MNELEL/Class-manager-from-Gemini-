import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  User, 
  Sparkles, 
  Flame,
  FileText,
  Target,
  Trophy,
  Loader2,
  Clock,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface StudentGoal {
  id: string;
  day: string; // 'א' | 'ב' | 'ג' | 'ד' | 'ה'
  text: string;
  completed: boolean;
}

export interface PacingItem {
  id: string;
  week: string;
  subject: string;
  topic: string;
  goals: string;
  testPlanned: string;
  status: 'planned' | 'in_progress' | 'completed';
}

export interface WeeklyPlanningViewProps {
  students: Array<{ id: string | number; name: string; group?: string }>;
  onBack: () => void;
}

const DAYS_OF_WEEK = [
  { key: 'א', name: 'יום ראשון' },
  { key: 'ב', name: 'יום שני' },
  { key: 'ג', name: 'יום שלישי' },
  { key: 'ד', name: 'יום רביעי' },
  { key: 'ה', name: 'יום חמישי' }
];

export const WeeklyPlanningView: React.FC<WeeklyPlanningViewProps> = ({ students = [], onBack }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | number | null>(students[0]?.id || null);
  const [goals, setGoals] = useState<Record<string, StudentGoal[]>>(() => {
    const saved = localStorage.getItem('classManager_weeklyGoals');
    return saved ? JSON.parse(saved) : {};
  });

  const [newGoalText, setNewGoalText] = useState<Record<string, string>>({
    'א': '', 'ב': '', 'ג': '', 'ד': '', 'ה': ''
  });

  const [activeTab, setActiveTab] = useState<'board' | 'summary' | 'pacing'>('pacing');

  const [pacingList, setPacingList] = useState<PacingItem[]>(() => {
    const saved = localStorage.getItem('pedagogy_weekly_pacing');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        id: 'pace-1',
        week: 'שבוע 1 (נוכחי)',
        subject: 'חשבון',
        topic: 'שברים עשרוניים',
        goals: 'חיבור וחיסור שברים עשרוניים במאונך, פתרון בעיות לרוחב נושאי הכיתה והבנת ערך המקום והנקודה העשרונית.',
        testPlanned: 'בוחן קצר על חיבור שברים עשרוניים',
        status: 'in_progress'
      },
      {
        id: 'pace-2',
        week: 'שבוע 2',
        subject: 'מדעים',
        topic: 'חוקי ניוטון',
        goals: 'הכרת שלושת חוקי התנועה של אייזק ניוטון, ניתוח כוחות אינרציה, תאוצה, ותגובה הדדית.',
        testPlanned: 'מבחן חוקי התנועה של ניוטון והבנת מושג הכוח',
        status: 'planned'
      },
      {
        id: 'pace-3',
        week: 'שבוע 3',
        subject: 'היסטוריה',
        topic: 'הצהרת כורש',
        goals: 'סקירה פדגוגית של הצהרת כורש, ניתוח מסמך ההצהרה וגורמי שיבת ציון.',
        testPlanned: 'עבודת סיכום - הצהרת כורש ושיבת ציון',
        status: 'planned'
      }
    ];
  });

  const [newPace, setNewPace] = useState<Partial<PacingItem>>({
    week: '',
    subject: '',
    topic: '',
    goals: '',
    testPlanned: '',
    status: 'planned'
  });

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('classManager_weeklyGoals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('pedagogy_weekly_pacing', JSON.stringify(pacingList));
  }, [pacingList]);

  const activeStudent = students.find(s => s.id === selectedStudentId);
  const studentGoals = selectedStudentId ? (goals[selectedStudentId] || []) : [];

  // Calculate completion percentage for the active student
  const completedCount = studentGoals.filter(g => g.completed).length;
  const totalCount = studentGoals.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAddGoal = (day: string) => {
    const text = newGoalText[day]?.trim();
    if (!text || !selectedStudentId) return;

    const newGoal: StudentGoal = {
      id: `${Date.now()}-${Math.random()}`,
      day,
      text,
      completed: false
    };

    setGoals(prev => {
      const studentIdStr = String(selectedStudentId);
      const currentList = prev[studentIdStr] || [];
      return {
        ...prev,
        [studentIdStr]: [...currentList, newGoal]
      };
    });

    setNewGoalText(prev => ({ ...prev, [day]: '' }));
  };

  const handleToggleGoal = (goalId: string) => {
    if (!selectedStudentId) return;
    setGoals(prev => {
      const studentIdStr = String(selectedStudentId);
      const currentList = prev[studentIdStr] || [];
      const updated = currentList.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g);
      return {
        ...prev,
        [studentIdStr]: updated
      };
    });
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!selectedStudentId) return;
    setGoals(prev => {
      const studentIdStr = String(selectedStudentId);
      const currentList = prev[studentIdStr] || [];
      const updated = currentList.filter(g => g.id !== goalId);
      return {
        ...prev,
        [studentIdStr]: updated
      };
    });
  };

  const handleGenerateSuggestions = (day: string) => {
    if (!activeStudent) return;
    const templates = [
      `להשלים ${activeStudent.name} את משימות התרגול בחשבון`,
      `לגלות התנהגות מופתית ושיתוף פעולה בשיעור קבוצתי`,
      `להכין את שיעורי הבית בצורה מלאה`,
      `להוביל יוזמה חיובית בתוך הקבוצה שלו`,
      `תרגול קריאה קולית רצופה במשך 15 דקות`
    ];
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    setNewGoalText(prev => ({ ...prev, [day]: randomTemplate }));
  };

  return (
    <div className="p-6 md:p-10 space-y-8 h-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors text-right" dir="rtl">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-850 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            title="חזור למסך הקודם"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>📅</span> תכנון שבועי ויעדים אישים
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-1">נהלו יעדים, מעקב יומי ומשימות מיקוד פדגוגיות לכל תלמידי הכיתה בנפרד.</p>
          </div>
        </div>

        {/* Navigation tabs внутри вида */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800 max-w-md w-full">
          <button 
            onClick={() => setActiveTab('pacing')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'pacing' ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            תכנון הספקים שבועי (סילבוס)
          </button>
          <button 
            onClick={() => setActiveTab('board')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'board' ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            לוח יעדים יומי
          </button>
          <button 
            onClick={() => setActiveTab('summary')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'summary' ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            ריכוז והתקדמות כיתתית
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* RIGHT COLUMN: STUDENTS LIST SELECTOR (Hidden in Pacing view) */}
        {activeTab !== 'pacing' && (
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">תלמידי הכיתה ({students.length})</span>
              
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto custom-scrollbar">
                {students.map(student => {
                  const sGoals = goals[String(student.id)] || [];
                  const comp = sGoals.filter(g => g.completed).length;
                  const tot = sGoals.length;
                  const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;
                  const isSelected = student.id === selectedStudentId;

                  return (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`w-full text-right p-3.5 rounded-2xl flex items-center justify-between transition-all border outline-none ${
                        isSelected 
                          ? 'bg-brand-50/50 border-brand-200 dark:bg-brand-950/20 dark:border-brand-850' 
                          : 'border-slate-50 dark:border-slate-850 hover:bg-slate-50/50 bg-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border shadow-xs ${
                          isSelected ? 'bg-brand-600 text-white border-brand-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-100'
                        }`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`text-xs font-black ${isSelected ? 'text-brand-700 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'}`}>{student.name}</p>
                          {student.group && <p className="text-[9px] text-slate-400 font-bold">{student.group}</p>}
                        </div>
                      </div>

                      {tot > 0 ? (
                        <div className="text-left font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg font-black text-slate-600 dark:text-slate-350">
                          {comp}/{tot} ({pct}%)
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-355 italic">טרם הוגדרו</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* LEFT COLUMN: ACTIVE VIEW CARD RENDERER */}
        <div className={activeTab === 'pacing' ? 'lg:col-span-12' : 'lg:col-span-9'}>
          {activeTab === 'pacing' ? (
            /* PACING SILLABUS TRACKER VIEW */
            <div className="space-y-6">
              {/* Sync Banner */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-150/40 dark:border-amber-900/30 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-4 text-amber-800 dark:text-amber-200">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-2xl shrink-0">
                  <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="font-black text-base text-amber-900 dark:text-amber-300">סנכרון פדגוגי והספקים שבועי ב-AI</h4>
                  <p className="text-xs font-semibold mt-1 opacity-90 leading-relaxed">
                    הגדירו את נושאי ההספק הלימודי השבועיים שלכם מטה. מערכת הספרייה תסנכרן את המידע מעצמה ותציע לכם חומרי עמוד מותאמים, דפי עבודה ממוקדים ומבחנים פדגוגיים שנוצרו במיוחד ב-AI על פי חומרי ההספק שהוגדרו!
                  </p>
                </div>
              </div>

              {/* Add New Pacing Entry */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-brand-600" />
                  הוספת יעד תכנון והספק שבועי חדש בכיתה
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-450 mb-1">שבוע</label>
                    <input 
                      type="text" 
                      placeholder="לדוגמא: שבוע 4" 
                      value={newPace.week || ''} 
                      onChange={e => setNewPace(prev => ({ ...prev, week: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-450 mb-1">מקצוע</label>
                    <input 
                      type="text" 
                      placeholder="لדוגמא: אזרחות, אנגלית" 
                      value={newPace.subject || ''} 
                      onChange={e => setNewPace(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-450 mb-1">נושא ממוקד להספק</label>
                    <input 
                      type="text" 
                      placeholder="לדוגמא: אחוזים, הצהרת זכויות" 
                      value={newPace.topic || ''} 
                      onChange={e => setNewPace(prev => ({ ...prev, topic: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-450 mb-1">מטרות והספק לימודי שבועי</label>
                    <input 
                      type="text" 
                      placeholder="לדוגמא: הבנת משמעות האחוז..." 
                      value={newPace.goals || ''} 
                      onChange={e => setNewPace(prev => ({ ...prev, goals: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none text-xs font-bold"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={() => {
                        if (!newPace.week || !newPace.subject || !newPace.topic) {
                          alert('אנא מלאו את שדות השבוע, המקצוע והנושא לפחות לפעולת סנכרון נכונה.');
                          return;
                        }
                        const entry: PacingItem = {
                          id: 'pace-' + Date.now(),
                          week: newPace.week,
                          subject: newPace.subject,
                          topic: newPace.topic,
                          goals: newPace.goals || 'כללי',
                          testPlanned: newPace.testPlanned || `בוחן מיוחד מבוסס AI בנושא ${newPace.topic}`,
                          status: 'planned'
                        };
                        setPacingList(prev => [...prev, entry]);
                        setNewPace({ week: '', subject: '', topic: '', goals: '', testPlanned: '', status: 'planned' });
                      }}
                      className="w-full py-2.5 bg-brand-600 text-white font-black text-xs rounded-xl hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Adding / הוסף
                    </button>
                  </div>
                </div>
              </div>

              {/* Pacing List Items */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-350">תוכנית הספקים כיתתית מתוזמנת</span>
                  <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 px-2 rounded-lg font-black flex items-center gap-1">
                    🟢 מסונכרן פדגוגית לספרייה
                  </span>
                </div>

                <div className="space-y-4">
                  {pacingList.map((item) => (
                    <div 
                      key={item.id} 
                      className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        item.status === 'in_progress' 
                          ? 'bg-brand-50/20 border-brand-200 dark:border-brand-900/50' 
                          : 'bg-slate-50/20 border-slate-100 dark:border-slate-850'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 border ${
                          item.status === 'in_progress' 
                            ? 'bg-amber-100 text-amber-700 border-amber-200' 
                            : item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {item.status === 'in_progress' ? <Clock className="w-5 h-5 animate-spin-slow" /> : item.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-brand-600 uppercase bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded">
                              {item.week}
                            </span>
                            <span className="text-xs font-black text-slate-400 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded">
                              {item.subject}
                            </span>
                            <h4 className="text-base font-black text-slate-800 dark:text-white">
                              נושא: <span className="text-primary underline decoration-brand-400">{item.topic}</span>
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                            <strong>מטרות והספק:</strong> {item.goals}
                          </p>
                          <p className="text-xs text-slate-400 font-semibold mt-1">
                            <strong>הערכה שנקבעה:</strong> {item.testPlanned}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end self-end md:self-center border-t md:border-none pt-3 md:pt-0 w-full md:w-auto">
                        <select 
                          value={item.status} 
                          onChange={(e) => {
                            const newStatus = e.target.value as any;
                            setPacingList(prev => prev.map(p => p.id === item.id ? { ...p, status: newStatus } : p));
                          }}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-350"
                        >
                          <option value="planned">📅 מתוכנן בהמשך</option>
                          <option value="in_progress">⚡ בביצוע השבוע</option>
                          <option value="completed">✅ הושלם בהצלחה</option>
                        </select>

                        <button 
                          onClick={() => {
                            if (confirm('האם לבטל יעד תכנון זה מלוח ההספקים?')) {
                              setPacingList(prev => prev.filter(p => p.id !== item.id));
                            }
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                          title="מחק יעד"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {pacingList.length === 0 && (
                    <div className="p-12 text-center text-slate-400 italic">
                      לא הוגדרו הספקים לימודיים. הוסיפו הספק ממוקד למעלה.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'board' ? (
            activeStudent ? (
              <div className="space-y-6">
                
                {/* Active Student Dashboard Panel */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-4xl">🎯</span>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">תוכנית שבועית: {activeStudent.name}</h3>
                      <p className="text-xs text-slate-450 font-bold mt-1">הוסיפו יעדים ללימוד, מוטיבציה או משימות אישיות יומיות ועקבו אחר רמת הביצוע.</p>
                    </div>
                  </div>

                  {totalCount > 0 ? (
                    <div className="flex items-center gap-4 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl w-full sm:w-auto">
                      <div className="text-center">
                        <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{completionPercentage}%</span>
                        <p className="text-[9px] font-black tracking-widest text-emerald-500 uppercase">הצלחה שבועית</p>
                      </div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-xl text-emerald-600">
                        <Trophy className="w-6 h-6 animate-bounce" />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/40 rounded-2xl text-[11px] font-semibold text-slate-500">
                      💡 התחל בהקלדת יעד פשוט באחד מימי השבוע מטה!
                    </div>
                  )}
                </div>

                {/* Days Grid Loop with smooth entries */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {DAYS_OF_WEEK.map(day => {
                    const dayGoals = studentGoals.filter(g => g.day === day.key);
                    const dayComp = dayGoals.filter(g => g.completed).length;
                    const dayTot = dayGoals.length;

                    return (
                      <div 
                        key={day.key} 
                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-810 rounded-2xl p-4 flex flex-col justify-between h-[360px] shadow-xs hover:shadow-md transition-shadow relative"
                      >
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100">{day.name}</span>
                            <span className="text-[10px] w-6 h-6 font-black bg-brand-50 dark:bg-brand-950/40 text-brand-600 rounded-full flex items-center justify-center">{day.key}</span>
                          </div>

                          {/* Goals inside this day list */}
                          <div className="space-y-2 overflow-y-auto max-h-[190px] pr-1 scrollbar-thin">
                            <AnimatePresence>
                              {dayGoals.map(goal => (
                                <motion.div
                                  key={goal.id}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className={`p-2 rounded-xl border flex items-start gap-2 text-right group transition-all relative ${
                                    goal.completed 
                                      ? 'bg-emerald-50/30 border-emerald-100 text-emerald-800 line-through decoration-emerald-200' 
                                      : 'bg-slate-50/40 border-slate-100 text-slate-655'
                                  }`}
                                >
                                  <button 
                                    onClick={() => handleToggleGoal(goal.id)}
                                    className="pt-0.5 outline-none hover:scale-110 active:scale-95 transition-transform"
                                  >
                                    {goal.completed ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-slate-300 group-hover:text-brand-500" />
                                    )}
                                  </button>

                                  <span className="text-[11px] font-bold flex-1 leading-snug break-words">{goal.text}</span>

                                  <button 
                                    onClick={() => handleDeleteGoal(goal.id)}
                                    className="p-1 opacity-0 group-hover:opacity-100 text-rose-350 hover:text-rose-500 rounded-md absolute left-1 top-1/2 -translate-y-1/2 transition-all"
                                    title="מחק יעד"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </motion.div>
                              ))}
                            </AnimatePresence>

                            {dayGoals.length === 0 && (
                              <p className="text-[10px] text-slate-350 text-center py-8 italic select-none">אין יעדים מוגדרים</p>
                            )}
                          </div>
                        </div>

                        {/* Input footer for adding goals to the specific day */}
                        <div className="space-y-1.5 pt-3 border-t border-dashed border-slate-150">
                          <input 
                            type="text"
                            value={newGoalText[day.key] || ''}
                            onChange={(e) => setNewGoalText(prev => ({ ...prev, [day.key]: e.target.value }))}
                            placeholder="יעד חדש..."
                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold rounded-lg border border-transparent focus:border-brand-500 focus:bg-white text-slate-700 dark:text-white outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddGoal(day.key);
                            }}
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleAddGoal(day.key)}
                              className="flex-1 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-black text-[9px] rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                            >
                              <Plus className="w-3 h-3" /> הוסף
                            </button>
                            <button
                              onClick={() => handleGenerateSuggestions(day.key)}
                              className="p-1.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-lg hover:bg-amber-100 text-[9px] font-black"
                              title="רעיונות ויעדים מה-AI"
                            >
                              ✨
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 max-w-lg mx-auto space-y-4">
                <span>🎒</span>
                <p className="text-xl font-bold">טרם הוגדרו תלמידים בכיתה הנוכחית</p>
                <p className="text-xs text-slate-400">אנא הגדר רשימת תלמידים דרך יבוא קובץ csv או במסך ההגדרות הכללי.</p>
              </div>
            )
          ) : (
            /* SUMMARY VIEW: AGGREGATE STATS */
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">ריכוז מעקב יעדים כיתתי</h3>
                  <p className="text-xs text-slate-400 font-bold">סקירה מלאה על כלל התקדמות החניכים והמשימות האישיות שלהם השבוע.</p>
                </div>
                <span className="text-[10px] bg-brand-50 px-2.5 py-1 text-brand-600 rounded-lg font-black font-display">דו״ח התקדמות ריכוזי</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100/50">
                  <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase block mb-1">תלמידים מטופלים</span>
                  <span className="text-3xl font-black text-slate-800 dark:text-white tabular-nums">
                    {students.filter(s => (goals[String(s.id)] || []).length > 0).length} / {students.length}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100/50">
                  <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase block mb-1">סה״כ יעדים שהוגדרו</span>
                  <span className="text-3xl font-black text-slate-800 dark:text-white tabular-nums">
                    {Object.values(goals).reduce((acc, curr) => acc + curr.length, 0)}
                  </span>
                </div>
                <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-xl border border-emerald-100/50">
                  <span className="text-[10px] text-emerald-600/80 font-black tracking-widest uppercase block mb-1">יעדים שהושלמו השבוע</span>
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {Object.values(goals).reduce((acc, curr) => acc + curr.filter(g => g.completed).length, 0)}
                  </span>
                </div>
                <div className="p-4 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50">
                  <span className="text-[10px] text-indigo-600/80 font-black tracking-widest uppercase block mb-1">ממוצע כיתתי לביצוע</span>
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {(() => {
                      const all = Object.values(goals).reduce((acc, curr) => acc + curr.length, 0);
                      const done = Object.values(goals).reduce((acc, curr) => acc + curr.filter(g => g.completed).length, 0);
                      return all > 0 ? Math.round((done / all) * 100) : 0;
                    })()}%
                  </span>
                </div>
              </div>

              {/* Progress Detail List */}
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">דירוג התמדה והישגי חניכים</span>
                <div className="space-y-3">
                  {students.map(student => {
                    const sGoals = goals[String(student.id)] || [];
                    const doneG = sGoals.filter(g => g.completed).length;
                    const totG = sGoals.length;
                    const pctG = totG > 0 ? Math.round((doneG / totG) * 100) : 0;

                    return (
                      <div key={student.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center justify-between gap-6">
                        <div className="flex items-center gap-3 w-1/4">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                          <p className="text-xs font-black text-slate-800 dark:text-slate-100">{student.name}</p>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-3 max-w-md shadow-inner overflow-hidden relative">
                          <div 
                            className="bg-gradient-to-r from-brand-600 to-indigo-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${pctG}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs font-black text-slate-600">
                          <span>{doneG} / {totG} יעדים</span>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-bold">({pctG}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
