import { useState, useRef, useCallback } from 'react';
import InputForm from './components/InputForm/index.jsx';
import Results from './components/Results/index.jsx';
import AboutPanel from './components/AboutPanel.jsx';
import { useSimulation } from './hooks/useSimulation.js';
import './App.css';

const NESTEGG_VERSION = 1;

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
    setInputs,
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
  const fileInputRef = useRef(null);

  const handleExport = useCallback(() => {
    const data = {
      version: NESTEGG_VERSION,
      exportedAt: new Date().toISOString(),
      inputs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `nestegg-${date}.nestegg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [inputs]);

  const handleImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.inputs) {
          setInputs(data.inputs);
        } else {
          // Bare inputs object (no wrapper)
          setInputs(data);
        }
      } catch (err) {
        console.error('Failed to import file:', err);
        alert('Could not read .nestegg file. Is it valid JSON?');
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-imported
    e.target.value = '';
  }, [setInputs]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-row">
          <div className="header-left">
            <h1>NestEgg</h1>
            <p className="tagline">See how prepared you really are</p>
          </div>
          <div className="header-actions">
            <button className="header-btn" onClick={handleExport} type="button" title="Export inputs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Save
            </button>
            <button className="header-btn" onClick={() => fileInputRef.current?.click()} type="button" title="Import inputs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Load
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".nestegg,.json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
            <button className="about-link" onClick={() => setShowAbout(true)} type="button">
              About
            </button>
          </div>
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
