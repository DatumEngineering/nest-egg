import HouseholdStep from './HouseholdStep.jsx';
import RetirementVisionStep from './RetirementVisionStep.jsx';
import AssetsEventsStep from './AssetsEventsStep.jsx';
import InvestmentStrategyStep from './InvestmentStrategyStep.jsx';

export default function InputForm({
  inputs,
  updateInput,
  updateNestedInput,
  updateEarner,
  addEarner,
  removeEarner,
  setLocation,
  addWindfall,
  updateWindfall,
  removeWindfall,
  addProperty,
  updateProperty,
  removeProperty,
  addPrimaryResidence,
  updatePrimaryResidence,
  clearPrimaryResidence,
  primaryAge,
  totalPortfolio,
  effectiveKneeYear,
  totalYears,
  onRun,
  isRunning,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onRun();
  };

  return (
    <form className="input-form" onSubmit={handleSubmit} noValidate>
      <HouseholdStep
        inputs={inputs}
        updateEarner={updateEarner}
        addEarner={addEarner}
        removeEarner={removeEarner}
        totalPortfolio={totalPortfolio}
      />
      <RetirementVisionStep
        inputs={inputs}
        updateInput={updateInput}
        setLocation={setLocation}
      />
      <AssetsEventsStep
        inputs={inputs}
        addWindfall={addWindfall}
        updateWindfall={updateWindfall}
        removeWindfall={removeWindfall}
        addProperty={addProperty}
        updateProperty={updateProperty}
        removeProperty={removeProperty}
        addPrimaryResidence={addPrimaryResidence}
        updatePrimaryResidence={updatePrimaryResidence}
        clearPrimaryResidence={clearPrimaryResidence}
        primaryAge={primaryAge}
      />
      <InvestmentStrategyStep
        inputs={inputs}
        updateInput={updateInput}
        updateNestedInput={updateNestedInput}
        effectiveKneeYear={effectiveKneeYear}
        totalYears={totalYears}
      />

      <button type="submit" className="run-button" disabled={isRunning}>
        {isRunning ? 'Running Simulation...' : 'Run Simulation'}
      </button>
    </form>
  );
}
