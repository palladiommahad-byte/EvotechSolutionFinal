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
import { useTranslation } from 'react-i18next';

const data = [
  { month: 'Jan', revenue: 245000 },
  { month: 'Feb', revenue: 312000 },
  { month: 'Mar', revenue: 287000 },
  { month: 'Apr', revenue: 356000 },
  { month: 'May', revenue: 423000 },
  { month: 'Jun', revenue: 398000 },
  { month: 'Jul', revenue: 445000 },
  { month: 'Aug', revenue: 412000 },
  { month: 'Sep', revenue: 478000 },
  { month: 'Oct', revenue: 523000 },
  { month: 'Nov', revenue: 567000 },
  { month: 'Dec', revenue: 612000 },
];

interface RevenueChartProps {
  data?: {
    month: string;
    revenue: number;
    expenses?: number;
  }[];
}

export const RevenueChart = ({ data: externalData }: RevenueChartProps) => {
  const { t } = useTranslation();
  const displayData = externalData && externalData.length > 0 ? externalData : data;
  return (
    <div className="card-elevated p-6 animate-slide-up">
      <div className="mb-6 overflow-visible">
        <h3 className="text-lg font-heading font-semibold text-foreground">{t('dashboard.revenueChart')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('dashboard.revenueTrends')}</p>
      </div>
      <div className="h-[250px] min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
            <XAxis
              dataKey="month"
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
              formatter={(value: number) => [formatMAD(value), t('dashboard.totalEarnings')]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
