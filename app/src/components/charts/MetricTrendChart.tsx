import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MetricTrendPoint } from '@/api/types';
import { formatDate } from '@/lib/format';
import { CHART_COLORS } from './chartColors';
import styles from './charts.module.css';

export interface MetricTrendChartProps {
  data: readonly MetricTrendPoint[];
}

/** Тренд метрик якості «моделі» за період (тижневі точки). */
export function MetricTrendChart({ data }: MetricTrendChartProps) {
  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...data]} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="period"
            tickFormatter={(value: string) => formatDate(value)}
            stroke={CHART_COLORS.axisText}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            domain={[0.6, 1]}
            tickFormatter={(value: number) => value.toFixed(2)}
            stroke={CHART_COLORS.axisText}
            tick={{ fontSize: 12 }}
          />
          <Tooltip formatter={(value) => Number(value).toFixed(3)} />
          <Legend />
          <Line
            type="monotone"
            dataKey="rocAuc"
            name="ROC-AUC"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="f1"
            name="F1-міра"
            stroke={CHART_COLORS.secondary}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="precision"
            name="Точність"
            stroke={CHART_COLORS.tertiary}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
