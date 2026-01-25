import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';

export const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { companyInfo } = useCompany();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showStatusChangeAlert, setShowStatusChangeAlert] = useState(false);

  // Check if user was logged out due to status change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const statusChangeLogout = localStorage.getItem('statusChangeLogout');
      if (statusChangeLogout === 'true') {
        setShowStatusChangeAlert(true);
        // Clear the flag
        localStorage.removeItem('statusChangeLogout');
        localStorage.removeItem('statusChangeTimestamp');
      }
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: Location })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location.state, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);

      if (success) {
        toast({
          title: t('auth.welcomeBackToast'),
          description: t('auth.welcomeBackToastDescription'),
          variant: "success",
        });

        // Small delay to ensure state is updated before navigation
        // This prevents the redirect loop issue
        await new Promise(resolve => setTimeout(resolve, 100));

        // Redirect to the page user was trying to access, or home
        const from = (location.state as { from?: Location })?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        toast({
          title: t('auth.loginFailed'),
          description: t('auth.invalidCredentialsDescription'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('auth.error'),
        description: t('auth.errorDescription'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-section flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary-foreground rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-foreground rounded-full translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            {companyInfo.logo ? (
              <div className="w-16 h-16 rounded-xl bg-primary-foreground/10 flex items-center justify-center overflow-hidden border border-primary-foreground/20">
                <img
                  src={companyInfo.logo}
                  alt={companyInfo.name}
                  className="w-full h-full object-contain p-2"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-primary-foreground" />
              </div>
            )}
            <div>
              <span className="text-2xl font-heading font-bold text-primary-foreground">{companyInfo.name}</span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-heading font-bold text-primary-foreground mb-4">
            {t('auth.inventoryMadeForMorocco').split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md whitespace-pre-line">
            {t('auth.manageInventoryDescription')}
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-sm text-primary-foreground/60">
            © {new Date().getFullYear()} {companyInfo.name}. {t('auth.allRightsReserved')}
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            {companyInfo.logo ? (
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                <img
                  src={companyInfo.logo}
                  alt={companyInfo.name}
                  className="w-full h-full object-contain p-2"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
            )}
            <div>
              <span className="text-xl font-heading font-bold text-foreground">{companyInfo.name}</span>
            </div>
          </div>

          <div className="card-elevated p-8">
            <div className="text-center mb-8">
              {/* Logo in login form */}
              {companyInfo.logo && (
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-xl bg-primary/5 flex items-center justify-center overflow-hidden border border-border">
                    <img
                      src={companyInfo.logo}
                      alt={companyInfo.name}
                      className="w-full h-full object-contain p-3"
                    />
                  </div>
                </div>
              )}
              <h2 className="text-2xl font-heading font-bold text-foreground">{t('auth.welcomeBack')}</h2>
              <p className="text-muted-foreground mt-2">{t('auth.signInToAccount')}</p>
            </div>

            {showStatusChangeAlert && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('auth.accessRevoked')}</AlertTitle>
                <AlertDescription>
                  {t('auth.accessRevokedDescription')}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.ma"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded border-border" />
                  <span className="text-muted-foreground">{t('auth.rememberMe')}</span>
                </label>
              </div>

              <Button type="submit" className="w-full btn-primary-gradient" disabled={isLoading}>
                {isLoading ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('auth.dontHaveAccount')}{' '}
                <a href="#" className="text-primary hover:underline font-medium">
                  {t('auth.contactSales')}
                </a>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            {t('auth.bySigningIn')}
          </p>
        </div>
      </div>
    </div>
  );
};
