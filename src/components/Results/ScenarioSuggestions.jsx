/**
 * Generates scenario suggestions based on current inputs and results.
 * Suggests tweaks that could improve success rate.
 */
export default function ScenarioSuggestions({ results, inputs, coastYearResult, perEarnerCoast }) {
  if (!results) return null;

  const suggestions = [];
  const successPct = results.successRate * 100;
  const targetPct = (inputs.confidenceTarget ?? 0.90) * 100;

  // Check each earner for FERS 1.1% bump opportunity
  inputs.earners.forEach((earner, i) => {
    if (earner.fers && earner.fers.mode === 'active') {
      const yos = earner.fers.currentYearsOfService ?? 0;
      const retAge = earner.retirementAge;
      const yearsToRetire = retAge - earner.currentAge;
      const totalYOS = yos + yearsToRetire;

      // 1.1% multiplier available if retiring at 62+ with 20+ years of service
      if (retAge < 62 && totalYOS + (62 - retAge) >= 20) {
        const extraYears = 62 - retAge;
        const projectedYOS = totalYOS + extraYears;
        const normalPension = earner.fers.currentSalary * 0.01 * totalYOS;
        const bumpedPension = earner.fers.currentSalary * 0.011 * projectedYOS;
        const increase = bumpedPension - normalPension;

        suggestions.push({
          type: 'fers-bump',
          earner: earner.name,
          text: `If ${earner.name} works until 62 (${extraYears} more years), they qualify for the 1.1% FERS multiplier with ${projectedYOS} years of service. Pension goes from ~$${Math.round(normalPension / 1000)}K to ~$${Math.round(bumpedPension / 1000)}K/yr (+$${Math.round(increase / 1000)}K/yr).`,
        });
      } else if (retAge >= 62 && totalYOS < 20) {
        const yearsNeeded = 20 - totalYOS;
        suggestions.push({
          type: 'fers-yos',
          earner: earner.name,
          text: `${earner.name} retires at 62+ but needs ${yearsNeeded} more years of service to reach 20 for the 1.1% FERS multiplier.`,
        });
      }
    }
  });

  // If not meeting target, suggest increasing retirement age
  if (!results.meetsConfidence) {
    suggestions.push({
      type: 'retire-later',
      text: `Current success rate is ${successPct.toFixed(1)}%, below the ${targetPct.toFixed(0)}% target. Consider delaying retirement by 2-3 years to increase contributions and reduce withdrawal years.`,
    });
  }

  // Per-earner coast suggestions
  if (perEarnerCoast && perEarnerCoast.length > 0) {
    perEarnerCoast.forEach((ec) => {
      if (!ec.alreadyCoasting && !ec.neverReaches && ec.coastAge) {
        const earner = inputs.earners[ec.earnerIndex];
        if (earner && ec.coastAge < earner.retirementAge) {
          const yearsEarly = earner.retirementAge - ec.coastAge;
          suggestions.push({
            type: 'earner-coast',
            earner: ec.earnerName,
            text: `${ec.earnerName} could stop contributing at age ${ec.coastAge} (${yearsEarly} years before retirement) while maintaining ${targetPct.toFixed(0)}% success.`,
          });
        }
      }
    });
  }

  // If success is very high, suggest reducing savings or earlier retirement
  if (successPct > 98) {
    suggestions.push({
      type: 'over-saving',
      text: `${successPct.toFixed(1)}% success suggests you may be over-saving. Consider reducing savings rate or exploring earlier retirement.`,
    });
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="scenario-suggestions">
      <h4>Scenario Suggestions</h4>
      <ul>
        {suggestions.map((s, i) => (
          <li key={i} className={`suggestion suggestion-${s.type}`}>
            {s.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
