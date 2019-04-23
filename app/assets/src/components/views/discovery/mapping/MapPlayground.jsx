import React from "react";
import PropTypes from "prop-types";
import { Marker, Popup as MapPopup } from "react-map-gl";
import { get, concat, reject } from "lodash/fp";

import BaseMap from "~/components/views/discovery/mapping/BaseMap";
import CircleMarker from "~/components/views/discovery/mapping/CircleMarker";
import { DataTooltip } from "~ui/containers";

import cs from "./map_playground.scss";

class MapPlayground extends React.Component {
  constructor(props) {
    super(props);
    const { results } = this.props;

    // Load demo data as locations->samples
    const locationsToItems = {};
    results.forEach(result => {
      // Match locations that look like coordinates separated by a comma
      let locationName = result.location.replace(/_/g, ", ");
      const match = /^([-0-9.]+),\s?([-0-9.]+)$/g.exec(locationName);
      if (match) {
        let [lat, lon] = this.parseLatLon(match[1], match[2]);
        if (!(lat && lon)) return;
        locationName = `${lat}, ${lon}`;
        const item = {
          name: result.name,
          id: result.id
        };

        // Group items under the location name
        if (locationsToItems.hasOwnProperty(locationName)) {
          locationsToItems[locationName].items.push(item);
        } else {
          locationsToItems[locationName] = {
            lat: lat,
            lon: lon,
            items: [item]
          };
        }
      }
    });

    this.state = {
      locationsToItems: locationsToItems,
      viewport: {},
      popups: [],
      hoverTooltip: null
    };
  }

  parseLatLon = (lat, lon) => {
    // Round the coordinates for some minimal aggregation
    lat = parseFloat(parseFloat(lat).toFixed(2));
    lon = parseFloat(parseFloat(lon).toFixed(2));
    // Reject invalid coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return [null, null];
    } else {
      return [lat, lon];
    }
  };

  updateViewport = viewport => {
    this.setState({ viewport });
  };

  renderMarker = (marker, index) => {
    const { viewport } = this.state;
    const [locationName, markerData] = marker;
    const pointCount = markerData.items.length;
    const minSize = 12;
    // Scale based on the zoom and point count (zoomed-in = higher zoom)
    const markerSize = Math.max(
      Math.log(pointCount) / Math.log(1.5) * (get("zoom", viewport) || 3),
      minSize
    );
    let hoverContent = (
      <div>
        <div className={cs.title}>{locationName}</div>
        <div className={cs.description}>{`Samples: ${pointCount}`}</div>
      </div>
    );
    hoverContent = (
      <DataTooltip
        title={locationName}
        data={[{ data: [[`Samples: ${pointCount}`, "val"]] }]}
      />
    );
    const popupInfo = {
      name: locationName,
      lat: markerData.lat,
      lon: markerData.lon,
      markerIndex: index,
      items: markerData.items
    };
    return (
      <Marker
        key={`marker-${index}`}
        latitude={markerData.lat}
        longitude={markerData.lon}
      >
        <CircleMarker
          size={markerSize}
          hoverContent={hoverContent}
          onHover={this.handleMarkerHover}
          onClick={() => this.openPopup(popupInfo)}
        />
      </Marker>
    );
  };

  openPopup(popupInfo) {
    this.setState({
      popups: concat(this.state.popups, popupInfo)
    });
  }

  closePopup(popupInfo) {
    this.setState({
      popups: reject({ markerIndex: popupInfo.markerIndex }, this.state.popups)
    });
  }

  handleMarkerHover = node => {
    this.setState({ hoverTooltip: this.getTooltipData(node) });
  };

  handleMarkerHoverOut = () => {
    this.setState({ hoverTooltip: null });
  };

  renderPopupBox = popupInfo => {
    return (
      <MapPopup
        anchor="bottom"
        tipSize={0}
        latitude={popupInfo.lat}
        longitude={popupInfo.lon}
        onClose={() => this.closePopup(popupInfo)}
        className={cs.dataBox}
      >
        <div>
          <div className={cs.title}>{popupInfo.name}</div>
          {popupInfo.items.map((sample, i) => (
            <div className={cs.description} key={`popup-${i}`}>
              {sample.name}
            </div>
          ))}
        </div>
      </MapPopup>
    );
  };

  render() {
    const { mapTilerKey } = this.props;
    const { locationsToItems, popups } = this.state;

    return (
      <BaseMap
        mapTilerKey={mapTilerKey}
        updateViewport={this.updateViewport}
        markers={Object.entries(locationsToItems).map(this.renderMarker)}
        popups={popups.map(this.renderPopupBox)}
      />
    );
  }
}

MapPlayground.propTypes = {
  results: PropTypes.array,
  // Access tokens safe for clients
  mapTilerKey: PropTypes.string
};

export default MapPlayground;
