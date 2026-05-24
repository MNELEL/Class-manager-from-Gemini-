import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

export const CentralCalendar = ({ students }: { students: any[] }) => {
    // Gather all events and tasks
    const allItems = students.flatMap(s => [
        ...(s.tasks || []).map((t: any) => ({ ...t, type: 'משימה', studentName: s.name })),
        ...(s.events || []).map((e: any) => ({ ...e, type: 'אירוע', studentName: s.name }))
    ]);

    return (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black mb-4 flex items-center gap-2"><CalendarIcon /> לוח שנה מרכזי</h3>
            <div className="space-y-4">
                {allItems.sort((a,b) => new Date(a.dueDate || a.date).getTime() - new Date(b.dueDate || b.date).getTime()).map((item, i) => (
                    <div key={i} className="p-3 border-b flex justify-between">
                        <div>
                            <p className="font-bold">{item.title || item.note}</p>
                            <p className="text-sm text-slate-500">{item.studentName} | {item.type}</p>
                        </div>
                        <p className="text-sm">{new Date(item.dueDate || item.date).toLocaleDateString('he-IL')}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
