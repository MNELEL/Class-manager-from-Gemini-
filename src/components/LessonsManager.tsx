import { useState, useMemo } from 'react';
import { 
    Plus, Clock, MapPin, Trash2, BookOpen, Edit2, Calendar, 
    Download, CheckCircle, AlertTriangle, Grid, List, Sparkles, 
    Check, HelpCircle, FileText, Search, SlidersHorizontal, ArrowLeft,
    CheckSquare, Square, ThumbsUp, Printer, CalendarDays
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Student } from '../types';
import { scheduleCalendarEvent } from '../lib/workspace';

interface Lesson {
    id: string;
    name: string;
    day: string;
    time: string;
    room?: string;
    category?: 'regular' | 'alternative';
    goal?: string;
    status?: 'not_started' | 'in_progress' | 'completed';
    notes?: string;
    color?: string;
}

// Hebrew Day Names Map for Sorting & Matching
const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

// Predefined Subject Colors for beautiful visual rhythm
const SUBJECTS_PRESETS = [
    { name: 'גמרא', bg: 'bg-amber-500/10 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', hex: '#f59e0b', label: 'amber' },
    { name: 'חומש', bg: 'bg-orange-500/10 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800', hex: '#f97316', label: 'orange' },
    { name: 'הלכה ותנ"ך', bg: 'bg-yellow-500/10 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', hex: '#eab308', label: 'yellow' },
    { name: 'מתמטיקה', bg: 'bg-blue-500/10 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800', hex: '#3b82f6', label: 'blue' },
    { name: 'אנגלית', bg: 'bg-purple-500/10 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800', hex: '#a855f7', label: 'purple' },
    { name: 'שפה ועברית', bg: 'bg-emerald-500/10 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', hex: '#10b981', label: 'emerald' },
    { name: 'מדעים', bg: 'bg-cyan-500/10 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800', hex: '#06b6d4', label: 'cyan' },
    { name: 'שיחת משוב', bg: 'bg-rose-500/10 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800', hex: '#f43f5e', label: 'rose' },
    { name: 'תגבור אישי', bg: 'bg-indigo-500/10 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800', hex: '#6366f1', label: 'indigo' }
];

const COLOR_MAP: Record<string, string> = {
    amber: 'bg-amber-500/10 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    orange: 'bg-orange-500/10 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-850',
    yellow: 'bg-yellow-500/10 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    blue: 'bg-blue-500/10 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-500/10 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    emerald: 'bg-emerald-500/10 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    cyan: 'bg-cyan-500/10 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
    rose: 'bg-rose-500/10 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    indigo: 'bg-indigo-500/10 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
};

const getNextDateForDay = (dayName: string) => {
    const daysMap: Record<string, number> = {
        'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'שבת': 6
    };
    const targetDay = daysMap[dayName] !== undefined ? daysMap[dayName] : 0;
    const now = new Date();
    const result = new Date(now);
    result.setDate(now.getDate() + (targetDay + 7 - now.getDay()) % 7);
    return result;
};

export const LessonsManager = ({ 
    student, 
    onUpdateStudent 
}: { 
    student: Student, 
    onUpdateStudent: (updatedStudent: Student) => void 
}) => {
    // Basic States
    const [viewMode, setViewMode] = useState<'cards' | 'grid' | 'timeline'>('cards');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'err' | 'warning' } | null>(null);

    // Filter/Search States
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'regular' | 'alternative'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all');

    // New/Editing Lesson Draft State
    const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
        name: '',
        day: 'ראשון',
        time: '',
        room: '',
        category: 'regular',
        goal: '',
        status: 'not_started',
        notes: '',
        color: 'indigo'
    });

    const triggerToast = (text: string, type: 'success' | 'err' | 'warning' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Sync to Google Calendar using global workspace helper
    const syncToCalendar = async (lesson: Lesson) => {
        try {
            const date = getNextDateForDay(lesson.day);
            const [hours, minutes] = (lesson.time || "08:00").split(':');
            date.setHours(parseInt(hours || '8'), parseInt(minutes || '0'));
            
            const start = new Date(date);
            const end = new Date(date);
            end.setHours(start.getHours() + 1); // Default to 1 hour duration

            await scheduleCalendarEvent({
                summary: `שיעור עם ${student.name}: ${lesson.name}`,
                location: lesson.room || 'חדר טיפולי/תגבור',
                description: `יעד לימודי: ${lesson.goal || 'טרם נקבע'}\nהערות: ${lesson.notes || ''}`,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() }
            });
            
            triggerToast('השיעור סונכרן בהצלחה ליומן Google!', 'success');
        } catch (err: any) {
            console.error(err);
            triggerToast('שגיאה בסנכרון ליומן, ודא הרשאות: ' + err.message, 'err');
        }
    };

    // Save or Edit Lesson Handler
    const saveLesson = () => {
        if (!newLesson.name || !newLesson.time) {
            triggerToast('אנא הזן שם שיעור ושעה תקנית', 'warning');
            return;
        }
        
        const existingLessons = student.lessons || [];

        if (editingLessonId) {
            const updatedStudent = {
                ...student,
                lessons: existingLessons.map(l => 
                    l.id === editingLessonId 
                        ? { 
                            ...l, 
                            name: newLesson.name!, 
                            day: newLesson.day || 'ראשון', 
                            time: newLesson.time!, 
                            room: newLesson.room, 
                            category: newLesson.category || 'regular',
                            goal: newLesson.goal || '',
                            status: newLesson.status || 'not_started',
                            notes: newLesson.notes || '',
                            color: newLesson.color || 'indigo'
                          }
                        : l
                )
            };
            onUpdateStudent(updatedStudent);
            triggerToast(`השיעור "${newLesson.name}" עודכן בהצלחה!`);
        } else {
            const lesson: Lesson = {
                id: Date.now().toString(),
                name: newLesson.name,
                day: newLesson.day || 'ראשון',
                time: newLesson.time,
                room: newLesson.room || '',
                category: newLesson.category || 'regular',
                goal: newLesson.goal || '',
                status: newLesson.status || 'not_started',
                notes: newLesson.notes || '',
                color: newLesson.color || 'indigo'
            };

            const updatedStudent = {
                ...student,
                lessons: [...existingLessons, lesson]
            };
            onUpdateStudent(updatedStudent);
            triggerToast(`השיעור "${newLesson.name}" נוסף בהצלחה למערכת!`);
        }
        
        // Reset Draft Setup
        setNewLesson({ 
            name: '', 
            day: 'ראשון', 
            time: '', 
            room: '', 
            category: 'regular',
            goal: '',
            status: 'not_started',
            notes: '',
            color: 'indigo'
        });
        setEditingLessonId(null);
        setIsModalOpen(false);
    };

    // Modify inline status of lesson (for quick checking)
    const toggleLessonStatus = (lessonId: string, currentStatus: Lesson['status']) => {
        const statuses: Lesson['status'][] = ['not_started', 'in_progress', 'completed'];
        const nextIdx = (statuses.indexOf(currentStatus || 'not_started') + 1) % statuses.length;
        const nextStatus = statuses[nextIdx];

        const updatedStudent = {
            ...student,
            lessons: (student.lessons || []).map(l => 
                l.id === lessonId ? { ...l, status: nextStatus } : l
            )
        };
        onUpdateStudent(updatedStudent);
        
        const statusText = nextStatus === 'completed' ? 'הושלם בהצלחה' : nextStatus === 'in_progress' ? 'בתהליך עבודה' : 'טרם התחיל';
        triggerToast(`סטטוס השיעור עודכן ל: ${statusText}`);
    };

    const editLesson = (lesson: Lesson) => {
        setNewLesson({
            name: lesson.name,
            day: lesson.day,
            time: lesson.time,
            room: lesson.room || '',
            category: lesson.category || 'regular',
            goal: lesson.goal || '',
            status: lesson.status || 'not_started',
            notes: lesson.notes || '',
            color: lesson.color || 'indigo'
        });
        setEditingLessonId(lesson.id);
        setIsModalOpen(true);
    };

    const deleteLesson = (id: string) => {
        const deletedName = (student.lessons || []).find(l => l.id === id)?.name;
        const updatedStudent = {
            ...student,
            lessons: (student.lessons || []).filter(l => l.id !== id)
        };
        onUpdateStudent(updatedStudent);
        triggerToast(`השיעור "${deletedName || 'שנבחר'}" הוסר מהמערכת`);
    };

    const openCreateModal = () => {
        setNewLesson({ 
            name: '', 
            day: 'ראשון', 
            time: '', 
            room: '', 
            category: 'regular',
            goal: '',
            status: 'not_started',
            notes: '',
            color: 'indigo'
        });
        setEditingLessonId(null);
        setIsModalOpen(true);
    };

    // Presets application helper
    const handlePresetSelect = (preset: typeof SUBJECTS_PRESETS[0]) => {
        setNewLesson(prev => ({
            ...prev,
            name: preset.name,
            color: preset.label
        }));
    };

    // Calculate Conflict Warnings
    const conflicts = useMemo(() => {
        const studentLessons = student.lessons || [];
        const seen: Record<string, Lesson[]> = {};
        studentLessons.forEach(l => {
            const key = `${l.day}-${l.time}`;
            if (!seen[key]) seen[key] = [];
            seen[key].push(l);
        });
        return Object.entries(seen)
            .filter(([_, items]) => items.length > 1)
            .map(([key, items]) => ({
                day: items[0].day,
                time: items[0].time,
                lessonNames: items.map(l => l.name)
            }));
    }, [student.lessons]);

    // Derived Statistics
    const statsSummary = useMemo(() => {
        const list = student.lessons || [];
        const total = list.length;
        const alternative = list.filter(l => l.category === 'alternative').length;
        const completed = list.filter(l => l.status === 'completed').length;
        const inProgress = list.filter(l => l.status === 'in_progress').length;
        
        // Subject breakdown
        const subjectCount: Record<string, number> = {};
        list.forEach(l => {
            subjectCount[l.name] = (subjectCount[l.name] || 0) + 1;
        });
        const popularSubject = Object.entries(subjectCount).sort((a,b) => b[1] - a[1])[0]?.[0] || 'אין';

        return { total, alternative, completed, inProgress, popularSubject };
    }, [student.lessons]);

    // Filtering logic
    const filteredLessons = useMemo(() => {
        let list = student.lessons || [];
        
        // Search Term
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            list = list.filter(l => 
                l.name.toLowerCase().includes(term) || 
                (l.goal && l.goal.toLowerCase().includes(term)) ||
                (l.room && l.room.toLowerCase().includes(term))
            );
        }

        // Category Filter
        if (categoryFilter !== 'all') {
            list = list.filter(l => l.category === categoryFilter);
        }

        // Status Filter
        if (statusFilter !== 'all') {
            list = list.filter(l => (l.status || 'not_started') === statusFilter);
        }

        // Default chronological sorting within filters
        return [...list].sort((a, b) => a.time.localeCompare(b.time));
    }, [student.lessons, searchTerm, categoryFilter, statusFilter]);

    // Grouping for traditional Cards view
    const groupedLessons = useMemo(() => {
        return days.reduce((acc, day) => {
            acc[day] = filteredLessons.filter(l => l.day === day);
            return acc;
        }, {} as Record<string, Lesson[]>);
    }, [filteredLessons]);

    // Unique sorted times for Grid view
    const uniqueTimeSlots = useMemo(() => {
        const studentLessons = student.lessons || [];
        const times = Array.from(new Set(studentLessons.map(l => l.time)));
        if (times.length === 0) {
            return ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
        }
        return times.sort();
    }, [student.lessons]);

    // Native Print optimization script
    const handlePrintWindow = () => {
        window.print();
    };

    // Generic ICS (iCalendar File) Generator
    const downloadICSFile = () => {
        const list = student.lessons || [];
        if (list.length === 0) {
            triggerToast('אין שיעורים במערכת לייצוא!', 'warning');
            return;
        }

        let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ClassAndSchool//LessonsScheduler//HE\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n";
        
        list.forEach(lesson => {
            const date = getNextDateForDay(lesson.day);
            const [hours, minutes] = (lesson.time || "08:00").split(':');
            date.setHours(parseInt(hours || '8'), parseInt(minutes || '0'), 0);
            
            // Format to YYYYMMDDTHHMMSSZ
            const formattedStart = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const dateEnd = new Date(date);
            dateEnd.setHours(dateEnd.getHours() + 1);
            const formattedEnd = dateEnd.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

            icsContent += "BEGIN:VEVENT\r\n";
            icsContent += `UID:${lesson.id}-lessons@schoolmanager\r\n`;
            icsContent += `DTSTART:${formattedStart}\r\n`;
            icsContent += `DTEND:${formattedEnd}\r\n`;
            icsContent += `SUMMARY:שיעור ${lesson.name} [${student.name}]\r\n`;
            icsContent += `LOCATION:${lesson.room || 'כיתה'}\r\n`;
            icsContent += `DESCRIPTION:סוג: ${lesson.category === 'alternative' ? 'תגבור/חלופי' : 'רגיל'}\\nיעד לימודי: ${lesson.goal || 'טרם נקבע'}\\nסטטוס: ${lesson.status || 'not_started'}\\nהערות: ${lesson.notes || ''}\r\n`;
            icsContent += "END:VEVENT\r\n";
        });

        icsContent += "END:VCALENDAR\r\n";

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lessons-schedule-${student.name}.ics`;
        link.click();
        triggerToast('קובץ יומן שיעורים (ICS) הורד בהצלחה! ניתן לייבא ל-Google / Outlook.');
    };

    return (
        <div className="space-y-8 select-none" dir="rtl">
            {/* Action Dialog / Notifications */}
            {toast && (
                <div className={cn(
                    "fixed bottom-6 left-6 z-[1002] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-black animate-in slide-in-from-bottom duration-300",
                    toast.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none' :
                    toast.type === 'warning' ? 'bg-amber-500 text-slate-900 shadow-amber-100 dark:shadow-none' :
                    'bg-rose-600 text-white shadow-rose-200 dark:shadow-none'
                )}>
                    {toast.type === 'success' && <Check className="w-4 h-4" />}
                    {toast.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                    {toast.type === 'err' && <AlertTriangle className="w-4 h-4" />}
                    <span>{toast.text}</span>
                </div>
            )}

            {/* Print Header Branding (Hidden on desktop screen, visible only on print) */}
            <div className="hidden print:block mb-8 border-b-2 border-slate-300 pb-4 text-center">
                <h1 className="text-3xl font-black text-slate-900">מערכת שעות שבועית ומרחב פדגוגי</h1>
                <p className="text-md text-slate-500 font-bold mt-1">תלמיד/ה: {student.name} • כיתה: {student.areaPref?.zone || 'מחנך/יועץ'}</p>
                <div className="flex justify-center gap-6 mt-3 text-xs text-slate-500 font-bold">
                    <span>סה"כ שעות שבועיות: {statsSummary.total}</span>
                    <span>מתוכם שיעורי תגבור: {statsSummary.alternative}</span>
                    <span>שיעורים שהושלמו: {statsSummary.completed}</span>
                </div>
            </div>

            {/* Top Workspace Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-brand-500 text-white rounded-xl shadow-md">
                            <CalendarDays className="w-5 h-5 animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white">מרחב שיעורים פדגוגי</h3>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">ניהול מערכת אישית, מעקב יעדי למידה ותגבורים חלופיים</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Exporters */}
                    <button 
                        onClick={downloadICSFile}
                        className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs border border-slate-200 dark:border-slate-800 transition-all shadow-sm active:scale-95"
                        title="ייצוא ליומנים חיצוניים"
                    >
                        <Download className="w-4 h-4 text-brand-500" />
                        ייצוא יומן (iCal)
                    </button>

                    <button 
                        onClick={handlePrintWindow}
                        className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs border border-slate-200 dark:border-slate-800 transition-all shadow-sm active:scale-95"
                        title="הדפסת המערכת השבועית"
                    >
                        <Printer className="w-4 h-4 text-emerald-500" />
                        הדפס מערכת שעות
                    </button>

                    <button 
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-3 bg-brand-600 dark:bg-brand-500 hover:bg-brand-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-brand-500/10 hover:scale-105 transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        שיעור או תגבור חדש
                    </button>
                </div>
            </div>

            {/* Conflicts Alert Warning Banner */}
            {conflicts.length > 0 && (
                <div className="bg-amber-500/10 border-2 border-amber-300 p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center gap-4 text-amber-800 dark:text-amber-400 print:hidden shadow-inner animate-in fade-in duration-300">
                    <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md">
                        <AlertTriangle className="w-5 h-5 animate-bounce" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <h4 className="font-extrabold text-sm md:text-base">הצטלבות או כפילות במערכת השעות של התלמיד!</h4>
                        <div className="text-xs font-bold opacity-90 space-y-1">
                            {conflicts.map((c, i) => (
                                <p key={i}>
                                    • יום <strong>{c.day}</strong> בשעה <strong>{c.time}</strong>: קיימת התנגשות בין השיעורים: {c.lessonNames.join(' ותרפ"א/')}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Statistics Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
                <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 flex items-center justify-center font-black">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white">{statsSummary.total}</div>
                        <div className="text-[10px] text-slate-400 font-bold">שעות שבועיות סה"כ</div>
                    </div>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-black">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white">{statsSummary.completed}</div>
                        <div className="text-[10px] text-slate-400 font-bold">שיעורים שהושלמו</div>
                    </div>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center font-black">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white">{statsSummary.alternative}</div>
                        <div className="text-[10px] text-slate-400 font-bold">שיעורי תגבור וחלופות</div>
                    </div>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center font-black">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-base font-black text-slate-800 dark:text-white truncate max-w-[120px]">{statsSummary.popularSubject}</div>
                        <div className="text-[10px] text-slate-400 font-bold">מקצוע מרכזי השבוע</div>
                    </div>
                </div>
            </div>

            {/* Layout Filter Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-850 print:hidden">
                {/* Visual View-Mode Selector Tabs */}
                <div className="flex bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-2xl space-x-1" dir="ltr">
                    <button 
                        onClick={() => setViewMode('timeline')}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer",
                            viewMode === 'timeline' 
                                ? "bg-white dark:bg-slate-950 text-brand-600 dark:text-brand-400 shadow-md" 
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                        )}
                    >
                        <List className="w-3.5 h-3.5" />
                        יומן למידה פדגוגי
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer",
                            viewMode === 'grid' 
                                ? "bg-white dark:bg-slate-950 text-brand-600 dark:text-brand-400 shadow-md" 
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                        )}
                    >
                        <Grid className="w-3.5 h-3.5" />
                        מערכת שעות שבועית
                    </button>
                    <button 
                        onClick={() => setViewMode('cards')}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer",
                            viewMode === 'cards' 
                                ? "bg-white dark:bg-slate-950 text-brand-600 dark:text-brand-400 shadow-md" 
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                        )}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        תצוגת כרטיסיות
                    </button>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap lg:flex-nowrap items-center gap-3">
                    {/* Search Field */}
                    <div className="relative flex-1 md:flex-initial min-w-[180px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="חיפוש מקצוע / יעד / כיתה..."
                            className="w-full pr-9 pl-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white"
                        />
                    </div>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value as any)}
                        className="p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-350"
                    >
                        <option value="all">כל סוגי השיעורים</option>
                        <option value="regular">שיעורים רגילים</option>
                        <option value="alternative">חלופות ותגבורים</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-350"
                    >
                        <option value="all">כל הסטטוסים</option>
                        <option value="not_started">טרם התחיל</option>
                        <option value="in_progress">בתהליך עבודה</option>
                        <option value="completed">הושלם בהצלחה</option>
                    </select>
                </div>
            </div>

            {/* VIEW MODE 1: TRADITIONAL CARDS DAY LIST (Enhanced) */}
            {viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {days.map(day => (
                        <div key={day} className="bg-slate-50 dark:bg-slate-850 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/50 dark:border-slate-800">
                                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm tracking-widest">{day}</h4>
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        {groupedLessons[day].length} שיעורים
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {groupedLessons[day].length > 0 ? (
                                        groupedLessons[day].map(lesson => (
                                            <div 
                                                key={lesson.id} 
                                                className={cn(
                                                    "group relative p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md",
                                                    COLOR_MAP[lesson.color || ''] || "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
                                                    lesson.status === 'completed' && 'opacity-65 line-through decoration-slate-400'
                                                )}
                                            >
                                                <div className="flex flex-col gap-1 pr-1">
                                                    <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                                        {/* Status Icon Indicator */}
                                                        <button
                                                            onClick={() => toggleLessonStatus(lesson.id, lesson.status)}
                                                            className="text-slate-400 hover:text-brand-500 transition-colors"
                                                            title="שנה סטטוס התקדמות"
                                                        >
                                                            {lesson.status === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                                            {lesson.status === 'in_progress' && <Clock className="w-4 h-4 text-amber-500 animate-pulse" />}
                                                            {(lesson.status === 'not_started' || !lesson.status) && <Clock className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                                                        </button>

                                                        <span className="font-black text-slate-800 dark:text-white leading-tight text-sm">
                                                            {lesson.name}
                                                        </span>

                                                        {lesson.category === 'alternative' && (
                                                            <span className="text-[8px] font-black bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded-md uppercase">חלופה</span>
                                                        )}
                                                    </div>

                                                    {lesson.goal && (
                                                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-normal line-clamp-2" title="יעד למידה">
                                                            🔍 <strong>יעד:</strong> {lesson.goal}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-3 text-[10px] font-extrabold text-slate-400 mt-2">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {lesson.time}
                                                        </div>
                                                        {lesson.room && (
                                                            <div className="flex items-center gap-1 max-w-[100px] truncate" title={lesson.room}>
                                                                <MapPin className="w-3 h-3" />
                                                                {lesson.room}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Float Controller */}
                                                <div className="absolute top-3 left-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-white/95 dark:bg-slate-900/90 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-800">
                                                    <button 
                                                        onClick={() => syncToCalendar(lesson)}
                                                        className="p-1 text-slate-400 hover:text-brand-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                                        title="סנכרן ליומן גוגל"
                                                    >
                                                        <Calendar className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => editLesson(lesson)}
                                                        className="p-1 text-slate-400 hover:text-brand-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                                        title="ערוך פרטי שיעור"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => deleteLesson(lesson.id)}
                                                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                                        title="מחק שיעור"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
                                            <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase">אין שיעורים ליום זה</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* VIEW MODE 2: VISUAL WEEKLY TIMETABLE GRID (מערכת שעות חזותית) */}
            {viewMode === 'grid' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 overflow-x-auto shadow-inner">
                    <table className="w-full border-collapse text-right min-w-[700px]">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-850">
                                <th className="py-4 px-3 text-slate-400 text-xs font-black w-[100px]">שעת שיעור</th>
                                {days.map(day => (
                                    <th key={day} className="py-4 px-3 text-slate-700 dark:text-slate-200 text-sm font-black text-center">{day}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {uniqueTimeSlots.map(time => (
                                <tr key={time} className="border-b border-slate-100 dark:border-slate-850/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="py-5 px-3 font-extrabold text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                                        {time}
                                    </td>
                                    {days.map(day => {
                                        const dayLessons = filteredLessons.filter(l => l.day === day && l.time === time);
                                        return (
                                            <td key={day} className="p-2 align-middle">
                                                {dayLessons.map(lesson => (
                                                    <div 
                                                        key={lesson.id} 
                                                        onClick={() => editLesson(lesson)}
                                                        className={cn(
                                                            "p-3 rounded-2xl border text-center shadow-xs cursor-pointer hover:scale-103 transition-all select-none space-y-1 my-1",
                                                            COLOR_MAP[lesson.color || ''] || "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-850",
                                                            lesson.status === 'completed' && 'opacity-60 line-through'
                                                        )}
                                                    >
                                                        <div className="text-xs font-black text-slate-800 dark:text-white truncate">
                                                            {lesson.name}
                                                        </div>
                                                        <div className="text-[9px] font-bold text-slate-400 truncate">
                                                            {lesson.room || 'ללא חדר'}
                                                        </div>
                                                        {lesson.status === 'completed' && (
                                                            <div className="flex justify-center text-emerald-500">
                                                                <Check className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {dayLessons.length === 0 && (
                                                    <div className="py-4 text-center text-[10px] text-slate-200 dark:text-slate-800 font-extrabold tracking-widest hover:text-slate-400 transition-colors cursor-pointer" onClick={() => {
                                                        setNewLesson(prev => ({ ...prev, day, time }));
                                                        setIsModalOpen(true);
                                                    }}>
                                                        + חלון פנוי
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* VIEW MODE 3: PEDAGOGICAL TIMELINE (יומן התקדמות לימודי) */}
            {viewMode === 'timeline' && (
                <div className="space-y-6">
                    {filteredLessons.length > 0 ? (
                        <div className="relative border-r-2 border-slate-200 dark:border-slate-800 pr-6 space-y-8 py-2">
                            {filteredLessons.map((lesson, idx) => (
                                <div key={lesson.id} className="relative">
                                    {/* Circle Dot Marker */}
                                    <div className={cn(
                                        "absolute -right-[31px] top-1.5 w-4 h-4 rounded-full border-4 bg-white dark:bg-slate-900 transition-transform hover:scale-125 z-10",
                                        lesson.status === 'completed' ? 'border-emerald-500' :
                                        lesson.status === 'in_progress' ? 'border-amber-500' : 'border-slate-300 dark:border-slate-700'
                                    )} />

                                    {/* Chronological Card Layout */}
                                    <div className={cn(
                                        "p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow",
                                        COLOR_MAP[lesson.color || ''] || "border-slate-200 dark:border-slate-800"
                                    )}>
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-black bg-brand-500 text-white px-2.5 py-0.5 rounded-full">
                                                        יום {lesson.day} • {lesson.time}
                                                    </span>
                                                    <h4 className="text-lg font-black text-slate-800 dark:text-white">{lesson.name}</h4>
                                                    
                                                    {lesson.category === 'alternative' && (
                                                        <span className="text-[10px] font-black bg-orange-200 text-orange-700 px-2 py-0.5 rounded-lg">שיעור תגבור</span>
                                                    )}
                                                </div>

                                                {lesson.room && (
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        מיקום: {lesson.room}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status Badge Buttons */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleLessonStatus(lesson.id, lesson.status)}
                                                    className={cn(
                                                        "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5",
                                                        lesson.status === 'completed' ? 'bg-emerald-500 text-white' :
                                                        lesson.status === 'in_progress' ? 'bg-amber-500 text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                    )}
                                                >
                                                    {lesson.status === 'completed' && <Check className="w-3 h-3" />}
                                                    {lesson.status === 'completed' ? 'הושלם בהצלחה' : 
                                                     lesson.status === 'in_progress' ? 'בביצוע פדגוגי' : 'טרם התחיל (לחץ לשינוי)'}
                                                </button>

                                                <button 
                                                    onClick={() => editLesson(lesson)}
                                                    className="p-2 text-slate-400 hover:text-brand-500 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-75 * rounded-xl transition-colors"
                                                    title="ערוך שיעור"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => deleteLesson(lesson.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-75 * rounded-xl transition-colors"
                                                    title="מחק שיעור"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Pedagogical Insights Inside Timeline */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-850">
                                            <div className="space-y-1">
                                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">🎯 יעד לימודי מוגדר</h5>
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-350 leading-relaxed bg-slate-100/40 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                                                    {lesson.goal || 'טרם עודכן יעד משמעותי לשיעור זה.'}
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">📝 סיכום מפגש והערות פדגוגיות</h5>
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-350 leading-relaxed bg-slate-100/40 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                                                    {lesson.notes || 'אין הערות או סיכומים פדגוגיים מיוחדים לבינתיים.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800/80 rounded-[3rem]">
                            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h4 className="text-lg font-black text-slate-400 dark:text-slate-600">לא נמצאו שיעורים התואמים למפרט המסננים</h4>
                            <p className="text-xs text-slate-400 mt-1 font-medium">נסו לשנות את הגדרות החיפוש או הוסיפו שיעור חדש מעלה</p>
                        </div>
                    )}
                </div>
            )}

            {/* CREATION & EDIT MODAL DIALOG */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[1001] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200" dir="rtl">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl">
                                <BookOpen className="w-6 h-6 text-brand-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                                    {editingLessonId ? 'עריכת שיעור ופרטים' : 'תכנון שיעור חדש'}
                                </h3>
                                <p className="text-slate-500 font-medium text-sm">הזן את פרטי השיעור והיעדים הפדגוגיים שלו במרחב הלימודי של {student.name}</p>
                            </div>
                        </div>

                        {/* Subject Presets - Click to autofill */}
                        {!editingLessonId && (
                            <div className="space-y-1.5">
                                <span className="text-xs font-black text-slate-400 mr-1 block text-right">קיצור דרך - בחירת מקצוע עם צבע מותאם:</span>
                                <div className="flex flex-wrap gap-2">
                                    {SUBJECTS_PRESETS.map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handlePresetSelect(preset)}
                                            className={cn(
                                                "px-3 py-1.5 text-[10px] font-black border rounded-xl hover:scale-105 active:scale-95 transition-all",
                                                preset.bg
                                            )}
                                        >
                                            {preset.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-400 mr-2 text-right block">שם השיעור / מקצוע</label>
                                    <input 
                                        type="text"
                                        value={newLesson.name}
                                        onChange={e => setNewLesson({...newLesson, name: e.target.value})}
                                        placeholder="מתמטיקה, גמרא, מדעים..."
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-400 mr-2 text-right block">צבע שיעור מותאם</label>
                                    <select 
                                        value={newLesson.color}
                                        onChange={e => setNewLesson({...newLesson, color: e.target.value as any})}
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-xs"
                                    >
                                        <option value="indigo">אינדיגו (ברירת מחדל)</option>
                                        <option value="amber">ענבר (תנ"ך ומקצועות קודש)</option>
                                        <option value="orange">כתום חם (חומש/משנה)</option>
                                        <option value="yellow">צהוב זהב</option>
                                        <option value="blue">כחול עמוק (מתמטיקה ומדע)</option>
                                        <option value="purple">סגול מלכותי (שפות זרות)</option>
                                        <option value="emerald">ירוק ברקת (שפה וספרות)</option>
                                        <option value="cyan">טורקיז</option>
                                        <option value="rose">ורוד ורד</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-400 mr-2 text-right block">יום שבועי</label>
                                    <select 
                                        value={newLesson.day}
                                        onChange={e => setNewLesson({...newLesson, day: e.target.value})}
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-xs"
                                    >
                                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-400 mr-2 text-right block">שעת השיעור</label>
                                    <input 
                                        type="time"
                                        value={newLesson.time}
                                        onChange={e => setNewLesson({...newLesson, time: e.target.value})}
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-400 mr-2 text-right block">סוג הלמידה</label>
                                    <select 
                                        value={newLesson.category}
                                        onChange={e => setNewLesson({...newLesson, category: e.target.value as any})}
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-xs"
                                    >
                                        <option value="regular">שיעור רגיל (מערכת מרכזית)</option>
                                        <option value="alternative">חלופת למידה / תגבור מסייע וחונכות</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-400 mr-2 text-right block">סטטוס התחלתי</label>
                                    <select 
                                        value={newLesson.status}
                                        onChange={e => setNewLesson({...newLesson, status: e.target.value as any})}
                                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-xs"
                                    >
                                        <option value="not_started">טרם התחיל (Not Started)</option>
                                        <option value="in_progress">בתהליך עבודה (In Progress)</option>
                                        <option value="completed">הושלם בהצלחה (Completed)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 mr-2 text-right block">חדר / מיקום השיעור</label>
                                <input 
                                    type="text"
                                    value={newLesson.room}
                                    onChange={e => setNewLesson({...newLesson, room: e.target.value})}
                                    placeholder="כיתה ה'2, ספריה, מרכז למידה טיפולי..."
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 mr-2 text-right block">🎯 יעד פדגוגי/לימודי (Goal)</label>
                                <input 
                                    type="text"
                                    value={newLesson.goal}
                                    onChange={e => setNewLesson({...newLesson, goal: e.target.value})}
                                    placeholder="דוגמה: למידת חצי פרק בבא קמא, שיפור קריאת שפה זרה..."
                                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 mr-2 text-right block">📝 הערות פדגוגיות וסיכום השיבולים</label>
                                <textarea 
                                    value={newLesson.notes}
                                    onChange={e => setNewLesson({...newLesson, notes: e.target.value})}
                                    placeholder="רשמו סיכום ביניים קצר, הערות מיוחדות לתיק פדגוגי או חומרי למידה..."
                                    className="w-full p-4 min-h-[90px] rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-xs"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={saveLesson}
                                className="flex-1 py-4 bg-brand-600 dark:bg-brand-500 text-white rounded-2xl font-black hover:bg-brand-700 transition-all shadow-lg active:scale-95 cursor-pointer"
                            >
                                {editingLessonId ? 'שמור שינויים' : 'הוסף שיעור לימודי'}
                            </button>
                            <button 
                                onClick={() => { setIsModalOpen(false); setEditingLessonId(null); }}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
