import { useTranslations as useNextIntlTranslations } from 'next-intl';

/**
 * Custom hook for accessing translations
 * Provides typed access to translation functions for different sections
 */
export function useAppTranslations() {
  const t = useNextIntlTranslations();
  
  return {
    // General function for any translation
    t,
    
    // Specific section translators for better organization
    common: (key: string) => t(`common.${key}`),
    auth: (key: string) => t(`auth.${key}`),
    dashboard: (key: string) => t(`dashboard.${key}`),
    document: (key: string) => t(`document.${key}`),
    viewer: (key: string) => t(`viewer.${key}`),
    language: (key: string) => t(`language.${key}`),
    errors: (key: string) => t(`errors.${key}`),
    notifications: (key: string) => t(`notifications.${key}`),
    share: (key: string) => t(`share.${key}`),
    annotations: (key: string) => t(`annotations.${key}`),
    sharing: (key: string) => t(`sharing.${key}`),
  };
}

/**
 * Hook for getting the current locale
 */
export function useCurrentLocale() {
  // You can get this from cookies or Next.js locale
  if (typeof window !== 'undefined') {
    const cookies = document.cookie.split(';');
    const localeCookie = cookies.find(cookie => cookie.trim().startsWith('locale='));
    return localeCookie ? localeCookie.split('=')[1] : 'en';
  }
  return 'en';
} 