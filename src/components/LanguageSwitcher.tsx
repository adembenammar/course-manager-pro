import { Languages } from 'lucide-react';
import { Button } from './ui/button';
import { Language } from '@/contexts/LanguageContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useTranslation } from '@/hooks/useTranslation';

const languageLabels: Record<Language, string> = {
  fr: 'Francais',
  en: 'English',
};

const LanguageSwitcher = () => {
  const { language, setLanguage, toggleLanguage, t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label={t('Changer de langue', 'Change language')}
        >
          <Languages className="h-4 w-4" />
          <span className="sr-only">{t('Langue', 'Language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {(Object.keys(languageLabels) as Language[]).map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className={language === lang ? 'font-semibold' : ''}
          >
            {languageLabels[lang]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={toggleLanguage}>
          {t('Basculer', 'Toggle')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
