import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import Logo from "../../components/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-aurora flex flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="font-mono text-8xl font-bold mt-8 bg-clip-text text-transparent bg-brand-gradient">404</p>
      <h1 className="font-display text-2xl font-semibold mt-4">This alarm didn't go off</h1>
      <p className="text-ink-900/60 dark:text-white/50 mt-2 max-w-sm">
        The page you're looking for doesn't exist, or may have moved.
      </p>
      <Link to="/" className="btn-primary mt-8">
        <FiArrowLeft className="w-4 h-4" /> Back to home
      </Link>
    </div>
  );
}
