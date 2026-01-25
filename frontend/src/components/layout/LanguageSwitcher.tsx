import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useSettings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const { data: userPreferences } = useUserPreferences(user?.id || '');
  const updatePreferencesMutation = useUpdateUserPreferences();

  const handleLanguageChange = async (language: string) => {
    i18n.changeLanguage(language);
    
    // Save to database if user is logged in
    if (user?.id) {
      try {
        await updatePreferencesMutation.mutateAsync({
          userId: user.id,
          preferences: { language: language as 'en' | 'fr' },
        });
      } catch (error) {
        console.error('Error saving language preference to database:', error);
      }
    }
  };
  
  // Sync language from database when user preferences load
  React.useEffect(() => {
    if (userPreferences?.language && userPreferences.language !== i18n.language) {
      i18n.changeLanguage(userPreferences.language);
    }
  }, [userPreferences?.language]); // Removed i18n from dependencies to avoid infinite loop

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-[130px] h-9 border-border bg-section hover:bg-section/80">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <SelectValue>
            {i18n.language === 'fr' ? t('common.french') : t('common.english')}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{t('common.english')}</SelectItem>
        <SelectItem value="fr">{t('common.french')}</SelectItem>
      </SelectContent>
    </Select>
  );
};
