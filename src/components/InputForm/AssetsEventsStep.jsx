import WindfallEvents from './WindfallEvents.jsx';
import RentalProperties from './RentalProperties.jsx';
import PrimaryResidence from './PrimaryResidence.jsx';

const InfoIcon = ({ tip }) => (
  <span className="info-icon" data-tip={tip}>i</span>
);

export default function AssetsEventsStep({
  inputs,
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
}) {
  return (
    <fieldset className="step-fieldset">
      <legend>
        Step 3: Assets & Events
        <InfoIcon tip="Add future cash events (inheritance, home sale), investment properties, and home downsizing plans. These feed into the Monte Carlo simulation." />
      </legend>

      <div className="vision-section">
        <h4>
          Future Cash Events
          <InfoIcon tip="One-time cash inflows or outflows at a future date. Examples: inheritance, home sale proceeds, large purchase. Timing can vary using the std. deviation field." />
        </h4>
        <WindfallEvents
          events={inputs.windfallEvents}
          addWindfall={addWindfall}
          updateWindfall={updateWindfall}
          removeWindfall={removeWindfall}
        />
      </div>

      <div className="vision-section">
        <h4>
          Investment Properties
          <InfoIcon tip="Rental properties generate monthly income, offset by mortgage P&I, taxes/insurance, maintenance, and vacancy. Net income flows into the simulation each year." />
        </h4>
        <RentalProperties
          properties={inputs.rentalProperties}
          addProperty={addProperty}
          updateProperty={updateProperty}
          removeProperty={removeProperty}
        />
      </div>

      <div className="vision-section">
        <h4>
          Home Downsizing
          <InfoIcon tip="Model selling your primary residence and buying a smaller home. Net equity (after sale costs and new purchase) is added to your portfolio at the specified age." />
        </h4>
        <PrimaryResidence
          primaryResidence={inputs.primaryResidence}
          addPrimaryResidence={addPrimaryResidence}
          updatePrimaryResidence={updatePrimaryResidence}
          clearPrimaryResidence={clearPrimaryResidence}
          retirementAge={inputs.retirementAge}
          primaryAge={primaryAge}
        />
      </div>
    </fieldset>
  );
}
