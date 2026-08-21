export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * JSON fetch wrapper used by every API call in the app. Attaches
 * `Authorization: Bearer <token>` when a token is passed, and turns a
 * non-2xx response into an ApiError with the backend's own message
 * (FastAPI's `{"detail": "..."}` shape) when available.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      (typeof body?.detail === 'string' && body.detail) ||
      'Something went wrong. Please try again.';
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return null as T;
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------
// Types (mirror the backend's Pydantic schemas)
// ---------------------------------------------------------------------

export type ConfusingTerm = { term: string; explanation: string };

export type ExplainResult = {
  verdict: 'safe' | 'suspicious' | 'likely_scam' | 'needs_clarification';
  verdict_reason: string;
  summary: string;
  key_points: string[];
  confusing_terms: ConfusingTerm[];
  what_you_should_do: string[];
};

export type UsageInfo = {
  daily_used: number;
  daily_limit: number;
  daily_remaining: number;
  monthly_used: number;
  monthly_limit: number;
  monthly_remaining: number;
};

export type UserAdminOut = {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
};

// ---------------------------------------------------------------------
// Explain
// ---------------------------------------------------------------------

export function explainRequest(
  input: { text?: string; imageBase64?: string; imageMimeType?: string },
  token: string | null,
): Promise<ExplainResult> {
  return apiFetch<ExplainResult>(
    '/api/explain',
    {
      method: 'POST',
      body: JSON.stringify({
        text: input.text || undefined,
        image_base64: input.imageBase64 || undefined,
        image_mime_type: input.imageMimeType || undefined,
      }),
    },
    token,
  );
}


export function getUsage(token: string) {
  return apiFetch<UsageInfo>('/api/usage', {}, token);
}

export function getHealth() {
  return apiFetch<{ status: string }>('/api/health');
}

// ---------------------------------------------------------------------
// Settings - public (no auth) and admin (full read/write/delete)
// ---------------------------------------------------------------------

export function getPublicSettings() {
  return apiFetch<Record<string, string>>('/api/settings/public');
}

export function adminGetSettings(token: string) {
  return apiFetch<Record<string, string>>('/api/admin/settings', {}, token);
}

export function adminPutSettings(token: string, updates: Record<string, string>) {
  return apiFetch<Record<string, string>>(
    '/api/admin/settings',
    { method: 'PUT', body: JSON.stringify(updates) },
    token,
  );
}

export function adminDeleteSetting(token: string, key: string) {
  return apiFetch<void>(`/api/admin/settings/${encodeURIComponent(key)}`, { method: 'DELETE' }, token);
}

// ---------------------------------------------------------------------
// Admin - user management
// ---------------------------------------------------------------------

export function adminListUsers(token: string) {
  return apiFetch<UserAdminOut[]>('/api/admin/users', {}, token);
}

export function adminUpdateUser(token: string, userId: string, isAdmin: boolean) {
  return apiFetch<UserAdminOut>(
    `/api/admin/users/${userId}`,
    { method: 'PATCH', body: JSON.stringify({ is_admin: isAdmin }) },
    token,
  );
}

export function adminDeleteUser(token: string, userId: string) {
  return apiFetch<void>(`/api/admin/users/${userId}`, { method: 'DELETE' }, token);
}


export type AnalysisHistoryItem = {
  id: string;
  input_type: 'text' | 'image';
  input_text: string | null;
  result: ExplainResult;
  created_at: string;
};

export function getHistory(token: string) {
  return apiFetch<AnalysisHistoryItem[]>('/api/history', {}, token);
}

export function getHistoryItem(token: string, historyId: string) {
  return apiFetch<AnalysisHistoryItem>(`/api/history/${historyId}`, {}, token);
}

export function deleteHistoryItem(token: string, historyId: string) {
  return apiFetch<void>(`/api/history/${historyId}`, { method: 'DELETE' }, token);
}

// ---------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------

export function forgotPassword(email: string) {
  return apiFetch<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, newPassword: string) {
  return apiFetch<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

// ---------------------------------------------------------------------
// Google sign-in
// ---------------------------------------------------------------------
// (Handled directly in src/lib/auth.tsx's loginWithGoogle, which calls
// /api/auth/google via apiFetch and persists the resulting session the
// same way login/signup do.)
