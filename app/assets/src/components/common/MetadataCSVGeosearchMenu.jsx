import React from "react";
import { uniq } from "lodash/fp";

import { getGeoSearchSuggestions } from "~/api/locations";
import MetadataInput, {
  processLocationSelection,
} from "~/components/common/MetadataInput";
import PropTypes from "~/components/utils/propTypes";

export const geosearchCSVlocations = async metadata => {
  const fieldName = "Collection Location";

  if (!(metadata && metadata.rows)) return;

  // Get results for each plain text value
  const locationNames = uniq(metadata.rows.map(r => r[fieldName]));
  const matchedLocations = {};
  for (const query of locationNames) {
    const suggestions = await getGeoSearchSuggestions(query, 1);
    if (suggestions.length > 0) {
      matchedLocations[query] = suggestions[0];
    }
  }

  console.log("The metadata we have: ", metadata);

  // Set results if there was a match
  let newMetadata = metadata;
  metadata.rows.forEach((row, rowIndex) => {
    const locationName = row[fieldName];
    if (matchedLocations.hasOwnProperty(locationName)) {
      const isHuman = row["Host Genome"] && row["Host Genome"] === "Human";
      console.log("isHuman: ", isHuman);
      const { result, warning } = processLocationSelection(
        matchedLocations[locationName],
        isHuman
      );
      console.log("processed: ", result, warning);
      newMetadata.rows[rowIndex][fieldName] = result;
    }
  });
  return newMetadata;
};

class MetadataCSVGeosearchMenu extends React.Component {
  render() {
    const { onMetadataChange, metadata, projectMetadataFields } = this.props;

    if (!(metadata && metadata.rows)) return null;

    // Render results
    return metadata.rows.map((sample, rowIndex) => {
      return (
        <div>
          <span>{sample["Sample Name"]}</span>
          <span>
            <MetadataInput
              key={"collection_location_v2"}
              // className={cs.input}
              value={sample["Collection Location"]}
              metadataType={projectMetadataFields["collection_location_v2"]}
              onChange={(key, value) => {
                const newMetadata = metadata;
                newMetadata.rows[rowIndex]["Collection Location"] = value;

                onMetadataChange({
                  metadata: newMetadata,
                });

                // Log analytics?
              }}
              withinModal={true}
              isHuman={true}
            />
          </span>
        </div>
      );
    });
  }
}

MetadataCSVGeosearchMenu.propTypes = {
  metadata: PropTypes.object,
  onMetadataChange: PropTypes.func.isRequired,
  projectMetadataFields: PropTypes.object,
};

export default MetadataCSVGeosearchMenu;
