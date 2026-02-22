import { useState } from 'react';
import InputForm from './components/InputForm/index.jsx';
import Results from './components/Results/index.jsx';
import AboutPanel from './components/AboutPanel.jsx';
import { useSimulation } from './hooks/useSimulation.js';
import './App.css';

function App() {
  const {
    inputs,
    updateInput,
    updateNestedInput,
    updateEarner,
    addEarner,
    removeEarner,
    addWindfall,
    updateWindfall,
    removeWindfall,
    addProperty,
    updateProperty,
    removeProperty,
    addPrimaryResidence,
    updatePrimaryResidence,
    clearPrimaryResidence,
    setLocation,
    results,
    coastResult,
    coastYearResult,
    perEarnerCoast,
    yieldCurveData,
    deterministicCoastData,
    spendingProjectionData,
    totalPortfolio,
    primaryAge,
    deathAge,
    effectiveKneeYear,
    isRunning,
    error,
    runSimulation,
  } = useSimulation();

  const totalYears = deathAge - primaryAge;
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-row">
          <div className="header-left">
            <h1>NestEgg</h1>
            <p className="tagline">See how prepared you really are</p>
          </div>
          <button className="about-link" onClick={() => setShowAbout(true)} type="button">
            About
          </button>
        </div>
      </header>

      <AboutPanel isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <main className="app-main">
        <div className="input-panel">
          <div className="privacy-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Your data never leaves your browser. No accounts, no cookies, no tracking.</span>
          </div>
          <InputForm
            inputs={inputs}
            updateInput={updateInput}
            updateNestedInput={updateNestedInput}
            updateEarner={updateEarner}
            addEarner={addEarner}
            removeEarner={removeEarner}
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
            setLocation={setLocation}
            totalPortfolio={totalPortfolio}
            effectiveKneeYear={effectiveKneeYear}
            totalYears={totalYears}
            onRun={runSimulation}
            isRunning={isRunning}
          />
        </div>

        <div className="results-panel">
          <Results
            results={results}
            coastResult={coastResult}
            coastYearResult={coastYearResult}
            perEarnerCoast={perEarnerCoast}
            yieldCurveData={yieldCurveData}
            deterministicCoastData={deterministicCoastData}
            spendingProjectionData={spendingProjectionData}
            inputs={inputs}
            totalPortfolio={totalPortfolio}
            primaryAge={primaryAge}
            error={error}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
