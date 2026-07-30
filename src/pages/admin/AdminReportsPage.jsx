import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, Calendar } from 'lucide-react';

const AdminReportsPage = () => {
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const reports = [
    { title: 'Daily Platform Activity & Alarm Log', timeframe: 'Daily Report', file: 'PDF' },
    { title: 'Weekly Cohort Wakefulness & Habit Index Summary', timeframe: 'Weekly Report', file: 'PDF' },
    { title: 'Monthly Cognitive Challenge Solver Metrics', timeframe: 'Monthly Report', file: 'Excel' }
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{notice}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Reports & Audit Logs</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Generate system-wide analytics, user audit logs, and compliance report bundles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map((r, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  {r.timeframe}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{r.title}</h3>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button 
                onClick={() => showNotice(`Exporting PDF: ${r.title}`)}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
              <button 
                onClick={() => showNotice(`Exporting Excel: ${r.title}`)}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Export Excel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminReportsPage;
