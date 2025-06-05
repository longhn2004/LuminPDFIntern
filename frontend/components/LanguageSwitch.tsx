"use client";

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

interface LanguageSwitchProps {
  variant?: 'dark' | 'light';
}

export default function LanguageSwitch({ variant = 'dark' }: LanguageSwitchProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  // Get current locale from cookie
  const currentLocale = Cookies.get('locale') || 'en';
  const isVietnamese = currentLocale === 'vi';

  const handleLanguageToggle = () => {
    if (isPending) return;
    
    const newLocale = isVietnamese ? 'en' : 'vi';
    
    startTransition(() => {
      // Set the locale cookie
      Cookies.set('locale', newLocale, { expires: 365 });
      
      // Show success message
      toast.success(t('notifications.languageChanged'));
      
      // Reload the page to apply the new locale
      window.location.reload();
    });
  };

  // Styling based on variant
  const isDark = variant === 'dark';
  const activeTextClass = isDark ? 'text-white' : 'text-gray-900';
  const inactiveTextClass = isDark ? 'text-white/60' : 'text-gray-500';
  const switchBgClass = isDark ? 'bg-white/30' : 'bg-gray-200';
  const focusRingClass = isDark ? 'focus:ring-white/50 focus:ring-offset-transparent' : 'focus:ring-blue-500 focus:ring-offset-2';

  return (
    <div className="flex items-center space-x-2">
      {/* English Label */}
      <span className={`text-sm font-medium transition-colors ${!isVietnamese ? activeTextClass : inactiveTextClass}`}>
        EN
      </span>

      {/* Toggle Switch */}
      <button
        onClick={handleLanguageToggle}
        disabled={isPending}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${switchBgClass} ${focusRingClass}`}
        role="switch"
        aria-checked={isVietnamese}
        title={t('language.switchLanguage')}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            isVietnamese ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>

      {/* Vietnamese Label */}
      <span className={`text-sm font-medium transition-colors ${isVietnamese ? activeTextClass : inactiveTextClass}`}>
        VI
      </span>
    </div>
  );
} 