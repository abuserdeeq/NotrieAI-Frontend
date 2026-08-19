import { useQuery } from '@tanstack/react-query';
import { getPublicSettings } from '@/lib/api';

// Kept in sync with the seed values in the backend's
// migrations/versions/0002_site_branding.py - used before the settings
// have loaded, or if an admin clears a value back to empty.
export const DEFAULT_SITE_NAME = 'NotrieAI';
export const DEFAULT_SITE_TAGLINE = 'Understanding should not be a privilege.';

/**
 * Reads the admin-editable site_name / site_tagline branding settings.
 * Shares the same query (and cache) as the theme loader in App.tsx, so
 * this doesn't trigger an extra network request - it just reads whatever
 * /api/settings/public already returned. An admin can change either value
 * at any time from /admin/settings, and every component using this hook
 * picks it up automatically (react-query refetches on a 60s staleTime,
 * and immediately after a save via query invalidation).
 */
export function useSiteBranding() {
  const { data, isLoading } = useQuery({
    queryKey: ['public-settings'],
    queryFn: getPublicSettings,
    staleTime: 60_000,
  });

  const siteName = data?.site_name?.trim() || DEFAULT_SITE_NAME;
  const siteTagline = data?.site_tagline?.trim() || DEFAULT_SITE_TAGLINE;

  return { siteName, siteTagline, isLoading };
}
