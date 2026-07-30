import React from 'react';
import CoachTopBar from '../components/CoachTopBar';
import CoachSidebar from '../components/CoachSidebar';

const CoachLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1F2937] flex flex-col font-sans">
      {/* Top Bar */}
      <CoachTopBar />

      {/* Sidebar + Main Content Layout */}
      <div className="flex-1 flex max-w-[1400px] w-full mx-auto">
        <CoachSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CoachLayout;
