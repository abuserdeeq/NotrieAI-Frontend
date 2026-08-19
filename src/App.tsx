import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LogoMark } from '@/components/brand';
import { AdminRoute, ProtectedRoute } from '@/components/protected-route';
import NotFound from '@/pages/not-found';
import LoginPage from '@/pages/login';
import SignupPage from '@/pages/signup';
import AdminSettingsPage from '@/pages/admin-settings';
import { AuthProvider, useAuth } from '@/lib/auth';
import {
  deleteHistoryItem,
  explainRequest,
  getHealth,
  getHistory,
  getPublicSettings,
  type ExplainResult,
  type AnalysisHistoryItem,
} from '@/lib/api';
import { applyThemeFromSettings } from '@/lib/theme';
import { useSiteSettings } from '@/hooks/use-site-settings';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clipboard,
  Copy,
  FileText,
  Image as ImageIcon,
  Info,
  Lightbulb,
  ListChecks,
  Menu,
  History,
  Trash2,
  Loader2,
  LogOut,
  RotateCcw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  Link,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

type Mode = 'text' | 'image';

const VERDICT_META: Record<
  ExplainResult['verdict'],
  { label: string; icon: typeof ShieldCheck; className: string }
> = {
  safe: {
    label: 'Safe',
    icon: ShieldCheck,
    className: 'bg-[hsl(140_40%_94%)] text-[hsl(140_45%_28%)] border-[hsl(140_40%_78%)]',
  },
  suspicious: {
    label: 'Suspicious',
    icon: AlertCircle,
    className: 'bg-[hsl(43_90%_94%)] text-[hsl(30_60%_32%)] border-[hsl(43_80%_78%)]',
  },
  likely_scam: {
    label: 'Likely Scam',
    icon: ShieldAlert,
    className: 'bg-[hsl(6_70%_95%)] text-[hsl(6_60%_36%)] border-[hsl(6_60%_80%)]',
  },
  needs_clarification: {
    label: 'Needs Clarification',
    icon: Info,
    className: 'bg-[hsl(213_30%_95%)] text-[hsl(213_35%_32%)] border-[hsl(213_25%_80%)]',
  },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: typeof BookOpen;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
        <Icon size={17} strokeWidth={1.8} />
      </div>
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
          {eyebrow}
        </p>
        <h3 className="mt-1 font-serif text-[22px] leading-tight text-[hsl(var(--foreground))]">
          {title}
        </h3>
      </div>
    </div>
  );
}

function VerdictBanner({ verdict, reason }: { verdict: ExplainResult['verdict']; reason: string }) {
  const meta = VERDICT_META[verdict];
  const Icon = meta.icon;
  return (
    <div
      data-testid="banner-verdict"
      className={`mb-7 flex items-start gap-3 rounded-2xl border px-5 py-4 ${meta.className}`}
    >
      <Icon size={20} className="mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-bold" data-testid="text-verdict-label">{meta.label}</p>
        <p className="mt-0.5 text-sm leading-5 opacity-90" data-testid="text-verdict-reason">{reason}</p>
      </div>
    </div>
  );
}

function ResultView({
  result,
  onStartOver,
}: {
  result: ExplainResult;
  onStartOver: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyText = useMemo(
    () =>
      [
        `VERDICT: ${VERDICT_META[result.verdict].label}`,
        result.verdict_reason,
        '',
        'IN PLAIN WORDS',
        result.summary,
        '',
        'KEY POINTS',
        ...result.key_points.map((point) => `• ${point}`),
        '',
        'WORDS TO KNOW',
        ...result.confusing_terms.map(
          (item) => `${item.term}: ${item.explanation}`,
        ),
        '',
        'WHAT YOU SHOULD DO',
        ...result.what_you_should_do.map((item) => `• ${item}`),
      ].join('\n'),
    [result],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="fade-up mx-auto w-full max-w-[1060px]" aria-live="polite">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--accent-foreground))]">
            Your clear copy
          </p>
          <h2 className="mt-2 font-serif text-[clamp(2.2rem,5vw,4.15rem)] leading-[0.98] tracking-[-0.045em] text-[hsl(var(--primary))]">
            Here&apos;s what it means.
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            data-testid="button-copy-result"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-sm font-semibold text-[hsl(var(--foreground))] transition-transform hover:-translate-y-0.5 hover:border-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy all'}
          </button>
          <button
            type="button"
            onClick={onStartOver}
            data-testid="button-new-document"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          >
            <RotateCcw size={15} />
            New document
          </button>
        </div>
      </div>

      <VerdictBanner verdict={result.verdict} reason={result.verdict_reason} />

      <div className="grid gap-4 lg:grid-cols-[1.22fr_0.78fr]">
        <article className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(213_28%_18%_/_0.07)] sm:p-8">
          <SectionHeading icon={BookOpen} eyebrow="01 / the gist" title="Summary" />
          <p
            data-testid="text-result-summary"
            className="max-w-2xl text-[19px] leading-[1.65] text-[hsl(var(--foreground))]"
          >
            {result.summary}
          </p>
          <div className="mt-8 border-t border-[hsl(var(--border))] pt-7">
            <SectionHeading icon={ListChecks} eyebrow="02 / don’t miss these" title="Key Points" />
            <ul className="space-y-4" data-testid="list-key-points">
              {result.key_points.map((point, index) => (
                <li
                  key={`${point}-${index}`}
                  data-testid={`text-key-point-${index}`}
                  className="flex gap-3 text-[15px] leading-6 text-[hsl(var(--foreground))]"
                >
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))] font-mono text-[10px] font-bold text-[hsl(var(--accent-foreground))]">
                    {index + 1}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-6 sm:p-7">
            <SectionHeading icon={Lightbulb} eyebrow="03 / translate it" title="Confusing Terms Explained" />
            <div className="space-y-5" data-testid="list-confusing-terms">
              {result.confusing_terms.length > 0 ? (
                result.confusing_terms.map((item, index) => (
                  <div key={`${item.term}-${index}`} data-testid={`term-card-${index}`}>
                    <p className="font-semibold text-[hsl(var(--primary))]">{item.term}</p>
                    <p className="mt-1 text-sm leading-5 text-[hsl(var(--muted-foreground))]">
                      {item.explanation}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Nothing tricky stood out here.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-[24px] bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] shadow-[0_16px_45px_hsl(213_28%_18%_/_0.13)] sm:p-7">
            <SectionHeading icon={ArrowRight} eyebrow="04 / your next step" title="What You Should Do" />
            <ul className="space-y-4" data-testid="list-next-steps">
              {result.what_you_should_do.map((step, index) => (
                <li
                  key={`${step}-${index}`}
                  data-testid={`text-next-step-${index}`}
                  className="flex gap-3 text-sm leading-6 text-[hsl(var(--primary-foreground))]"
                >
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" size={17} />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
      <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-5 text-[hsl(var(--muted-foreground))]">
        NotrieAI helps you understand text and messages. It does not replace advice from a qualified professional.
      </p>
    </section>
  );
}

function LoadingResult() {
  return (
    <section className="mx-auto w-full max-w-[1060px]" aria-live="polite" data-testid="status-loading">
      <div className="mb-7">
        <div className="shimmer h-3 w-28 rounded-full" />
        <div className="shimmer mt-4 h-14 w-full max-w-[580px] rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.22fr_0.78fr]">
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8">
          <div className="shimmer h-10 w-48 rounded-xl" />
          <div className="mt-8 space-y-3">
            <div className="shimmer h-4 w-full rounded" />
            <div className="shimmer h-4 w-11/12 rounded" />
            <div className="shimmer h-4 w-4/5 rounded" />
          </div>
          <div className="mt-10 space-y-4">
            <div className="shimmer h-4 w-3/4 rounded" />
            <div className="shimmer h-4 w-full rounded" />
            <div className="shimmer h-4 w-10/12 rounded" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="shimmer h-56 rounded-[24px]" />
          <div className="shimmer h-64 rounded-[24px]" />
        </div>
      </div>
      <p className="mt-8 flex items-center justify-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
        <Loader2 size={15} className="animate-spin" />
        Reading between the lines…
      </p>
    </section>
  );
}

function Home() {
  const { token, user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { siteName, siteTagline } = useSiteSettings();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [validationError, setValidationError] = useState('');
  const [dismissedError, setDismissedError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const explain = useMutation({
    mutationFn: (input: { text?: string; imageBase64?: string; imageMimeType?: string }) =>
      explainRequest(input, token),
    onError: (error: Error) => {
      if ('status' in error && (error as { status?: number }).status === 401) {
        logout();
        setLocation('/login');
      }
    },
  });
  const health = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    retry: false,
    staleTime: 60_000,
  });

  const historyQuery = useQuery({
    queryKey: ['analysis-history'],
    queryFn: () => getHistory(token as string),
    enabled: Boolean(token),
    staleTime: 0,
  });

  const deleteHistory = useMutation({
    mutationFn: (historyId: string) => deleteHistoryItem(token as string, historyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['analysis-history'] }),
  });

  const openHistoryItem = (item: AnalysisHistoryItem) => {
    setResult(item.result);
    setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const textCount = text.length;
  const isBusy = explain.isPending;
  const errorMessage =
    explain.error instanceof Error
      ? explain.error.message
      : 'We could not analyse that right now. Please try again in a moment.';

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setValidationError('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    setValidationError('');
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDismissedError(false);

    if (mode === 'text') {
      const cleanedText = text.trim();
      if (cleanedText.length < 20) {
        setValidationError('Please paste at least 20 characters so NotrieAI has enough context to help.');
        return;
      }
      if (cleanedText.length > 30000) {
        setValidationError('That is a little too much at once. Please keep it under 30,000 characters.');
        return;
      }
      setValidationError('');
      setResult(null);
      explain.mutate({ text: cleanedText }, { onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ['analysis-history'] }); } });
      return;
    }

    if (!imageFile) {
      setValidationError('Please choose a screenshot or photo first.');
      return;
    }
    setValidationError('');
    setResult(null);
    try {
      const imageBase64 = await fileToBase64(imageFile);
      explain.mutate(
        { text: text.trim() || undefined, imageBase64, imageMimeType: imageFile.type },
        { onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ['analysis-history'] }); } },
      );
    } catch {
      setValidationError('Could not read that image. Please try another file.');
    }
  };

  const startOver = () => {
    setText('');
    clearImage();
    setResult(null);
    setValidationError('');
    setDismissedError(false);
    explain.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="notrie-app paper-grain">
      <header className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <p className="font-serif text-[22px] font-semibold tracking-[-0.03em] text-[hsl(var(--primary))]"> {siteName}</p>
            <p className="block max-w-[180px] font-mono text-[8px] leading-3 uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] sm:max-w-none sm:text-[9px] sm:tracking-[0.16em]">{siteTagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] sm:flex" data-testid="status-connection">
            <span className={`h-2 w-2 rounded-full ${health.isLoading ? 'bg-[hsl(var(--accent))]' : health.isError ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(var(--chart-3))]'}`} />
            <span>{health.isLoading ? 'Checking guide' : health.isError ? 'Guide offline' : 'Guide is ready'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Open analysis history"
              aria-expanded={historyOpen}
              title="Analysis history"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--primary))] transition-colors hover:border-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            >
              <Menu size={17} />
            </button>
            {user?.is_admin && (
              <Link
                href="/admin/settings"
                aria-label="Admin settings"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--primary))] transition-colors hover:border-[hsl(var(--primary))]"
              >
                <Settings size={16} />
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                setLocation('/login');
              }}
              aria-label="Log out"
              title={user?.email}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--primary))] transition-colors hover:border-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))]"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {historyOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Analysis history">
          <button
            type="button"
            aria-label="Close analysis history"
            className="absolute inset-0 bg-black/25"
            onClick={() => setHistoryOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-[390px] flex-col border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[-18px_0_50px_hsl(213_28%_18%_/_0.12)]">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <History size={17} className="text-[hsl(var(--primary))]" />
                  <h2 className="font-serif text-xl text-[hsl(var(--primary))]">Analysis history</h2>
                </div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Your completed analyses</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close history"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--primary))]"
              >
                <X size={17} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {historyQuery.isLoading ? (
                <p className="p-3 text-sm text-[hsl(var(--muted-foreground))]">Loading history…</p>
              ) : historyQuery.data?.length ? (
                <div className="space-y-2">
                  {historyQuery.data.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
                      <button
                        type="button"
                        onClick={() => openHistoryItem(item)}
                        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] rounded-lg"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                            {item.input_type === 'image' ? 'Photo analysis' : 'Text analysis'}
                          </span>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-semibold text-[hsl(var(--foreground))]">
                          {item.input_text?.trim() || `${VERDICT_META[item.result.verdict].label} analysis`}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                          {item.result.summary}
                        </p>
                      </button>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          aria-label="Delete this analysis"
                          title="Delete"
                          disabled={deleteHistory.isPending}
                          onClick={() => deleteHistory.mutate(item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)_/_0.08)] disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center">
                  <History size={22} className="mx-auto text-[hsl(var(--muted-foreground))]" />
                  <p className="mt-3 text-sm font-semibold">No analyses yet</p>
                  <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Your completed analyses will appear here.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1240px] px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:px-10 lg:pt-20">
        {result ? (
          <ResultView result={result} onStartOver={startOver} />
        ) : isBusy ? (
          <LoadingResult />
        ) : (
          <>
            <section className="grid items-end gap-10 pb-12 lg:grid-cols-[1fr_0.7fr] lg:gap-20 lg:pb-16">
              <div className="fade-up">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.13em] text-[hsl(var(--muted-foreground))]">
                  <Sparkles size={13} className="text-[hsl(var(--accent-foreground))]" />
                  A little clarity, right here
                </div>
                <h1 className="max-w-[720px] font-serif text-[clamp(3.4rem,8vw,7.4rem)] font-semibold leading-[0.88] tracking-[-0.065em] text-[hsl(var(--primary))]">
                  Hard to read.
                  <br />
                  <span className="text-[hsl(var(--chart-3))]">Easy to act on.</span>
                </h1>
                <p className="mt-7 max-w-[510px] text-[17px] leading-7 text-[hsl(var(--muted-foreground))]">
                  Paste a message or upload a screenshot. NotrieAI tells you what it means, whether it's safe, and what to do next.
                </p>
              </div>
              <div className="fade-up fade-up-delay-1 hidden lg:block">
                <div className="relative ml-auto max-w-[340px] rotate-[2deg] rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_20px_50px_hsl(213_28%_18%_/_0.09)]">
                  <div className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                    <ShieldCheck size={18} />
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">The Notrie promise</p>
                  <p className="mt-5 font-serif text-[27px] leading-[1.1] tracking-[-0.035em] text-[hsl(var(--primary))]">
                    No jargon.
                    <br />
                    No guessing.
                    <br />
                    Just next steps.
                  </p>
                  <div className="mt-7 flex items-center gap-2 border-t border-[hsl(var(--border))] pt-4 text-xs text-[hsl(var(--muted-foreground))]">
                    <Info size={14} />
                    You stay in control.
                  </div>
                </div>
              </div>
            </section>

            <section className="fade-up fade-up-delay-2" aria-label="Simplify your document">
              <div className="rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-[0_20px_55px_hsl(213_28%_18%_/_0.08)] sm:p-5 lg:p-6">
                <div className="mb-4 flex flex-col justify-between gap-3 px-2 sm:flex-row sm:items-center sm:px-1">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Start with the message or document</p>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Your text stays private to this explanation.</p>
                  </div>
                  <div className="inline-flex self-start rounded-full bg-[hsl(var(--secondary))] p-1" role="group" aria-label="Choose input type">
                    <button
                      type="button"
                      onClick={() => setMode('text')}
                      data-testid="button-mode-text"
                      aria-pressed={mode === 'text'}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${mode === 'text' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
                    >
                      Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('image')}
                      data-testid="button-mode-image"
                      aria-pressed={mode === 'image'}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${mode === 'image' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
                    >
                      Photo
                    </button>
                  </div>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className={`rounded-[21px] border bg-[hsl(var(--background))] p-4 transition-colors sm:p-5 ${validationError ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--input))] focus-within:border-[hsl(var(--primary))]'}`}>
                    {mode === 'text' ? (
                      <textarea
                        value={text}
                        onChange={(event) => {
                          setText(event.target.value);
                          if (validationError) setValidationError('');
                        }}
                        data-testid="input-document-text"
                        aria-label="Text to analyse"
                        placeholder="Paste the words that made you pause…"
                        maxLength={30000}
                        className="min-h-[250px] w-full resize-y bg-transparent text-[16px] leading-7 text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:min-h-[290px]"
                      />
                    ) : (
                      <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[hsl(var(--border))] p-6 text-center sm:min-h-[290px]">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageChange}
                          data-testid="input-image-file"
                          className="hidden"
                          id="image-upload-input"
                        />
                        {imagePreviewUrl ? (
                          <div className="flex flex-col items-center gap-3">
                            <img
                              src={imagePreviewUrl}
                              alt="Selected screenshot preview"
                              data-testid="img-image-preview"
                              className="max-h-[200px] rounded-xl border border-[hsl(var(--border))] object-contain"
                            />
                            <button
                              type="button"
                              onClick={clearImage}
                              data-testid="button-remove-image"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--destructive))]"
                            >
                              <X size={13} /> Remove image
                            </button>
                          </div>
                        ) : (
                          <label htmlFor="image-upload-input" className="cursor-pointer">
                            <ImageIcon size={28} className="mx-auto mb-2 text-[hsl(var(--muted-foreground))]" />
                            <p className="text-sm font-semibold text-[hsl(var(--primary))]">Upload a screenshot or photo</p>
                            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">SMS, WhatsApp message, or document photo — JPEG, PNG, or WebP</p>
                          </label>
                        )}
                      </div>
                    )}
                    <div className="mt-4 flex flex-col justify-between gap-3 border-t border-[hsl(var(--border))] pt-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                        {mode === 'text' ? (
                          <span data-testid="text-character-count">{textCount.toLocaleString()} / 30,000</span>
                        ) : (
                          <span>{imageFile ? imageFile.name : 'No image selected'}</span>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={isBusy}
                        data-testid="button-analyse"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[hsl(var(--accent))] px-6 text-sm font-bold text-[hsl(var(--accent-foreground))] shadow-[0_8px_20px_hsl(39_93%_62%_/_0.2)] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                      >
                        {isBusy ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                        {isBusy ? 'Analysing…' : 'Analyse'}
                        {!isBusy && <ArrowRight size={16} />}
                      </button>
                    </div>
                  </div>
                </form>
                {validationError && (
                  <div className="mt-3 flex items-start gap-2 px-2 text-sm text-[hsl(var(--destructive))]" role="alert" data-testid="status-validation-error">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
                {explain.isError && !dismissedError && (
                  <div className="mt-3 flex items-start justify-between gap-3 rounded-2xl bg-[hsl(var(--destructive)_/_0.09)] px-3 py-3 text-sm text-[hsl(var(--destructive))]" role="alert" data-testid="status-api-error">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                    <button type="button" onClick={() => setDismissedError(true)} data-testid="button-dismiss-error" aria-label="Dismiss error">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="fade-up fade-up-delay-3 mt-16 grid gap-6 border-t border-[hsl(var(--border))] pt-8 sm:grid-cols-3">
              <div className="flex gap-3">
                <FileText size={18} className="mt-0.5 shrink-0 text-[hsl(var(--chart-3))]" />
                <div>
                  <p className="text-sm font-bold text-[hsl(var(--primary))]">Bring the real words</p>
                  <p className="mt-1 text-sm leading-5 text-[hsl(var(--muted-foreground))]">Scam messages, contracts, medical notes, and official letters are all welcome.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <BookOpen size={18} className="mt-0.5 shrink-0 text-[hsl(var(--chart-3))]" />
                <div>
                  <p className="text-sm font-bold text-[hsl(var(--primary))]">Read it your way</p>
                  <p className="mt-1 text-sm leading-5 text-[hsl(var(--muted-foreground))]">Get a clear explanation and a verdict, without the formal tone.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clipboard size={18} className="mt-0.5 shrink-0 text-[hsl(var(--chart-3))]" />
                <div>
                  <p className="text-sm font-bold text-[hsl(var(--primary))]">Leave with a plan</p>
                  <p className="mt-1 text-sm leading-5 text-[hsl(var(--muted-foreground))]">Save the key points and practical next steps by copying the result.</p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 border-t border-[hsl(var(--border))] px-5 py-6 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <p>{siteName} · Understanding should not be a privilege.</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em]">Text + Photo</p>
      </footer>
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/admin/settings">
          <AdminRoute>
            <AdminSettingsPage />
          </AdminRoute>
        </Route>
        <Route path="/">
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

/** Applies the admin's chosen theme colors as soon as the app loads - runs
 * on every page, including /login, since branding shouldn't wait for auth. */
function ThemeLoader() {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: getPublicSettings,
    staleTime: 60_000,
  });

  useEffect(() => {
    applyThemeFromSettings(data);
  }, [data]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ThemeLoader />
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
