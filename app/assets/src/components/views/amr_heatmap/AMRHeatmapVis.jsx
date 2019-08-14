import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";

import Heatmap from "~/components/visualizations/heatmap/Heatmap";
import MetadataLegend from "~/components/common/Heatmap/MetadataLegend";
import MetadataSelector from "~/components/common/Heatmap/MetadataSelector";
import { DataTooltip } from "~ui/containers";
import { getTooltipStyle } from "~/components/utils/tooltip";
import { logAnalyticsEvent } from "~/api/analytics";

import cs from "./amr_heatmap_vis.scss";

const VIEW_LEVEL_ALLELES = "allele";
const VIEW_LEVEL_GENES = "gene";

const DEFAULT_SELECTED_METADATA = ["collection_location_v2"];

export default class AMRHeatmapVis extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      nodeHoverInfo: null,
      tooltipLocation: null,
      columnMetadataLegend: null,
      addMetadataTrigger: null,
      nodeHovered: false,
      metadataLabelHovered: false,
      selectedMetadata: new Set(DEFAULT_SELECTED_METADATA),
    };

    this.heatmap = null;
  }

  componentDidMount() {
    this.processSampleData();
  }

  componentDidUpdate(prevProps, prevState) {
    const { selectedMetadata, nodeHovered, metadataLabelHovered } = this.state;
    const { selectedOptions } = this.props;
    if (
      selectedOptions !== prevProps.selectedOptions ||
      this.heatmap === null
    ) {
      this.updateHeatmap();
    }
    if (
      selectedMetadata !== prevState.selectedMetadata &&
      this.heatmap !== null
    ) {
      this.heatmap.updateColumnMetadata(this.getSelectedMetadataFields());
    }
    if (nodeHovered !== prevState.nodeHovered) {
      logAnalyticsEvent("AMRHeatmapVis_heatmap-node-hover_triggered");
    }
    if (metadataLabelHovered !== prevState.metadataLabelHovered) {
      logAnalyticsEvent("AMRHeatmapVis_heatmap-metadata-label-hover_triggered");
    }
  }

  processSampleData() {
    const { samplesWithAMRCounts } = this.props;
    const [sampleLabels, geneLabels, alleleLabels] = this.extractLabels(
      samplesWithAMRCounts
    );
    const alleleToGeneMap = this.mapAllelesToGenes(samplesWithAMRCounts);
    this.setState({
      sampleLabels,
      geneLabels,
      alleleLabels,
      alleleToGeneMap,
    });
  }

  // Sometimes, when presenting the tooltip popup as a user hovers over
  // a node on the heatmap, they will be over a node where the row is
  // an allele and the column is a sample with no AMR count for the allele.
  // With no AMR count, there's no easy way to grab the name of the gene
  // for the allele. Hence the allele-to-gene mapping.
  mapAllelesToGenes(sampleData) {
    const alleleToGeneMap = {};
    sampleData.forEach(sample => {
      sample.amrCounts.forEach(amrCount => {
        // annotation_gene is more fine grained label introduced in pipeline v3.9
        // older samples will not have that field
        alleleToGeneMap[amrCount.allele] =
          amrCount.annotation_gene || amrCount.gene;
      });
    });
    return alleleToGeneMap;
  }

  extractLabels(sampleData) {
    const sampleLabels = [];
    const genes = {};
    const alleles = {};
    sampleData.forEach(sample => {
      sampleLabels.push({
        label: sample.sampleName,
        id: sample.sampleId,
        metadata: sample.metadata,
      });
      sample.amrCounts.forEach(amrCount => {
        // backwards compatibility for older samples without annotation_gene
        if (amrCount.hasOwnProperty("annotation_gene")) {
          genes[amrCount.annotation_gene] = true;
        } else {
          genes[amrCount.gene] = true;
        }
        alleles[amrCount.allele] = true;
      });
    });
    const geneLabels = Object.keys(genes).map(gene => {
      return { label: gene };
    });
    const alleleLabels = Object.keys(alleles).map(allele => {
      return { label: allele };
    });

    return [sampleLabels, geneLabels, alleleLabels];
  }

  getMetadataTypes() {
    const { samplesMetadataTypes } = this.props;
    return Object.keys(samplesMetadataTypes)
      .sort()
      .map(type => {
        return {
          label: samplesMetadataTypes[type].name,
          value: samplesMetadataTypes[type].key,
        };
      });
  }

  //*** Callback functions for the heatmap ***

  colorFilter = (value, node, originalColor, _, colorNoValue) => {
    // Leave zero values grey
    return value > 0 ? originalColor : colorNoValue;
  };

  onNodeHover = node => {
    this.setState({
      nodeHoverInfo: this.getTooltipData(node),
      nodeHovered: true,
    });
  };

  onNodeHoverMove = (_, event) => {
    if (event) {
      this.setState({
        tooltipLocation: {
          left: event.pageX,
          top: event.pageY,
        },
      });
    }
  };

  onNodeHoverOut = () => {
    this.setState({ nodeHoverInfo: null });
  };

  // mediate the callback function for clicking a row label in the heatmap,
  // so that clicking an allele returns the proper gene
  onRowLabelClick = rowLabel => {
    const { selectedOptions, onGeneLabelClick } = this.props;
    const { alleleToGeneMap } = this.state;
    let geneName = rowLabel;
    if (selectedOptions.viewLevel === VIEW_LEVEL_ALLELES) {
      geneName = alleleToGeneMap[rowLabel];
    }
    onGeneLabelClick(geneName);
  };

  onMetadataLabelHover = node => {
    const legend = this.heatmap.getColumnMetadataLegend(node.value);
    this.setState({
      columnMetadataLegend: legend,
      metadataLabelHovered: true,
    });
  };

  onMetadataLabelOut = () => {
    this.setState({ columnMetadataLegend: null });
  };

  onMetadataAddButtonClick = trigger => {
    this.setState({
      addMetadataTrigger: trigger,
    });
    logAnalyticsEvent("AMRHeatmapVis_metadata-add-button_clicked");
  };

  onMetadataSelectionChange = selectedMetadata => {
    this.setState({
      selectedMetadata,
    });
    logAnalyticsEvent("AMRHeatmapVis_selected-metadata_changed", {
      selectedMetadata,
    });
  };

  //*** Following functions depend on state and must be called after the component has updated ***

  getSelectedMetadataFields() {
    const { samplesMetadataTypes } = this.props;
    const { selectedMetadata } = this.state;
    const sortByLabel = (a, b) => (a.label > b.label ? 1 : -1); // alphabetical

    return Array.from(selectedMetadata)
      .map(metadatum => {
        return {
          label: samplesMetadataTypes[metadatum].name,
          value: metadatum,
        };
      })
      .sort(sortByLabel);
  }

  getTooltipData(node) {
    const { samplesWithAMRCounts, selectedOptions } = this.props;
    const { sampleLabels, alleleToGeneMap } = this.state;
    const sampleName = sampleLabels[node.columnIndex].label;
    const rowLabel = this.getHeatmapLabels()[node.rowIndex].label;
    const sampleForColumn = samplesWithAMRCounts[node.columnIndex];

    const amrCountForNode = sampleForColumn.amrCounts.find(
      amrCount => amrCount[selectedOptions.viewLevel] === rowLabel
    );

    let gene = "";
    let allele = "";
    switch (selectedOptions.viewLevel) {
      case VIEW_LEVEL_ALLELES: {
        allele = rowLabel;
        gene = alleleToGeneMap[allele];
        break;
      }
      case VIEW_LEVEL_GENES: {
        gene = rowLabel;
        allele = amrCountForNode ? amrCountForNode.allele : "---";
        break;
      }
      default: {
        break;
      }
    }

    let values = METRICS.map(metric => {
      const value = amrCountForNode
        ? amrCountForNode[metric.value] || "N/A"
        : 0;
      return [
        metric.text,
        metric.value === selectedOptions.metric ? <b>{value}</b> : value,
      ];
    });

    return [
      {
        name: "Info",
        data: [["Sample", sampleName], ["Gene", gene], ["Allele", allele]],
      },
      {
        name: "Values",
        data: values,
      },
    ];
  }

  getHeatmapLabels() {
    const { selectedOptions } = this.props;
    const { alleleLabels, geneLabels } = this.state;
    switch (selectedOptions.viewLevel) {
      case VIEW_LEVEL_ALLELES: {
        return alleleLabels;
      }
      case VIEW_LEVEL_GENES: {
        return geneLabels;
      }
    }
  }

  computeHeatmapValues(rows) {
    const { selectedOptions, samplesWithAMRCounts } = this.props;
    const heatmapValues = [];
    rows.forEach(label => {
      const rowValues = [];
      const rowName = label.label;
      samplesWithAMRCounts.forEach(sample => {
        const amrCountForRow = sample.amrCounts.find(
          amrCount => amrCount[selectedOptions.viewLevel] === rowName
        );
        if (amrCountForRow !== undefined) {
          rowValues.push(amrCountForRow[selectedOptions.metric] || 0);
        } else {
          rowValues.push(0);
        }
      });
      heatmapValues.push(rowValues);
    });
    return heatmapValues;
  }

  updateHeatmap() {
    const { selectedOptions } = this.props;
    const { sampleLabels } = this.state;
    const rows = this.getHeatmapLabels();
    const columns = sampleLabels;
    const values = this.computeHeatmapValues(rows);
    if (this.heatmap !== null) {
      this.heatmap.updateData({
        rowLabels: rows,
        columnLabels: columns,
        values: values,
      });
      this.heatmap.updateScale(selectedOptions.scale);
    } else {
      this.initializeHeatmap(rows, columns, values);
    }
  }

  initializeHeatmap(rows, columns, values) {
    const { selectedOptions, onSampleLabelClick } = this.props;
    this.heatmap = new Heatmap(
      this.heatmapContainer,
      // Data for the Heatmap
      // The Heatmap expects values to be listed by rows, and rows and values are rendered in reverse order.
      // That is, the first array in "values" is rendered on the bottom; and the leftmost value is rendered
      // in the rightmost box, and vice versa.
      {
        rowLabels: rows,
        columnLabels: columns, // Each columnLabel object contains the sample name, id, and all metadata values
        values: values,
      },
      // Custom options:
      {
        scale: selectedOptions.scale,
        scaleMin: 0,
        customColorCallback: this.colorFilter,
        onNodeHover: this.onNodeHover,
        onNodeHoverMove: this.onNodeHoverMove,
        onNodeHoverOut: this.onNodeHoverOut,
        onColumnLabelClick: onSampleLabelClick,
        onRowLabelClick: this.onRowLabelClick,
        columnMetadata: this.getSelectedMetadataFields(), // gets the selected metadata *fields*
        onColumnMetadataLabelMove: this.onNodeHoverMove,
        onColumnMetadataLabelHover: this.onMetadataLabelHover,
        onColumnMetadataLabelOut: this.onMetadataLabelOut,
        onAddColumnMetadataClick: this.onMetadataAddButtonClick,
        marginLeft: 50, // our gene names are very short, so this is to prevent metadata names from disappearing
      }
    );
    this.heatmap.start();
  }

  //*** Render functions ***

  renderNodeHoverTooltip() {
    const { nodeHoverInfo, tooltipLocation } = this.state;
    if (!(nodeHoverInfo && tooltipLocation)) {
      return;
    }
    return (
      <div
        className={cx(cs.tooltip, nodeHoverInfo && cs.visible)}
        style={getTooltipStyle(tooltipLocation, {
          buffer: 20,
          below: true,
        })}
      >
        <DataTooltip data={nodeHoverInfo} />
      </div>
    );
  }

  render() {
    const {
      columnMetadataLegend,
      tooltipLocation,
      addMetadataTrigger,
      selectedMetadata,
    } = this.state;
    return (
      <div className={cs.AMRHeatmapVis}>
        <div
          className={cs.AMRHeatmapContainer}
          ref={container => {
            this.heatmapContainer = container;
          }}
        />
        {this.renderNodeHoverTooltip()}
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
            metadataTypes={this.getMetadataTypes()}
            onMetadataSelectionChange={this.onMetadataSelectionChange}
            onMetadataSelectionClose={() => {
              this.setState({ addMetadataTrigger: null });
            }}
          />
        )}
      </div>
    );
  }
}

AMRHeatmapVis.propTypes = {
  samplesWithAMRCounts: PropTypes.arrayOf(
    PropTypes.shape({
      sampleName: PropTypes.string,
      sampleId: PropTypes.number,
      metadata: PropTypes.array,
      amrCounts: PropTypes.array,
      error: PropTypes.string,
    })
  ),
  selectedOptions: PropTypes.shape({
    metric: PropTypes.string,
    viewLevel: PropTypes.string,
    scale: PropTypes.string,
  }),
  onSampleLabelClick: PropTypes.func,
  onGeneLabelClick: PropTypes.func,
  samplesMetadataTypes: PropTypes.object,
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string,
      value: PropTypes.string,
    })
  ),
};
