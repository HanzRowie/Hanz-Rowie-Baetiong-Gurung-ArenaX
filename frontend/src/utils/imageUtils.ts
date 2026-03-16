/**
 * Normalizes a profile picture URL to always be absolute.
 * The backend inconsistently returns either:
 *   - Relative paths: /media/profile_pictures/foo.jpg
 *   - Absolute URLs: http://localhost:8000/media/profile_pictures/foo.jpg
 * This utility ensures we always get a usable URL.
 */
export function getAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative path — prepend the API base URL
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}
