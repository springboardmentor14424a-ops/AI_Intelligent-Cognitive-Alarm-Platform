import Logo from "./Logo";
import { FiTwitter, FiGithub, FiLinkedin } from "react-icons/fi";

export default function Footer() {
  return (
    <footer className="border-t border-ink-100 dark:border-white/5 mt-24">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Logo size="sm" />
          <p className="text-sm text-ink-900/50 dark:text-white/40 mt-3 max-w-xs">
            A wake-up system that trains your mind while it gets you out of bed.
          </p>
          <div className="flex gap-3 mt-4">
            {[FiTwitter, FiGithub, FiLinkedin].map((Icon, i) => (
              <a key={i} href="#" className="w-8 h-8 rounded-lg bg-ink-100 dark:bg-white/5 flex items-center justify-center hover:bg-ink-200 dark:hover:bg-white/10 transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="font-display font-semibold text-sm mb-3">Product</p>
          <ul className="space-y-2 text-sm text-ink-900/50 dark:text-white/40">
            <li><a href="#features" className="hover:text-ink-900 dark:hover:text-white">Features</a></li>
            <li><a href="#stats" className="hover:text-ink-900 dark:hover:text-white">Results</a></li>
            <li><a href="#testimonials" className="hover:text-ink-900 dark:hover:text-white">Stories</a></li>
          </ul>
        </div>

        <div>
          <p className="font-display font-semibold text-sm mb-3">Company</p>
          <ul className="space-y-2 text-sm text-ink-900/50 dark:text-white/40">
            <li><a href="#" className="hover:text-ink-900 dark:hover:text-white">About</a></li>
            <li><a href="#" className="hover:text-ink-900 dark:hover:text-white">Careers</a></li>
            <li><a href="#" className="hover:text-ink-900 dark:hover:text-white">Contact</a></li>
          </ul>
        </div>

        <div>
          <p className="font-display font-semibold text-sm mb-3">Legal</p>
          <ul className="space-y-2 text-sm text-ink-900/50 dark:text-white/40">
            <li><a href="#" className="hover:text-ink-900 dark:hover:text-white">Privacy</a></li>
            <li><a href="#" className="hover:text-ink-900 dark:hover:text-white">Terms</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100 dark:border-white/5 py-6 text-center text-xs text-ink-900/40 dark:text-white/30">
        © 2026 Cogniwake. All rights reserved.
      </div>
    </footer>
  );
}
