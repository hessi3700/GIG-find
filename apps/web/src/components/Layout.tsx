import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-panel">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-slate-900 transition-colors hover:text-primary-600"
          >
            Gig Finder
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Browse
            </Link>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Dashboard
                </Link>
                <Link
                  to="/messages"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Messages
                </Link>
                <span className="ml-2 hidden text-sm text-slate-500 sm:inline">{user.name}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-red-600"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="btn-primary ml-1 px-4 py-2"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Gig Finder. All rights reserved.
            </p>
            <p className="text-sm text-slate-500">
              Built by{' '}
              <a
                href="https://github.com/HessiKz"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary-600 transition-colors hover:text-primary-700 hover:underline"
              >
                HessiKz
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
