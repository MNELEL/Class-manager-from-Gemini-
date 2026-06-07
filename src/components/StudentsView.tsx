import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Search, Filter, Plus, Edit2, Trash2, 
  ChevronDown, User as UserIcon, BookOpen, 
  Settings2, AlertCircle, Sparkles, GraduationCap, FileText
} from 'lucide-react';
import { Student } from '../types';
import { cn } from '../lib/utils';
import { generateContent } from '../lib/ai';
import { exportStudentPDF } from '../lib/pdf';

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
  const [importing, setImporting] = useState(false);

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

  const handleSaveStudent = (newStudent: Student) => {
    let newStudents = [...students];
    if (editingStudent) {
      newStudents = newStudents.map(s => s.id === newStudent.id ? newStudent : s);
    } else {
      newStudents.push({ ...newStudent, id: String(Date.now()) });
    }
    updateCurrentConfig({ students: newStudents });
    setShowForm(false);
    setEditingStudent(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('האם למחוק תלמיד זה?')) {
      updateCurrentConfig({ students: students.filter((s: Student) => s.id !== id) });
    }
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
          id: String(Date.now()) + Math.random().toString(36).substr(2, 9)
        }));
        
        updateCurrentConfig({ students: [...students, ...newStudents] });
        setShowImportForm(false);
      }
    } catch (err) {
      console.error(err);
      alert('אירעה שגיאה בניתוח הטקסט');
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
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowImportForm(true)}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm"
          >
            <Sparkles className="w-5 h-5 text-indigo-500" />
            ייבוא חכם (AI)
          </button>
          <button 
            onClick={() => { setEditingStudent(null); setShowForm(true); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
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
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{student.name}</p>
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
                        {student.preferredRow && <span>שורה: <b className="text-slate-800">{student.preferredRow}</b></span>}
                        {student.frontPrefer && <span className="bg-emerald-100 text-emerald-800 px-1.5 rounded">קדמי</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => exportStudentPDF(student)}
                          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="ייצוא פרופיל PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setViewType('studentDetail'); /* we'd ideally pass student ID but viewType 'studentDetail' expects state mapping */ }}
                          className="p-2 text-slate-400 hover:text-primary transition-colors"
                          title="צפה בפרופיל"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setEditingStudent(student); setShowForm(true); }}
                          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(student.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
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
            <div key={student.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-border p-5 flex flex-col items-center text-center gap-3 card-hover relative group">
              <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingStudent(student); setShowForm(true); }} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 hover:text-emerald-600">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(student.id)} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 text-primary flex items-center justify-center text-2xl font-black shadow-inner">
                {student.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{student.name}</h3>
                <p className="text-xs text-slate-500">{student.groups?.join(', ') || 'ללא קבוצה'}</p>
              </div>
              {student.pedagogicalDiagnoses && student.pedagogicalDiagnoses.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {student.pedagogicalDiagnoses.map(d => (
                    <span key={d} className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-amber-50 text-amber-600">
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
          className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
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
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                    ביטול
                  </button>
                  <button type="submit" className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm">
                    שמור תלמיד
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
