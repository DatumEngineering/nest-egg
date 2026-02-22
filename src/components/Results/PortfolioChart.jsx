import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const fmt = (n) => {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export default function PortfolioChart({ percentileBands, retirementAge }) {
  if (!percentileBands || percentileBands.length === 0) return null;

  // Transform data for stacked area fan chart:
  // To draw a filled band between p5 and p95, we stack:
  //   - base layer (p5 height, transparent)
  //   - band layer (p95 - p5 height, colored)
  const chartData = useMemo(() =>
    percentileBands.map((d) => ({
      age: d.age,
      // Raw values for tooltip
      p5: d.p5,
      p10: d.p10,
      p25: d.p25,
      p50: d.p50,
      p75: d.p75,
      p90: d.p90,
      p95: d.p95,
      mean: d.mean,
      // Stacked band layers
      base5: d.p5,
      band5_95: Math.max(0, d.p95 - d.p5),
      base10: d.p10,
      band10_90: Math.max(0, d.p90 - d.p10),
      base25: d.p25,
      band25_75: Math.max(0, d.p75 - d.p25),
    })),
    [percentileBands]
  );

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div style={{
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '8px 12px',
        fontSize: '0.8rem',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Age {data.age}</div>
        <div>95th: {fmt(data.p95)}</div>
        <div>90th: {fmt(data.p90)}</div>
        <div>75th: {fmt(data.p75)}</div>
        <div style={{ fontWeight: 600 }}>Median: {fmt(data.p50)}</div>
        <div>25th: {fmt(data.p25)}</div>
        <div>10th: {fmt(data.p10)}</div>
        <div>5th: {fmt(data.p5)}</div>
        <div style={{ color: '#f57c00', marginTop: 4 }}>Mean: {fmt(data.mean)}</div>
      </div>
    );
  };

  return (
    <div className="chart-container">
      <h3>Portfolio Value Over Time (Percentile Bands)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="age"
            label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            tickFormatter={fmt}
            label={{ value: 'Portfolio Value', angle: -90, position: 'insideLeft', offset: 10 }}
          />
          <Tooltip content={customTooltip} />

          {/* 5th-95th band */}
          <Area type="monotone" dataKey="base5" stackId="outer" fill="transparent" stroke="none" />
          <Area type="monotone" dataKey="band5_95" stackId="outer" fill="#e3f2fd" stroke="none" fillOpacity={0.7} name="5th-95th" />

          {/* 10th-90th band */}
          <Area type="monotone" dataKey="base10" stackId="mid" fill="transparent" stroke="none" />
          <Area type="monotone" dataKey="band10_90" stackId="mid" fill="#bbdefb" stroke="none" fillOpacity={0.7} name="10th-90th" />

          {/* 25th-75th band */}
          <Area type="monotone" dataKey="base25" stackId="inner" fill="transparent" stroke="none" />
          <Area type="monotone" dataKey="band25_75" stackId="inner" fill="#90caf9" stroke="none" fillOpacity={0.7} name="25th-75th" />

          {/* Median line */}
          <Line type="monotone" dataKey="p50" stroke="#1565c0" strokeWidth={2} dot={false} name="Median" />

          {/* Mean line */}
          <Line type="monotone" dataKey="mean" stroke="#f57c00" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Mean" />

          <ReferenceLine
            x={retirementAge}
            stroke="#e53935"
            strokeDasharray="3 3"
            label={{ value: 'Retirement', position: 'top', fill: '#e53935' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span style={{ color: '#90caf9' }}>25th-75th</span>
        {' | '}
        <span style={{ color: '#bbdefb' }}>10th-90th</span>
        {' | '}
        <span style={{ color: '#e3f2fd' }}>5th-95th</span>
        {' | '}
        <span style={{ color: '#1565c0', fontWeight: 600 }}>Median</span>
        {' | '}
        <span style={{ color: '#f57c00' }}>Mean</span>
      </div>
    </div>
  );
}
