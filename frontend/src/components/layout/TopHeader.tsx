import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { toast } from '@/hooks/use-toast';


import { Button } from '@/components/ui/button';
import { Bell, Search, User, Settings, LogOut, UserCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

export const TopHeader = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user: authUser, logout } = useAuth();
  const { companyInfo } = useCompany();
  const { unreadCount } = useNotifications();

  const companyLogo = companyInfo.logo;
  // Use auth user data directly
  const displayName = authUser?.name || 'User';
  const displayEmail = authUser?.email || '';
  const displayRole = authUser?.role || '';

  const handleLogout = () => {
    logout();
    toast({
      title: t('auth.loggedOut'),
      description: t('auth.loggedOutDescription'),
      variant: "success",
    });
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Welcome Message */}
      <div className="flex items-center gap-4 flex-1">
        <h1 className="text-lg font-medium text-foreground">
          {t('auth.welcomeBackUser', { name: '' })}
          <span className="text-primary font-semibold ml-1">{displayName}</span>
        </h1>
      </div>

      {/* Language Switcher & Date */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-full border border-border/50">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {format(new Date(), 'EEEE, d MMMM yyyy', {
              locale: i18n.language === 'fr' ? fr : enUS
            })}
          </span>
        </div>
        <LanguageSwitcher />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <NotificationDropdown>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground relative rounded-full data-[state=open]:bg-primary data-[state=open]:text-primary-foreground"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs p-0"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </NotificationDropdown>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative rounded-full data-[state=open]:bg-primary data-[state=open]:text-primary-foreground">
                <Avatar className="w-8 h-8 border-2 border-border hover:border-primary/50 transition-colors">
                  <AvatarImage src={companyLogo || undefined} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">{displayRole}</p>
                  {displayEmail && (
                    <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
