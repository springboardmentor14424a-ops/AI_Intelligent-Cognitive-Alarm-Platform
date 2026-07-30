import { FiChevronRight } from "react-icons/fi";

export default function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-ink-900/50 dark:text-white/40 mb-1">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className={i === items.length - 1 ? "text-ink-900 dark:text-white font-medium" : ""}>{item}</span>
          {i < items.length - 1 && <FiChevronRight className="w-3.5 h-3.5" />}
        </span>
      ))}
    </nav>
  );
}
