import React from 'react';
import { FiInbox } from 'react-icons/fi';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction,
}) => {
  return (
    <div className="glass-panel p-8 text-center rounded-2xl border border-slate-800 flex flex-col items-center justify-center my-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mb-4 border border-slate-700">
        {icon || <FiInbox className="w-7 h-7" />}
      </div>
      <h4 className="text-lg font-bold text-white">{title}</h4>
      <p className="text-sm text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/20"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
