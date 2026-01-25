/**
 * ThemeSync Component
 * Syncs theme preference with database when user is logged in
 * This component should be placed inside AuthProvider
 */
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useSettings';
import { themeColors } from '@/contexts/ThemeContext';

export const ThemeSync = () => {
  // All hooks must be called unconditionally
  const { user } = useAuth();
  const { currentTheme, setTheme } = useTheme();
  const { data: userPreferences } = useUserPreferences(user?.id || '');
  const updatePreferencesMutation = useUpdateUserPreferences();

  // Sync theme from database when user preferences load
  useEffect(() => {
    if (!setTheme || !currentTheme) return;

    if (userPreferences?.theme_color && Object.keys(themeColors).includes(userPreferences.theme_color)) {
      if (userPreferences.theme_color !== currentTheme) {
        setTheme(userPreferences.theme_color as typeof currentTheme);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPreferences?.theme_color]); // Only depend on userPreferences to avoid infinite loops

  // Save to database when theme changes (but not when syncing from database)
  useEffect(() => {
    if (!updatePreferencesMutation || !user?.id || !userPreferences || userPreferences.theme_color === undefined) {
      return;
    }

    // Only save if theme changed by user action, not during initial sync
    if (userPreferences.theme_color !== currentTheme) {
      // Use a small delay to avoid race conditions
      const timeoutId = setTimeout(() => {
        updatePreferencesMutation.mutate({
          userId: user.id,
          preferences: { theme_color: currentTheme },
        });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTheme, user?.id]); // Only depend on currentTheme and user.id

  return null;
};
