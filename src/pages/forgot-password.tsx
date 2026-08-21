import { type FormEvent, useState } from 'react';
import { Link } from 'wouter';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { LogoMark } from '@/components/brand';
import { useSiteSettings } from '@/hooks/use-site-settings';
import { forgotPassword } from '@/lib/api';
import { ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const { siteName, siteTagline } = useSiteSettings();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsBusy(true);
    try {
      await forgotPassword(email.trim());
      // Always show the same success state, whether or not the email
      // has an account - the backend intentionally doesn't reveal that.
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send that right now. Please try again.');
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
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{siteTagline}</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(213_28%_18%_/_0.07)] sm:p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <CheckCircle2 size={32} className="text-[hsl(var(--primary))]" />
              <p className="text-sm text-[hsl(var(--foreground))]">
                If an account exists for <strong>{email.trim()}</strong>, we've sent a link to
                reset the password. Check the inbox (and spam folder).
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="mb-5 text-sm text-[hsl(var(--muted-foreground))]">
                Enter the email on your account and we'll send you a link to reset your password.
              </p>

              <label
                className="block text-xs font-bold uppercase tracking-[0.1em] text-[hsl(var(--muted-foreground))]"
                htmlFor="forgot-email"
              >
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                {isBusy ? 'Sending…' : 'Send reset link'}
                {!isBusy && <ArrowRight size={16} />}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
          <Link href="/login" className="font-semibold text-[hsl(var(--primary))] underline underline-offset-2">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
