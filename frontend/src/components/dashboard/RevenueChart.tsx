import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { formatMAD } from '@/lib/moroccan-utils';
import { useTranslation } from 'react-i18next';

interface RevenueChartProps {
  data?: { month: string; revenue: number; expenses?: number }[];
}

const yFmt = (v: number) => {
  if (v === 0) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}k`;
  return `${v}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p: any) => p.dataKey === 'revenue');
  const expenses = payload.find((p: any) => p.dataKey === 'expenses');
  return (
    <div style={{
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 8px 24px -4px rgb(0 0 0 / 0.15)',
      minWidth: 140,
    }}>
      <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, marginBottom: 6 }}>{label}</p>
      {revenue && (
        <p style={{ color: 'hsl(var(--foreground))', fontWeight: 700, fontSize: 15, marginBottom: expenses ? 4 : 0 }}>
          {formatMAD(revenue.value)}
        </p>
      )}
      {expenses && expenses.value > 0 && (
        <p style={{ color: 'hsl(var(--destructive))', fontWeight: 600, fontSize: 13 }}>
          − {formatMAD(expenses.value)}
        </p>
      )}
    </div>
  );
};

export const RevenueChart = ({ data: externalData }: RevenueChartProps) => {
  const { t } = useTranslation();

  // Use real data if available; otherwise show empty state
  const displayData = externalData && externalData.length > 0 ? externalData : [];

  const totalRevenue = displayData.reduce((s, d) => s + d.revenue, 0);
  const totalExpenses = displayData.reduce((s, d) => s + (d.expenses ?? 0), 0);
  const maxRevenue = Math.max(...displayData.map(d => d.revenue), 1);
  const avgRevenue = displayData.length > 0 ? totalRevenue / displayData.length : 0;
  const hasExpenses = displayData.some(d => (d.expenses ?? 0) > 0);
  const nonZeroMonths = displayData.filter(d => d.revenue > 0).length;

  return (
    <div className="card-elevated p-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-heading font-semibold text-foreground">
            {t('dashboard.revenueChart')}
          </h3>
          <p className="text-2xl font-bold text-foreground mt-1 leading-tight">
            {formatMAD(totalRevenue)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{t('dashboard.revenueTrends')}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block opacity-90" />
            <span className="text-xs text-muted-foreground">{t('dashboard.totalEarnings')}</span>
          </div>
          {hasExpenses && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-destructive inline-block" />
              <span className="text-xs text-muted-foreground">Dépenses</span>
            </div>
          )}
          {avgRevenue > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-muted-foreground inline-block opacity-50" />
              <span className="text-xs text-muted-foreground">Moy. {yFmt(avgRevenue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayData}
            margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
            barSize={18}
            barCategoryGap="25%"
          >
            <defs>
              <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="revenueBarGradTop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.75} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.1}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => String(t(`months.${v}`, v))}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={yFmt}
              width={38}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted-foreground))', fillOpacity: 0.06, radius: 4 }} />

            {/* Average reference line */}
            {avgRevenue > 0 && (
              <ReferenceLine
                y={avgRevenue}
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity={0.4}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}

            {/* Revenue bars */}
            <Bar dataKey="revenue" radius={[5, 5, 2, 2]}>
              {displayData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={
                    entry.revenue === maxRevenue && maxRevenue > 0
                      ? 'url(#revenueBarGradTop)'
                      : entry.revenue > 0
                        ? 'url(#revenueBarGrad)'
                        : 'hsl(var(--muted-foreground))'
                  }
                  fillOpacity={entry.revenue === 0 ? 0.12 : 1}
                />
              ))}
            </Bar>

            {/* Expenses line — only when data has expenses */}
            {hasExpenses && (
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 3"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer summary */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          {nonZeroMonths} mois avec revenus
        </span>
        {hasExpenses && (
          <span className="text-xs text-destructive font-medium">
            Dépenses: {formatMAD(totalExpenses)}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Pic: <span className="text-foreground font-medium">{yFmt(maxRevenue)}</span>
        </span>
      </div>
    </div>
  );
};
