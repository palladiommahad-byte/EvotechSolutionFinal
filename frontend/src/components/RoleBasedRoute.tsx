import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'manager' | 'accountant' | 'staff')[];
  allowedPaths?: string[];
}

// Define role-based route permissions
const rolePermissions: Record<string, string[]> = {
  admin: ['/', '/inventory', '/crm', '/invoicing', '/purchases', '/sales', '/stock-tracking', '/tax-reports', '/treasury', '/settings'],
  manager: ['/', '/inventory', '/crm', '/invoicing', '/purchases', '/sales', '/stock-tracking', '/tax-reports', '/treasury', '/settings'],
  accountant: ['/', '/tax-reports', '/treasury'], // Dashboard, Report, and Treasury
  staff: ['/', '/inventory', '/stock-tracking'], // Dashboard, Inventory, and Stock Tracking
};

export const RoleBasedRoute = ({ children, allowedRoles, allowedPaths }: RoleBasedRouteProps) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific allowed roles are provided, check them
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // If specific allowed paths are provided, check them
  if (allowedPaths && !allowedPaths.includes(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  // Check role-based permissions for the current path
  const userAllowedPaths = rolePermissions[user.role] || [];
  if (!userAllowedPaths.includes(location.pathname)) {
    // Redirect to dashboard if trying to access unauthorized page
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
