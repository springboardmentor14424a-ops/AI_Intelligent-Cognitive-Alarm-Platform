import React, { useState } from 'react';
import { Sparkles, Send, CheckCircle2 } from 'lucide-react';

const CoachRecommendationsPage = () => {
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const recommendations = [
    { student: 'Alex Rivera', rec: 'Maintain 06:30 AM wake-up schedule. Increase Math challenge equations to 3 steps.', status: 'Sent' },
    { student: 'John Carter', rec: 'Aim for bedtime by 11:00 PM tonight to reduce snooze attempts on morning alarm.', status: 'Sent' },
    { student: 'Sarah Lee', rec: 'Congratulations on 96% wake-up consistency! Moving challenge difficulty to Medium.', status: 'Pending Review' }
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI & Coach Recommendations</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Review personalized guidance and dispatch wake-up recommendations to students.
        </p>
      </div>

      <div className="space-y-3">
        {recommendations.map((r, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <strong className="text-slate-900 text-sm">{r.student}</strong>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                {r.status}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              "{r.rec}"
            </p>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => showNotice(`Recommendation re-sent to ${r.student}`)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Re-Send Recommendation
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoachRecommendationsPage;
