import React from 'react';
import AdminTopBar from '../components/AdminTopBar';
import AdminSidebar from '../components/AdminSidebar';

const AdminLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1F2937] flex flex-col font-sans">
      {/* Top Bar */}
      <AdminTopBar />

      {/* Sidebar + Main Content Layout */}
      <div className="flex-1 flex max-w-[1400px] w-full mx-auto">
        <AdminSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
