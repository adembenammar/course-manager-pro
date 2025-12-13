import { Languages } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

const languageLabels: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
};

const LanguageSwitcher = () => {
  const { language, setLanguage, toggleLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full" aria-label="Changer de langue">
          <Languages className="h-4 w-4" />
          <span className="sr-only">Language</span>
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
        <DropdownMenuItem onClick={toggleLanguage}>↔ Basculer</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
