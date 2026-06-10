import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Printer, Download, Filter, Eye, CheckSquare, Square, 
  Users, Award, HelpCircle, Sparkles, AlertCircle, BookOpen, UserCheck
} from 'lucide-react';
import { Student } from '../types';

interface StudentReportModalProps {
  students: Student[];
  onClose: () => void;
}

export const StudentReportModal = ({ students, onClose }: StudentReportModalProps) => {
  // Column toggles
  const [showGender, setShowGender] = useState(true);
  const [showGroups, setShowGroups] = useState(true);
  const [showDiagnoses, setShowDiagnoses] = useState(true);
  const [showAccommodations, setShowAccommodations] = useState(true);
  const [showSeating, setShowSeating] = useState(true);
  const [showGrades, setShowGrades] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);

  // Filters
  const [groupFilter, setGroupFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [accommodationFilter, setAccommodationFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Extract all categories / groups
  const allGroups = useMemo(() => {
    const groupsSet = new Set<string>();
    students.forEach(s => s.groups?.forEach(g => groupsSet.add(g)));
    return Array.from(groupsSet);
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGroup = groupFilter === 'all' || s.groups?.includes(groupFilter);
      const matchGender = genderFilter === 'all' || s.gender === genderFilter;
      const matchAccommodation = accommodationFilter === 'all' || 
        (accommodationFilter === 'yes' && ((s.pedagogicalDiagnoses && s.pedagogicalDiagnoses.length > 0) || (s.learningAccommodations && s.learningAccommodations.length > 0))) || 
        (accommodationFilter === 'no' && (!s.pedagogicalDiagnoses || s.pedagogicalDiagnoses.length === 0) && (!s.learningAccommodations || s.learningAccommodations.length === 0));

      return matchSearch && matchGroup && matchGender && matchAccommodation;
    });
  }, [students, searchTerm, groupFilter, genderFilter, accommodationFilter]);

  // Statistics
  const statistics = useMemo(() => {
    const total = filteredStudents.length;
    let boys = 0;
    let girls = 0;
    let withAccommodations = 0;
    let totalGradeSum = 0;
    let gradesCount = 0;

    filteredStudents.forEach(s => {
      if (s.gender === 'male') boys++;
      else if (s.gender === 'female') girls++;

      if ((s.pedagogicalDiagnoses && s.pedagogicalDiagnoses.length > 0) || (s.learningAccommodations && s.learningAccommodations.length > 0)) {
        withAccommodations++;
      }

      if (s.grades && s.grades.length > 0) {
        s.grades.forEach(g => {
          totalGradeSum += g.grade;
          gradesCount++;
        });
      }
    });

    const avgGrade = gradesCount > 0 ? Math.round(totalGradeSum / gradesCount) : null;

    return { total, boys, girls, withAccommodations, avgGrade };
  }, [filteredStudents]);

  // Export CSV handler
  const handleExportCSV = () => {
    // CSV headers based on toggles
    const headers = ['שם מלא'];
    if (showGender) headers.push('מגדר');
    if (showGroups) headers.push('קבוצות');
    if (showDiagnoses) headers.push('אבחונים/צרכים פדגוגיים');
    if (showAccommodations) headers.push('התאמות למידה');
    if (showSeating) headers.push('העדפת שורה/מיקום');
    if (showGrades) headers.push('ממוצע ציונים');
    if (showNotes) headers.push('הערות מחנך');
    if (showAIRecommendations) headers.push('המלצות פדגוגיות AI');

    const csvRows = [
      '\u200F' + headers.join(','), // Hebrew RTL marker + headers
    ];

    filteredStudents.forEach(s => {
      const rowData: string[] = [s.name];
      
      if (showGender) {
        rowData.push(s.gender === 'male' ? 'בן' : s.gender === 'female' ? 'בת' : 'לא מוגדר');
      }
      if (showGroups) {
        rowData.push(`"${(s.groups || []).join('; ')}"`);
      }
      if (showDiagnoses) {
        rowData.push(`"${(s.pedagogicalDiagnoses || []).join('; ')}"`);
      }
      if (showAccommodations) {
        rowData.push(`"${(s.learningAccommodations || []).join('; ')}"`);
      }
      if (showSeating) {
        const rowPref = s.preferredRow === 'front' ? 'קרוב ללוח' : s.preferredRow === 'middle' ? 'אמצע' : s.preferredRow === 'back' ? 'אחורה' : 'כל מקום';
        const constraints = [];
        if (s.frontPrefer) constraints.push('חובה שורה ראשונה');
        rowData.push(`"${rowPref}${constraints.length > 0 ? ' (' + constraints.join(', ') + ')' : ''}"`);
      }
      if (showGrades) {
        const avg = s.grades && s.grades.length > 0 
          ? Math.round(s.grades.reduce((sum, g) => sum + g.grade, 0) / s.grades.length) 
          : 'אין ציונים';
        rowData.push(String(avg));
      }
      if (showNotes) {
        rowData.push(`"${(s.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`);
      }
      if (showAIRecommendations) {
        rowData.push(`"${(s.ai_pedagogy_recommendation || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`);
      }

      csvRows.push(rowData.join(','));
    });

    const csvContent = csvRows.join('\r\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Student_Profiles_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print window
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md overflow-hidden" dir="rtl" id="student-report-dashboard">
      {/* Media Print styles injected to style the output perfectly */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background: #fff !important;
            color: #000 !important;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            direction: rtl;
          }
          .no-print {
            display: none !important;
          }
          .print-card-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Top Header Controls (Hidden on print) */}
      <header className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">מחולל דוח פרופילים ואפיוני תלמידים מקיף</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">צפייה, סינון, הדפסה וייצוא של כל פרטי התלמידים מרוכזים בגיליון אחד.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>הדפס דוח מעוצב</span>
          </button>

          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>ייצא ל-CSV (אקסל)</span>
          </button>

          <button 
            onClick={onClose}
            className="flex items-center justify-center p-3 text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-2xl hover:scale-105 transition-all cursor-pointer"
            title="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Core View Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 flex flex-col lg:flex-row gap-6">
        
        {/* Sidebar Configurator (Left side on desktop, top on mobile) - Hidden on print */}
        <aside className="no-print w-full lg:w-80 space-y-6 shrink-0">
          
          {/* Section Options (Columns toggle) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[2rem] space-y-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 dark:text-white tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Eye className="w-4 h-4 text-brand-500" />
              עמודות ומידע להצגה
            </h2>

            <div className="space-y-3">
              {[
                { label: 'מגדר (בן/בת)', state: showGender, setState: setShowGender },
                { label: 'קבוצות למידה', state: showGroups, setState: setShowGroups },
                { label: 'צרכים ואבחונים פדגוגיים', state: showDiagnoses, setState: setShowDiagnoses },
                { label: 'התאמות אקדמיות', state: showAccommodations, setState: setShowAccommodations },
                { label: 'העדפות שורה/מיקום', state: showSeating, setState: setShowSeating },
                { label: 'הישגים וציונים (ממוצע)', state: showGrades, setState: setShowGrades },
                { label: 'הערות מחנך אישיות', state: showNotes, setState: setShowNotes },
                { label: 'המלצות למידה חכמות (AI)', state: showAIRecommendations, setState: setShowAIRecommendations },
              ].map((col, idx) => (
                <button
                  key={idx}
                  onClick={() => col.setState(!col.state)}
                  className="w-full flex items-center gap-3 text-right p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all font-medium text-slate-700 dark:text-slate-300 text-xs"
                >
                  {col.state ? (
                    <CheckSquare className="w-5 h-5 text-brand-500 shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
                  )}
                  <span>{col.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filters configuration */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[2rem] space-y-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 dark:text-white tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Filter className="w-4 h-4 text-brand-500" />
              סינון נתונים
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">חיפוש קל לפי שם</label>
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="הקלד שם תלמיד..."
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">סינון לפי קבוצה</label>
                <select 
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-800 dark:text-white"
                >
                  <option value="all">כל הקבוצות</option>
                  {allGroups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">מגדר</label>
                <select 
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-800 dark:text-white"
                >
                  <option value="all">הכל</option>
                  <option value="male">בנים בלבד</option>
                  <option value="female">בנות בלבד</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">צרכים מיוחדים / אבחון</label>
                <select 
                  value={accommodationFilter}
                  onChange={(e) => setAccommodationFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-800 dark:text-white"
                >
                  <option value="all">כל התלמידים</option>
                  <option value="yes">בעלי אבחון/התאמה כלשהי</option>
                  <option value="no">ללא אבחונים או התאמות</option>
                </select>
              </div>
            </div>
          </div>
        </aside>

        {/* Live Preview of report + Summary statistics */}
        <main className="flex-1 flex flex-col gap-6">
          
          {/* Summary widgets - Hidden on print */}
          <section className="no-print grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500">תלמידים בדוח</p>
                <p className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">{statistics.total}</p>
              </div>
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-700 shrink-0" />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500">פילוח מיני</p>
                <p className="text-md font-bold text-slate-800 dark:text-white mt-1">
                  <span>{statistics.boys} בנים</span>
                  <span className="mx-1 px-1 text-slate-300">|</span>
                  <span>{statistics.girls} בנות</span>
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-slate-300 dark:text-slate-700 shrink-0" />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500">דרוש סיוע/התאמה</p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-500 mt-1">{statistics.withAccommodations}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 shrink-0" />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500">ממוצע כיתתי ממוזג</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500 mt-1">
                  {statistics.avgGrade !== null ? `${statistics.avgGrade}` : '-'}
                </p>
              </div>
              <Award className="w-8 h-8 text-slate-300 dark:text-slate-700 shrink-0" />
            </div>
          </section>

          {/* The Sheet (Preview & print-area target) */}
          <div 
            id="print-area" 
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-md flex flex-col space-y-6"
          >
            {/* Report Header Block */}
            <div className="border-b-2 border-slate-900 dark:border-white pb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="no-print bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full">
                  דוח מודפס רשמי
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                  כיתה חכמה CLASSFLOW - דוח פרופילים מורחב
                </h1>
                <p className="text-xs md:text-sm text-slate-500">
                  הופק בתאריך: {new Date().toLocaleDateString('he-IL')} בשעה {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              <div className="text-left py-2 font-mono text-[10px] text-slate-400">
                סה"כ תלמידים מקיפים: <span className="font-bold text-slate-900 dark:text-white">{filteredStudents.length}</span>
              </div>
            </div>

            {/* Empty view check */}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                לא נמצאו תלמידים העונים לקריטריוני הסינון שבחרת.
              </div>
            ) : (
              /* The Table of Students */
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 dark:border-slate-700 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <th className="py-4 px-3 text-slate-850">שם התלמיד/ה</th>
                      {showGender && <th className="py-4 px-3 text-slate-850">מגדר</th>}
                      {showGroups && <th className="py-4 px-3 text-slate-850">קבוצות למידה</th>}
                      {showDiagnoses && <th className="py-4 px-3 text-slate-850">אבחנות וצרכים</th>}
                      {showAccommodations && <th className="py-4 px-3 text-slate-850">התאמות למידה</th>}
                      {showSeating && <th className="py-4 px-3 text-slate-850">העדפות מיקום</th>}
                      {showGrades && <th className="py-4 px-3 text-slate-850">הישגים (ממוצע)</th>}
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudents.map((student) => {
                      const avg = student.grades && student.grades.length > 0
                        ? Math.round(student.grades.reduce((sum, g) => sum + g.grade, 0) / student.grades.length)
                        : null;

                      return (
                        <React.Fragment key={student.id}>
                          {/* Row 1: Core parameters */}
                          <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="py-4 px-3 font-bold text-slate-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <span className="no-print w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-bold flex items-center justify-center">
                                  {student.name.charAt(0)}
                                </span>
                                <span>{student.name}</span>
                              </div>
                            </td>
                            
                            {showGender && (
                              <td className="py-4 px-3 font-medium text-slate-600 dark:text-slate-300">
                                {student.gender === 'male' ? 'בן' : student.gender === 'female' ? 'בת' : 'לא צוין'}
                              </td>
                            )}

                            {showGroups && (
                              <td className="py-4 px-3 text-xs">
                                <div className="flex flex-wrap gap-1">
                                  {student.groups && student.groups.length > 0 ? (
                                    student.groups.map(g => (
                                      <span key={g} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 print:border print:border-slate-300 text-[10px] font-bold">
                                        {g}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </div>
                              </td>
                            )}

                            {showDiagnoses && (
                              <td className="py-4 px-3 text-xs">
                                <div className="flex flex-wrap gap-1">
                                  {student.pedagogicalDiagnoses && student.pedagogicalDiagnoses.length > 0 ? (
                                    student.pedagogicalDiagnoses.map(d => (
                                      <span key={d} className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 print:text-black print:border-dashed print:border print:border-slate-400 text-[10px] font-bold">
                                        {d}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </div>
                              </td>
                            )}

                            {showAccommodations && (
                              <td className="py-4 px-3 text-xs">
                                <div className="flex flex-wrap gap-1">
                                  {student.learningAccommodations && student.learningAccommodations.length > 0 ? (
                                    student.learningAccommodations.map(ac => (
                                      <span key={ac} className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 print:text-black print:border print:border-slate-400 text-[10px]">
                                        {ac}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </div>
                              </td>
                            )}

                            {showSeating && (
                              <td className="py-4 px-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                <div className="space-y-0.5">
                                  <p>
                                    מיקום מועדף: {
                                      student.preferredRow === 'front' ? 'קרוב ללוח' : 
                                      student.preferredRow === 'middle' ? 'אמצע הכיתה' : 
                                      student.preferredRow === 'back' ? 'אחורה' : 'כל מקום'
                                    }
                                  </p>
                                  {student.frontPrefer && (
                                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                                      * אילוץ שורה ראשונה
                                    </p>
                                  )}
                                </div>
                              </td>
                            )}

                            {showGrades && (
                              <td className="py-4 px-3 font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                                {avg !== null ? (
                                  <span className={avg >= 85 ? "text-emerald-600" : avg < 70 ? "text-rose-500" : "text-brand-600 animate-none"}>
                                    {avg}% (מתוך {student.grades?.length} מבחנים)
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">-</span>
                                )}
                              </td>
                            )}
                          </tr>

                          {/* Row 2: Secondary detail rows if toggled on */}
                          {(showNotes || showAIRecommendations) && (
                            <tr className="bg-slate-50/20 dark:bg-slate-800/5 print-card-break">
                              <td colSpan={7} className="pb-4 px-4 text-xs border-b border-slate-100 dark:border-slate-800">
                                <div className="space-y-2 pt-1">
                                  
                                  {/* Note tags/Notes text */}
                                  {showNotes && (student.notes || (student.noteTags && student.noteTags.length > 0)) && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                                      <p className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                        <span>הערת מחנך וחוזקות:</span>
                                      </p>
                                      {student.notes ? (
                                        <p className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">{student.notes}</p>
                                      ) : null}
                                      {student.noteTags && student.noteTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {student.noteTags.map(tag => (
                                            <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-650">#{tag}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* AI Pedagogical Recommendations */}
                                  {showAIRecommendations && student.ai_pedagogy_recommendation && (
                                    <div className="p-3 bg-indigo-50/30 border border-indigo-100/50 dark:bg-indigo-950/10 dark:border-indigo-900/40 rounded-xl space-y-1">
                                      <p className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>המלצה פדגוגית חכמה (סביבת למידה):</span>
                                      </p>
                                      <p className="text-indigo-950 dark:text-indigo-300 leading-relaxed whitespace-pre-line font-medium text-xs">{student.ai_pedagogy_recommendation}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer Signatures for printed version */}
            <div className="pt-12 mt-12 border-t border-slate-300 dark:border-slate-800 grid grid-cols-2 gap-10 text-center font-bold text-xs text-slate-500 print:block print:w-full print:flex print:justify-between">
              <div className="space-y-4 print:text-right">
                <p>חתימת המחנך/ת בכיתה: ___________________</p>
                <p className="text-[10px] text-slate-400">חתימת המורה ויועץ/ת בית הספר</p>
              </div>
              <div className="space-y-4 print:text-left">
                <p>אישור הנהלה או ריכוז פדגוגי: ___________________</p>
                <p className="text-[10px] text-slate-400">CLASSFLOW - ניהול כיתה פדגוגי מתקדם בסביבה חכמה</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
