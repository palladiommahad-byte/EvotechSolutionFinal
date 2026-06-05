import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { formatMAD } from '@/lib/moroccan-utils';
import { useTranslation } from 'react-i18next';

const MONTHS = [
  { key: '01', label: 'Jan' },
  { key: '02', label: 'Fév' },
  { key: '03', label: 'Mar' },
  { key: '04', label: 'Avr' },
  { key: '05', label: 'Mai' },
  { key: '06', label: 'Jun' },
  { key: '07', label: 'Jul' },
  { key: '08', label: 'Aoû' },
  { key: '09', label: 'Sep' },
  { key: '10', label: 'Oct' },
  { key: '11', label: 'Nov' },
  { key: '12', label: 'Déc' },
];

interface SalesChartProps {
  data?: { label: string; value: number; originalDate?: string }[];
}

const yFmt = (v: number) => {
  if (v === 0) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}k`;
  return `${v}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 8px 24px -4px rgb(0 0 0 / 0.15)',
    }}>
      <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, marginBottom: 4 }}>{label}</p>
      <p style={{ color: 'hsl(var(--foreground))', fontWeight: 700, fontSize: 15 }}>
        {formatMAD(payload[0].value)}
      </p>
    </div>
  );
};

export const SalesChart = ({ data = [] }: SalesChartProps) => {
  const { t } = useTranslation();
  const currentMonth = new Date().getMonth() + 1;

  // Fill all 12 months — match incoming data by month number or abbreviation
  const fullData = MONTHS.map(({ key, label }) => {
    const num = parseInt(key, 10);
    const match = data.find(d => {
      const lbl = String(d.label).trim();
      return (
        lbl === key ||
        lbl === String(num) ||
        lbl.toLowerCase() === label.toLowerCase() ||
        lbl.startsWith(key) ||
        lbl.padStart(2, '0') === key
      );
    });
    return {
      month: label,
      value: match?.value ?? 0,
      isCurrent: num === currentMonth,
    };
  });

  const totalValue = fullData.reduce((s, d) => s + d.value, 0);
  const maxValue = Math.max(...fullData.map(d => d.value), 1);
  const avgValue = totalValue / 12;

  const nonZeroMonths = fullData.filter(d => d.value > 0);
  const changePercent = nonZeroMonths.length >= 2
    ? (((nonZeroMonths[nonZeroMonths.length - 1].value - nonZeroMonths[0].value) / nonZeroMonths[0].value) * 100).toFixed(1)
    : null;

  return (
    <div className="card-elevated p-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-heading font-semibold text-foreground">
            {t('dashboard.totalSales')}
          </h3>
          <p className="text-2xl font-bold text-foreground mt-1 leading-tight">
            {formatMAD(totalValue)}
          </p>
          {changePercent !== null && (
            <p className={`text-xs mt-1 font-medium ${Number(changePercent) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {Number(changePercent) >= 0 ? '▲' : '▼'} {Math.abs(Number(changePercent))}% {t('dashboard.thisPeriod')}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-muted-foreground">{new Date().getFullYear()}</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block opacity-90" />
            <span className="text-xs text-muted-foreground">{t('dashboard.totalSales')}</span>
          </div>
          {avgValue > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-muted-foreground inline-block opacity-50" />
              <span className="text-xs text-muted-foreground">Moy. {yFmt(avgValue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={fullData}
            margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
            barSize={18}
            barCategoryGap="25%"
          >
            <defs>
              <linearGradient id="salesBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="salesBarGradActive" x1="0" y1="0" x2="0" y2="1">
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

            {/* Average reference line — only when there's real data */}
            {avgValue > 0 && (
              <ReferenceLine
                y={avgValue}
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity={0.4}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}

            <Bar dataKey="value" radius={[5, 5, 2, 2]}>
              {fullData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={
                    entry.value === maxValue && maxValue > 0
                      ? 'url(#salesBarGradActive)'
                      : entry.value > 0
                        ? 'url(#salesBarGrad)'
                        : 'hsl(var(--muted-foreground))'
                  }
                  fillOpacity={entry.value === 0 ? 0.12 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer summary */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          {nonZeroMonths.length} mois avec activité
        </span>
        <span className="text-xs text-muted-foreground">
          Meilleur: <span className="text-foreground font-medium">{yFmt(maxValue)}</span>
        </span>
      </div>
    </div>
  );
};
