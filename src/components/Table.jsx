import React from 'react';

const Table = ({ headers, data, type }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              {headers.map((header, idx) => (
                <th key={idx} className="py-3 px-4 sm:px-6 font-semibold text-slate-600 text-xs tracking-wider uppercase">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} className="even:bg-slate-50/50 hover:bg-slate-100/40 transition-colors">
                
                {/* 1. User Dashboard Alarms Table */}
                {type === 'alarms' && (
                  <>
                    <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900">{row.time}</td>
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-700">{row.challenge}</td>
                    <td className="py-3.5 px-4 sm:px-6 text-slate-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {row.status}
                      </span>
                    </td>
                  </>
                )}

                {/* 2. Wellness Coach Users Table */}
                {type === 'coach-users' && (
                  <>
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center border border-blue-200">
                        {row.name.charAt(0)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">{row.name}</td>
                    <td className="py-3.5 px-4 sm:px-6 text-slate-700">{row.wakeTime}</td>
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-800">{row.habitScore}</td>
                    <td className="py-3.5 px-4 sm:px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          row.risk === 'Low'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : row.risk === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {row.risk}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 sm:px-6">
                      <button 
                        onClick={() => alert(`Viewing details for ${row.name}`)}
                        className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-medium text-xs rounded-md transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </>
                )}

                {/* 3. Admin Recent Activities Table */}
                {type === 'activities' && (
                  <>
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-500">{row.time}</td>
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-800">{row.activity}</td>
                  </>
                )}

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
