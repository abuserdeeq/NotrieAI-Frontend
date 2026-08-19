import { type FormEvent, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { LogoMark } from '@/components/brand';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { useSiteBranding } from '@/hooks/use-site-branding';

export default function LoginPage() {
  const { login } = useAuth();
  const { siteName } = useSiteBranding();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsBusy(true);
    try {
      await login(email.trim(), password);
      setLocation('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log in. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="notrie-app paper-grain flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="fade-up w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoMark />
          <div>
            <p className="font-serif text-[22px] font-semibold tracking-[-0.03em] text-[hsl(var(--primary))]">
              {siteName}
            </p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Welcome back. Log in to continue.</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(213_28%_18%_/_0.07)] sm:p-8"
        >
          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3 text-[15px] text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]"
          />

          <label
            className="mt-5 block text-xs font-bold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]"
            htmlFor="login-password"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3 text-[15px] text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]"
          />

          {error && (
            <div className="mt-4 flex items-start gap-2 text-sm text-[hsl(var(--destructive))]" role="alert">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--accent))] px-6 text-sm font-bold text-[hsl(var(--accent-foreground))] shadow-[0_8px_20px_hsl(39_93%_62%_/_0.2)] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          >
            {isBusy ? <Loader2 size={17} className="animate-spin" /> : null}
            {isBusy ? 'Logging in…' : 'Log in'}
            {!isBusy && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
          New here?{' '}
          <Link href="/signup" className="font-semibold text-[hsl(var(--primary))] underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
