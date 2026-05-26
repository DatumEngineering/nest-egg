import NumericInput from './NumericInput.jsx';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function ContributionPeriods({ periods, salary, currentAge, retirementAge, onChange }) {
  const addPeriod = () => {
    const last = periods[periods.length - 1];
    const nextAge = Math.min(last.fromAge + 10, retirementAge - 1);
    if (nextAge <= last.fromAge) return;
    onChange([...periods, { fromAge: nextAge, rate: last.rate }]);
  };

  const update = (i, key, val) => {
    const updated = periods.map((p, idx) => (idx === i ? { ...p, [key]: val } : p));
    onChange(updated);
  };

  const remove = (i) => onChange(periods.filter((_, idx) => idx !== i));

  const canAddPeriod = periods[periods.length - 1].fromAge < retirementAge - 1;

  return (
    <div className="contribution-periods">
      <div className="contribution-periods-label">Contribution Schedule</div>
      {periods.map((period, i) => {
        const isFirst = i === 0;
        const prevFromAge = i > 0 ? periods[i - 1].fromAge : currentAge;
        const nextFromAge = i + 1 < periods.length ? periods[i + 1].fromAge - 1 : retirementAge - 1;
        return (
          <div key={i} className="contribution-period-row">
            <span className="cp-when">
              {isFirst ? (
                `Now (age ${currentAge})`
              ) : (
                <>
                  Age{' '}
                  <NumericInput
                    value={period.fromAge}
                    onChange={(e) => update(i, 'fromAge', Number(e.target.value))}
                    min={prevFromAge + 1}
                    max={nextFromAge}
                    className="cp-age-input"
                  />
                </>
              )}
            </span>
            <span className="cp-rate">
              <NumericInput
                value={(period.rate * 100).toFixed(0)}
                onChange={(e) => update(i, 'rate', Number(e.target.value) / 100)}
                min={0}
                max={100}
                step={5}
                className="cp-rate-input"
              />
              <span className="cp-pct">%</span>
            </span>
            <span className="cp-hint">{fmt(salary * period.rate)}/yr</span>
            {!isFirst && (
              <button
                type="button"
                className="remove-pension-btn"
                onClick={() => remove(i)}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
      {canAddPeriod && (
        <button type="button" className="add-pension-btn cp-add-btn" onClick={addPeriod}>
          + Add Period
        </button>
      )}
    </div>
  );
}
