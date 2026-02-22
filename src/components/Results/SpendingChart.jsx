import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const fmt = (n) => {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export default function SpendingChart({ spendingData, effectiveTaxRate }) {
  if (!spendingData || spendingData.length === 0) return null;

  const showPreTax = effectiveTaxRate > 0;

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;

    return (
      <div style={{
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '6px 10px',
        fontSize: '0.75rem',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 3 }}>Age {d.age}</div>
        <div>Expenses: {fmt(d.expenses)}</div>
        {showPreTax && <div>Pre-tax needed: {fmt(d.preTaxNeeded)}</div>}
      </div>
    );
  };

  return (
    <div className="chart-container">
      <h3>Spending Projection</h3>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={spendingData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="age"
            label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            tickFormatter={fmt}
            label={{ value: 'Annual Spending', angle: -90, position: 'insideLeft', offset: 10 }}
          />
          <Tooltip content={customTooltip} />

          {showPreTax && (
            <Area
              type="monotone"
              dataKey="preTaxNeeded"
              fill="#fff3e0"
              stroke="#ef6c00"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              fillOpacity={0.4}
              name="Pre-tax Needed"
            />
          )}
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="#1565c0"
            strokeWidth={2}
            dot={false}
            name="Expenses"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="hint" style={{ textAlign: 'center', marginTop: '0.15rem' }}>
        Deterministic projection using per-category inflation rates.
      </p>
    </div>
  );
}
