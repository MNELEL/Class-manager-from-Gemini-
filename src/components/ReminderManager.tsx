import { useState } from 'react';
import { Plus, Bell, Check, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Student } from '../types';

export const ReminderManager = ({ 
    student, 
    onUpdateStudent 
}: { 
    student: Student, 
    onUpdateStudent: (updatedStudent: Student) => void 
}) => {
    const [newReminder, setNewReminder] = useState('');
    const [dueDate, setDueDate] = useState('');

    const addReminder = () => {
        if (!newReminder) return;
        const updatedStudent = {
            ...student,
            pedagogicalReminders: [
                ...(student.pedagogicalReminders || []),
                {
                    id: Date.now().toString(),
                    note: newReminder,
                    dueDate: dueDate || new Date().toISOString().split('T')[0],
                    completed: false
                }
            ]
        };
        onUpdateStudent(updatedStudent);
        setNewReminder('');
        setDueDate('');
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

    return (
        <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">תזכורות פדגוגיות</h3>
            
            <div className="flex gap-2">
                <input 
                    type="text"
                    value={newReminder}
                    onChange={(e) => setNewReminder(e.target.value)}
                    placeholder="הוסף תזכורת..."
                    className="flex-1 p-3 rounded-xl border border-slate-200"
                />
                <input 
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="p-3 rounded-xl border border-slate-200"
                />
                <button onClick={addReminder} className="p-3 bg-brand-500 text-white rounded-xl">
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-2">
                {(student.pedagogicalReminders || []).map(reminder => (
                    <div key={reminder.id} className={cn(
                        "flex items-center justify-between p-4 rounded-xl border",
                        reminder.completed ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-200"
                    )}>
                        <div className="flex items-center gap-3">
                            <button onClick={() => toggleReminder(reminder.id)} className={cn(
                                "p-2 rounded-lg",
                                reminder.completed ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                            )}>
                                <Check className="w-4 h-4" />
                            </button>
                            <div>
                                <p className={cn("font-medium", reminder.completed && "line-through")}>{reminder.note}</p>
                                <p className="text-xs text-slate-400">{reminder.dueDate}</p>
                            </div>
                        </div>
                        <button onClick={() => deleteReminder(reminder.id)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
