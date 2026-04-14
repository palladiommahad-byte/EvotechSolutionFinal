import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';
import { settingsService } from '@/services/settings.service';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'accountant' | 'staff';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: (statusChange?: boolean) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('auth_user');
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        const token = localStorage.getItem('auth_token');

        if (storedUser && isAuthenticated && token) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);

            // Verify token is still valid (non-blocking)
            apiClient.auth.getCurrentUser().then(currentUser => {
              if (!currentUser) {
                // Token invalid, log out
                setUser(null);
                apiClient.auth.removeToken();
              }
            }).catch(() => {
              // API error - keep localStorage user as fallback
              console.warn('Token verification failed, using localStorage user');
            });
          } catch (parseError) {
            console.error('Error parsing stored user:', parseError);
            localStorage.removeItem('auth_user');
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('auth_token');
          }
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('auth_token');
      }
    }
    setLoading(false);
  }, []);

  // Monitor user status changes
  useEffect(() => {
    if (!user || loading) return;

    const checkUserStatus = async () => {
      try {
        const dbUser = await settingsService.getUserById(user.id);

        if (dbUser && dbUser.status !== 'active') {
          setUser(null);
          if (typeof window !== 'undefined') {
            apiClient.auth.removeToken();
            localStorage.setItem('statusChangeLogout', 'true');
            localStorage.setItem('statusChangeTimestamp', Date.now().toString());
            window.location.href = '/login';
          }
          return;
        }
      } catch (error) {
        console.warn('Error checking user status (non-critical):', error);
      }
    };

    const interval = setInterval(() => {
      if (user) {
        checkUserStatus();
      }
    }, 30000);

    const handleUserStatusChange = () => {
      if (user) {
        checkUserStatus();
      }
    };
    window.addEventListener('userStatusChanged', handleUserStatusChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('userStatusChanged', handleUserStatusChange);
    };
  }, [user, loading]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      if (!email || !password) {
        return false;
      }

      try {
        const response = await apiClient.auth.login(email, password);

        if (response.token && response.user) {
          const authenticatedUser: User = {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email || email,
            role: response.user.role || 'staff',
          };

          setUser(authenticatedUser);
          return true;
        }
      } catch (error) {
        console.warn('Login failed:', error);
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = (statusChange: boolean = false) => {
    setUser(null);
    apiClient.auth.logout();

    if (typeof window !== 'undefined') {
      if (statusChange) {
        localStorage.setItem('statusChangeLogout', 'true');
        localStorage.setItem('statusChangeTimestamp', Date.now().toString());
        window.dispatchEvent(new CustomEvent('userLoggedOutDueToStatusChange'));
      }
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
