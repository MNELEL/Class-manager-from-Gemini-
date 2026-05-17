import React from 'react';
import { motion } from 'motion/react';
import { Brain, Users, LayoutDashboard, ChevronRight } from 'lucide-react';

export const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-black text-brand-600">ClassPro Pro-Manager</h1>
        <button onClick={onGetStarted} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold">
          כניסה למערכת
        </button>
      </nav>

      {/* Hero */}
      <header className="py-20 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-black mb-6"
        >
          המערכת החכמה ל<span className="text-brand-600">ניהול כיתה</span>
        </motion.h2>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
          דירוג תלמידים מבוסס AI, ניהול משימות, ועבודה פדגוגית חכמה שחוסכת לכם זמן יקר.
        </p>
        <button onClick={onGetStarted} className="px-10 py-4 bg-brand-600 text-white rounded-full font-black text-lg flex items-center gap-2 mx-auto shadow-lg shadow-brand-600/20">
          התחילו להדגים עכשיו <ChevronRight className="w-5 h-5" />
        </button>
      </header>

      {/* Features */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          {[
            { icon: Brain, title: 'סידור ישיבה חכם', desc: 'התאמה אוטומטית לפי אילוצים קוגניטיביים וחברתיים.' },
            { icon: Users, title: 'ניהול CRM פדגוגי', desc: 'כל המידע על התלמיד במקום אחד נגיש.' },
            { icon: LayoutDashboard, title: 'מבצעים ואתגרים', desc: 'הגברת מוטיבציה בעזרת משחוק.' }
          ].map((f, i) => (
            <motion.div key={i} className="p-8 bg-slate-50 rounded-3xl" whileHover={{ y: -5 }}>
              <f.icon className="w-12 h-12 text-brand-600 mb-4" />
              <h3 className="text-2xl font-black mb-2">{f.title}</h3>
              <p className="text-slate-600">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
