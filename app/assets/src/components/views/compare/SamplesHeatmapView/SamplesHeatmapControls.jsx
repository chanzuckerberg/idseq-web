import {
  pull,
  isEqual,
  min,
  max,
  flatten,
  values,
  omitBy,
  mapValues,
  isEmpty,
} from "lodash/fp";
import PropTypes from "prop-types";
import React from "react";

import { logAnalyticsEvent } from "~/api/analytics";
import ThresholdFilterTag from "~/components/common/ThresholdFilterTag";
import { Divider } from "~/components/layout";
import List from "~/components/ui/List";
import BackgroundModelFilter from "~/components/views/report/filters/BackgroundModelFilter";
import SequentialLegendVis from "~/components/visualizations/legends/SequentialLegendVis.jsx";
import ColumnHeaderTooltip from "~ui/containers/ColumnHeaderTooltip";
import FilterTag from "~ui/controls/FilterTag";
import Slider from "~ui/controls/Slider";
import {
  Dropdown,
  MultipleNestedDropdown,
  ThresholdFilterDropdown,
} from "~ui/controls/dropdowns";
import { IconInfoSmall } from "~ui/icons";

import cs from "./samples_heatmap_view.scss";

export default class SamplesHeatmapControls extends React.Component {
  onTaxonLevelChange = taxonLevel => {
    if (this.props.selectedOptions.species === taxonLevel) {
      return;
    }

    this.props.onSelectedOptionsChange({ species: taxonLevel });
    logAnalyticsEvent("SamplesHeatmapControls_taxon-level-select_changed", {
      taxonLevel,
    });
  };

  renderTaxonLevelSelect() {
    return (
      <Dropdown
        fluid
        rounded
        options={this.props.options.taxonLevels}
        value={this.props.selectedOptions.species}
        onChange={this.onTaxonLevelChange}
        label="Taxon Level"
        disabled={this.props.loading || !this.props.data}
      />
    );
  }

  onCategoryChange = (categories, subcategories) => {
    this.props.onSelectedOptionsChange({ categories, subcategories });
    logAnalyticsEvent("SamplesHeatmapControls_category-filter_changed", {
      categories: categories.length,
      subcategories: subcategories.length,
    });
  };

  renderCategoryFilter() {
    let options = this.props.options.categories.map(category => {
      let option = { text: category, value: category };
      let subcategories = this.props.options.subcategories[category];
      if (Array.isArray(subcategories)) {
        option.suboptions = subcategories.map(subcategory => {
          return { text: subcategory, value: subcategory };
        });
      }
      return option;
    });

    return (
      <MultipleNestedDropdown
        boxed
        fluid
        rounded
        options={options}
        onChange={this.onCategoryChange}
        selectedOptions={this.props.selectedOptions.categories}
        selectedSuboptions={this.props.selectedOptions.subcategories}
        label="Categories"
        disabled={this.props.loading || !this.props.data}
        disableMarginRight
      />
    );
  }

  onMetricChange = metric => {
    if (metric === this.props.selectedOptions.metric) {
      return;
    }

    this.props.onSelectedOptionsChange({ metric });
    logAnalyticsEvent("SamplesHeatmapControls_metric-select_changed", {
      metric,
    });
  };

  renderMetricSelect() {
    return (
      <Dropdown
        fluid
        rounded
        options={this.props.options.metrics}
        onChange={this.onMetricChange}
        value={this.props.selectedOptions.metric}
        label="Metric"
        disabled={this.props.loading || !this.props.data}
      />
    );
  }

  onBackgroundChange = background => {
    if (background === this.props.selectedOptions.background) {
      return;
    }

    this.props.onSelectedOptionsChange({ background });
    logAnalyticsEvent("SamplesHeatmapControls_background-select_changed", {
      background,
    });
  };

  renderBackgroundSelect() {
    const {
      enableMassNormalizedBackgrounds,
      options,
      selectedOptions,
    } = this.props;

    return (
      <BackgroundModelFilter
        allBackgrounds={options.backgrounds}
        disabled={this.props.loading || !this.props.data}
        enableMassNormalizedBackgrounds={enableMassNormalizedBackgrounds}
        onChange={this.onBackgroundChange}
        value={selectedOptions.background}
      />
    );
  }

  onThresholdFilterApply = filters => {
    if (isEqual(filters, this.props.selectedOptions.thresholdFilters)) {
      return;
    }

    this.props.onSelectedOptionsChange({ thresholdFilters: filters });
    logAnalyticsEvent(
      "SamplesHeatmapControls_threshold-filter-select_applied",
      {
        filters: filters.length,
      }
    );
  };

  renderThresholdFilterSelect() {
    const { options, selectedOptions } = this.props;
    return (
      <ThresholdFilterDropdown
        options={options.thresholdFilters}
        thresholds={selectedOptions.thresholdFilters}
        onApply={this.onThresholdFilterApply}
        disabled={this.props.loading || !this.props.data}
        disableMarginRight
      />
    );
  }

  onSpecificityChange = specificity => {
    if (specificity === this.props.selectedOptions.readSpecificity) {
      return;
    }

    this.props.onSelectedOptionsChange({ readSpecificity: specificity });
    logAnalyticsEvent("SamplesHeatmapControls_specificity-filter_changed", {
      readSpecificity: specificity,
    });
  };

  renderSpecificityFilter() {
    return (
      <Dropdown
        fluid
        rounded
        options={this.props.options.specificityOptions}
        value={this.props.selectedOptions.readSpecificity}
        label="Read Specificity"
        onChange={this.onSpecificityChange}
        disabled={this.props.loading || !this.props.data}
      />
    );
  }

  onSortSamplesChange = selectedSortType => {
    if (selectedSortType === this.props.selectedOptions.sampleSortType) {
      return;
    }

    this.props.onSelectedOptionsChange({ sampleSortType: selectedSortType });
    logAnalyticsEvent("SamplesHeatmapControls_sort-samples-select_changed", {
      sampleSortType: selectedSortType,
    });
  };

  renderSortSamplesSelect() {
    return (
      <Dropdown
        fluid
        rounded
        options={this.props.options.sampleSortTypeOptions}
        value={this.props.selectedOptions.sampleSortType}
        label="Sort Samples"
        onChange={this.onSortSamplesChange}
        disabled={this.props.loading || !this.props.data}
      />
    );
  }

  onSortTaxaChange = selectedSortType => {
    if (selectedSortType === this.props.selectedOptions.taxaSortType) {
      return;
    }

    this.props.onSelectedOptionsChange({ taxaSortType: selectedSortType });
    logAnalyticsEvent("SamplesHeatmapControls_sort-taxa-select_changed", {
      taxaSortType: selectedSortType,
    });
  };

  renderSortTaxaSelect() {
    return (
      <Dropdown
        fluid
        rounded
        options={this.props.options.taxaSortTypeOptions}
        value={this.props.selectedOptions.taxaSortType}
        label="Sort Taxa"
        onChange={this.onSortTaxaChange}
        disabled={this.props.loading || !this.props.data}
      />
    );
  }

  onDataScaleChange = scaleIdx => {
    if (scaleIdx === this.props.selectedOptions.dataScaleIdx) {
      return;
    }

    this.props.onSelectedOptionsChange({ dataScaleIdx: scaleIdx });
    logAnalyticsEvent("SamplesHeatmapControls_data-scale-select_changed", {
      dataScaleIdx: scaleIdx,
    });
  };

  renderScaleSelect() {
    let options = this.props.options.scales.map((scale, index) => ({
      text: scale[0],
      value: index,
    }));

    return (
      <Dropdown
        fluid
        rounded
        value={this.props.selectedOptions.dataScaleIdx}
        onChange={this.onDataScaleChange}
        options={options}
        label="Scale"
        disabled={this.props.loading || !this.props.data}
      />
    );
  }

  onTaxonsPerSampleEnd = newValue => {
    this.props.onSelectedOptionsChange({ taxonsPerSample: newValue });
    logAnalyticsEvent(
      "SamplesHeatmapControls_taxons-per-sample-slider_changed",
      {
        taxonsPerSample: newValue,
      }
    );
  };

  renderTaxonsPerSampleSlider() {
    return (
      <Slider
        disabled={this.props.loading || !this.props.data}
        label="Taxa per Sample: "
        max={this.props.options.taxonsPerSample.max}
        min={this.props.options.taxonsPerSample.min}
        onAfterChange={this.onTaxonsPerSampleEnd}
        value={this.props.selectedOptions.taxonsPerSample}
      />
    );
  }

  renderLegend() {
    if (
      this.props.loading ||
      !this.props.data ||
      !(this.props.data[this.props.selectedOptions.metric] || []).length
    ) {
      return;
    }
    let values = this.props.data[this.props.selectedOptions.metric];
    let scaleIndex = this.props.selectedOptions.dataScaleIdx;
    return (
      <SequentialLegendVis
        min={Math.max(0, min(values.map(array => min(array))))}
        max={max(values.map(array => max(array)))}
        scale={this.props.options.scales[scaleIndex][1]}
      />
    );
  }

  handleRemoveThresholdFilter = threshold => {
    const newFilters = pull(
      threshold,
      this.props.selectedOptions.thresholdFilters
    );
    this.props.onSelectedOptionsChange({ thresholdFilters: newFilters });
  };

  handleRemoveCategory = category => {
    const newCategories = pull(category, this.props.selectedOptions.categories);
    this.props.onSelectedOptionsChange({ categories: newCategories });
  };

  handleRemoveSubcategory = subcat => {
    // For each category => [subcategories], remove subcat from subcategories.
    // Then omit all categories with empty subcategories.
    const newSubcategories = omitBy(
      isEmpty,
      mapValues(pull(subcat), this.props.selectedOptions.subcategories)
    );
    this.props.onSelectedOptionsChange({ subcategories: newSubcategories });
  };

  renderFilterTags = () => {
    let filterTags = [];
    const { selectedOptions } = this.props;

    if (selectedOptions.thresholdFilters) {
      filterTags = filterTags.concat(
        selectedOptions.thresholdFilters.map((threshold, i) => (
          <ThresholdFilterTag
            className={cs.filterTag}
            key={`threshold_filter_tag_${i}`}
            threshold={threshold}
            onClose={() => {
              this.handleRemoveThresholdFilter(threshold);
              logAnalyticsEvent(
                "SamplesHeatmapControls_threshold-filter_removed",
                {
                  value: threshold.value,
                  operator: threshold.operator,
                  metric: threshold.metric,
                }
              );
            }}
          />
        ))
      );
    }

    if (selectedOptions.categories) {
      filterTags = filterTags.concat(
        selectedOptions.categories.map((category, i) => {
          return (
            <FilterTag
              className={cs.filterTag}
              key={`category_filter_tag_${i}`}
              text={category}
              onClose={() => {
                this.handleRemoveCategory(category);
                logAnalyticsEvent(
                  "SamplesHeatmapControl_categories-filter_removed",
                  {
                    category,
                  }
                );
              }}
            />
          );
        })
      );
    }

    if (selectedOptions.subcategories) {
      const subcategoryList = flatten(values(selectedOptions.subcategories));
      filterTags = filterTags.concat(
        subcategoryList.map((subcat, i) => {
          return (
            <FilterTag
              className={cs.filterTag}
              key={`subcat_filter_tag_${i}`}
              text={subcat}
              onClose={() => {
                this.handleRemoveSubcategory(subcat);
                logAnalyticsEvent(
                  "SamplesHeatmapControl_categories-filter_removed",
                  {
                    subcat,
                  }
                );
              }}
            />
          );
        })
      );
    }

    return filterTags;
  };

  renderFilterStatsInfo = () => {
    const {
      filteredTaxaCount,
      totalTaxaCount,
      prefilterConstants,
    } = this.props;
    const { topN, minReads } = prefilterConstants;

    const content = (
      <React.Fragment>
        In order to load the heatmap faster, the data included in this heatmap
        was preselected based on the following conditions:
        <List
          listClassName={cs.conditionList}
          listItems={[
            `The top ${topN} unique taxa per sample, based on relative abundance (rPM)`,
            `Only taxa with at least ${minReads} reads`,
          ]}
        />
        You can add taxa under 5 reads using the “Add taxa” button below.
      </React.Fragment>
    );

    return (
      <span className={cs.reportInfoMsg}>
        Showing top {filteredTaxaCount} taxa of {totalTaxaCount} preselected
        taxa.
        <ColumnHeaderTooltip
          trigger={
            <span>
              <IconInfoSmall className={cs.infoIcon} />
            </span>
          }
          content={content}
        />
      </span>
    );
  };

  render() {
    const { selectedOptions, loading } = this.props;
    const { thresholdFilters, categories, subcategories } = selectedOptions;
    // Only display the filter tag row if relevant filters are selected,
    // otherwise an empty row will be rendered.
    const displayFilterTags =
      ((thresholdFilters || []).length ||
        (categories || []).length ||
        (subcategories["Viruses"] || []).length) > 0;

    return (
      <div className={cs.menu}>
        <Divider />
        <div className={cs.filterRow}>
          <div className={cs.filterControl}>
            {this.renderTaxonLevelSelect()}
          </div>
          <div className={cs.filterControl}>{this.renderCategoryFilter()}</div>
          <div className={cs.filterControl}>{this.renderSortTaxaSelect()}</div>
          <div className={cs.filterControl}>
            {this.renderSortSamplesSelect()}
          </div>
          <div className={cs.filterControl}>{this.renderMetricSelect()}</div>
          <div className={cs.filterControl}>
            {this.renderBackgroundSelect()}
          </div>
        </div>
        <div className={cs.filterRow}>
          <div className={cs.filterControl}>
            {this.renderThresholdFilterSelect()}
          </div>
          <div className={cs.filterControl}>
            {this.renderSpecificityFilter()}
          </div>
          <div className={cs.filterControl}>{this.renderScaleSelect()}</div>
          <div className={cs.filterControl}>
            {this.renderTaxonsPerSampleSlider()}
          </div>
          <div className={cs.filterControl}>{this.renderLegend()}</div>
        </div>
        {displayFilterTags && (
          <div className={cs.filterTagsList}>{this.renderFilterTags()}</div>
        )}
        {!loading && (
          <div className={cs.statsRow}>{this.renderFilterStatsInfo()}</div>
        )}
        <Divider />
      </div>
    );
  }
}

SamplesHeatmapControls.propTypes = {
  options: PropTypes.shape({
    metrics: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        value: PropTypes.string,
      })
    ),
    categories: PropTypes.arrayOf(PropTypes.string),
    subcategories: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)),
    backgrounds: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        value: PropTypes.number,
      })
    ),
    taxonLevels: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        value: PropTypes.number,
      })
    ),
    specificityOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        value: PropTypes.number,
      })
    ),
    sampleSortTypeOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        value: PropTypes.string,
      })
    ),
    taxaSortTypeOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        value: PropTypes.string,
      })
    ),
    sortTaxaOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        value: PropTypes.number,
      })
    ),
    thresholdFilters: PropTypes.shape({
      operators: PropTypes.arrayOf(PropTypes.string),
      targets: PropTypes.arrayOf(
        PropTypes.shape({
          text: PropTypes.string,
          value: PropTypes.string,
        })
      ),
    }),
    scales: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)),
    taxonsPerSample: PropTypes.objectOf(PropTypes.number),
  }),
  selectedOptions: PropTypes.shape({
    species: PropTypes.number,
    categories: PropTypes.arrayOf(PropTypes.string),
    subcategories: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)),
    metric: PropTypes.string,
    background: PropTypes.number,
    thresholdFilters: PropTypes.arrayOf(
      PropTypes.shape({
        metric: PropTypes.string,
        value: PropTypes.string,
        operator: PropTypes.string,
      })
    ),
    readSpecificity: PropTypes.number,
    sampleSortType: PropTypes.string,
    taxaSortType: PropTypes.string,
    dataScaleIdx: PropTypes.number,
    taxonsPerSample: PropTypes.number,
  }),
  onSelectedOptionsChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  data: PropTypes.objectOf(
    PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number))
  ),
  filteredTaxaCount: PropTypes.number,
  totalTaxaCount: PropTypes.number,
  prefilterConstants: PropTypes.object,
  enableMassNormalizedBackgrounds: PropTypes.bool,
};
