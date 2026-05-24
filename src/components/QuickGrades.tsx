
import React from 'react';
import { cn } from '../lib/utils';
import { Student } from '../types';

export const QuickGrades = ({ student, updateStudent }: { student: Student, updateStudent: (f: string, v: any) => void }) => {
    return (
        <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800">
            <h4 className="font-bold mb-4 text-slate-700 dark:text-slate-200">הזנת ציון שבועי מהיר</h4>
            <div className="flex gap-2">
                <input type="text" placeholder="שבוע" id="weekly-week" className="flex-1 p-2 rounded-lg border" />
                <input type="text" placeholder="מקצוע" id="weekly-subject" className="flex-1 p-2 rounded-lg border" />
                <input type="number" placeholder="ציון" id="weekly-grade" className="w-20 p-2 rounded-lg border" />
                <button onClick={() => {
                   const week = (document.getElementById('weekly-week') as HTMLInputElement).value;
                   const subject = (document.getElementById('weekly-subject') as HTMLInputElement).value;
                   const grade = parseInt((document.getElementById('weekly-grade') as HTMLInputElement).value);
                   if (week && subject && !isNaN(grade)) {
                       updateStudent('weeklyGrades', [...(student.weeklyGrades || []), { week, subject, grade }]);
                   }
                }} className="bg-brand-600 text-white px-4 rounded-lg font-bold">+</button>
            </div>
            <div className="mt-4 space-y-2">
                {(student.weeklyGrades || []).slice(-5).map((wg: any, i: number) => (
                    <div key={i} className="flex justify-between p-2 bg-white rounded-lg border border-slate-100">
                        <span>{wg.week} - {wg.subject}</span>
                        <span className="font-bold">{wg.grade}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
