import { Check, Palette } from 'lucide-react';
import { useTheme, themeColors, ThemeColor } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateUserPreferences } from '@/hooks/useSettings';

export const ThemeCustomizer = () => {
  const { currentTheme, setTheme } = useTheme();
  const { user } = useAuth();
  const updatePreferencesMutation = useUpdateUserPreferences();

  const colorOptions: ThemeColor[] = ['navy', 'indigo', 'blue', 'sky', 'teal', 'slate', 'rose', 'cyan', 'yellow'];

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-heading font-semibold text-foreground">App Theme Colors</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-6">
        Choose your preferred accent color for the application interface.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {colorOptions.map((color) => {
          const config = themeColors[color];
          const isSelected = currentTheme === color;

          return (
            <button
              key={color}
              onClick={() => {
                setTheme(color);
                // Save to database if user is logged in
                if (user?.id) {
                  updatePreferencesMutation.mutate({
                    userId: user.id,
                    preferences: { theme_color: color },
                  });
                }
              }}
              className={cn(
                "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50 hover:bg-section'
              )}
            >
              <div
                className="w-12 h-12 rounded-full shadow-lg relative"
                style={{ background: config.gradient }}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              <span className={cn(
                "text-sm font-medium",
                isSelected ? 'text-primary' : 'text-foreground'
              )}>
                {config.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-section rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Preview:</strong> The selected color will be applied to buttons, 
          sidebar active states, and accent elements throughout the app.
        </p>
      </div>
    </div>
  );
};
