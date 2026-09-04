import React from 'react';
import { FiCheckCircle, FiHeart } from 'react-icons/fi';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Intelligent Cognitive Alarm Platform</span>


        </div>


      </div>
    </footer>
  );
};
