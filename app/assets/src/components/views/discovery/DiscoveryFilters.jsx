import cx from "classnames";
import { find, forEach, pick } from "lodash/fp";
import PropTypes from "prop-types";
import React from "react";

import { logAnalyticsEvent, withAnalytics } from "~/api/analytics";
import {
  BaseMultipleFilter,
  BaseSingleFilter,
  LocationFilter,
  TaxonFilter,
} from "~/components/common/filters";
import { WORKFLOWS } from "~/components/utils/workflows";
import FilterTag from "~ui/controls/FilterTag";
import { DISCOVERY_DOMAIN_SNAPSHOT } from "./discovery_api";

import cs from "./discovery_filters.scss";

class DiscoveryFilters extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // taxon is an async dropdown and needs full options (value + label) to be stored
      // (otherwise we would need to load the labels from values)
      taxonSelected: this.props.taxonSelected,
      // for the remaining filters we can store values only
      locationSelected: this.props.locationSelected,
      timeSelected: this.props.timeSelected,
      visibilitySelected: this.props.visibilitySelected,
      hostSelected: this.props.hostSelected,
      tissueSelected: this.props.tissueSelected,
    };
  }

  static getDerivedStateFromProps(props, state) {
    let newState = state;
    forEach(
      key => {
        if (!state.prev || props[key] !== state.prev[key]) {
          newState.prev = newState.prev || {};
          newState[key] = props[key];
          newState.prev[key] = props[key];
        }
      },
      [
        "hostSelected",
        "locationSelected",
        "locationV2Selected",
        "taxonSelected",
        "timeSelected",
        "tissueSelected",
        "visibilitySelected",
      ]
    );

    return newState;
  }

  notifyFilterChangeHandler = () => {
    const { onFilterChange } = this.props;
    const selected = pick(
      [
        "hostSelected",
        "locationSelected",
        "locationV2Selected",
        "taxonSelected",
        "timeSelected",
        "tissueSelected",
        "visibilitySelected",
      ],
      this.state
    );
    onFilterChange && onFilterChange(selected);
  };

  handleChange(selectedKey, selected) {
    const newState = [];
    newState[selectedKey] = selected;
    this.setState(newState, this.notifyFilterChangeHandler);
    logAnalyticsEvent(`DiscoveryFilters_${selectedKey.toLowerCase()}_changed`, {
      selectedKey: selected,
    });
  }

  handleRemoveTag(selectedKey, removedValue) {
    let newSelected = null;
    if (Array.isArray(this.state[selectedKey])) {
      newSelected = this.state[selectedKey].filter(
        option => (option.value || option) !== removedValue
      );
    }

    let newState = {};
    newState[selectedKey] = newSelected;
    this.setState(newState, this.notifyFilterChangeHandler);
  }

  renderTags(optionsKey) {
    let selectedKey = `${optionsKey}Selected`;
    let selectedOptions = this.state[selectedKey];
    let options = this.props[optionsKey];

    if (!selectedOptions) return;
    if (!Array.isArray(selectedOptions)) selectedOptions = [selectedOptions];

    const tags = selectedOptions
      // check if filter is on option format or just value (taxon are hashes with text and value)
      .map(option =>
        option.text
          ? option
          : find({ value: option }, options) || {
              text: option,
              value: option,
            }
      )
      // create the filter tag
      .map(option => {
        return (
          <FilterTag
            className={cs.filterTag}
            key={option.value}
            text={option.text}
            onClose={withAnalytics(
              this.handleRemoveTag.bind(this, selectedKey, option.value),
              "DiscoveryFilters_tag_removed",
              {
                value: option.value,
                text: option.text,
              }
            )}
          />
        );
      });
    return <div className={cs.tags}>{tags}</div>;
  }

  render() {
    const {
      hostSelected,
      locationV2Selected,
      taxonSelected,
      timeSelected,
      tissueSelected,
      visibilitySelected,
    } = this.state;

    const {
      className,
      domain,
      host,
      locationV2,
      time,
      tissue,
      visibility,
      workflow,
    } = this.props;

    return (
      <div className={cx(cs.filtersContainer, className)}>
        {/* TODO(ihan): enable taxon and location filter for snapshot view */}
        {domain !== DISCOVERY_DOMAIN_SNAPSHOT && (
          <>
            <div className={cs.filterContainer}>
              <TaxonFilter
                domain={domain}
                onChange={this.handleChange.bind(this, "taxonSelected")}
                selectedOptions={taxonSelected}
                disabled={workflow === WORKFLOWS.CONSENSUS_GENOME.value}
              />
              {this.renderTags("taxon")}
            </div>
            <div className={cs.filterContainer}>
              <LocationFilter
                onChange={this.handleChange.bind(this, "locationV2Selected")}
                selected={
                  locationV2 && locationV2.length ? locationV2Selected : null
                }
                options={locationV2}
                label="Location"
              />
              {this.renderTags("locationV2")}
            </div>
          </>
        )}
        <div className={cs.filterContainer}>
          <BaseSingleFilter
            label="Timeframe"
            options={time}
            onChange={this.handleChange.bind(this, "timeSelected")}
            value={time && !!time.length ? timeSelected : null}
          />
          {this.renderTags("time")}
        </div>
        {domain !== DISCOVERY_DOMAIN_SNAPSHOT && (
          <div className={cs.filterContainer}>
            <BaseSingleFilter
              label="Visibility"
              options={visibility}
              onChange={this.handleChange.bind(this, "visibilitySelected")}
              value={
                visibility && visibility.length ? visibilitySelected : null
              }
            />
            {this.renderTags("visibility")}
          </div>
        )}
        <div className={cs.filterContainer}>
          <BaseMultipleFilter
            onChange={this.handleChange.bind(this, "hostSelected")}
            selected={host && host.length ? hostSelected : null}
            options={host}
            label="Host"
          />
          {this.renderTags("host")}
        </div>
        <div className={cs.filterContainer}>
          <BaseMultipleFilter
            onChange={this.handleChange.bind(this, "tissueSelected")}
            selected={tissue && tissue.length ? tissueSelected : null}
            options={tissue}
            label="Sample Type"
          />
          {this.renderTags("tissue")}
        </div>
      </div>
    );
  }
}

DiscoveryFilters.defaultProps = {
  host: [],
  location: [],
  locationV2: [],
  time: [],
  tissue: [],
  visibility: [],
};

DiscoveryFilters.propTypes = {
  allowedFeatures: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
  domain: PropTypes.string,
  workflow: PropTypes.string,

  // Filter options and counters
  host: PropTypes.array,
  location: PropTypes.array,
  locationV2: PropTypes.array,
  time: PropTypes.array,
  tissue: PropTypes.array,
  visibility: PropTypes.array,

  // Selected values
  hostSelected: PropTypes.array,
  locationSelected: PropTypes.array,
  locationV2Selected: PropTypes.array,
  taxonSelected: PropTypes.array,
  timeSelected: PropTypes.string,
  tissueSelected: PropTypes.array,
  visibilitySelected: PropTypes.string,

  onFilterChange: PropTypes.func,
};

export default DiscoveryFilters;
