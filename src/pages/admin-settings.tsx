import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogoMark } from '@/components/brand';
import { useAuth } from '@/lib/auth';
import {
  adminDeleteSetting,
  adminDeleteUser,
  adminGetSettings,
  adminListUsers,
  adminPutSettings,
  adminUpdateUser,
  type UserAdminOut,
} from '@/lib/api';
import { applyTheme, type ThemeColors } from '@/lib/theme';

const THEME_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'background', label: 'Background' },
  { key: 'foreground', label: 'Text' },
  { key: 'primary', label: 'Primary' },
  { key: 'primary_foreground', label: 'Primary text' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'secondary_foreground', label: 'Secondary text' },
  { key: 'accent', label: 'Accent' },
  { key: 'accent_foreground', label: 'Accent text' },
];

const EMPTY_THEME: ThemeColors = {
  background: '',
  foreground: '',
  primary: '',
  primary_foreground: '',
  secondary: '',
  secondary_foreground: '',
  accent: '',
  accent_foreground: '',
};

// Settings under these prefixes get their own dedicated UI above; anything
// else shows up in the generic "Advanced settings" editor below.
const KNOWN_PREFIXES = ['provider_', 'theme_'];

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
        checked ? 'bg-[hsl(var(--chart-3))]' : 'bg-[hsl(var(--muted))]'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <span
          className="h-8 w-8 shrink-0 rounded-lg border border-[hsl(var(--border))]"
          style={{ backgroundColor: value ? `hsl(${value})` : 'transparent' }}
          aria-hidden="true"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. 202 34% 20%"
          className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]"
        />
      </div>
    </label>
  );
}

export default function AdminSettingsPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminGetSettings(token as string),
    enabled: Boolean(token),
  });
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminListUsers(token as string),
    enabled: Boolean(token),
  });

  const [themeLight, setThemeLight] = useState<ThemeColors>(EMPTY_THEME);
  const [themeDark, setThemeDark] = useState<ThemeColors>(EMPTY_THEME);
  const [activeThemeTab, setActiveThemeTab] = useState<'light' | 'dark'>('light');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    if (!settingsQuery.data) return;
    try {
      if (settingsQuery.data.theme_light) {
        setThemeLight({ ...EMPTY_THEME, ...JSON.parse(settingsQuery.data.theme_light) });
      }
    } catch {
      // ignore malformed stored theme
    }
    try {
      if (settingsQuery.data.theme_dark) {
        setThemeDark({ ...EMPTY_THEME, ...JSON.parse(settingsQuery.data.theme_dark) });
      }
    } catch {
      // ignore malformed stored theme
    }
  }, [settingsQuery.data]);

  const updateSettings = useMutation({
    mutationFn: (updates: Record<string, string>) => adminPutSettings(token as string, updates),
    onSuccess: (data) => queryClient.setQueryData(['admin-settings'], data),
  });

  const deleteSetting = useMutation({
    mutationFn: (key: string) => adminDeleteSetting(token as string, key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-settings'] }),
  });

  const toggleUserAdmin = useMutation({
    mutationFn: ({ id, isAdmin }: { id: string; isAdmin: boolean }) =>
      adminUpdateUser(token as string, id, isAdmin),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => adminDeleteUser(token as string, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const openaiEnabled = (settingsQuery.data?.provider_openai_enabled ?? 'true') === 'true';
  const geminiEnabled = (settingsQuery.data?.provider_gemini_enabled ?? 'true') === 'true';

  const handleSaveTheme = () => {
    updateSettings.mutate(
      { theme_light: JSON.stringify(themeLight), theme_dark: JSON.stringify(themeDark) },
      {
        onSuccess: () => {
          applyTheme(themeLight, themeDark);
          queryClient.invalidateQueries({ queryKey: ['public-settings'] });
        },
      },
    );
  };

  const handleAddCustom = (event: FormEvent) => {
    event.preventDefault();
    const key = newKey.trim();
    if (!key) return;
    updateSettings.mutate(
      { [key]: newValue },
      {
        onSuccess: () => {
          setNewKey('');
          setNewValue('');
        },
      },
    );
  };

  const customEntries = Object.entries(settingsQuery.data ?? {}).filter(
    ([key]) => !KNOWN_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );

  return (
    <div className="notrie-app paper-grain min-h-dvh">
      <header className="mx-auto flex w-full max-w-[1000px] items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <p className="font-serif text-[20px] font-semibold tracking-[-0.03em] text-[hsl(var(--primary))]">
              Admin Settings
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Signed in as {user?.email}</p>
          </div>
        </div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--primary))]">
          <ArrowLeft size={15} /> Back to app
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[1000px] space-y-6 px-5 pb-20 sm:px-8">
        {/* AI Providers */}
        <section className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
          <h2 className="font-serif text-[22px] text-[hsl(var(--primary))]">AI Providers</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            OpenAI is tried first when both are on; Gemini is the fallback.
          </p>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[hsl(var(--border))] p-4">
              <div>
                <p className="font-semibold text-[hsl(var(--foreground))]">OpenAI (GPT-5.6 Luna)</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Primary provider</p>
              </div>
              <Switch
                checked={openaiEnabled}
                label="Toggle OpenAI"
                onChange={(next) => updateSettings.mutate({ provider_openai_enabled: next ? 'true' : 'false' })}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[hsl(var(--border))] p-4">
              <div>
                <p className="font-semibold text-[hsl(var(--foreground))]">Gemini (gemini-flash-latest)</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Fallback provider</p>
              </div>
              <Switch
                checked={geminiEnabled}
                label="Toggle Gemini"
                onChange={(next) => updateSettings.mutate({ provider_gemini_enabled: next ? 'true' : 'false' })}
              />
            </div>
            {!openaiEnabled && !geminiEnabled && (
              <p className="text-sm text-[hsl(var(--destructive))]">
                Both providers are off - NotrieAI can't explain anything right now.
              </p>
            )}
          </div>
          {updateSettings.isError && (
            <p className="mt-4 text-sm text-[hsl(var(--destructive))]">
              {updateSettings.error instanceof Error
                ? updateSettings.error.message
                : 'Could not save. Please try again.'}
            </p>
          )}
        </section>

        {/* Theme */}
        <section className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-[22px] text-[hsl(var(--primary))]">Theme</h2>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Colors as HSL triplets, e.g. <code>202 34% 20%</code>.
              </p>
            </div>
            <div className="inline-flex rounded-full bg-[hsl(var(--secondary))] p-1">
              <button
                type="button"
                onClick={() => setActiveThemeTab('light')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  activeThemeTab === 'light'
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'text-[hsl(var(--muted-foreground))]'
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setActiveThemeTab('dark')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  activeThemeTab === 'dark'
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'text-[hsl(var(--muted-foreground))]'
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {THEME_FIELDS.map(({ key, label }) => (
              <ColorField
                key={key}
                label={label}
                value={(activeThemeTab === 'light' ? themeLight : themeDark)[key]}
                onChange={(next) =>
                  (activeThemeTab === 'light' ? setThemeLight : setThemeDark)((prev) => ({
                    ...prev,
                    [key]: next,
                  }))
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleSaveTheme}
            disabled={updateSettings.isPending}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[hsl(var(--accent))] px-5 text-sm font-bold text-[hsl(var(--accent-foreground))] disabled:opacity-70"
          >
            {updateSettings.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save theme
          </button>
          {updateSettings.isError && (
            <p className="mt-3 text-sm text-[hsl(var(--destructive))]">
              {updateSettings.error instanceof Error
                ? updateSettings.error.message
                : 'Could not save theme. Please try again.'}
            </p>
          )}
          {updateSettings.isSuccess && (
            <p className="mt-3 text-sm text-[hsl(var(--chart-3))]">Theme saved and applied.</p>
          )}
        </section>

        {/* Users */}
        <section className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <UsersIcon size={18} className="text-[hsl(var(--primary))]" />
            <h2 className="font-serif text-[22px] text-[hsl(var(--primary))]">Users</h2>
          </div>
          {usersQuery.isLoading ? (
            <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">Loading…</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2 pr-4">Joined</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.data?.map((row: UserAdminOut) => {
                    const isSelf = row.id === user?.id;
                    return (
                      <tr key={row.id} className="border-b border-[hsl(var(--border))] last:border-0">
                        <td className="py-3 pr-4">
                          {row.email}
                          {isSelf && <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">(you)</span>}
                        </td>
                        <td className="py-3 pr-4">
                          {row.is_admin ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--chart-3))]">
                              <ShieldCheck size={14} /> Admin
                            </span>
                          ) : (
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">Member</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-[hsl(var(--muted-foreground))]">
                          {new Date(row.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              disabled={isSelf || toggleUserAdmin.isPending}
                              onClick={() => toggleUserAdmin.mutate({ id: row.id, isAdmin: !row.is_admin })}
                              className="text-xs font-semibold text-[hsl(var(--primary))] underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {row.is_admin ? 'Remove admin' : 'Make admin'}
                            </button>
                            <button
                              type="button"
                              disabled={isSelf || deleteUser.isPending}
                              onClick={() => {
                                if (window.confirm(`Delete ${row.email}? This can't be undone.`)) {
                                  deleteUser.mutate(row.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--destructive))] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Advanced / custom settings - unrestricted key/value control */}
        <section className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
          <h2 className="font-serif text-[22px] text-[hsl(var(--primary))]">Advanced settings</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Any other key/value pair - add one below and it's available immediately, no code changes needed.
          </p>

          <div className="mt-5 space-y-3">
            {customEntries.length === 0 && (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No custom settings yet.</p>
            )}
            {customEntries.map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-1/3 truncate font-mono text-xs text-[hsl(var(--muted-foreground))]">{key}</span>
                <input
                  defaultValue={value}
                  onBlur={(event) => {
                    if (event.target.value !== value) updateSettings.mutate({ [key]: event.target.value });
                  }}
                  className="flex-1 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm outline-none focus:border-[hsl(var(--primary))]"
                />
                <button
                  type="button"
                  onClick={() => deleteSetting.mutate(key)}
                  className="text-[hsl(var(--destructive))]"
                  aria-label={`Delete ${key}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddCustom} className="mt-5 flex flex-wrap items-end gap-2 border-t border-[hsl(var(--border))] pt-5">
            <label className="min-w-[140px] flex-1">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">Key</span>
              <input
                value={newKey}
                onChange={(event) => setNewKey(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm outline-none focus:border-[hsl(var(--primary))]"
              />
            </label>
            <label className="min-w-[140px] flex-1">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">Value</span>
              <input
                value={newValue}
                onChange={(event) => setNewValue(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm outline-none focus:border-[hsl(var(--primary))]"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))]"
            >
              <Plus size={15} /> Add
            </button>
          </form>
        </section>
      </main>
    </div>
  );
                }
