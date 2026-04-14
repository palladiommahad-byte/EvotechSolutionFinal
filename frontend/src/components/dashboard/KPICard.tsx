import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';

interface KPICardProps {
  title: string;
  value: string;
  valueAsNumber?: number; // Optional: if provided, will use CurrencyDisplay with tooltip
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
  iconBg?: string;
}

export const KPICard = ({
  title,
  value,
  valueAsNumber,
  change,
  changeLabel,
  icon,
  iconBg = 'bg-primary/10',
}: KPICardProps) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  // Determine if the value is long and needs smaller font
  const isLongValue = value.length > 15;

  return (
    <div className="kpi-card animate-fade-in">
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className={cn("p-3 rounded-xl flex-shrink-0", iconBg)}>
          {icon}
        </div>
        <div className="text-right flex-1 min-w-0 overflow-visible">
          {change !== undefined && change !== 0 && (
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1 text-xs">
                {isPositive && <TrendingUp className="w-3 h-3 text-success flex-shrink-0" />}
                {isNegative && <TrendingDown className="w-3 h-3 text-destructive flex-shrink-0" />}
                <span
                  className={cn(
                    "font-medium",
                    isPositive && "text-success",
                    isNegative && "text-destructive"
                  )}
                >
                  {isPositive && '+'}
                  {change}%
                </span>
              </div>
              {changeLabel && (
                <span className="text-xs text-muted-foreground whitespace-normal text-right">{changeLabel}</span>
              )}
            </div>
          )}
          {change === 0 && changeLabel && (
            <span className="text-xs text-muted-foreground whitespace-normal">{changeLabel}</span>
          )}
        </div>
      </div>
      <div className="min-w-0 w-full overflow-visible">
        {valueAsNumber !== undefined ? (
          <CurrencyDisplay
            amount={valueAsNumber}
            className={cn(
              "font-heading font-bold text-foreground mb-1 leading-tight overflow-visible whitespace-normal break-words block",
              isLongValue ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
            )}
          />
        ) : (
          <p className={cn(
            "font-heading font-bold text-foreground mb-1 leading-tight overflow-visible whitespace-normal break-words",
            isLongValue ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
          )}>
            {value}
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
      </div>
    </div>
  );
};
