import React from 'react';

const StatCard = ({ title, value, subtext, buttonText, onButtonClick, icon: Icon, badgeColor = 'bg-blue-50 text-blue-600' }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full group">
      <div>
        {/* Card Header: Title & Icon */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
          {Icon && (
            <div className={`p-2 rounded-lg ${badgeColor} transition-transform group-hover:scale-105`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Card Main Stat Value */}
        <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight my-1">
          {value}
        </div>

        {/* Subtext / Tag */}
        {subtext && (
          <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
            {subtext}
          </p>
        )}
      </div>

      {/* Optional Action Button */}
      {buttonText && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={onButtonClick}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors duration-150 shadow-xs flex items-center justify-center gap-1"
          >
            {buttonText}
          </button>
        </div>
      )}
    </div>
  );
};

export default StatCard;
