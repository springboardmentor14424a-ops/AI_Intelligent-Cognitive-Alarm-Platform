import React from 'react';

const RecommendationCard = ({ title, icon: Icon, items = [], text }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold text-sm">
        {Icon && <Icon className="w-4 h-4 text-blue-600" />}
        <span>{title}</span>
      </div>

      {/* Direct Text or Bullet Items */}
      {text && (
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
          {text}
        </p>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="text-xs sm:text-sm text-slate-600 flex items-start gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RecommendationCard;
