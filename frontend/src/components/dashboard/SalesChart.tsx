import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatMAD } from '@/lib/moroccan-utils';
import { ToggleButtonGroup } from '@/components/ui/ToggleButtonGroup';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Period = 'weekly' | 'monthly' | 'yearly';

interface SalesChartProps {
  data?: {
    label: string;
    value: number;
    originalDate?: string; // To help with sorting/filtering
  }[];
}

// Fallback to empty state if no data is provided
export const SalesChart = ({ data: displayData = [] }: SalesChartProps) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('monthly');

  const totalValue = displayData.reduce((sum, item) => sum + item.value, 0);
  const avgValue = displayData.length > 0 ? totalValue / displayData.length : 0;
  const changePercent = displayData.length > 1
    ? ((displayData[displayData.length - 1].value - displayData[0].value) / displayData[0].value * 100).toFixed(1)
    : '0.0';

  return (
    <div className="card-elevated p-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1 overflow-visible">
          <h3 className="text-lg font-heading font-semibold text-foreground">{t('dashboard.totalSales')}</h3>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 break-words overflow-visible whitespace-normal leading-tight">{formatMAD(totalValue)}</p>
          <p className={`text-sm ${Number(changePercent) >= 0 ? 'text-success' : 'text-destructive'}`}>
            {Number(changePercent) >= 0 ? '+' : ''}{changePercent}% {t('dashboard.thisPeriod')}
          </p>
        </div>
        <div className="flex-shrink-0">
          <ToggleButtonGroup
            options={[
              { value: 'weekly' as const, label: t('dashboard.weekly') },
              { value: 'monthly' as const, label: t('dashboard.monthly') },
              { value: 'yearly' as const, label: t('dashboard.yearly') },
            ]}
            value={period}
            onChange={(val) => setPeriod(val as Period)}
            size="sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-2">
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
          <ChevronLeft className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">{t('common.previous')}</span>
        </button>
        <span className="text-xs sm:text-sm text-muted-foreground font-medium text-center px-2 flex-1">
          {period === 'weekly' ? 'Current Week' : period === 'monthly' ? 'Year 2024' : 'All Time'}
        </span>
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
          <span className="hidden sm:inline">{t('common.next')}</span>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        </button>
      </div>

      <div className="h-[250px] min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="hsl(215, 16%, 47%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => String(t(`months.${value}`, value))}
            />
            <YAxis
              stroke="hsl(215, 16%, 47%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(214, 32%, 91%)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
              }}
              formatter={(value: number) => [formatMAD(value), t('dashboard.totalSales')]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
