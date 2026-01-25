import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from '../locales/en.json';
import frTranslations from '../locales/fr.json';

// Get language from localStorage (will be synced with database)
const getInitialLanguage = (): string => {
  if (typeof window === 'undefined') return 'en';
  
  // Try to get from localStorage first (synced from database)
  const saved = localStorage.getItem('i18nextLng');
  if (saved && (saved === 'en' || saved === 'fr')) {
    return saved;
  }
  
  // Fallback to browser language
  const browserLang = navigator.language.split('-')[0];
  return (browserLang === 'fr') ? 'fr' : 'en';
};

i18n
  .use(LanguageDetector) // Detects user language from browser
  .use(initReactI18next) // Passs i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      fr: {
        translation: frTranslations,
      },
    },
    fallbackLng: 'en', // Default language
    lng: getInitialLanguage(), // Use saved language or default to English
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'], // Check localStorage first, then browser language
      caches: ['localStorage'], // Cache language preference in localStorage
    },
  });

// Listen for language changes and sync to localStorage
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('i18nextLng', lng);
  }
});

export default i18n;
