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
          <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.1} vertical={false} />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(value) => String(t(`months.${value}`, value))}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)',
                padding: '8px 12px',
              }}
              itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px', fontSize: '12px' }}
              formatter={(value: number) => [formatMAD(value), t('dashboard.totalEarnings')]}
              cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              fill="url(#revenueGradient)"
              activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
