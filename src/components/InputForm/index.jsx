import HouseholdStep from './HouseholdStep.jsx';
import VisionStep from './VisionStep.jsx';
import StrategyStep from './StrategyStep.jsx';

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
  setRiskPreset,
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
      <VisionStep
        inputs={inputs}
        updateInput={updateInput}
        setLocation={setLocation}
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
      <StrategyStep
        inputs={inputs}
        updateInput={updateInput}
        updateNestedInput={updateNestedInput}
        setRiskPreset={setRiskPreset}
        effectiveKneeYear={effectiveKneeYear}
        totalYears={totalYears}
      />

      <button type="submit" className="run-button" disabled={isRunning}>
        {isRunning ? 'Running Simulation...' : 'Run Simulation'}
      </button>
    </form>
  );
}
