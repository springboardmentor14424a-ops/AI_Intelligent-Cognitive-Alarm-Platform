import React, { useState, useEffect } from 'react';
import { FiBell, FiCheckCircle, FiMoon, FiClock, FiTarget, FiZap, FiX, FiCheck } from 'react-icons/fi';
import axios from 'axios';

export interface AppNotification {
  id: string;
  type: 'bedtime' | 'wakeup' | 'habit' | 'challenge' | 'coaching' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  scheduledFor: string;
  createdAt: string;
}

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch (_err) {
      // Fallback local notifications
      setNotifications([
        {
          id: '1',
          type: 'bedtime',
          title: 'Digital Sunset Reminder',
          message: 'Screen cutoff recommended at 10:15 PM for optimal REM recovery.',
          isRead: false,
          scheduledFor: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'wakeup',
          title: 'Smart Alarm Set',
          message: 'Tomorrow wake-up at 07:00 AM with Adaptive Logic Challenge.',
          isRead: false,
          scheduledFor: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ]);
      setUnreadCount(2);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (_err) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (_err) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'bedtime':
        return <FiMoon className="w-4 h-4 text-purple-400" />;
      case 'wakeup':
        return <FiClock className="w-4 h-4 text-cyan-400" />;
      case 'habit':
        return <FiTarget className="w-4 h-4 text-emerald-400" />;
      case 'challenge':
        return <FiZap className="w-4 h-4 text-amber-400" />;
      default:
        return <FiCheckCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
        title="Notifications"
      >
        <FiBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-850 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FiBell className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-100">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                >
                  <FiCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">No notifications yet.</div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 transition-colors flex items-start gap-3 ${
                    item.isRead ? 'bg-slate-900/40 opacity-75' : 'bg-slate-800/40'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 mt-0.5">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-semibold text-slate-200">{item.title}</h4>
                      {!item.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(item.id)}
                          className="text-[10px] text-cyan-400 hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{item.message}</p>
                    <span className="text-[9px] text-slate-500 block mt-2 font-mono">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
