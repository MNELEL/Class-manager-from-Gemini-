
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export const BehaviorTimeline = ({ logs }: { logs: any[] }) => {
    const data = logs.map(l => ({
        timestamp: new Date(l.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        value: ['excellence', 'good_learning', 'correct_seating', 'success_campaign'].includes(l.categoryId) ? 1 : -1,
        category: l.categoryId
    })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return (
        <div className="h-64 w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h4 className="font-black text-slate-800 dark:text-white mb-4">ציר זמן התנהגות</h4>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <XAxis dataKey="timestamp" />
                    <YAxis ticks={[-1, 0, 1]} domain={[-1.5, 1.5]} hide />
                    <Tooltip />
                    <ReferenceLine y={0} stroke="#cbd5e1" />
                    <Line type="step" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
