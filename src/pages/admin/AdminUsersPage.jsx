import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Eye, Edit3, UserX, CheckCircle2 } from 'lucide-react';

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const usersList = [
    { id: '1', name: 'Alex Rivera', role: 'Student', email: 'alex@alarm.io', status: 'Active', lastLogin: '10 min ago' },
    { id: '2', name: 'Dr. Aris Thorne', role: 'Coach', email: 'coach@alarm.io', status: 'Active', lastLogin: '1 hour ago' },
    { id: '3', name: 'System Ops Lead', role: 'Administrator', email: 'admin@alarm.io', status: 'Active', lastLogin: 'Just now' },
    { id: '4', name: 'John Carter', role: 'Student', email: 'john@alarm.io', status: 'Active', lastLogin: '3 hours ago' },
    { id: '5', name: 'Sarah Lee', role: 'Student', email: 'sarah@alarm.io', status: 'Active', lastLogin: 'Yesterday' }
  ];

  const filtered = usersList.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform User Directory</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage system users, assign roles (Student, Coach, Admin), and configure access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button 
            onClick={() => showNotice('Add User modal opened')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 tracking-wider uppercase">
                <th className="py-3 px-4 sm:px-6">Avatar</th>
                <th className="py-3 px-4 sm:px-6">Name</th>
                <th className="py-3 px-4 sm:px-6">Role</th>
                <th className="py-3 px-4 sm:px-6">Status</th>
                <th className="py-3 px-4 sm:px-6">Last Login</th>
                <th className="py-3 px-4 sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr key={row.id} className="even:bg-slate-50/50 hover:bg-slate-100/40 transition-colors">
                  <td className="py-3 px-4 sm:px-6">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center border border-blue-200">
                      {row.name.charAt(0)}
                    </div>
                  </td>
                  <td className="py-3 px-4 sm:px-6 font-semibold text-slate-900">{row.name}</td>
                  <td className="py-3 px-4 sm:px-6">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      row.role === 'Student' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      row.role === 'Coach' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {row.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 sm:px-6">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 sm:px-6 text-slate-500">{row.lastLogin}</td>
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => navigate(`/admin/user/${row.id}`)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-xs transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button 
                        onClick={() => showNotice(`Editing user ${row.name}`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button 
                        onClick={() => showNotice(`Disabled user ${row.name}`)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium text-xs rounded-md transition-colors flex items-center gap-1"
                      >
                        <UserX className="w-3 h-3" /> Disable
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;
