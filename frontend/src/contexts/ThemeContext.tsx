import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useSettings';

export type ThemeColor = 'navy' | 'indigo' | 'blue' | 'sky' | 'teal' | 'slate' | 'rose' | 'cyan' | 'yellow';

interface ThemeColorConfig {
  name: string;
  primary: string;
  primaryForeground: string;
  gradient: string;
}

export const themeColors: Record<ThemeColor, ThemeColorConfig> = {
  navy: {
    name: 'Navy Blue',
    primary: '222 47% 17%',
    primaryForeground: '210 40% 98%',
    gradient: 'linear-gradient(135deg, hsl(222 47% 17%) 0%, hsl(222 47% 30%) 100%)',
  },
  indigo: {
    name: 'Indigo',
    primary: '239 84% 67%',
    primaryForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(239 84% 67%) 0%, hsl(258 90% 66%) 100%)',
  },
  blue: {
    name: 'Blue',
    primary: '217 91% 60%',
    primaryForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(199 89% 48%) 100%)',
  },
  sky: {
    name: 'Sky Blue',
    primary: '199 89% 48%',
    primaryForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(199 89% 48%) 0%, hsl(201 96% 32%) 100%)',
  },
  teal: {
    name: 'Teal',
    primary: '173 80% 40%',
    primaryForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(173 80% 40%) 0%, hsl(166 76% 37%) 100%)',
  },
  slate: {
    name: 'Slate',
    primary: '215 28% 17%',
    primaryForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(215 28% 17%) 0%, hsl(215 25% 27%) 100%)',
  },
  rose: {
    name: 'Rose',
    primary: '346 77% 50%',
    primaryForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(346 77% 50%) 0%, hsl(330 70% 55%) 100%)',
  },
  cyan: {
    name: 'Cyan',
    primary: '187 85% 43%',
    primaryForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(187 85% 43%) 0%, hsl(199 89% 48%) 100%)',
  },
  yellow: {
    name: 'Yellow',
    primary: '43 96% 56%',
    primaryForeground: '0 0% 100%',
    gradient: 'linear-gradient(135deg, hsl(43 96% 56%) 0%, hsl(38 92% 50%) 100%)',
  },
};

interface ThemeContextType {
  currentTheme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to validate UUID format
const isValidUUID = (str: string | undefined | null): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id && isValidUUID(user.id) ? user.id : '';
  const { data: userPreferences } = useUserPreferences(userId);
  const updatePreferencesMutation = useUpdateUserPreferences();
  
  // Initialize theme from database user preferences, fallback to 'navy'
  const [currentTheme, setCurrentTheme] = useState<ThemeColor>(() => {
    if (userPreferences?.theme_color && Object.keys(themeColors).includes(userPreferences.theme_color)) {
      return userPreferences.theme_color as ThemeColor;
    }
    return 'navy';
  });

  // Update theme when user preferences change
  useEffect(() => {
    if (userPreferences?.theme_color && Object.keys(themeColors).includes(userPreferences.theme_color)) {
      setCurrentTheme(userPreferences.theme_color as ThemeColor);
    }
  }, [userPreferences?.theme_color]);

  // Apply theme styles immediately
  useEffect(() => {
    const config = themeColors[currentTheme];
    const root = document.documentElement;
    
    root.style.setProperty('--primary', config.primary);
    root.style.setProperty('--primary-foreground', config.primaryForeground);
    root.style.setProperty('--gradient-primary', config.gradient);
    root.style.setProperty('--ring', config.primary);
    root.style.setProperty('--sidebar-primary', config.primary);
    root.style.setProperty('--sidebar-primary-foreground', config.primaryForeground);
    root.style.setProperty('--sidebar-ring', config.primary);
  }, [currentTheme]);

  const setTheme = async (theme: ThemeColor) => {
    setCurrentTheme(theme);
    
    // Save to database if user is logged in
    if (userId) {
      try {
        await updatePreferencesMutation.mutateAsync({
          userId,
          preferences: { theme_color: theme },
        });
      } catch (error) {
        console.error('Error updating theme in database:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
