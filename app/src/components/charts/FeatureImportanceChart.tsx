import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FeatureImportance } from '@/api/types';
import { formatPercent } from '@/lib/format';
import { CHART_COLORS } from './chartColors';
import styles from './charts.module.css';

export interface FeatureImportanceChartProps {
  data: readonly FeatureImportance[];
}

/** Горизонтальна діаграма важливості ознак «моделі». */
export function FeatureImportanceChart({ data }: FeatureImportanceChartProps) {
  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[...data]}
          layout="vertical"
          margin={{ top: 8, right: 32, bottom: 8, left: 8 }}
        >
          <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 'dataMax']}
            tickFormatter={(value: number) => formatPercent(value)}
            stroke={CHART_COLORS.axisText}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={168}
            stroke={CHART_COLORS.axisText}
            tick={{ fontSize: 12 }}
          />
          <Tooltip formatter={(value) => formatPercent(Number(value), 1)} />
          <Bar dataKey="importance" name="Важливість" fill={CHART_COLORS.primary} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
