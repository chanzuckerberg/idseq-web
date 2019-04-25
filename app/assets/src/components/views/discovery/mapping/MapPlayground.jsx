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
        let [lat, lng] = this.parseLatLng(match[1], match[2]);
        if (!(lat && lng)) return;
        locationName = `${lat}, ${lng}`;
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
            lng: lng,
            items: [item]
          };
        }
      }
    });

    this.state = {
      locationsToItems: locationsToItems,
      viewport: {},
      popups: [],
      hoverTooltip: null,
      hoverTooltipShouldClose: false
    };
  }

  parseLatLng = (lat, lng) => {
    // Round the coordinates for some minimal aggregation
    lat = parseFloat(parseFloat(lat).toFixed(2));
    lng = parseFloat(parseFloat(lng).toFixed(2));
    // Reject invalid coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      // eslint-disable-next-line no-console
      console.log(`Skipping invalid coordinates ${lat}, ${lng}`);
      return [null, null];
    } else {
      return [lat, lng];
    }
  };

  updateViewport = viewport => {
    this.setState({ viewport });
  };

  renderMarker = (marker, index) => {
    const { viewport } = this.state;
    const [name, markerData] = marker;
    const lat = markerData.lat;
    const lng = markerData.lng;
    const pointCount = markerData.items.length;
    const minSize = 12;
    // Scale based on the zoom and point count (zoomed-in = higher zoom)
    // Log1.5 of the count looked nice visually for not getting too large with many points.
    const markerSize = Math.max(
      Math.log(pointCount) / Math.log(1.5) * (get("zoom", viewport) || 3),
      minSize
    );

    return (
      <Marker key={`marker-${index}`} latitude={lat} longitude={lng}>
        <CircleMarker
          size={markerSize}
          onMouseEnter={() =>
            this.handleMarkerMouseEnter({ lat, lng, name, pointCount })
          }
          onMouseLeave={this.handleMarkerMouseLeave}
          onClick={() =>
            this.openPopup({
              lat,
              lng,
              name,
              index,
              items: markerData.items
            })
          }
        />
      </Marker>
    );
  };

  handleMarkerMouseEnter = hoverInfo => {
    const hoverTooltip = (
      <MapPopup
        className={cs.dataTooltipContainer}
        anchor="bottom"
        tipSize={10}
        latitude={hoverInfo.lat}
        longitude={hoverInfo.lng}
        closeButton={false}
        offsetTop={-15}
      >
        <div
          onMouseEnter={this.handleTooltipMouseEnter}
          onMouseLeave={this.handleMarkerMouseLeave}
        >
          {"Hello I am div"}
        </div>
        {/*<DataTooltip*/}
        {/*data={[*/}
        {/*{ name: hoverInfo.name, data: [["Samples", hoverInfo.pointCount]] }*/}
        {/*]}*/}
        {/*onMouseEnter={() => console.log("Hello I am data tooltip")}*/}
        {/*/>*/}
      </MapPopup>
    );
    this.setState({ hoverTooltip, hoverTooltipShouldClose: false });
  };

  handleMarkerMouseLeave = () => {
    console.log("exited");
    this.setState({ hoverTooltipShouldClose: true });
    setTimeout(() => {
      const { hoverTooltipShouldClose } = this.state;
      hoverTooltipShouldClose && this.setState({ hoverTooltip: null });
    }, 2000);
  };

  handleTooltipMouseEnter = () => {
    console.log("entered");
    this.setState({ hoverTooltipShouldClose: false });
  };

  openPopup = popupInfo => {
    this.setState({
      popups: concat(this.state.popups, popupInfo),
      hoverTooltip: null // Replace the open tooltip
    });
  };

  closePopup = popupInfo => {
    this.setState({
      popups: reject({ index: popupInfo.index }, this.state.popups)
    });
  };

  renderPopupBox = popupInfo => {
    return (
      <MapPopup
        className={cs.dataTooltipContainer}
        anchor="bottom"
        tipSize={10}
        latitude={popupInfo.lat}
        longitude={popupInfo.lng}
        offsetTop={-15}
        onClose={() => this.closePopup(popupInfo)}
      >
        <DataTooltip
          data={[
            {
              name: popupInfo.name,
              data: popupInfo.items.map(sample => [sample.name])
            }
          ]}
          singleColumn={true}
        />
      </MapPopup>
    );
  };

  render() {
    const { mapTilerKey } = this.props;
    const { locationsToItems, hoverTooltip, popups } = this.state;

    return (
      <BaseMap
        mapTilerKey={mapTilerKey}
        updateViewport={this.updateViewport}
        hoverTooltip={hoverTooltip}
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
