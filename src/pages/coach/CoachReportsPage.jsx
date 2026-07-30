import React, { useState } from 'react';
import { FileText, Download, CheckCircle2 } from 'lucide-react';

const CoachReportsPage = () => {
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const reports = [
    { title: 'Weekly Cohort Habit Performance Report', date: 'July 28, 2026', type: 'PDF' },
    { title: 'High-Risk Snooze Vulnerability Analysis', date: 'July 25, 2026', type: 'PDF' },
    { title: 'Cognitive Challenge Solver Accuracy Summary', date: 'July 20, 2026', type: 'XLSX' }
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Reports & Analytics</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Generate formatted cohort progress summaries for review and client distribution.
        </p>
      </div>

      <div className="space-y-3">
        {reports.map((r, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{r.title}</h3>
                <span className="text-xs text-slate-500">Generated on {r.date} • {r.type} Format</span>
              </div>
            </div>

            <button 
              onClick={() => showNotice(`Downloading ${r.title}...`)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoachReportsPage;
