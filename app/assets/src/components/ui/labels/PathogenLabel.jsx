import Label from "./Label";
import BasicPopup from "../../BasicPopup";
import React from "react";

const NIAID_URL =
  "https://www.niaid.nih.gov/research/emerging-infectious-diseases-pathogens";
const CATEGORIES = {
  categoryA: {
    text: "pathogenic | a",
    color: "red",
    tooltip: "NIAID pathogen priority list | category A",
    url: NIAID_URL
  },
  categoryB: {
    text: "pathogenic | b",
    color: "orange",
    tooltip: "NIAID pathogen priority list | category B",
    url: NIAID_URL
  },
  categoryC: {
    text: "pathogenic | c",
    color: "yellow",
    tooltip: "NIAID pathogen priority list | category C",
    url: NIAID_URL
  }
};

const PathogenLabel = ({ type }) => {
  if (type) {
    let label = (
      <a href={CATEGORIES[type]["url"]} target="_blank">
        <Label
          text={CATEGORIES[type]["text"]}
          color={CATEGORIES[type]["color"]}
          size="medium"
          className="pathogen-label"
        />
      </a>
    );
    return <BasicPopup trigger={label} content={CATEGORIES[type]["tooltip"]} />;
  } else {
    return null;
  }
};

export default PathogenLabel;
