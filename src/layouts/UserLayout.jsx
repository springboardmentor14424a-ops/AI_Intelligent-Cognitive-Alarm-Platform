import React from 'react';
import UserTopBar from '../components/UserTopBar';
import UserSidebar from '../components/UserSidebar';

const UserLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1F2937] flex flex-col font-sans">
      {/* Top Bar */}
      <UserTopBar />

      {/* Sidebar + Main Content Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <UserSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default UserLayout;
