import { useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
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

export default function CoastCurveChart({
  coastCurve,
  currentPortfolio,
  currentAge,
  title = 'Coast FIRE Number Over Time',
  collapsible = false,
  hint,
}) {
  const [isOpen, setIsOpen] = useState(!collapsible);

  if (!coastCurve || coastCurve.length === 0) return null;

  const data = coastCurve.map((d) => ({
    ...d,
    currentPortfolio,
  }));

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;

    const canCoast = currentPortfolio >= d.coastNumber;
    return (
      <div style={{
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '8px 12px',
        fontSize: '0.8rem',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Age {d.age}</div>
        <div>Coast Number: {fmt(d.coastNumber)}</div>
        <div>Your Portfolio: {fmt(currentPortfolio)}</div>
        <div style={{ color: canCoast ? '#2e7d32' : '#c62828', fontWeight: 600, marginTop: 4 }}>
          {canCoast ? 'Can coast at this age' : `Need ${fmt(d.coastNumber - currentPortfolio)} more`}
        </div>
      </div>
    );
  };

  const chartContent = (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="age"
            label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            tickFormatter={fmt}
            label={{ value: 'Coast Number', angle: -90, position: 'insideLeft', offset: 10 }}
          />
          <Tooltip content={customTooltip} />

          <Area
            type="monotone"
            dataKey="coastNumber"
            fill="#e8f5e9"
            stroke="none"
            fillOpacity={0.5}
          />
          <Line
            type="monotone"
            dataKey="coastNumber"
            stroke="#2e7d32"
            strokeWidth={2}
            dot={false}
            name="Coast Number"
          />
          <ReferenceLine
            y={currentPortfolio}
            stroke="#1565c0"
            strokeDasharray="5 5"
            label={{ value: `Current: ${fmt(currentPortfolio)}`, position: 'right', fill: '#1565c0' }}
          />
          {currentAge && (
            <ReferenceLine
              x={currentAge}
              stroke="#999"
              strokeDasharray="3 3"
              label={{ value: 'Now', position: 'top', fill: '#999' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="hint" style={{ textAlign: 'center', marginTop: '0.25rem' }}>
        {hint || 'The coast number decreases over time. Where the blue line crosses the green curve, you can stop contributing.'}
      </p>
    </>
  );

  if (collapsible) {
    return (
      <div className="chart-container" style={{ marginTop: '1rem' }}>
        <h3
          onClick={() => setIsOpen(!isOpen)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          {isOpen ? '\u25BC' : '\u25B6'} {title}
        </h3>
        {isOpen && chartContent}
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>{title}</h3>
      {chartContent}
    </div>
  );
}
