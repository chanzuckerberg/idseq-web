import React from "react";
import PathogenLabel from "../../ui/labels/PathogenLabel";
import InsightIcon from "../../ui/icons/InsightIcon";

const PathogenSummary = ({ topScoringTaxa }) => {
  let topScoringDisplay, pathogenDisplay;

  if (topScoringTaxa.length > 0) {
    topScoringDisplay = (
      <div className="top-scoring">
        <InsightIcon />
        <div className="header">Top Scoring</div>
        {topScoringTaxa.map(tax => {
          return <div>{tax.name}</div>;
        })}
      </div>
    );
  }

  let topPathogens = topScoringTaxa.filter(tax => tax.pathogenTag);
  if (topPathogens.length > 0) {
    pathogenDisplay = (
      <div className="top-pathogens">
        <div className="header">Pathogenic Agents</div>
        {topPathogens.map(tax => {
          return (
            <div>
              {tax.name}
              <PathogenLabel type={tax.pathogenTag} />
            </div>
          );
        })}
      </div>
    );
  }

  if (topScoringDisplay || pathogenDisplay) {
    return (
      <div className="ui message yellow idseq-ui pathogen-summary">
        {topScoringDisplay}
        {pathogenDisplay}
      </div>
    );
  } else {
    return null;
  }
};

export default PathogenSummary;
