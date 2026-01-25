import { cn } from '@/lib/utils';

type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface StatusBadgeProps {
  status: StatusType;
  children: React.ReactNode;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  success: 'status-success',
  warning: 'status-warning',
  danger: 'status-danger',
  info: 'status-info',
  default: 'status-default',
};

export const StatusBadge = ({ status, children, className }: StatusBadgeProps) => {
  return (
    <span className={cn('status-badge', statusStyles[status], className)}>
      {children}
    </span>
  );
};
