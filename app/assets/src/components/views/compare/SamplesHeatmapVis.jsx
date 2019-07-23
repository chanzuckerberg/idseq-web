import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import { keyBy } from "lodash/fp";

import { logAnalyticsEvent } from "~/api/analytics";
import { DataTooltip } from "~ui/containers";
import { openUrl } from "~utils/links";
import Heatmap from "~/components/visualizations/heatmap/Heatmap";
import { getTooltipStyle } from "~/components/utils/tooltip";
import MetadataLegend from "~/components/common/Heatmap/MetadataLegend";
import MetadataSelector from "~/components/common/Heatmap/MetadataSelector";

import cs from "./samples_heatmap_vis.scss";

class SamplesHeatmapVis extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      addMetadataTrigger: null,
      nodeHoverInfo: null,
      columnMetadataLegend: null,
      selectedMetadata: new Set(this.props.defaultMetadata),
      tooltipLocation: null,
    };

    this.heatmap = null;
    this.scale = this.props.scale;

    // TODO: yet another metric name conversion to remove
    this.metrics = [
      { key: "NT.zscore", label: "NT Z Score" },
      { key: "NT.rpm", label: "NT rPM" },
      { key: "NT.r", label: "NT r (total reads)" },
      { key: "NR.zscore", label: "NR Z Score" },
      { key: "NR.rpm", label: "NR rPM" },
      { key: "NR.r", label: "NR r (total reads)" },
    ];

    this.metadataTypes = keyBy("key", this.props.metadataTypes);
  }

  componentDidMount() {
    const {
      onMetadataSortChange,
      metadataSortField,
      metadataSortAsc,
    } = this.props;

    this.heatmap = new Heatmap(
      this.heatmapContainer,
      {
        rowLabels: this.extractTaxonLabels(),
        columnLabels: this.extractSampleLabels(), // Also includes column metadata.
        values: this.props.data[this.props.metric],
      },
      {
        customColorCallback: this.colorScale,
        columnMetadata: this.getSelectedMetadata(),
        initialColumnMetadataSortField: metadataSortField,
        initialColumnMetadataSortAsc: metadataSortAsc,
        onNodeHover: this.handleNodeHover,
        onNodeHoverMove: this.handleMouseHoverMove,
        onNodeHoverOut: this.handleNodeHoverOut,
        onColumnMetadataSortChange: onMetadataSortChange,
        onColumnMetadataLabelHover: this.handleColumnMetadataLabelHover,
        onColumnMetadataLabelMove: this.handleMouseHoverMove,
        onColumnMetadataLabelOut: this.handleColumnMetadataLabelOut,
        onRemoveRow: this.props.onRemoveTaxon,
        onCellClick: this.handleCellClick,
        onColumnLabelClick: this.props.onSampleLabelClick,
        onRowLabelClick: this.props.onTaxonLabelClick,
        onAddColumnMetadataClick: this.handleAddColumnMetadataClick,
        scale: this.props.scale,
        // only display colors to positive values
        scaleMin: 0,
      }
    );
    this.heatmap.start();
  }

  componentDidUpdate(prevProps) {
    if (this.props.scale !== this.scale) {
      this.scale = this.props.scale;
      this.heatmap.updateScale(this.props.scale);
    }
    if (this.props.sampleDetails !== prevProps.sampleDetails) {
      this.heatmap.updateData({
        columnLabels: this.extractSampleLabels(), // Also includes column metadata.
      });
    }
  }

  extractSampleLabels() {
    return this.props.sampleIds.map(id => {
      return {
        label: this.props.sampleDetails[id].name,
        metadata: this.props.sampleDetails[id].metadata,
        id,
      };
    });
  }

  colorScale = (value, node, originalColor, _, colorNoValue) => {
    const { taxonFilterState } = this.props;
    const filtered = taxonFilterState[node.rowIndex][node.columnIndex];
    return value > 0 && filtered ? originalColor : colorNoValue;
  };

  extractTaxonLabels() {
    return this.props.taxonIds.map(id => {
      return {
        label: this.props.taxonDetails[id].name,
      };
    });
  }

  handleMouseHoverMove = (_, currentEvent) => {
    if (currentEvent) {
      this.setState({
        tooltipLocation: {
          left: currentEvent.pageX,
          top: currentEvent.pageY,
        },
      });
    }
  };

  handleNodeHover = node => {
    this.setState({ nodeHoverInfo: this.getTooltipData(node) });
    logAnalyticsEvent("SamplesHeatmapVis_node_hovered", {
      nodeValue: node.value,
    });
  };

  handleNodeHoverOut = () => {
    this.setState({ nodeHoverInfo: null });
  };

  handleColumnMetadataLabelHover = node => {
    const legend = this.heatmap.getColumnMetadataLegend(node.value);
    this.setState({
      columnMetadataLegend: legend,
    });
    logAnalyticsEvent("SamplesHeatmapVis_column-metadata_hovered", {
      nodeValue: node.value,
      columnMetadataLegend: legend,
    });
  };

  handleColumnMetadataLabelOut = () => {
    this.setState({ columnMetadataLegend: null });
  };

  download() {
    this.heatmap.download();
  }

  downloadAsPng() {
    this.heatmap.downloadAsPng();
  }

  getTooltipData(node) {
    let sampleId = this.props.sampleIds[node.columnIndex];
    let taxonId = this.props.taxonIds[node.rowIndex];
    let sampleDetails = this.props.sampleDetails[sampleId];
    let taxonDetails = this.props.taxonDetails[taxonId];

    let nodeHasData = this.metrics.some(
      metric => !!this.props.data[metric.key][node.rowIndex][node.columnIndex]
    );

    let values = null;
    if (nodeHasData) {
      values = this.metrics.map(metric => {
        const data = this.props.data[metric.key];
        const value = parseFloat(
          (data[node.rowIndex][node.columnIndex] || 0).toFixed(4)
        );
        return [
          metric.label,
          metric.key === this.props.metric ? <b>{value}</b> : value,
        ];
      });
    }

    return [
      {
        name: "Info",
        data: [
          ["Sample", sampleDetails.name],
          ["Taxon", taxonDetails.name],
          ["Category", taxonDetails.category],
        ],
      },
      {
        name: "Values",
        data: nodeHasData ? values : [["", "Taxon not found in Sample"]],
      },
    ];
  }

  handleCellClick = (cell, currentEvent) => {
    const sampleId = this.props.sampleIds[cell.columnIndex];
    openUrl(`/samples/${sampleId}`, currentEvent);
    logAnalyticsEvent("SamplesHeatmapVis_cell_clicked", {
      sampleId,
    });
  };

  handleAddColumnMetadataClick = trigger => {
    this.setState({
      addMetadataTrigger: trigger,
    });
    logAnalyticsEvent("SamplesHeatmapVis_column-metadata_clicked", {
      addMetadataTrigger: trigger,
    });
  };

  handleSelectedMetadataChange = selectedMetadata => {
    const { onMetadataChange } = this.props;

    let intersection = new Set(
      [...this.state.selectedMetadata].filter(metadatum =>
        selectedMetadata.has(metadatum)
      )
    );
    const current = new Set([...intersection, ...selectedMetadata]);
    this.setState(
      {
        selectedMetadata: current,
      },
      () => {
        this.heatmap.updateColumnMetadata(this.getSelectedMetadata());
        onMetadataChange && onMetadataChange(selectedMetadata);
        logAnalyticsEvent("SamplesHeatmapVis_selected-metadata_changed", {
          selectedMetadata: current.length,
        });
      }
    );
  };

  getSelectedMetadata() {
    const sortByLabel = (a, b) => (a.label > b.label ? 1 : -1);

    return Array.from(this.state.selectedMetadata)
      .filter(metadatum => !!this.metadataTypes[metadatum])
      .map(metadatum => {
        return { value: metadatum, label: this.metadataTypes[metadatum].name };
      })
      .sort(sortByLabel);
  }

  getAvailableMetadataOptions() {
    return this.props.metadataTypes.map(metadata => {
      return { value: metadata.key, label: metadata.name };
    });
  }

  render() {
    const {
      tooltipLocation,
      nodeHoverInfo,
      columnMetadataLegend,
      addMetadataTrigger,
      selectedMetadata,
    } = this.state;

    return (
      <div className={cs.samplesHeatmapVis}>
        <div
          className={cs.heatmapContainer}
          ref={container => {
            this.heatmapContainer = container;
          }}
        />

        {nodeHoverInfo &&
          tooltipLocation && (
            <div
              className={cx(cs.tooltip, nodeHoverInfo && cs.visible)}
              style={getTooltipStyle(tooltipLocation, {
                buffer: 20,
                below: true,
              })}
            >
              <DataTooltip data={nodeHoverInfo} />
            </div>
          )}
        {columnMetadataLegend &&
          tooltipLocation && (
            <MetadataLegend
              metadataColors={columnMetadataLegend}
              tooltipLocation={tooltipLocation}
            />
          )}
        {addMetadataTrigger && (
          <MetadataSelector
            addMetadataTrigger={addMetadataTrigger}
            selectedMetadata={selectedMetadata}
            metadataTypes={this.getAvailableMetadataOptions()}
            onMetadataSelectionChange={this.handleSelectedMetadataChange}
            onMetadataSelectionClose={() => {
              this.setState({ addMetadataTrigger: null });
            }}
          />
        )}
      </div>
    );
  }
}

SamplesHeatmapVis.defaultProps = {
  defaultMetadata: [],
};

SamplesHeatmapVis.propTypes = {
  data: PropTypes.object,
  taxonFilterState: PropTypes.objectOf(PropTypes.objectOf(PropTypes.bool)),
  defaultMetadata: PropTypes.array,
  metadataTypes: PropTypes.array,
  metric: PropTypes.string,
  metadataSortField: PropTypes.string,
  metadataSortAsc: PropTypes.bool,
  onMetadataSortChange: PropTypes.func,
  onMetadataChange: PropTypes.func,
  onRemoveTaxon: PropTypes.func,
  onSampleLabelClick: PropTypes.func,
  onTaxonLabelClick: PropTypes.func,
  sampleDetails: PropTypes.object,
  sampleIds: PropTypes.array,
  scale: PropTypes.string,
  taxonDetails: PropTypes.object,
  taxonIds: PropTypes.array,
};

export default SamplesHeatmapVis;
