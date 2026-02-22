import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function YieldCurveChart({ curveData }) {
  if (!curveData || curveData.length === 0) return null;

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;

    return (
      <div style={{
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '8px 12px',
        fontSize: '0.8rem',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Age {d.age} (Year {d.year})</div>
        <div>Mean Return: {d.meanPct.toFixed(1)}%</div>
        <div>Volatility: {d.volPct.toFixed(1)}%</div>
        <div>1-sigma range: {d.lowerBound.toFixed(1)}% to {d.upperBound.toFixed(1)}%</div>
      </div>
    );
  };

  return (
    <div className="chart-container">
      <h3>Investment Glide Path</h3>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={curveData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="age"
            label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            label={{ value: 'Return (%)', angle: -90, position: 'insideLeft', offset: 10 }}
          />
          <Tooltip content={customTooltip} />

          <Area type="monotone" dataKey="bandBase" stackId="vol" fill="transparent" stroke="none" />
          <Area type="monotone" dataKey="bandWidth" stackId="vol" fill="#e3f2fd" stroke="none" fillOpacity={0.6} name="1-sigma" />

          <Line type="monotone" dataKey="meanPct" stroke="#1565c0" strokeWidth={2} dot={false} name="Mean Return" />
          <Line type="monotone" dataKey="volPct" stroke="#f57c00" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Volatility" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span style={{ color: '#1565c0', fontWeight: 600 }}>Mean Return</span>
        {' | '}
        <span style={{ color: '#f57c00' }}>Volatility</span>
        {' | '}
        <span style={{ color: '#e3f2fd', background: '#333', padding: '0 4px', borderRadius: 2 }}>1-sigma band</span>
      </div>
    </div>
  );
}
