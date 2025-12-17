import { useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Lightweight helper to translate inline strings without wiring a full i18n lib.
 * Usage: const { t, language } = useTranslation(); t('Bonjour', 'Hello')
 */
export const useTranslation = () => {
  const { language, setLanguage, toggleLanguage } = useLanguage();

  const t = useCallback(
    (fr: string, en: string) => (language === 'en' ? en : fr),
    [language]
  );

  return {
    language,
    setLanguage,
    toggleLanguage,
    t,
  };
};

export type TranslateFn = ReturnType<typeof useTranslation>['t'];
