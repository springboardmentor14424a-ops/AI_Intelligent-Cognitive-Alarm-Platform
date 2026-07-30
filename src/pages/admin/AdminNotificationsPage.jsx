import React, { useState } from 'react';
import { Megaphone, Plus, CheckCircle2, Send } from 'lucide-react';

const AdminNotificationsPage = () => {
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const announcements = [
    { title: 'Scheduled Infrastructure Maintenance', text: 'System maintenance scheduled on Sunday from 02:00 AM to 04:00 AM EST.', date: 'Today' },
    { title: 'New Challenge Pack Release', text: 'New challenge pack (Anagram Word Games) added to Challenge Library.', date: 'Yesterday' },
    { title: 'Wellness Coach Portal Upgrade', text: 'Wellness Coach dashboard UI updated with Student Details monitoring.', date: '25 Jul' }
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{notice}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Notifications & Broadcasts</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage system announcements and push global notifications to all platform roles.
          </p>
        </div>

        <button 
          onClick={() => showNotice('Create Announcement modal opened')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      <div className="space-y-3">
        {announcements.map((ann, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">{ann.title}</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">{ann.date}</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">{ann.text}</p>
            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => showNotice(`Broadcast re-sent for: ${ann.title}`)}
                className="px-3 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-medium text-xs rounded-lg transition-colors flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> Re-broadcast
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
