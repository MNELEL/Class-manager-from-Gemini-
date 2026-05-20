import { useState } from 'react';
import { Plus, Bell, Check, Trash2, AlertTriangle, BookOpen, Calendar, HelpCircle, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { Student } from '../types';

interface Reminder {
    id: string;
    note: string;
    dueDate: string;
    completed: boolean;
    priority?: 'high' | 'medium' | 'low';
    category?: 'homework' | 'behavior' | 'parent_call' | 'exam' | 'other';
}

export const ReminderManager = ({ 
    student, 
    onUpdateStudent 
}: { 
    student: Student, 
    onUpdateStudent: (updatedStudent: Student) => void 
}) => {
    const [newReminder, setNewReminder] = useState('');
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
    const [category, setCategory] = useState<'homework' | 'behavior' | 'parent_call' | 'exam' | 'other'>('other');
    const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

    const addReminder = () => {
        if (!newReminder.trim()) return;
        const reminderItem: Reminder = {
            id: Date.now().toString(),
            note: newReminder.trim(),
            dueDate: dueDate || new Date().toISOString().split('T')[0],
            completed: false,
            priority,
            category
        };

        const updatedStudent = {
            ...student,
            pedagogicalReminders: [
                ...(student.pedagogicalReminders || []),
                reminderItem
            ]
        };
        onUpdateStudent(updatedStudent);
        setNewReminder('');
        setDueDate(new Date().toISOString().split('T')[0]);
        setPriority('medium');
        setCategory('other');
    };

    const toggleReminder = (id: string) => {
        const updatedStudent = {
            ...student,
            pedagogicalReminders: (student.pedagogicalReminders || []).map(r => 
                r.id === id ? { ...r, completed: !r.completed } : r
            )
        };
        onUpdateStudent(updatedStudent);
    };

    const deleteReminder = (id: string) => {
        const updatedStudent = {
            ...student,
            pedagogicalReminders: (student.pedagogicalReminders || []).filter(r => r.id !== id)
        };
        onUpdateStudent(updatedStudent);
    };

    // Filters & Sorting
    const rawReminders = student.pedagogicalReminders || [];
    const filteredReminders = rawReminders
        .filter((r: any) => {
            const matchesPriority = filterPriority === 'all' || r.priority === filterPriority;
            const matchesStatus = 
                filterStatus === 'all' ? true :
                filterStatus === 'active' ? !r.completed : r.completed;
            return matchesPriority && matchesStatus;
        })
        .sort((a: any, b: any) => {
            // Uncompleted first, then by priority (high > medium > low), then by date
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            const weightA = priorityWeight[a.priority as 'high' | 'medium' | 'low'] || 2;
            const weightB = priorityWeight[b.priority as 'high' | 'medium' | 'low'] || 2;
            if (weightA !== weightB) return weightB - weightA;
            
            return a.dueDate.localeCompare(b.dueDate);
        });

    const getPriorityDetails = (p: string = 'medium') => {
        switch(p) {
            case 'high': return { label: 'דחוף מאוד', color: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-400', badgeDot: 'bg-rose-500' };
            case 'low': return { label: 'בעדיפות נמוכה', color: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/30 dark:border-sky-900 dark:text-sky-400', badgeDot: 'bg-sky-400' };
            default: return { label: 'עדיפות רגילה', color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400', badgeDot: 'bg-amber-500' };
        }
    };

    const getCategoryDetails = (c: string = 'other') => {
        switch(c) {
            case 'homework': return { label: 'שיעורי בית', icon: <BookOpen className="w-3.5 h-3.5" /> };
            case 'behavior': return { label: 'התנהגות', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
            case 'parent_call': return { label: 'שיחת הורים', icon: <MessageSquare className="w-3.5 h-3.5" /> };
            case 'exam': return { label: 'מבחן/מטלה', icon: <Calendar className="w-3.5 h-3.5" /> };
            default: return { label: 'אחר', icon: <HelpCircle className="w-3.5 h-3.5" /> };
        }
    };

    return (
        <div className="space-y-8" dir="rtl">
            <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">תחנת תזכורות פדגוגיות</h3>
                <p className="text-sm font-medium text-slate-400 mt-1">נהלו משימות, שיחות מעקב ותלונות טיפול בשבילו</p>
            </div>

            {/* Quick Add Form */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 space-y-4">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block px-1">תזכורת חדשה</span>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6">
                        <input 
                            type="text"
                            value={newReminder}
                            onChange={(e) => setNewReminder(e.target.value)}
                            placeholder="למשל: לבדוק שקיבל אישור על השאלון..."
                            className="w-full p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <input 
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 font-bold"
                        />
                    </div>
                    <div className="md:col-span-3 flex items-center justify-end">
                        <button 
                            onClick={addReminder} 
                            disabled={!newReminder.trim()}
                            className={cn(
                                "w-full py-4 bg-brand-600 text-white rounded-xl font-black shadow-lg shadow-brand-100 flex items-center justify-center gap-2 hover:bg-brand-700 transition-all cursor-pointer active:scale-95",
                                !newReminder.trim() && "opacity-50 cursor-not-allowed shadow-none"
                            )}
                        >
                            <Plus className="w-5 h-5" />
                            שמור תזכורת
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Priority Selector */}
                    <div className="space-y-1.5 text-right">
                        <label className="text-[10px] font-black text-slate-400 uppercase pr-1">עדיפות / דחיפות</label>
                        <div className="flex gap-2">
                            {(['low', 'medium', 'high'] as const).map(p => {
                                const details = getPriorityDetails(p);
                                return (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={cn(
                                            "flex-1 py-2 text-center rounded-lg border text-xs font-black transition-all cursor-pointer",
                                            priority === p 
                                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-sm" 
                                                : "bg-white dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <span className="flex items-center justify-center gap-1.5">
                                            <span className={cn("w-2 h-2 rounded-full", details.badgeDot)} />
                                            {p === 'high' ? '🚨 דחוף' : p === 'medium' ? '🔔 רגיל' : '💡 נמוך'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-1.5 text-right">
                        <label className="text-[10px] font-black text-slate-400 uppercase pr-1">סיווג המשימה</label>
                        <select
                            value={category}
                            onChange={(e: any) => setCategory(e.target.value)}
                            className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-white outline-none"
                        >
                            <option value="homework">📝 שיעורי בית</option>
                            <option value="behavior">⚠️ התנהגות ואינטראקציה</option>
                            <option value="parent_call">📞 שיחת טלפון להורים</option>
                            <option value="exam">📅 הכנה למבחן / הגשות</option>
                            <option value="other">📎 נושא כללי אחר</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap gap-4 items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase">תצוגה:</span>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {(['all', 'active', 'completed'] as any[]).map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                                    filterStatus === s 
                                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {s === 'all' ? 'הכל' : s === 'active' ? 'לבצע' : 'הושלמו'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase">עדיפות:</span>
                    <select
                        value={filterPriority}
                        onChange={(e: any) => setFilterPriority(e.target.value)}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold outline-none text-slate-600 dark:text-slate-350"
                    >
                        <option value="all">כל הרמות</option>
                        <option value="high">🚨 דחופות בלבד</option>
                        <option value="medium">🔔 רגילות בלבד</option>
                        <option value="low">💡 נמוכות בלבד</option>
                    </select>
                </div>
            </div>

            {/* Reminders List */}
            <div className="space-y-3">
                {filteredReminders.length > 0 ? (
                    filteredReminders.map((reminder: any) => {
                        const prio = getPriorityDetails(reminder.priority);
                        const cat = getCategoryDetails(reminder.category);
                        return (
                            <div key={reminder.id} className={cn(
                                "flex items-center justify-between p-5 rounded-3xl border-2 transition-all relative overflow-hidden group shadow-sm",
                                reminder.completed 
                                    ? "bg-slate-50/50 border-slate-100 dark:bg-slate-900/10 dark:border-slate-900/30 opacity-60" 
                                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:shadow-md"
                            )}>
                                <div className="flex items-center gap-4 relative z-10 flex-1 min-w-0">
                                    <button 
                                        onClick={() => toggleReminder(reminder.id)} 
                                        className={cn(
                                            "w-7 h-7 rounded-xl flex items-center justify-center transition-all border-2 cursor-pointer",
                                            reminder.completed 
                                                ? "bg-emerald-500 border-emerald-500 text-white" 
                                                : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-brand-500 text-transparent hover:text-brand-500"
                                        )}
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <div className="space-y-1.5 flex-1 min-w-0 text-right">
                                        <p className={cn(
                                            "font-black text-slate-800 dark:text-white leading-tight pr-1",
                                            reminder.completed && "line-through text-slate-400 dark:text-slate-500"
                                        )}>
                                            {reminder.note}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Due Date */}
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                <Calendar className="w-3 h-3" />
                                                עד: {new Date(reminder.dueDate).toLocaleDateString('he-IL')}
                                            </span>

                                            {/* Priority Badge */}
                                            <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black border", prio.color)}>
                                                {prio.label}
                                            </span>

                                            {/* Category Tag */}
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold border border-slate-200/50 dark:border-slate-700/50">
                                                {cat.icon}
                                                {cat.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => deleteReminder(reminder.id)} 
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer mr-3"
                                    title="מחק תזכורת"
                                >
                                    <Trash2 className="w-4.5 h-4.5" />
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] opacity-60">
                        <Bell className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="text-sm font-black text-slate-400">אין תזכורות העונות על הפילטר שנבחר</p>
                        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">מלאו את הטופס למעלה כדי לרשום תזכורת מעקב חדשה</p>
                    </div>
                )}
            </div>
        </div>
    );
};
