import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  User,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useTranslation } from 'react-i18next';



// Navigation items with translation keys
const getNavigationItems = (t: (key: string) => string) => [
  { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'accountant', 'staff'] },
  { name: t('nav.allItems'), href: '/inventory', icon: Package, roles: ['admin', 'manager', 'staff'] },
  { name: t('nav.newStocksIn'), href: '/stock-tracking', icon: BarChart3, roles: ['admin', 'manager', 'staff'] },
  { name: t('nav.sales'), href: '/sales', icon: TrendingUp, roles: ['admin', 'manager'] },
  { name: t('nav.purchase'), href: '/purchases', icon: ShoppingCart, roles: ['admin', 'manager'] },
  { name: t('nav.report'), href: '/tax-reports', icon: FileSpreadsheet, roles: ['admin', 'manager', 'accountant'] },
];

const getSecondaryNavItems = (t: (key: string) => string) => [
  { name: t('nav.crm'), href: '/crm', icon: Users, roles: ['admin', 'manager'] },
  { name: t('nav.treasury'), href: '/treasury', icon: Wallet, roles: ['admin', 'manager', 'accountant'] },
  { name: t('nav.settings'), href: '/settings', icon: Settings, roles: ['admin', 'manager'] },
];

export const AppSidebar = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const { user: authUser } = useAuth();
  const { companyInfo } = useCompany();

  const companyName = companyInfo.name || 'My Store';
  const companyLogo = companyInfo.logo;

  // Filter navigation based on user role
  const userRole = authUser?.role || 'staff';
  const allNavigationItems = getNavigationItems(t);
  const allSecondaryNavItems = getSecondaryNavItems(t);
  const navigation = allNavigationItems.filter(item => item.roles.includes(userRole));
  const secondaryNav = allSecondaryNavItems.filter(item => item.roles.includes(userRole));

  const displayName = authUser?.name || 'User';
  const displayRole = authUser?.role || 'staff';

  return (
    <aside
      className={cn(
        "h-screen bg-primary flex flex-col transition-all duration-300 relative",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn("h-16 flex items-center min-w-0 relative", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            {companyLogo ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white/10 flex-shrink-0">
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-warning flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
            )}
            <span
              className={cn(
                "font-heading font-bold text-primary-foreground leading-tight truncate min-w-0 flex-1 block",
                companyName.length > 25 ? "text-xs" : companyName.length > 18 ? "text-sm" : "text-base"
              )}
              title={companyName}
            >
              {companyName}
            </span>
          </div>
        )}
        {collapsed && (
          <div className="relative group">
            {companyLogo ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white/10">
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-warning flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {companyName}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/30 transition-colors z-10",
            collapsed ? "absolute top-2 right-1" : "flex-shrink-0"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        <div className={cn("space-y-1", collapsed ? "px-2" : "px-3")}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-200 relative group",
                  collapsed
                    ? "justify-center px-2 py-2.5 w-full"
                    : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-primary-foreground text-primary shadow-sm"
                    : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                )}
              >
                <item.icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-5 h-5")} />
                {!collapsed && <span className="truncate">{item.name}</span>}
                {collapsed && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.name}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Divider */}
        <div className={cn("border-t border-primary-foreground/20", collapsed ? "mx-2 my-4" : "my-4")} />

        {/* Secondary Navigation */}
        <div className={cn("space-y-1", collapsed ? "px-2" : "px-3")}>
          {secondaryNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-200 relative group",
                  collapsed
                    ? "justify-center px-2 py-2.5 w-full"
                    : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-primary-foreground text-primary shadow-sm"
                    : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                )}
              >
                <item.icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-5 h-5")} />
                {!collapsed && <span className="truncate">{item.name}</span>}
                {collapsed && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.name}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className={cn("border-t border-primary-foreground/20", collapsed ? "p-2" : "p-3")}>
        {collapsed ? (
          <div className="relative group flex justify-center">
            <Avatar className="w-8 h-8 border-2 border-primary-foreground/20">
              <AvatarImage src={undefined} alt={displayName} />
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              <div>{displayName}</div>
              <div className="text-muted-foreground capitalize">{displayRole}</div>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-primary-foreground/80">
            <Avatar className="w-8 h-8 border-2 border-primary-foreground/20 flex-shrink-0">
              <AvatarImage src={undefined} alt={displayName} />
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary-foreground truncate">{displayName}</p>
              <p className="text-xs text-primary-foreground/60 truncate capitalize">{displayRole}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
