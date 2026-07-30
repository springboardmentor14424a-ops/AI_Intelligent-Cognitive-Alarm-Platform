import { FiSearch } from "react-icons/fi";

export default function SearchBar({ placeholder = "Search…" }) {
  return (
    <div className="relative hidden md:block w-full max-w-xs">
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-900/30 dark:text-white/30" />
      <input
        type="text"
        placeholder={placeholder}
        className="input-field pl-9 py-2 text-sm"
        aria-label="Search"
      />
    </div>
  );
}
