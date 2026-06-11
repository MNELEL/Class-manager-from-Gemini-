import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Search, Filter, Plus, Edit2, Trash2, 
  ChevronDown, User as UserIcon, BookOpen, 
  Settings2, AlertCircle, Sparkles, GraduationCap, FileText, CheckCircle2, Download
} from 'lucide-react';
import { Student } from '../types';
import { cn } from '../lib/utils';
import { generateContent } from '../lib/ai';
import { exportStudentPDF } from '../lib/pdf';
import { StudentReportModal } from './StudentReportModal';

export const StudentsView = ({ 
  students, 
  currentConfig,
  updateCurrentConfig,
  onBack,
  setViewType
}: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [showImportForm, setShowImportForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [importing, setImporting] = useState(false);

  // Key Interaction States
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Derive unique groups
  const allGroups = useMemo(() => {
    const groups = new Set<string>();
    students.forEach((s: Student) => {
      s.groups?.forEach(g => groups.add(g));
    });
    return Array.from(groups);
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s: Student) => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGroup = selectedGroup === 'all' || s.groups?.includes(selectedGroup);
      return matchSearch && matchGroup;
    });
  }, [students, searchTerm, selectedGroup]);

  const handleSaveStudent = async (newStudent: Student) => {
    setIsSaving(true);
    // Visual Simulator delay to showcase full form submitting spinner state
    await new Promise(resolve => setTimeout(resolve, 750));

    let newStudents = [...students];
    if (editingStudent) {
      newStudents = newStudents.map(s => s.id === newStudent.id ? newStudent : s);
      setToast({ text: 'פרופיל התלמיד עודכן בהצלחה בהיסטוריה הכיתתית!', type: 'success' });
    } else {
      newStudents.push({ ...newStudent, id: String(Date.now()) });
      setToast({ text: `התלמיד החדש "${newStudent.name}" נוסף בהצלחה!`, type: 'success' });
    }
    updateCurrentConfig({ students: newStudents });
    setIsSaving(false);
    setShowForm(false);
    setEditingStudent(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`האם למחוק את התלמיד ${name}?`)) {
      updateCurrentConfig({ students: students.filter((s: Student) => s.id !== id) });
      setToast({ text: `התלמיד "${name}" הוסר מהכיתה בהצלחה.`, type: 'info' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const exportToCSV = () => {
    if (!students || students.length === 0) {
      setToast({ text: 'אין תלמידים להציג או לייצא כעת.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    // Define CSV Headers in Hebrew
    const headers = [
      'מזהה ייחודי',
      'שם מלא',
      'מגדר',
      'גובה / מידות',
      'קבוצות',
      'שורה מועדפת',
      'העדפת ישיבה קדמית',
      'אפיון פדגוגי / קשיים',
      'הערות מיוחדות'
    ];

    // Build Rows
    const rows = students.map((s: Student) => [
      s.id || '',
      s.name || '',
      s.gender === 'male' ? 'בן' : s.gender === 'female' ? 'בת' : '',
      s.height || '',
      (s.groups || []).join('; '),
      s.preferredRow || '',
      s.frontPrefer ? 'כן' : 'לא',
      (s.pedagogicalDiagnoses || []).join('; '),
      s.notes || ''
    ]);

    // Format fields with quotes to handle commas or newlines safely
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const stringVal = String(val).replace(/"/g, '""'); // escape double quotes
          return `"${stringVal}"`;
        }).join(',')
      )
    ].join('\n');

    // Add Unicode BOM (\uFEFF) for Excel RTL encoding support
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `גיבוי_תלמידים_כיתה_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast({ text: 'קובץ ה-CSV גובה והורד בהצלחה למחשבך!', type: 'success' });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAIImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const text = fd.get('importText') as string;
    if (!text) return;

    setImporting(true);
    try {
      const responseText = await generateContent(
        `נתח את הטקסט הבא והחזר מתוכו רשימה של התלמידים עם המאפיינים שלהם לפי פורמט ה-JSON הבא בדיוק:
{
  "students": [
    {
      "name": "שם התלמיד/ה",
      "gender": "male או female או ריק",
      "groups": ["קבוצה 1", "קבוצה 2"],
      "pedagogicalDiagnoses": ["אבחנה פדגוגית/קושי/ריכוז"],
      "preferredRow": "front או middle או back או any",
      "frontPrefer": true או false
    }
  ]
}

טקסט לניתוח:
${text}`,
        "אנא החזר פלט בפורמט JSON בלבד, ללא שום הערות או פסקאות מקדימות (ללא markdown)."
      );

      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/([\{\[][\s\S]*[\}\]])/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          throw parseErr;
        }
      }

      if (parsed && parsed.students) {
        const newStudents = parsed.students.map((s: any) => ({
          ...s,
          id: String(Date.now() + Math.random())
        }));
        
        updateCurrentConfig({ students: [...students, ...newStudents] });
        setToast({ text: `ייבוא מוצלח! ${newStudents.length} תלמידים נוספו לכיתה בעזרת AI.`, type: 'success' });
        setTimeout(() => setToast(null), 4000);
        setShowImportForm(false);
      }
    } catch (err) {
      console.error(err);
      setToast({ text: 'אירעה שגיאה בניתוח הטקסט ע"י הבינה המלאכותית.', type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-6 h-full overflow-y-auto no-scrollbar pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            ניהול תלמידים
          </h2>
          <p className="text-slate-500 font-medium mt-1">רשימת התלמידים בכיתה, פרופיל אישי, ואפיון חכם.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={exportToCSV}
            className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-850 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2.5 rounded-xl font-bold hover:scale-[1.02] hover:shadow-sm cursor-pointer transition-all duration-200 border border-emerald-200/40"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            גיבוי וייצוא CSV
          </button>
          <button 
            onClick={() => setShowReportModal(true)}
            className="flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-850 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 dark:text-amber-400 px-4 py-2.5 rounded-xl font-bold hover:scale-[1.02] hover:shadow-sm cursor-pointer transition-all duration-200 border border-amber-200/40"
          >
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            הפק דוח פרופילים מלא
          </button>
          <button 
            onClick={() => setShowImportForm(true)}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold hover:scale-[1.02] hover:shadow-sm cursor-pointer transition-all duration-200"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            ייבוא חכם (AI)
          </button>
          <button 
            onClick={() => { setEditingStudent(null); setShowForm(true); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold hover:bg-primary/95 hover:scale-[1.02] hover:shadow-md active:scale-95 cursor-pointer transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            הוסף תלמיד חדש
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border flex flex-col md:flex-row items-center gap-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="חיפוש לפי תלמיד..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar">
          <select 
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 font-medium outline-none shrink-0"
          >
            <option value="all">כל הקבוצות</option>
            {allGroups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          
          <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl p-1 shrink-0">
            <button 
              onClick={() => setViewMode('table')}
              className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'table' ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:text-slate-700")}
            >
              <Users className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'grid' ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:text-slate-700")}
            >
              <UserIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">תלמיד/ה</th>
                  <th className="px-6 py-4">קבוצות</th>
                  <th className="px-6 py-4">צרכים מיוחדים / אפיון</th>
                  <th className="px-6 py-4">העדפות מיקום</th>
                  <th className="px-6 py-4 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      לא נמצאו תלמידים.
                    </td>
                  </tr>
                ) : filteredStudents.map((student: Student) => (
                  <tr 
                    key={student.id} 
                    onClick={() => setSelectedStudentId(selectedStudentId === student.id ? null : student.id)}
                    className={cn(
                      "transition-all duration-150 cursor-pointer border-r-4",
                      selectedStudentId === student.id
                        ? "bg-primary/5 dark:bg-primary/10 border-r-primary border-b border-border shadow-sm scale-[0.998]"
                        : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20 border-r-transparent"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full font-bold flex items-center justify-center transition-all",
                          selectedStudentId === student.id 
                            ? "bg-primary text-white scale-110 shadow-md"
                            : "bg-primary/10 text-primary"
                        )}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{student.name}</span>
                            {selectedStudentId === student.id && (
                              <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-black animate-pulse">פרופיל פעיל</span>
                            )}
                          </p>
                          {(student.gender || student.height) && (
                            <p className="text-xs text-slate-500">
                              {student.gender === 'male' ? 'בן' : student.gender === 'female' ? 'בת' : ''} {student.height ? `- ${student.height}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {student.groups?.map(g => (
                          <span key={g} className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {g}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {student.pedagogicalDiagnoses?.map(d => (
                          <span key={d} className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        {student.preferredRow && <span>שורה: <b className="text-slate-800 dark:text-slate-200">{student.preferredRow}</b></span>}
                        {student.frontPrefer && <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 rounded font-bold">קדמי</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => exportStudentPDF(student)}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-115 active:scale-90 transition-all cursor-pointer"
                          title="ייצוא פרופיל PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setViewType('studentDetail'); }}
                          className="p-2 text-slate-400 hover:text-primary hover:scale-115 active:scale-90 transition-all cursor-pointer"
                          title="צפה בפרופיל"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setEditingStudent(student); setShowForm(true); }}
                          className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-115 active:scale-90 transition-all cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(student.id, student.name)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:scale-115 active:scale-90 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStudents.map((student: Student) => (
            <div 
              key={student.id} 
              onClick={() => setSelectedStudentId(selectedStudentId === student.id ? null : student.id)}
              className={cn(
                "bg-white dark:bg-slate-900 rounded-2xl border p-5 flex flex-col items-center text-center gap-3 relative group transition-all duration-200 cursor-pointer",
                selectedStudentId === student.id
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10 scale-[1.015] shadow-md"
                  : "border-border hover:border-slate-300 dark:hover:border-slate-700 hover:scale-[1.01] hover:shadow-sm"
              )}
            >
              <div 
                className={cn(
                  "absolute top-3 left-3 flex gap-1 transition-all duration-200",
                  selectedStudentId === student.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => { setEditingStudent(student); setShowForm(true); }} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer hover:scale-105 active:scale-95">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(student.id, student.name)} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 hover:text-red-500 transition-colors cursor-pointer hover:scale-105 active:scale-95">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shadow-inner transition-all duration-300",
                selectedStudentId === student.id
                  ? "bg-primary text-white scale-105 shadow-md"
                  : "bg-gradient-to-tr from-primary/20 to-primary/5 text-primary"
              )}>
                {student.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                  <span>{student.name}</span>
                  {selectedStudentId === student.id && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </h3>
                <p className="text-xs text-slate-500">{student.groups?.join(', ') || 'ללא קבוצה'}</p>
              </div>
              {student.pedagogicalDiagnoses && student.pedagogicalDiagnoses.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {student.pedagogicalDiagnoses.map(d => (
                    <span key={d} className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating Add Button for Mobile */}
      <div className="md:hidden fixed bottom-24 left-4 z-50">
        <button 
          onClick={() => { setEditingStudent(null); setShowForm(true); }}
          className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-90 transition-transform cursor-pointer"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <AnimatePresence>
        {showImportForm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !importing && setShowImportForm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-border"
            >
              <div className="border-b border-border p-6 flex justify-between items-center bg-academic-gradient rounded-t-3xl">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    ייבוא חכם של תלמידים
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">הדבק רשימות או טקסט חופשי, והבינה המלאכותית תסדר את הנתונים.</p>
                </div>
                <button 
                  onClick={() => !importing && setShowImportForm(false)} 
                  disabled={importing}
                  className="p-2 text-slate-400 hover:text-slate-700 bg-white/50 rounded-full disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
              <form className="p-6 space-y-6" onSubmit={handleAIImport}>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">טקסט חופשי לייבוא</label>
                  <textarea 
                    name="importText" 
                    required 
                    rows={8}
                    placeholder="לדוגמא: דני הוא בן, יושב שורה ראשונה (הפרעת קשב). מיכל בת, קבוצה מתקדמים..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none" 
                    disabled={importing}
                  />
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowImportForm(false)} 
                    disabled={importing}
                    className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                  >
                    ביטול
                  </button>
                  <button 
                    type="submit" 
                    disabled={importing}
                    className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {importing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        מנתח נתונים...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        ייבא תלמידים
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReportModal && (
          <StudentReportModal 
            students={students} 
            onClose={() => setShowReportModal(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-border"
            >
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-border p-6 flex justify-between items-center z-10">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                  {editingStudent ? 'עריכת תלמיד' : 'הוספת תלמיד חדש'}
                </h3>
                <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full">
                  ✕
                </button>
              </div>
              <form 
                className="p-6 space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const newStudent: any = {
                    ...(editingStudent || {}),
                    name: fd.get('name') as string,
                    gender: fd.get('gender') as string,
                    groups: (fd.get('groups') as string).split(',').map(s=>s.trim()).filter(Boolean),
                    pedagogicalDiagnoses: (fd.get('diagnoses') as string).split(',').map(s=>s.trim()).filter(Boolean),
                    preferredRow: fd.get('preferredRow') as string,
                    frontPrefer: fd.get('frontPrefer') === 'on',
                  };
                  handleSaveStudent(newStudent);
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">שם מלא</label>
                    <input name="name" defaultValue={editingStudent?.name} required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">מגדר</label>
                      <select name="gender" defaultValue={editingStudent?.gender} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none">
                        <option value="">לא מוגדר</option>
                        <option value="male">בן</option>
                        <option value="female">בת</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">העדפת שורה</label>
                      <select name="preferredRow" defaultValue={editingStudent?.preferredRow} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none">
                        <option value="any">כל מקום</option>
                        <option value="front">קרוב ללוח</option>
                        <option value="middle">אמצע כיתה</option>
                        <option value="back">אחורה</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">קבוצות (מופרד בפסיקים)</label>
                    <input name="groups" defaultValue={editingStudent?.groups?.join(', ')} placeholder="לדוגמא: קבוצת אנגלית, מתקדמים" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">צרכים ואפיונים (מופרד בפסיקים)</label>
                    <input name="diagnoses" defaultValue={editingStudent?.pedagogicalDiagnoses?.join(', ')} placeholder="לדוגמא: משקפיים, הפרעת קשב" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer">
                    <input type="checkbox" name="frontPrefer" defaultChecked={editingStudent?.frontPrefer} className="w-5 h-5 accent-primary" />
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-300">חובה שורה ראשונה</p>
                      <p className="text-xs text-slate-500">רק אם יש אילוץ רפואי או קוגניטיבי מיוחד</p>
                    </div>
                  </label>
                </div>
                
                <div className="pt-6 border-t border-border flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)} 
                    disabled={isSaving}
                    className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                  >
                    ביטול
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/95 transition-all active:scale-95 shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        שומר...
                      </>
                    ) : (
                      'שמור תלמיד'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Elegant Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-6 z-[300] bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm border border-slate-800/10"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
