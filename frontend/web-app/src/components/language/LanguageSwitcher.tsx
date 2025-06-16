
import React from 'react';
import { useLanguage, Language } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'sw' : 'en');
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="flex items-center gap-2" 
      onClick={toggleLanguage}
    >
      <Globe className="h-4 w-4" />
      {language === 'en' ? t('swahili') : t('english')}
    </Button>
  );
};

export default LanguageSwitcher;
