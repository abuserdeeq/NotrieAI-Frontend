import { useQuery } from '@tanstack/react-query';
import { getPublicSettings } from '@/lib/api';

const DEFAULT_SITE_NAME = 'NotrieAI';
const DEFAULT_SITE_TAGLINE = 'Understand anything in seconds.';

export function useSiteSettings() {
  const query = useQuery({
    queryKey: ['public-settings'],
    queryFn: getPublicSettings,
    staleTime: 60_000,
  });

  return {
    ...query,
    siteName: query.data?.site_name?.trim() || DEFAULT_SITE_NAME,
    siteTagline: query.data?.site_tagline?.trim() || DEFAULT_SITE_TAGLINE,
  };
}
