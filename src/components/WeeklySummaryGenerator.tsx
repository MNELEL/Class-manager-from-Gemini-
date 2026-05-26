import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, 
  Loader2, 
  Check, 
  Sparkles, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  ArrowLeft, 
  PenSquare, 
  Award, 
  TrendingUp, 
  Trash2, 
  Plus, 
  BookOpen, 
  User, 
  CornerUpLeft,
  ChevronRight
} from 'lucide-react';
import { createGmailDraft, exportToDocs, scheduleCalendarEvent } from '../lib/workspace';

interface WeeklySummaryGeneratorProps {
  students: any[];
  analyticsLog: any[];
  studentPoints?: Record<string, number>;
  setNotifications: any;
}

const BEHAVIOR_CATEGORIES: Record<string, { label: string, icon: string, isPositive: boolean }> = {
  good_learning: { label: 'למידה טובה', icon: '📚', isPositive: true },
  correct_seating: { label: 'ישיבה נכונה', icon: '🪑', isPositive: true },
  success_campaign: { label: 'הצלחה במבצע', icon: '🎯', isPositive: true },
  disruption: { label: 'הפרעה בשיעור', icon: '📢', isPositive: false },
  bad_learning: { label: 'חוסר למידה', icon: '📝', isPositive: false },
  violence: { label: 'אלימות', icon: '🚫', isPositive: false },
  missing_task: { label: 'אי ביצוע משימה', icon: '❌', isPositive: false },
};

type TemplateType = 'warm' | 'professional' | 'supportive';

export const WeeklySummaryGenerator = ({ 
  students = [], 
  analyticsLog = [], 
  studentPoints = {}, 
  setNotifications 
}: WeeklySummaryGeneratorProps) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [templateType, setTemplateType] = useState<TemplateType>('warm');
  const [customEmail, setCustomEmail] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [summaryText, setSummaryText] = useState<string>('');
  
  // Workspace Actions States
  const [isGmailLoading, setIsGmailLoading] = useState(false);
  const [isGmailSuccess, setIsGmailSuccess] = useState(false);
  
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);

  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  
  // Custom interactive calendar picker states
  const [meetingDate, setMeetingDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().substring(0, 10);
  });
  const [meetingTime, setMeetingTime] = useState<string>('16:00');
  const [meetingDuration, setMeetingDuration] = useState<number>(30); // 30 minutes

  // Get active student
  const activeStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [selectedStudentId, students]);

  // Aggregate behavior logs & points for chosen student
  const studentMetrics = useMemo(() => {
    if (!selectedStudentId) return null;

    const studentLogs = analyticsLog.filter(l => l.studentId === selectedStudentId);
    
    // Last 7 days
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const weeklyLogs = studentLogs.filter(l => (now - l.timestamp) <= ONE_WEEK_MS);
    
    // If no weekly logs found, take last 5 logs overall to keep the summary representative
    const relevantLogs = weeklyLogs.length > 0 ? weeklyLogs : studentLogs.slice(-5);

    const positiveLogs = relevantLogs.filter(l => {
      const cat = BEHAVIOR_CATEGORIES[l.categoryId];
      return cat?.isPositive || (l.value && l.value > 0);
    });

    const negativeLogs = relevantLogs.filter(l => {
      const cat = BEHAVIOR_CATEGORIES[l.categoryId];
      return !cat?.isPositive || (l.value && l.value < 0);
    });

    // Recent grades
    const gradesList = activeStudent?.grades || [];
    const recentGrades = [...gradesList]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);

    const totalPoints = studentPoints[selectedStudentId] || 0;

    return {
      relevantLogs,
      positiveLogs,
      negativeLogs,
      recentGrades,
      totalPoints,
    };
  }, [selectedStudentId, analyticsLog, activeStudent, studentPoints]);

  // Reset workspace statuses and initialize input parameters when student change
  useEffect(() => {
    if (activeStudent) {
      // Find parent email from student object or metadata
      const parentEmail = activeStudent.parentEmail || activeStudent.metadata?.parentEmail || '';
      setCustomEmail(parentEmail);
      setCustomSubject(`סיכום שבועי ועדכון פדגוגי - ${activeStudent.name}`);
      setIsGmailSuccess(false);
      setDocUrl(null);
      setCalendarUrl(null);
    } else {
      setCustomEmail('');
      setCustomSubject('');
      setSummaryText('');
    }
  }, [activeStudent]);

  // Re-generate summary text whenever template parameters or student metrics change
  useEffect(() => {
    if (!activeStudent || !studentMetrics) return;

    const { positiveLogs, negativeLogs, recentGrades, totalPoints } = studentMetrics;

    let behaviorSummaryText = '';
    if (positiveLogs.length > 0) {
      behaviorSummaryText += '\nראויים לציון הדברים החיוביים הבאים:\n' + 
        positiveLogs.map(l => {
          const categoryName = BEHAVIOR_CATEGORIES[l.categoryId]?.label || '';
          return `  ⭐ ${categoryName}${l.reason ? ` (${l.reason})` : ''}`;
        }).join('\n');
    } else {
      behaviorSummaryText += '\nהשבוע התנהלותו/ה הייתה תקינה ורגועה.';
    }

    if (negativeLogs.length > 0) {
      behaviorSummaryText += '\n\nנקודות שחשוב לשים אליהן לב לעתיד:\n' + 
        negativeLogs.map(l => {
          const categoryName = BEHAVIOR_CATEGORIES[l.categoryId]?.label || '';
          return `  ⚠️ ${categoryName}${l.reason ? ` (${l.reason})` : ''}`;
        }).join('\n');
    }

    let gradesSummaryText = '';
    if (recentGrades.length > 0) {
      gradesSummaryText += recentGrades.map((g: any) => {
        return `  📝 מקצוע: ${g.subject} | ציון: ${g.grade} ${g.testName ? `(${g.testName})` : ''}`;
      }).join('\n');
    } else {
      gradesSummaryText += '  לא נרשמו הערכות או ציונים רשמיים השבוע.';
    }

    let result = '';

    if (templateType === 'warm') {
      result = `שלום רב,

אני שמח/ה לשתף אתכם בסיכום השבועי של ${activeStudent.name}. זהו חלק ממעקב צמוד המבוסס על מערכת הלמידה והישיבה הכיתתית שלנו.

התנהגות ומעורבות בכיתה:
${activeStudent.name} צבר/ה סך הכל ${totalPoints} נקודות אור השבוע במערכת הדירוג הכיתתית. ${behaviorSummaryText}

עדכון הישגים וציונים לאחרונה:
${gradesSummaryText}

איזה יופי של שבוע! גאה מאוד בהתקדמות והמאמץ של ${activeStudent.name}. נשמח מאוד להמשך שיתוף פעולה ושיח מעצים גם בבית!

בברכה,
מחנך/כת הכיתה`;
    } else if (templateType === 'professional') {
      result = `להורי התלמיד/ה ${activeStudent.name} שלום רב,

להלן דו״ח סיכום שבועי פדגוגי והתנהגותי מרכז עבור ${activeStudent.name}.

1. מדדי התנהגות והשתתפות:
   • יציבות כיתתית: ${totalPoints} נקודות במדד החיזוקים.
   • הערות חיוביות:${positiveLogs.length > 0 ? '\n' + positiveLogs.map(l => `     - ${BEHAVIOR_CATEGORIES[l.categoryId]?.label || 'חיזוק'} ${l.reason ? `(${l.reason})` : ''}`).join('\n') : ' לא נרשמו אירועים מתוזמנים.'}
   • אירועי משמעת/מטלות חסרות:${negativeLogs.length > 0 ? '\n' + negativeLogs.map(l => `     - ${BEHAVIOR_CATEGORIES[l.categoryId]?.label || 'הפרעה/אי ביצוע'} ${l.reason ? `(${l.reason})` : ''}`).join('\n') : ' לא נרשמו אירועים חריגים השבוע.'}

2. הישגים לימודיים וציונים בולטים:
${gradesSummaryText}

הערות הדו״ח מבוססות על שיבוץ התלמיד ורישומי המפה השבועית. נשמח לעמוד לרשותכם להמשך הובלת הישגים אקדמיים.

בברכת סוף שבוע נעים,
צוות החינוך וההוראה הכיתתי`;
    } else if (templateType === 'supportive') {
      result = `להורי ${activeStudent.name} שלום,

אני פונה אליכם השבוע על מנת לשתף אתכם במאזן הלמידה וההתנהגות של ${activeStudent.name}, כחלק מרצוננו המשותף להביא למיצוי הפוטנציאל האישי שלו/ה.

השבוע זיהינו מספר תחומים שבהם נדרש חיזוק או תשומת לב משותפת:
${negativeLogs.length > 0 ? negativeLogs.map(l => `  • ${BEHAVIOR_CATEGORIES[l.categoryId]?.label || 'נקודה לשיפור'}: ${l.reason || 'נדרשת השתדלות מוגברת'}`).join('\n') : '  • נדרשת הקפדה יתרה על מהלך השיעור והשתתפות פרואקטיבית.'}

ברצוננו להדגיש גם את נקודות האור המשמעותיות שבהן ${activeStudent.name} הראה/תה השתדלות:
${positiveLogs.length > 0 ? positiveLogs.map(l => `  • ${BEHAVIOR_CATEGORIES[l.categoryId]?.label || 'נקודת אור'}: ${l.reason || 'עשייה יפה'}`).join('\n') : '  • שמירה על נוכחות וגישה חיובית.'}
(בסרגל הנקודות הכיתתי נצברו סך הכל ${totalPoints} נקודות זכות).

ציונים והערכות אחרונות:
${gradesSummaryText}

אנו מאמינים כי שיבוש קל הוא תמיד פתח ללמידה. נשמח מאוד אם תוכלו לקיים השבוע שיחת עידוד בבית ולסייע בהכוונת ${activeStudent.name} להתארגנות טובה יותר.

בברכה והערכה,
הצוות החינוכי`;
    }

    setSummaryText(result);
  }, [selectedStudentId, templateType, activeStudent, studentMetrics]);

  // Handle Create Gmail Draft
  const handleGmailAction = async () => {
    if (!activeStudent) return;
    
    // Explicit workspace mandate: Confirmation Dialog before creating a draft
    const isConfirmed = window.confirm(
      `האם ברצונך ליצור כעת טיוטת מייל חדשה בחשבון ה-Gmail שלך עבור הורי התלמיד ${activeStudent.name}?`
    );
    if (!isConfirmed) return;

    setIsGmailLoading(true);
    setIsGmailSuccess(false);
    try {
      const emailToUse = customEmail.trim() || 'parent@example.com';
      await createGmailDraft(emailToUse, customSubject, summaryText);
      setIsGmailSuccess(true);
      setNotifications((prev: any) => [
        { id: Date.now(), text: `טיוטת מייל נוצרה בהצלחה עבור הורי ${activeStudent.name}!`, type: 'success' },
        ...prev
      ]);
    } catch (e: any) {
      setNotifications((prev: any) => [
        { id: Date.now(), text: `שגיאה ביצירת טיוטת מייל: ${e.message}`, type: 'error' },
        ...prev
      ]);
    } finally {
      setIsGmailLoading(false);
    }
  };

  // Handle Export to Docs
  const handleDocsAction = async () => {
    if (!activeStudent) return;

    // Consent Dialogue for Documents creation
    const isConfirmed = window.confirm(
      `האם ליצור מסמך Google Doc חדש שיכיל את הסיכום השבועי של ${activeStudent.name}?`
    );
    if (!isConfirmed) return;

    setIsDocsLoading(true);
    setDocUrl(null);
    try {
      const title = `סיכום שבועי - ${activeStudent.name} (${new Date().toLocaleDateString('he-IL')})`;
      const url = await exportToDocs(title, summaryText);
      setDocUrl(url);
      setNotifications((prev: any) => [
        { id: Date.now(), text: `מסמך Google Doc נוצר בתיקייה שלך!`, type: 'success' },
        ...prev
      ]);
    } catch (e: any) {
      setNotifications((prev: any) => [
        { id: Date.now(), text: `שגיאה ביצירת מסמך Docs: ${e.message}`, type: 'error' },
        ...prev
      ]);
    } finally {
      setIsDocsLoading(false);
    }
  };

  // Handle Schedule Calendar Reminders/Meetings
  const handleCalendarAction = async () => {
    if (!activeStudent) return;

    // Consent Dialogue for Calendar write access
    const isConfirmed = window.confirm(
      `האם ברצונך לקבוע שיחת סיכום / עדכון להורי ${activeStudent.name} ביומן Google שלך?`
    );
    if (!isConfirmed) return;

    setIsCalendarLoading(true);
    setCalendarUrl(null);
    try {
      // Calculate start ISO format from state
      const startDateTime = `${meetingDate}T${meetingTime}:00`;
      const startDateObj = new Date(startDateTime);
      const endDateObj = new Date(startDateObj.getTime() + meetingDuration * 60 * 1000);
      
      const event = {
        summary: `שיחת סיכום פדגוגית: ${activeStudent.name}`,
        description: `שיחת המשך ומעקב בעקבות סיכום שבועי מרכז.\n\nטקסט סיכום:\n${summaryText}`,
        location: 'חדר צוות / טלפוני',
        start: { dateTime: startDateObj.toISOString() },
        end: { dateTime: endDateObj.toISOString() }
      };

      const url = await scheduleCalendarEvent(event);
      setCalendarUrl(url);
      setNotifications((prev: any) => [
        { id: Date.now(), text: `מפגש שובץ בהצלחה ביומן Google!`, type: 'success' },
        ...prev
      ]);
    } catch (e: any) {
      setNotifications((prev: any) => [
        { id: Date.now(), text: `שגיאה בשיבוץ ביומן Google: ${e.message}`, type: 'error' },
        ...prev
      ]);
    } finally {
      setIsCalendarLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* 2. Headline card */}
      <div className="bg-gradient-to-l from-indigo-600 to-brand-600 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 transform -translate-x-12 -translate-y-6 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 right-0 transform translate-x-12 translate-y-6 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/20 rounded-xl text-yellow-300">
                <Sparkles className="w-5 h-5 fill-current" />
              </span>
              <h3 className="text-2xl font-black">מחולל סיכום שבועי להורים - Google Workspace</h3>
            </div>
            <p className="text-indigo-100 text-sm max-w-2xl font-medium">
              כלי זה סורק ומנתח באופן אוטומטי את ציוני התלמיד, נקודות הזכות במפה, ואירועי המשמעת שנרשמו השבוע, ומעצב אותם לטיוטה מוכנה לשליחה ב-Gmail.
            </p>
          </div>
          
          {selectedStudentId && (
            <button 
              onClick={() => setSelectedStudentId('')}
              className="px-4 py-2 bg-white/20 text-white hover:bg-white/30 rounded-xl text-xs font-black transition-all flex items-center gap-2 self-start md:self-center"
            >
              <ArrowLeft className="w-4 h-4 ml-1" />
              בחירת תלמיד אחר
            </button>
          )}
        </div>
      </div>

      {!selectedStudentId ? (
        /* MAIN LIST CARD: SELECT STUDENT */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              בחרו תלמיד ליצירת סיכום
            </h4>
            <span className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold px-3 py-1 rounded-full">
              {students.length} תלמידים רשומים בכתה
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {students.map((student: any) => {
              const pts = studentPoints[student.id] || 0;
              const hasEmail = student.parentEmail || student.metadata?.parentEmail;
              
              return (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className="flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-800/50 dark:hover:bg-indigo-950/20 border border-slate-100 hover:border-indigo-100 dark:border-slate-800 dark:hover:border-indigo-900 rounded-2xl transition-all text-right group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold group-hover:scale-105 transition-transform">
                      {student.name.substring(0, 1)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {student.name}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {hasEmail ? (student.parentEmail || student.metadata?.parentEmail) : 'לא הוגדר מייל הורים'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                      👑 {pts}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* INTERACTIVE SUMMARY WORKSPACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* RIGHT COLUMN: CONTROLS & AGGREGATE STATS */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Template type picker */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="font-black text-slate-900 dark:text-white text-base">⚙️ בחירת סגנון התבנית</h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTemplateType('warm')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                    templateType === 'warm'
                      ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-lg">💖</span>
                  <span>חם ומעודד</span>
                </button>
                <button
                  onClick={() => setTemplateType('professional')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                    templateType === 'professional'
                      ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-lg">💼</span>
                  <span>רשמי ומקצועי</span>
                </button>
                <button
                  onClick={() => setTemplateType('supportive')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                    templateType === 'supportive'
                      ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-lg">🤝</span>
                  <span>מיקוד בשיפור</span>
                </button>
              </div>

              {/* Email Parameters */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1">
                    כתובת המייל של ההורים:
                  </label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="הזינו כתובת דוא״ל לשליחת הסיכום"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 transition-all text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1">
                    נושא המייל:
                  </label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 transition-all text-right"
                  />
                </div>
              </div>
            </div>

            {/* Display Aggregated Metrics */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                נתונים שנסרקו השבוע עבור {activeStudent.name}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">התנהגות חיובית</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                    {studentMetrics?.positiveLogs.length || 0}
                  </p>
                </div>
                <div className="p-4 bg-orange-50/50 dark:bg-orange-950/10 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                  <p className="text-[10px] font-black text-orange-600 dark:text-orange-400">נקודות לשיפור</p>
                  <p className="text-2xl font-black text-orange-700 dark:text-orange-300 mt-1">
                    {studentMetrics?.negativeLogs.length || 0}
                  </p>
                </div>
              </div>

              {/* Recent Grades table preview */}
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-400">ציונים והערכות אחרונות בשימושי מפת הכיתה:</p>
                {studentMetrics?.recentGrades && studentMetrics.recentGrades.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {studentMetrics.recentGrades.map((g: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs">
                        <span className="font-black text-slate-700 dark:text-slate-200">{g.subject}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{g.testName || 'מבחן'}</span>
                          <span className="font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                            {g.grade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-center">
                    אין ציונים רשומים השבוע עבור תלמיד זה.
                  </p>
                )}
              </div>
            </div>

            {/* Google Calendar Reminder Utility */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  קביעת שיחת המשו״ב ביומן Google
                </h4>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-lg">
                  אופציונלי
                </span>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                רוצים לזמן שיחת שיפור או פגישת עדכון להורים? תזמנו אותה ישירות מכאן ליומן ה-Google שלכם עם הסיכום בתוך התיאור.
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] h-4 font-black text-slate-400 mb-1">תאריך פגישה</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] h-4 font-black text-slate-400 mb-1">שעת פגישה</label>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleCalendarAction}
                  disabled={isCalendarLoading}
                  className="flex-1 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                >
                  {isCalendarLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                  תזמון פגישה ביומן ב-Google
                </button>

                {calendarUrl && (
                  <a
                    href={calendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-all flex items-center gap-1"
                  >
                    פתחו מפגש
                  </a>
                )}
              </div>
            </div>

          </div>

          {/* LEFT COLUMN: INTERACTIVE EDITOR & GOOGLE API INSERTERS */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <PenSquare className="w-4 h-4" />
                  </span>
                  <h4 className="font-italic text-slate-950 dark:text-white font-black text-base">עריכת הסיכום ותצוגה מקדימה</h4>
                </div>
                <span className="text-xs text-slate-400">לפי בחירת נושא ועריכת טקסט חופשית</span>
              </div>

              {/* Textarea summary content */}
              <div className="space-y-2">
                <textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  rows={14}
                  className="w-full p-4 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-400 dark:bg-slate-800 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 font-semibold text-sm leading-relaxed text-right outline-none transition-all"
                />
              </div>

              {/* ACTION BUTTONS GRID */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                
                {/* 1. Gmail Integration Button */}
                <button
                  onClick={handleGmailAction}
                  disabled={isGmailLoading}
                  className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                    isGmailSuccess 
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/10 disabled:opacity-50'
                  }`}
                >
                  {isGmailLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>מכין טיוטה...</span>
                    </>
                  ) : isGmailSuccess ? (
                    <>
                      <Check className="w-5 h-5 animate-scaleUp" />
                      <span>הטיוטה נוספה ל-Gmail שלך!</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 text-indigo-100" />
                      <span>יצירת טיוטת מייל ב-Gmail</span>
                    </>
                  )}
                </button>

                {/* 2. Docs Integration Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDocsAction}
                    disabled={isDocsLoading}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-2xl text-xs flex items-center gap-2 transition-all"
                    title="ייצוא הדוח למסמך Google Docs חדש"
                  >
                    {isDocsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 text-slate-500" />
                    )}
                    שמירה כקובץ Google Docs
                  </button>

                  {docUrl && (
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-2xl text-xs font-black transition-all flex items-center gap-1"
                      title="לחץ לצפייה במסמך שיצרת"
                    >
                      פתחו מסמך
                    </a>
                  )}
                </div>
                
              </div>

              {/* Warnings/Context Note */}
              <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-400 text-[11px] leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>שימו לב:</strong> תהליך השמירה ב-Gmail ובמערכות Workspace מתבצע תוך קבלת הרשאה זמנית מחשבון ה-Google שלך. הנתונים מאובטחים לחלוטין ואין שמירה של נתוני משתמשים בענן צד ג׳. נתוני ההתנהגות ואיכות הישיבה נסרקים כחלק ממחקרי המפה הכיתתית.
                </p>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
