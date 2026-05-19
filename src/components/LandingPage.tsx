import React from 'react';
import { motion } from 'motion/react';
import { 
  Brain, 
  Users, 
  LayoutDashboard, 
  ChevronRight, 
  Sparkles, 
  BarChart3, 
  CloudLightning, 
  School, 
  CloudIcon, 
  Check, 
  FileText,
  Target
} from 'lucide-react';
import { cn } from '../lib/utils';

export const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-x-hidden" dir="rtl">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <nav className="relative z-10 flex items-center justify-between p-6 px-10 max-w-7xl mx-auto backdrop-blur-md bg-white/30 dark:bg-slate-950/30 sticky top-0 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Class<span className="text-brand-600">Pro</span></h1>
        </div>
        <div className="flex items-center gap-6">
           <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500">
              <a href="#features" className="hover:text-brand-600 transition-colors">תכונות</a>
              <a href="#pedagogy" className="hover:text-brand-600 transition-colors">פדגוגיה חכמה</a>
              <a href="#workspace" className="hover:text-brand-600 transition-colors">Workspace</a>
           </div>
           <button onClick={onGetStarted} className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-200 dark:shadow-none">
             כניסה למערכת
           </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 py-24 px-6 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full text-xs font-black uppercase tracking-widest border border-brand-100 dark:border-brand-800">
            <Sparkles className="w-4 h-4" />
            מערכת ניהול הכיתה המתקדמת בעולם
          </div>
          <h2 className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.9]">
            הכיתה שלך, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-brand-600 to-indigo-600 px-2 leading-[1.2]">חכמה יותר.</span>
          </h2>
          <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
            מרכז שליטה אינטליגנטי למורים המשלב AI, ניהול פדגוגי עמוק, וכלים לחיזוק המוטיבציה הכיתתית בסנכרון מלא עם Google Workspace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <button onClick={onGetStarted} className="w-full sm:w-auto px-12 py-5 bg-brand-600 text-white rounded-3xl font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-brand-500/30 hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all">
              התחילו עכשיו חינם <ChevronRight className="w-6 h-6" />
            </button>
            <button className="w-full sm:w-auto px-12 py-5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-2 border-slate-100 dark:border-slate-800 rounded-3xl font-black text-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              צפו בסיור
            </button>
          </div>
        </motion.div>
      </header>

      {/* Stats/Social Proof */}
      <section className="relative z-10 py-12 border-y border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
         <div className="max-w-7xl mx-auto px-10 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'מורים פעילים', val: '+5,000' },
              { label: 'תלמידים במערכת', val: '+150K' },
              { label: 'סידורי AI שבוצעו', val: '+25K' },
              { label: 'דירוג חנות', val: '4.9/5' }
            ].map((s, i) => (
              <div key={i} className="text-center">
                 <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">{s.val}</p>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
         </div>
      </section>

      {/* Main Features Grid */}
      <section id="features" className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-right mb-20 space-y-4">
             <h3 className="text-sm font-black text-brand-600 uppercase tracking-widest flex items-center gap-2">
                <div className="w-8 h-px bg-brand-600" />
                מרכז הכלים
             </h3>
             <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">כל מה שצריך במקום אחד</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { 
                icon: Brain, 
                title: 'סידור ישיבה AI', 
                desc: 'אלגוריתם חכם הלוקח בחשבון העדפות חברתיות, צרכים רפואיים, גובה וביצועים לימודיים.',
                color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
              },
              { 
                icon: Users, 
                title: 'CRM פדגוגי עמוק', 
                desc: 'תיק תלמיד דיגיטלי הכולל הערות, משימות, הישגים ותקשורת עם הורים - הכל מסודר ונגיש.',
                color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
              },
              { 
                icon: LayoutDashboard, 
                title: 'משחוק ומוטיבציה', 
                desc: 'מערכת נקודות, כוכבים ומבצעים כיתתיים שמעודדים התנהגות חיובית ועבודה קבוצתית.',
                color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
              },
              { 
                icon: BarChart3, 
                title: 'אנליטיקה כיתתית', 
                desc: 'צפו במגמות בזמן אמת. רמת השתתפות, ביצועים במבחנים ושביעות רצון כיתתית בגרפים ברורים.',
                color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
              },
              { 
                icon: CloudLightning, 
                title: 'חיבור Workspace', 
                desc: 'סנכרון מלא עם Google Drive, Docs ו-Calendar. ייצוא דוחות וגיבוי נתונים בלחיצת כפתור.',
                color: 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400'
              },
              { 
                icon: School, 
                title: 'ניהול אירועים', 
                desc: 'יומן כיתה חכם, מעקב נוכחות וניהול אסיפות הורים בקלות ובצורה מאורגנת.',
                color: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400'
              }
            ].map((f, i) => (
              <motion.div 
                key={i} 
                className="group p-10 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-brand-200 dark:hover:border-brand-900 transition-all duration-500"
                whileHover={{ y: -10 }}
              >
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", f.color)}>
                  <f.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black mb-4 text-slate-900 dark:text-white">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workspace Section */}
      <section id="workspace" className="relative z-10 py-32 px-6 bg-slate-900 text-white overflow-hidden">
         <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
            <CloudIcon className="w-96 h-96" />
         </div>
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-20">
            <div className="flex-1 space-y-8">
               <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest border border-white/10">
                  Google Integration
               </div>
               <h2 className="text-5xl font-black tracking-tight leading-[1.1]">סנכרון מלא עם הכלים <br /> שאתם כבר אוהבים.</h2>
               <p className="text-xl text-slate-400 font-medium leading-relaxed">
                  אין צורך להקליד שוב. ייצאו את רשימות התלמידים ישירות ל-Google Docs, גבו את תוצרי הכיתה ב-Drive ונהלו את לוח הזמנים ב-Calendar - הכל מסונכרן.
               </p>
               <ul className="space-y-4 pt-4">
                  {[
                    'ייצוא רשימות תלמידים וציונים ל-Google Docs',
                    'גיבוי אוטומטי של מערכי ישיבה ב-Drive',
                    'ניהול אסיפות הורים ואירועים ב-Google Calendar',
                    'שליחת עדכונים להורים דרך Gmail'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 font-bold">
                       <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                       </div>
                       {item}
                    </li>
                  ))}
               </ul>
            </div>
            <div className="flex-1 w-full max-w-md bg-white/5 backdrop-blur-xl p-10 rounded-[4rem] border border-white/10 shadow-2xl relative">
                <div className="aspect-square bg-white rounded-[3rem] p-8 flex flex-col gap-6 shadow-bento overflow-hidden">
                   <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                         <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                         <div className="h-4 w-3/4 bg-slate-100 rounded-full mb-2" />
                         <div className="h-2 w-1/2 bg-slate-50 rounded-full" />
                      </div>
                   </div>
                   <div className="space-y-4">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="flex items-center gap-4">
                           <div className="w-4 h-4 bg-slate-50 rounded-full" />
                           <div className="h-3 bg-slate-50 rounded-full flex-1" />
                        </div>
                      ))}
                   </div>
                   <div className="mt-auto pt-6 flex justify-end">
                      <div className="w-24 h-10 bg-blue-600 rounded-xl" />
                   </div>
                </div>
                {/* Floating tags */}
                <div className="absolute -top-6 -right-6 p-4 bg-emerald-500 text-white rounded-3xl font-black text-xs shadow-xl rotate-12">LIVE SYNC</div>
                <div className="absolute -bottom-6 -left-6 p-4 bg-brand-500 text-white rounded-3xl font-black text-xs shadow-xl -rotate-6">AUTO BACKUP</div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-20 px-10 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="max-w-sm space-y-6">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white">
                    <LayoutDashboard className="w-8 h-8" />
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white">ClassPro</h1>
               </div>
               <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  הפלטפורמה המקיפה ביותר לניהול כיתה, שנבנתה על ידי מורים, עבור מורים. מביטה קדימה אל עתיד הפדגוגיה.
               </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-20">
               <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">מערכת</h4>
                  <ul className="space-y-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                     <li><a href="#" className="hover:text-brand-600 transition-colors">לוח בקרה</a></li>
                     <li><a href="#" className="hover:text-brand-600 transition-colors">שיבוץ AI</a></li>
                     <li><a href="#" className="hover:text-brand-600 transition-colors">כלי מורה</a></li>
                  </ul>
               </div>
               <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">חברה</h4>
                  <ul className="space-y-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                     <li><a href="#" className="hover:text-brand-600 transition-colors">אודות</a></li>
                     <li><a href="#" className="hover:text-brand-600 transition-colors">פרטיות</a></li>
                     <li><a href="#" className="hover:text-brand-600 transition-colors">צור קשר</a></li>
                  </ul>
               </div>
            </div>
         </div>
         <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">&copy; 2026 CLASSPRO PRO-MANAGER. ALL RIGHTS RESERVED.</p>
         </div>
      </footer>
    </div>
  );
};

