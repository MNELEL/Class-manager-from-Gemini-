import React, { useMemo } from 'react';
import { Bell, Gift, Clock } from 'lucide-react';

export const PersistentAlerts = ({ currentConfig }: { currentConfig: any }) => {
    const alerts = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const upcomingDays = 3;
        const alertsList: any[] = [];

        currentConfig.students.forEach((s: any) => {
            // Birthdays
            if (s.birthday && s.birthday.endsWith(today.slice(5))) {
                alertsList.push({ type: 'birthday', message: `יום הולדת שמח ל${s.name} היום! 🎉`, icon: <Gift className="w-4 h-4" /> });
            }

            // Tasks
            (s.tasks || []).filter((t: any) => t.status === 'pending' && t.dueDate && t.dueDate <= today).forEach((t: any) => {
                alertsList.push({ type: 'task', message: `דד-ליין למטלה של ${s.name}: ${t.title}`, icon: <Clock className="w-4 h-4" /> });
            });
        });
        return alertsList;
    }, [currentConfig]);

    if (alerts.length === 0) return null;

    return (
        <div className="fixed top-0 inset-x-0 z-[1000] p-4 pointer-events-none">
            <div className="max-w-4xl mx-auto flex flex-col gap-2 pointer-events-auto">
                {alerts.map((alert, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white dark:bg-slate-900 border-2 border-brand-200 dark:border-brand-800 p-4 rounded-2xl shadow-xl shadow-brand-500/10">
                        <div className="text-brand-600">{alert.icon}</div>
                        <span className="font-bold text-slate-800 dark:text-white">{alert.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
