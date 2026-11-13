import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BIN_STATUS_LIST, RegressionChartPoint, STATUS_META } from '../../types';

export interface DistributionDatum {
  status: string;
  key: keyof typeof STATUS_META;
  count: number;
}

export const StatusDistributionChart: React.FC<{ data: DistributionDatum[] }> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: -16, bottom: 4 }}>
          <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="status"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.08)' }}
            contentStyle={{
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#F1F5F9',
            }}
          />
          <Bar dataKey="count" name="Dustbins" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={STATUS_META[entry.key].hex} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface FillHistorySeriesPoint {
  time: string;
  fillPercentage: number;
  distanceCm: number;
}

export const FillHistoryAreaChart: React.FC<{
  data: FillHistorySeriesPoint[];
  accentHex?: string;
}> = ({ data, accentHex = '#06B6D4' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        No fill history recorded yet. Interact with the simulator to capture readings.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -14, bottom: 4 }}>
          <defs>
            <linearGradient id="fillAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accentHex} stopOpacity={0.35} />
              <stop offset="95%" stopColor={accentHex} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#F1F5F9',
            }}
          />
          <Area
            type="monotone"
            dataKey="fillPercentage"
            name="Fill Level (%)"
            stroke={accentHex}
            strokeWidth={2}
            fill="url(#fillAreaGrad)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface BinComparisonDatum {
  code: string;
  fillPercentage: number;
  distanceCm: number;
  status: keyof typeof STATUS_META;
}

export const FleetFillBarChart: React.FC<{ data: BinComparisonDatum[] }> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: -14, bottom: 4 }}>
          <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="code"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.08)' }}
            contentStyle={{
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#F1F5F9',
            }}
          />
          <Bar dataKey="fillPercentage" name="Fill %" radius={[6, 6, 0, 0]} maxBarSize={44}>
            {data.map((entry) => (
              <Cell key={entry.code} fill={STATUS_META[entry.status].hex} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RegressionTrendChart: React.FC<{ data: RegressionChartPoint[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-slate-400">
        No historical fill points available for regression plotting.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
          <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#F1F5F9',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#CBD5E1' }} />
          <Line
            type="monotone"
            dataKey="actualFill"
            name="Actual Fill History (%)"
            stroke="#22D3EE"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#22D3EE' }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="projectedFill"
            name="Linear Regression Trend (%)"
            stroke="#F59E0B"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ClassDistributionChart: React.FC<{
  counts: Record<(typeof BIN_STATUS_LIST)[number], number>;
}> = ({ counts }) => {
  const data = BIN_STATUS_LIST.map((key) => ({
    key,
    label: STATUS_META[key].label,
    count: counts[key] || 0,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
          <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.08)' }}
            contentStyle={{
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#F1F5F9',
            }}
          />
          <Bar dataKey="count" name="Samples" radius={[5, 5, 0, 0]} maxBarSize={44}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={STATUS_META[entry.key].hex} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
