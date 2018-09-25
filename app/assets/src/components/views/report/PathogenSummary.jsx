import React from "react";
import PathogenLabel from "../../ui/labels/PathogenLabel";
import InsightIcon from "../../ui/icons/InsightIcon";

const PathogenSummary = ({ topScoringTaxa }) => {
  let topScoringDisplay, pathogenDisplay;

  if (topScoringTaxa.length > 0) {
    topScoringDisplay = (
      <div className="top-scoring">
        <div className="header">Top Scoring</div>
        <ul>
          {topScoringTaxa.map(tax => {
            return <li>{tax.name}</li>;
          })}
        </ul>
      </div>
    );
  }

  let topPathogens = topScoringTaxa.filter(tax => tax.pathogenTag);
  if (topPathogens.length > 0) {
    pathogenDisplay = (
      <div className="top-pathogens">
        <div className="header">Pathogenic Agents</div>
        <ul>
          {topPathogens.map(tax => {
            return (
              <li>
                <span>{tax.name}</span>
                <PathogenLabel type={tax.pathogenTag} />
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (topScoringDisplay || pathogenDisplay) {
    return (
      <div className="ui message white idseq-ui pathogen-summary">
        <InsightIcon className="summary-icon" />
        {topScoringDisplay}
        {pathogenDisplay}
      </div>
    );
  } else {
    return null;
  }
};

export default PathogenSummary;
