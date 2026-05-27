import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, Mail, Printer, Download, Calendar, Users, 
  Award, AlertTriangle, X, Search, CheckCircle2, 
  User, Sparkles, Loader2, ArrowLeftRight, Check, ChevronLeft
} from 'lucide-react';
import { createGmailDraft } from '../lib/workspace';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Helper to format Date nicely in Hebrew
const formatHebrewDate = (dateStr: string) => {
  try {
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

const CATEGORY_LABELS: Record<string, { label: string, color: string, isPositive: boolean }> = {
  excellence: { label: 'הצטיינות ✨', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/10 border-amber-200', isPositive: true },
  good_learning: { label: 'למידה טובה 📚', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200', isPositive: true },
  correct_seating: { label: 'ישיבה נכונה 🪑', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/10 border-blue-200', isPositive: true },
  success_campaign: { label: 'הצלחה במבצע 🎯', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200', isPositive: true },
  disruption: { label: 'הפרעה למהלך שיעור 📢', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/10 border-orange-200', isPositive: false },
  bad_learning: { label: 'חוסר למידה / ציוד 📝', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/10 border-rose-200', isPositive: false },
  violence: { label: 'אירוע התנהגות חמור 🚫', color: 'text-red-600 bg-red-50 dark:bg-red-900/10 border-red-200', isPositive: false },
  missing_task: { label: 'אי ביצוע משימה ❌', color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/10 border-slate-200', isPositive: false },
};

export const DailySummaryGenerator = ({ students = [], currentConfig = {}, setNotifications }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState<'class' | 'student'>('class');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  
  // Custom states that feed directly into the PDF preview
  const [teacherCustomNote, setTeacherCustomNote] = useState('');
  const [studentSpecificNotes, setStudentSpecificNotes] = useState<Record<string, string>>({});
  
  const [isExporting, setIsExporting] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);

  const reportSheetRef = useRef<HTMLDivElement>(null);

  // Default to today in local timezone
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localD = new Date(d.getTime() - (offset * 60 * 1000));
    return localD.toISOString().split('T')[0];
  });

  // Collect logs for the selected date
  const selectedDateLogs = useMemo(() => {
    const logs = currentConfig?.analytics_log || [];
    return logs.filter((l: any) => {
      if (!l.timestamp) return false;
      const logDate = new Date(l.timestamp).toISOString().split('T')[0];
      return logDate === selectedDate;
    });
  }, [currentConfig?.analytics_log, selectedDate]);

  // Attendance sorting for the selected date
  // (In our app context, live status is written to student.status. We default to that for "today", and look at attendanceHistory as a fallback for past dates)
  const isTodaySelected = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return selectedDate === todayStr;
  }, [selectedDate]);

  const studentAttendanceList = useMemo(() => {
    return students.map((s: any) => {
      // Find historical matching entry if past date
      let status = 'none';
      if (isTodaySelected) {
        status = s.status || 'present'; // Default to present as starting state
      } else {
        const historyRecord = s.attendanceHistory?.find((h: any) => h.date?.startsWith(selectedDate));
        if (historyRecord) {
          status = historyRecord.status;
        } else {
          // Fallback to logs or s.status
          status = s.status || 'present';
        }
      }
      return {
        id: s.id,
        name: s.name,
        parentEmail: s.parentEmail || '',
        status: status as 'present' | 'absent' | 'late' | 'none'
      };
    });
  }, [students, selectedDate, isTodaySelected]);

  // Group stats
  const attendanceStats = useMemo(() => {
    const total = studentAttendanceList.length || 1;
    const present = studentAttendanceList.filter(s => s.status === 'present').length;
    const late = studentAttendanceList.filter(s => s.status === 'late').length;
    const absent = studentAttendanceList.filter(s => s.status === 'absent').length;
    const rate = Math.round(((present + late) / total) * 100);

    return { total, present, late, absent, rate };
  }, [studentAttendanceList]);

  // Categorize selected logs
  const positiveCredits = useMemo(() => {
    return selectedDateLogs.filter((l: any) => {
      const cat = CATEGORY_LABELS[l.categoryId];
      if (cat) return cat.isPositive;
      return (l.value || 0) >= 0;
    });
  }, [selectedDateLogs]);

  const negativeDiscipline = useMemo(() => {
    return selectedDateLogs.filter((l: any) => {
      const cat = CATEGORY_LABELS[l.categoryId];
      if (cat) return !cat.isPositive;
      return (l.value || 0) < 0;
    });
  }, [selectedDateLogs]);

  // Handle single student summary view selection
  const activeStudentObj = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s: any) => s.id === selectedStudentId);
  }, [selectedStudentId, students]);

  // Filtered student list for lookup
  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => 
      s.name.toLowerCase().includes(searchStudentTerm.toLowerCase())
    );
  }, [students, searchStudentTerm]);

  // Individual student data for the selected day
  const activeStudentDayData = useMemo(() => {
    if (!selectedStudentId) return null;
    const studentLogs = selectedDateLogs.filter((l: any) => l.studentId === selectedStudentId);
    const pos = studentLogs.filter((l: any) => {
      const cat = CATEGORY_LABELS[l.categoryId];
      if (cat) return cat.isPositive;
      return (l.value || 0) >= 0;
    });
    const neg = studentLogs.filter((l: any) => {
      const cat = CATEGORY_LABELS[l.categoryId];
      if (cat) return !cat.isPositive;
      return (l.value || 0) < 0;
    });
    const dayAttendance = studentAttendanceList.find(s => s.id === selectedStudentId)?.status || 'present';

    return {
      name: activeStudentObj?.name || '',
      logs: studentLogs,
      pos,
      neg,
      attendance: dayAttendance
    };
  }, [selectedStudentId, selectedDateLogs, studentAttendanceList, activeStudentObj]);

  // Export A4 PDF using high resolution html2canvas mapping into a jsPDF document
  const handleExportPDF = async () => {
    const element = reportSheetRef.current;
    if (!element) return;
    setIsExporting(true);

    try {
      // Create high-resolution screenshot of the element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 size
      const pageHeight = 297; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = reportType === 'class' 
        ? `סיכום_יומי_כיתתי_${selectedDate}.pdf` 
        : `סיכום_יומי_אישי_${activeStudentObj?.name?.replace(/\s+/g, '_')}_${selectedDate}.pdf`;

      pdf.save(fileName);

      setNotifications((prev: any) => [
        { id: Date.now(), text: `קובץ ה-PDF נוצר והורד בהצלחה! (${fileName})`, type: 'info' },
        ...prev
      ]);
    } catch (err: any) {
      console.error(err);
      setNotifications((prev: any) => [
        { id: Date.now(), text: `שגיאה בייצוא PDF: ${err.message}`, type: 'error' },
        ...prev
      ]);
    } finally {
      setIsExporting(false);
    }
  };

  // Printable print layout integration
  const handlePrint = () => {
    const printContents = reportSheetRef.current?.innerHTML;
    if (!printContents) return;

    // Create a temporary iframe or trigger window print for print preview of A4 page
    const originalContents = document.body.innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>הדפסת דוח פדגוגי - ${selectedDate}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
              body {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                margin: 20px;
                background-color: white;
                color: black;
              }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: right; font-size: 13px; }
              th { background-color: #f1f5f9; }
              .header { display: flex; justify-content: space-between; border-bottom: 3px double #334155; padding-bottom: 10px; margin-bottom: 20px; }
              .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; }
              .badge-green { background-color: #dcfce7; color: #166534; }
              .badge-amber { background-color: #fef9c3; color: #854d0e; }
              .badge-red { background-color: #fee2e2; color: #991b1b; }
              .grid-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
              .metric-card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; text-align: center; background-color: #fafafa; }
              .metric-num { font-size: 24px; font-weight: 900; color: #4f46e5; }
              .section-title { font-size: 18px; font-weight: bold; margin-top: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; color: #1e293b; }
              .notes-box { background-color: #f8fafc; border-right: 5px solid #4f46e5; padding: 15px; border-radius: 8px; font-style: italic; margin-top: 20px; }
            </style>
          </head>
          <body>
            ${printContents}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Gmail Parent Draft Automation
  const handleGmailDraft = async () => {
    setIsEmailSending(true);
    try {
      const summaryDateStr = formatHebrewDate(selectedDate);
      
      if (reportType === 'student') {
        if (!activeStudentObj) return;
        const parentMail = activeStudentObj.parentEmail || 'parents@school.org';
        const notesObj = studentSpecificNotes[selectedStudentId] || '';
        
        let draftBody = `שלום רב,\n\n`;
        draftBody += `מצורף כרטיס סיכום פדגוגי יומי עבור ${activeStudentObj.name} לתאריך ${summaryDateStr}.\n\n`;
        draftBody += `📊 נוכחות היום: ${
          activeStudentDayData?.attendance === 'present' ? '🟢 נוכח' :
          activeStudentDayData?.attendance === 'late' ? '🟡 מאחר' :
          activeStudentDayData?.attendance === 'absent' ? '🔴 נעדר' : 'לא מוגדר'
        }\n`;
        draftBody += `⭐️ יתרת נקודות זכות כיתתית מצטברת: ${currentConfig?.student_points?.[selectedStudentId] || 0} נק'\n\n`;
        
        if (activeStudentDayData?.pos && activeStudentDayData.pos.length > 0) {
          draftBody += `✨ חיזוקים והישגים חיוביים שנרשמו היום:\n`;
          activeStudentDayData.pos.forEach((l: any, idx: number) => {
            draftBody += `  - ${CATEGORY_LABELS[l.categoryId]?.label || l.reason || 'ציון חיובי'} ${l.value ? `(${l.value > 0 ? '+' : ''}${l.value} נק')` : ''} ${l.reason ? `: "${l.reason}"` : ''}\n`;
          });
          draftBody += `\n`;
        }

        if (activeStudentDayData?.neg && activeStudentDayData.neg.length > 0) {
          draftBody += `⚠️ אירועי התנהגות/משמעת שנרשמו היום:\n`;
          activeStudentDayData.neg.forEach((l: any, idx: number) => {
            draftBody += `  - ${CATEGORY_LABELS[l.categoryId]?.label || l.reason || 'הערת משמעת'} ${l.value ? `(${l.value} נק')` : ''} ${l.reason ? `: "${l.reason}"` : ''}\n`;
          });
          draftBody += `\n`;
        }

        if (notesObj) {
          draftBody += `✍️ הערה אישית מהמורה:\n`;
          draftBody += `"${notesObj}"\n\n`;
        }

        draftBody += `בברכה,\nצוות החינוך והסגל הפדגוגי של בית הספר.`;

        await createGmailDraft(parentMail, `סיכום פדגוגי יומי של התלמיד ${activeStudentObj.name} - ${summaryDateStr}`, draftBody);
        setNotifications((prev: any) => [
          { id: Date.now(), text: `טיוטת מייל להורים נוצרה בהצלחה עבור ${activeStudentObj.name}!`, type: 'success' },
          ...prev
        ]);
      } else {
        // Class-wide summary dispatch
        // Generate draft for the system supervisor or general class board
        let classDraft = `מנהל כיתה ורכז שכבה יקר,\n\n`;
        classDraft += `מצורף דוח סיכום יומי כיתתי עבור כיתת ${currentConfig.name || 'מנוהלת'} לתאריך ${summaryDateStr}.\n\n`;
        classDraft += `📋 מדדי נוכחות כיתתיים:\n`;
        classDraft += `● שיעור נוכחות: ${attendanceStats.rate}%\n`;
        classDraft += `● נוכחים: ${attendanceStats.present}\n`;
        classDraft += `● מאחרים: ${attendanceStats.late}\n`;
        classDraft += `● נעדרים: ${attendanceStats.absent}\n\n`;
        
        classDraft += `⭐️ נקודות זכות ופרסים שחולקו היום: ${positiveCredits.length} פעולות מצויינות.\n`;
        classDraft += `⚠️ אירועי משמעת שנרשמו היום: ${negativeDiscipline.length} אירועים חריגים.\n\n`;
        
        if (teacherCustomNote) {
          classDraft += `📝 הערות והודעות מורה:\n`;
          classDraft += `"${teacherCustomNote}"\n\n`;
        }
        
        classDraft += `בברכה,\nמחנך/כת כיתה ${currentConfig.name || ''}`;

        await createGmailDraft('principal@school-district.edu', `דוח סיכום יומי כיתתי - ${currentConfig.name || ''} - ${selectedDate}`, classDraft);
        setNotifications((prev: any) => [
          { id: Date.now(), text: `טיוטת דוח כיתתי כללי נוצרה בהצלחה בתיבת הדואר שלך!`, type: 'success' },
          ...prev
        ]);
      }
    } catch (err: any) {
      setNotifications((prev: any) => [
        { id: Date.now(), text: `שגיאה ביצירת המייל: ${err.message}`, type: 'error' },
        ...prev
      ]);
    } finally {
      setIsEmailSending(false);
    }
  };

  return (
    <>
      {/* Dynamic Trigger Button in Parent Workspace */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-4 bg-brand-600 dark:bg-brand-500 hover:bg-brand-700 dark:hover:bg-brand-600 text-white rounded-2xl font-black flex items-center gap-3 shadow-lg shadow-brand-500/20 active:scale-95 transition-all text-sm whitespace-nowrap cursor-pointer"
      >
        <FileText className="w-5 h-5" />
        סיכום יומי (PDF)
      </button>

      {/* FULL SCREEN MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col lg:flex-row bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans select-none animate-in fade-in duration-200">
          
          {/* CONTROLS SIDEBAR (Left on desktop) */}
          <div className="w-full lg:w-[450px] bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 z-30 shadow-2xl">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg tracking-tight">כלי ייצוא סיכום יומי</h3>
                  <p className="text-xs text-slate-400 font-bold">נוכחות, נקודות והערות משמעת</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="סגור חלונית"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Control Panels */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
              
              {/* Date selection */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  בחר תאריך דוח:
                </label>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedStudentId(''); // reset student selection when date changes
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 text-sm font-bold shadow-inner focus:border-brand-500 outline-none transition-all text-slate-800 dark:text-white"
                />
              </div>

              {/* Report Model Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
                  סוג דוח לייצוא:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-850 p-1 rounded-xl">
                  <button
                    onClick={() => setReportType('class')}
                    className={`py-2 px-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      reportType === 'class' 
                        ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow' 
                        : 'text-slate-400 dark:text-slate-550 hover:text-slate-600'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    כיתתי מאוחד
                  </button>
                  <button
                    onClick={() => setReportType('student')}
                    className={`py-2 px-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      reportType === 'student' 
                        ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow' 
                        : 'text-slate-400 dark:text-slate-550 hover:text-slate-600'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    תלמיד אינדיבידואלי
                  </button>
                </div>
              </div>

              {/* Student Picker (If student report chosen) */}
              {reportType === 'student' && (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 animate-in slide-in-from-top-4 duration-150">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-350 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-500" />
                    בחר תלמיד/ה מהכיתה:
                  </span>
                  
                  {/* SEARCH students mini box */}
                  <div className="relative">
                    <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="חפש תלמיד/ה ברשימה..."
                      value={searchStudentTerm}
                      onChange={(e) => setSearchStudentTerm(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs font-bold focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* List of matching students */}
                  <div className="max-h-40 overflow-y-auto border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white dark:bg-slate-900 custom-scrollbar p-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((s: any) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStudentId(s.id)}
                          className={`w-full text-right px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-between ${
                            selectedStudentId === s.id 
                              ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' 
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <span>{s.name}</span>
                          {selectedStudentId === s.id && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-slate-400 text-[10px] font-bold">לא נמצאו תלמידים תואמים</div>
                    )}
                  </div>
                </div>
              )}

              {/* Interactive Pedagogical Notes Editor */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  {reportType === 'class' ? 'הוסף הערת מורה כיתתית יומיות:' : 'הוסף הערת מורה אישית להורים:'}
                </label>
                {reportType === 'class' ? (
                  <textarea
                    rows={4}
                    value={teacherCustomNote}
                    onChange={(e) => setTeacherCustomNote(e.target.value)}
                    placeholder="הקלד כאן הודעות כיתתיות, הנחיות מורה, שיעורי בית או הערות כלליות שיופיעו בתוך ה-PDF..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 text-xs font-bold placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none transition-all resize-none text-slate-800 dark:text-white"
                  />
                ) : (
                  <textarea
                    rows={4}
                    disabled={!selectedStudentId}
                    value={selectedStudentId ? (studentSpecificNotes[selectedStudentId] || '') : ''}
                    onChange={(e) => setStudentSpecificNotes({
                      ...studentSpecificNotes,
                      [selectedStudentId]: e.target.value
                    })}
                    placeholder={selectedStudentId ? "הקלד הערה ספציפית ומלאת הערכה לתלמיד זה (כמו שיפור בלמידה, השתתפות נפלאה) שתשתלב בדנסט ה-PDF..." : "אנא בחר תלמיד מהרשימה כדי לכתוב הערה..."}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 text-xs font-bold placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none transition-all resize-none disabled:opacity-50 text-slate-800 dark:text-white"
                  />
                )}
              </div>

            </div>

            {/* Bottom Actions Frame */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting || (reportType === 'student' && !selectedStudentId)}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-brand-500/10 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  הורד סיכום (PDF)
                </button>
                <button
                  onClick={handlePrint}
                  disabled={reportType === 'student' && !selectedStudentId}
                  className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-indigo-500" />
                  הדפס / שמור
                </button>
              </div>

              <button
                onClick={handleGmailDraft}
                disabled={isEmailSending || (reportType === 'student' && !selectedStudentId)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isEmailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {reportType === 'student' ? 'שלח כרטיסייה במייל להורים 📧' : 'שלח סיכום כיתתי לרכז/מנהל 📧'}
              </button>
            </div>

          </div>

          {/* VISUAL LAYOUT PREVIEW PANEL (Right on desktop) */}
          <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-6 lg:p-12 overflow-y-auto flex justify-center custom-scrollbar">
            
            <div className="w-full max-w-[800px] flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  תצוגה מקדימה פדגוגית של הדוח (גודל דף A4)
                </span>
                
                {reportType === 'student' && !selectedStudentId && (
                  <span className="text-xs font-black text-rose-500 animate-bounce">
                    ← אנא בחר תלמיד בלוח הבקרה כדי להציג את הדוח האישי
                  </span>
                )}
              </div>

              {/* REPORT CARD WRAPPER */}
              <div 
                ref={reportSheetRef}
                id="daily-summary-report-sheet"
                dir="rtl"
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-10 shadow-2xl overflow-hidden select-text text-right"
                style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
              >
                
                {reportType === 'class' ? (
                  /* CLASS-WIDE REPORT VIEW */
                  <div className="space-y-8">
                    
                    {/* Official Document Header */}
                    <div className="flex justify-between items-start border-b-[3px] border-slate-800 pb-5">
                      <div>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight">דו"ח פדגוגי וסיכום יומי כיתתי</h1>
                        <p className="text-sm font-bold text-slate-500 mt-1">{formatHebrewDate(selectedDate)}</p>
                      </div>
                      <div className="text-left font-bold text-xs text-slate-500">
                        <p className="font-black text-slate-900 text-sm">{currentConfig.name || 'כיתה מוגדרת'}</p>
                        <p>בית ספר ממלכתי ClassPro</p>
                        <p>שעת הפקה: {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    {/* Class Metrics Ribbons */}
                    <div className="grid grid-cols-3 gap-4">
                      
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-150 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-black text-emerald-600 mb-1">שיעור נוכחות יומי</span>
                        <div className="flex items-baseline gap-0.5 text-emerald-800">
                          <span className="text-3xl font-black tabular-nums">{attendanceStats.rate}</span>
                          <span className="text-sm font-black">%</span>
                        </div>
                        <span className="text-[10px] text-emerald-500 font-bold mt-1">
                          {attendanceStats.present} מתוך {attendanceStats.total} תלמידים
                        </span>
                      </div>

                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-150 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-black text-amber-600 mb-1">נקודות אור שנצברו</span>
                        <div className="flex items-baseline gap-0.5 text-amber-800">
                          <span className="text-3xl font-black tabular-nums">+{positiveCredits.reduce((acc, c) => acc + (c.value || 0), 0)}</span>
                          <span className="text-sm font-black">נק'</span>
                        </div>
                        <span className="text-[10px] text-amber-500 font-bold mt-1">
                          ניתנו ב-{positiveCredits.length} אירועי למידה
                        </span>
                      </div>

                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-150 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-black text-rose-600 mb-1">התראות משמעת והפרעה</span>
                        <div className="flex items-baseline gap-0.5 text-rose-800">
                          <span className="text-3xl font-black tabular-nums">{negativeDiscipline.length}</span>
                          <span className="text-sm font-black">אירועים</span>
                        </div>
                        <span className="text-[10px] text-rose-500 font-bold mt-1">
                          הפחתה של {Math.abs(negativeDiscipline.reduce((acc, c) => acc + (c.value || 0), 0))} נקודות משמעת
                        </span>
                      </div>

                    </div>

                    {/* General Teacher Notes Section */}
                    {teacherCustomNote && (
                      <div className="p-5 bg-slate-50 rounded-2xl border-r-4 border-indigo-600">
                        <h3 className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-2">📢 הערות והודעות המורה להורים ולצוות:</h3>
                        <p className="text-sm leading-relaxed text-slate-800 font-medium whitespace-pre-line">{teacherCustomNote}</p>
                      </div>
                    )}

                    {/* Attendance Details Report */}
                    <div className="space-y-3">
                      <h2 className="text-base font-black text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600" />
                        יומן נוכחות כיתתי מפורט
                      </h2>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200">
                          <h4 className="text-xs font-black text-amber-700 mb-2 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                            איחורים כיתתיים ({studentAttendanceList.filter(s => s.status === 'late').length})
                          </h4>
                          {studentAttendanceList.filter(s => s.status === 'late').length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {studentAttendanceList.filter(s => s.status === 'late').map(s => (
                                <span key={s.id} className="text-xs font-black bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg">
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 font-bold">לא תועדו איחורים היום</p>
                          )}
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200">
                          <h4 className="text-xs font-black text-rose-700 mb-2 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                            היעדרויות וחיסורים ({studentAttendanceList.filter(s => s.status === 'absent').length})
                          </h4>
                          {studentAttendanceList.filter(s => s.status === 'absent').length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {studentAttendanceList.filter(s => s.status === 'absent').map(s => (
                                <span key={s.id} className="text-xs font-black bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg">
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 font-bold">לא תועדו היעדרויות היום</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Positive Achievements Section */}
                    <div className="space-y-3 font-medium text-xs">
                      <h2 className="text-base font-black text-emerald-800 border-b border-emerald-200 pb-1.5 flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-600" />
                        ריכוז נקודות זכות והצטיינות חיובית
                      </h2>
                      {positiveCredits.length > 0 ? (
                        <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-sm">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-700">
                                <th className="p-3 font-black border-b border-slate-200">שם התלמיד</th>
                                <th className="p-3 font-black border-b border-slate-200">סוג הצטיינות</th>
                                <th className="p-3 font-black border-b border-slate-200 text-center">נקודות זכות</th>
                                <th className="p-3 font-black border-b border-slate-200">פירוט פדגוגי</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {positiveCredits.map((l: any) => {
                                const st = students.find((s: any) => s.id === l.studentId);
                                return (
                                  <tr key={l.id} className="hover:bg-slate-50/50">
                                    <td className="p-3 font-black text-slate-900">{st?.name || 'תלמיד'}</td>
                                    <td className="p-3 font-bold text-slate-600">{CATEGORY_LABELS[l.categoryId]?.label || 'ציון חיובי'}</td>
                                    <td className="p-3 font-black text-emerald-600 text-center text-sm">+{l.value || 0}</td>
                                    <td className="p-3 text-slate-500 italic font-bold">{l.reason || '-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-5 text-center bg-slate-50 rounded-2xl text-slate-400 font-bold border border-slate-200">
                          לא חולקו נקודות זכות עדיין לתאריך זה
                        </div>
                      )}
                    </div>

                    {/* Discipline Incidents Section */}
                    <div className="space-y-3 font-medium text-xs">
                      <h2 className="text-base font-black text-rose-800 border-b border-rose-250 pb-1.5 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        ריכוז אירועי משמעת ואי-ביצוע משימות
                      </h2>
                      {negativeDiscipline.length > 0 ? (
                        <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-sm">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-700 font-black">
                                <th className="p-3 border-b border-slate-200">שם התלמיד</th>
                                <th className="p-3 border-b border-slate-200">סיווג אירוע</th>
                                <th className="p-3 border-b border-slate-200 text-center">הפחתת ניקוד</th>
                                <th className="p-3 border-b border-slate-200">הערות פדגוגיות ושעות</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {negativeDiscipline.map((l: any) => {
                                const st = students.find((s: any) => s.id === l.studentId);
                                return (
                                  <tr key={l.id} className="hover:bg-slate-50/50">
                                    <td className="p-3 font-black text-slate-900">{st?.name || 'תלמיד'}</td>
                                    <td className="p-3 font-bold text-slate-600">
                                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 font-black">
                                        {CATEGORY_LABELS[l.categoryId]?.label || 'הערת משמעת'}
                                      </span>
                                    </td>
                                    <td className="p-3 font-black text-rose-600 text-end text-sm">{l.value || 0}</td>
                                    <td className="p-3 text-slate-500 italic font-bold">{l.reason || '-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-5 text-center bg-emerald-50 text-emerald-700 rounded-2xl font-black border border-emerald-150">
                          מופת! לא נרשמו הערות משמעת או אירועי התנהגות שליליים ביום זה.
                        </div>
                      )}
                    </div>

                    {/* Official Footer Design */}
                    <div className="pt-10 flex justify-between items-center text-[10px] text-slate-400 font-bold border-t border-slate-200">
                      <span>צוות חינוכי ClassPro © כל הזכויות שמורות</span>
                      <span>חתימת מחנך/ת כיתה: ___________________</span>
                    </div>

                  </div>
                ) : (
                  /* PERSONAL STUDENT REPORT VIEW */
                  activeStudentObj ? (
                    <div className="space-y-8">
                      
                      {/* Student Card Header */}
                      <div className="flex justify-between items-start border-b-[3px] border-indigo-600 pb-5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-lg font-black leading-none">תלמיד/ה מן המניין</span>
                            <h1 className="text-2xl font-black text-slate-900 leading-tight">כרטיס סיכום פדגוגי יומי</h1>
                          </div>
                          <h2 className="text-xl font-black text-brand-600 mt-1">{activeStudentObj.name}</h2>
                          <p className="text-xs font-bold text-slate-400 mt-1">{formatHebrewDate(selectedDate)}</p>
                        </div>
                        <div className="text-left font-bold text-xs text-slate-500">
                          <p className="font-black text-slate-900 text-sm">{currentConfig.name || 'כיתה מוגדרת'}</p>
                          <p>בית ספר ממלכתי ClassPro</p>
                          <p>דואר הורים: {activeStudentObj.parentEmail || 'לא מוגדר'}</p>
                        </div>
                      </div>

                      {/* Personal metrics widget */}
                      <div className="grid grid-cols-3 gap-4">
                        
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center flex flex-col items-center">
                          <span className="text-xs font-black text-slate-500 mb-1">נוכחות יומית</span>
                          {activeStudentDayData?.attendance === 'present' && (
                            <span className="text-2xl font-black text-emerald-600">🟢 נוכח</span>
                          )}
                          {activeStudentDayData?.attendance === 'late' && (
                            <span className="text-2xl font-black text-amber-500">🟡 מאחר</span>
                          )}
                          {activeStudentDayData?.attendance === 'absent' && (
                            <span className="text-2xl font-black text-rose-600">🔴 נעדר</span>
                          )}
                          {activeStudentDayData?.attendance === 'none' && (
                            <span className="text-2xl font-black text-slate-400">לא נרשם</span>
                          )}
                        </div>

                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-150 text-center flex flex-col items-center">
                          <span className="text-xs font-black text-emerald-600 mb-1">פעולות חיוביות היום</span>
                          <span className="text-3xl font-black text-emerald-800">{activeStudentDayData?.pos?.length || 0}</span>
                          <span className="text-[10px] text-emerald-500 font-bold">חיזוקי הערכה פדגוגיים</span>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-150 text-center flex flex-col items-center">
                          <span className="text-xs font-black text-amber-600 mb-1">יתרת נקודות זכות כעת</span>
                          <span className="text-3xl font-black text-amber-800">{currentConfig?.student_points?.[selectedStudentId] || 0}</span>
                          <span className="text-[10px] text-amber-500 font-bold">סך הכל נקודות מצטברות</span>
                        </div>

                      </div>

                      {/* Personal Custom Teacher Feedback Card */}
                      {studentSpecificNotes[selectedStudentId] && (
                        <div className="p-5 bg-indigo-50/50 rounded-2xl border-r-4 border-indigo-600">
                          <h3 className="text-xs font-black text-indigo-700 mb-1">💬 הערה פדגוגית אישית להורים מהמחנך:</h3>
                          <p className="text-sm italic font-bold leading-relaxed text-slate-800">"{studentSpecificNotes[selectedStudentId]}"</p>
                        </div>
                      )}

                      {/* Positive Details Table */}
                      <div className="space-y-2 text-xs font-medium">
                        <h3 className="text-sm font-black text-emerald-800 border-b border-emerald-100 pb-1 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-emerald-600" />
                          פירוט הצטיינות וקרדיטים חיוביים
                        </h3>
                        {activeStudentDayData?.pos && activeStudentDayData.pos.length > 0 ? (
                          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-right border-collapse">
                              <tr className="bg-slate-50 text-slate-700 font-black">
                                <th className="p-3">קטגוריה</th>
                                <th className="p-3 text-center">נקודות</th>
                                <th className="p-3">פירוט התהליך</th>
                                <th className="p-3">שעה</th>
                              </tr>
                              {activeStudentDayData.pos.map((l: any) => (
                                <tr key={l.id} className="border-t border-slate-150">
                                  <td className="p-3 font-black text-slate-900">{CATEGORY_LABELS[l.categoryId]?.label || 'ציון חיובי'}</td>
                                  <td className="p-3 text-emerald-600 font-black text-center">+{l.value || 0}</td>
                                  <td className="p-3 text-slate-500 italic font-bold">{l.reason || 'עבודה הישגית יפה'}</td>
                                  <td className="p-3 text-slate-400 font-semibold">{new Date(l.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</td>
                                </tr>
                              ))}
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 font-bold italic p-3 bg-slate-50 rounded-xl border border-slate-100">לא תועדו נקודות זכות חיוביות היום.</p>
                        )}
                      </div>

                      {/* Negative Details Table */}
                      <div className="space-y-2 text-xs font-medium">
                        <h3 className="text-sm font-black text-rose-800 border-b border-rose-100 pb-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          רישום הערות משמעת ואי-ביצוע מטלות
                        </h3>
                        {activeStudentDayData?.neg && activeStudentDayData.neg.length > 0 ? (
                          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-right border-collapse">
                              <tr className="bg-slate-50 text-slate-700 font-black">
                                <th className="p-3">סוג אירוע</th>
                                <th className="p-3 text-center">הפחתת ניקוד</th>
                                <th className="p-3">הערה פדגוגית</th>
                                <th className="p-3">שעה</th>
                              </tr>
                              {activeStudentDayData.neg.map((l: any) => (
                                <tr key={l.id} className="border-t border-slate-150">
                                  <td className="p-3 font-black text-slate-900">
                                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                                      {CATEGORY_LABELS[l.categoryId]?.label || 'הערת משמעת'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-rose-600 font-black text-center">{l.value || 0}</td>
                                  <td className="p-3 text-slate-500 italic font-bold">{l.reason || 'אין פירוט נוסף'}</td>
                                  <td className="p-3 text-slate-400 font-semibold">{new Date(l.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</td>
                                </tr>
                              ))}
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-700 font-black p-3 bg-emerald-50 rounded-xl border border-emerald-100">תלמיד למופת! לא תועדו הפרעות או הערות משמעת להיום.</p>
                        )}
                      </div>

                      {/* Official Footer Design */}
                      <div className="pt-10 flex justify-between items-center text-[10px] text-slate-400 font-bold border-t border-slate-200">
                        <span>סגל פדגוגי ClassPro © לתקשורת משפחה-בית ספר</span>
                        <span>חתימת מחנך/ת כיתה: ___________________</span>
                      </div>

                    </div>
                  ) : (
                    /* STUDENT NOT SELECTED PLACEHOLDER SHEET */
                    <div className="h-[500px] flex flex-col items-center justify-center text-center p-8 text-slate-400 gap-4">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                        <User className="w-10 h-10 text-slate-300 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-lg text-slate-700">תלמיד לא נבחר</h4>
                        <p className="text-xs font-bold max-w-sm">על מנת להפיק כרטיסיית דוח סיכום תלמיד אינדיבידואלית, אנא בחר תלמיד מהרשימה בלוח הבקרה מצד שמאל.</p>
                      </div>
                    </div>
                  )
                )}

              </div>
            </div>

          </div>

        </div>
      )}
    </>
  );
};
