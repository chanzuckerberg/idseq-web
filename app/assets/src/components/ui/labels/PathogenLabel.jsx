import Label from "./Label";
import React from "react";

const PathogenLabel = ({ type, number }) => {
  let type2text = {
    categoryA: "pathogenic | A",
    categoryB: "pathogenic | B",
    categoryC: "pathogenic | C"
  };
  let text = type2text[type];
  if (number) {
    let plural = number > 1 ? "s" : "";
    text = `${number} ${text}${plural}`;
  }
  if (type) {
    return (
      <Label text={text} color="red" size="medium" className="pathogen-label" />
    );
  } else {
    return null;
  }
};

export default PathogenLabel;
