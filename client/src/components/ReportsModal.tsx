import React, { useState } from 'react';
import { FiFileText, FiDownload, FiX, FiPrinter, FiCheck, FiPieChart } from 'react-icons/fi';
import axios from 'axios';

export interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose }) => {
  const [reportType, setReportType] = useState<string>('full_comprehensive');
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateView = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      const res = await axios.get(`/api/reports/view?type=${reportType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (_err: any) {
      setError('Failed to load report view. Falling back to local data.');
      setReportData({
        reportId: `REP-${Date.now()}`,
        title: 'Executive Cognitive Performance Report',
        generatedAt: new Date().toLocaleString(),
        summary: 'Habit score is 86/100 (Optimal). Morning wake-up consistency at 88%.',
        metrics: {
          overallHabitScore: 86,
          wakeUpConsistency: '88%',
          challengeAccuracy: '85%',
          snoozeReduction: '82%',
        },
        tableData: [
          { day: 'Mon', habitScore: 78, wakeUpMinutesDelay: 4, challengeAccuracy: 80 },
          { day: 'Tue', habitScore: 82, wakeUpMinutesDelay: 2, challengeAccuracy: 85 },
          { day: 'Wed', habitScore: 85, wakeUpMinutesDelay: 3, challengeAccuracy: 88 },
          { day: 'Thu', habitScore: 80, wakeUpMinutesDelay: 5, challengeAccuracy: 82 },
          { day: 'Fri', habitScore: 88, wakeUpMinutesDelay: 1, challengeAccuracy: 90 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'pdf' | 'json') => {
    const token = localStorage.getItem('token');
    const url = `/api/reports/export?type=${reportType}&format=${format}`;
    
    if (format === 'csv' || format === 'pdf') {
      window.open(url, '_blank');
    } else {
      axios
        .get(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
          const href = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = href;
          link.download = `${reportType}_report.json`;
          link.click();
        })
        .catch(() => alert('Export failed. Please check backend connection.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FiFileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Performance Reports Center</h2>
              <p className="text-xs text-slate-400">Generate, view, and export behavioral telemetry documents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="full_comprehensive">Executive Full Comprehensive Report</option>
                <option value="habit_performance">Habit Adherence & Streak Performance</option>
                <option value="wake_up_performance">Wake-Up Consistency & Verification Log</option>
                <option value="challenge_performance">Cognitive Challenge Engine Analytics</option>
                <option value="sleep_analytics">Sleep Schedule & Snooze Reduction Log</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerateView}
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-cyan-500/20"
              >
                <FiPieChart className="w-4 h-4" />
                {loading ? 'Generating...' : 'View Report'}
              </button>
            </div>
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">{error}</div>}

          {/* Report Viewer */}
          {reportData ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-2">
                <div>
                  <h3 className="text-base font-bold text-cyan-400">{reportData.title}</h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Report ID: {reportData.reportId} | Generated: {reportData.generatedAt}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport('csv')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <FiDownload className="w-3.5 h-3.5" /> CSV
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-cyan-500/30 transition-colors"
                  >
                    <FiPrinter className="w-3.5 h-3.5" /> Printable HTML/PDF
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-300 bg-slate-900 p-4 rounded-lg border border-slate-800/80 leading-relaxed">
                {reportData.summary}
              </p>

              {/* Metrics Grid */}
              {reportData.metrics && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Telemetry Metrics
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(reportData.metrics).map(([key, value]: any) => (
                      <div key={key} className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                        <div className="text-[11px] text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                        <div className="text-lg font-bold text-slate-100 mt-1">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table Data */}
              {reportData.tableData && reportData.tableData.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Historical Breakdown Data
                  </h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                        <tr>
                          {Object.keys(reportData.tableData[0]).map((h) => (
                            <th key={h} className="px-4 py-2.5">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                        {reportData.tableData.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            {Object.values(row).map((val: any, i: number) => (
                              <td key={i} className="px-4 py-2.5 font-mono">
                                {val?.toString()}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
              Click <strong className="text-cyan-400">"View Report"</strong> to generate telemetry preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
