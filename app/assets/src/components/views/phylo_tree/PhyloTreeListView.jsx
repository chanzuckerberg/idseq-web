import React from "react";
import { fromPairs, set, find } from "lodash/fp";
import Divider from "../../layout/Divider";
import PhyloTreeVis from "./PhyloTreeVis";
import PhyloTreeDownloadButton from "./PhyloTreeDownloadButton";
import { SaveButton, ShareButton } from "~ui/controls/buttons";
import BasicPopup from "~/components/BasicPopup";
import copy from "copy-to-clipboard";
import { saveVisualization } from "~/api";

import NarrowContainer from "~/components/layout/NarrowContainer";
import DetailsSidebar from "~/components/common/DetailsSidebar";
import PropTypes from "prop-types";
import { parseUrlParams } from "~/helpers/url";
import ViewHeader from "../../layout/ViewHeader/ViewHeader";
import cs from "./phylo_tree_list_view.scss";

class PhyloTreeListView extends React.Component {
  constructor(props) {
    super(props);

    let urlParams = parseUrlParams();

    this.state = {
      selectedPhyloTreeId: this.getDefaultSelectedTreeId(
        urlParams,
        props.phyloTrees
      ),
      phyloTreeMap: fromPairs(props.phyloTrees.map(tree => [tree.id, tree])),
      sidebarMode: null,
      sidebarVisible: false,
      sidebarConfig: null,
      selectedSampleId: null,
      selectedPipelineRunId: null
    };
  }

  getDefaultSelectedTreeId(urlParams, phyloTrees = []) {
    const selectedId =
      urlParams.treeId || parseInt(window.sessionStorage.getItem("treeId"));

    // If the selected tree doesn't exist, default to the first one.
    if (!selectedId || !find({ id: selectedId }, phyloTrees)) {
      return (phyloTrees[0] || {}).id;
    }

    return selectedId;
  }

  handleTreeChange = newPhyloTreeId => {
    window.sessionStorage.setItem("treeId", newPhyloTreeId);
    this.setState({
      selectedPhyloTreeId: newPhyloTreeId,
      sidebarVisible: false
    });
  };

  handleMetadataUpdate = (key, newValue) => {
    // Update the metadata stored locally.
    this.setState({
      phyloTreeMap: set(
        [
          this.state.selectedPhyloTreeId,
          "sampleDetailsByNodeName",
          this.state.selectedPipelineRunId,
          "metadata",
          key
        ],
        newValue,
        this.state.phyloTreeMap
      )
    });
  };

  // TODO (gdingle): use url shorten when PR is merged
  handleShareClick = () => {
    copy(window.location.href);
  };

  handleSaveClick = async () => {
    // TODO (gdingle): add analytics tracking?
    let params = parseUrlParams();
    await saveVisualization("phylo_tree", params);
  };

  getTreeStatus(tree) {
    let statusMessage = "";
    switch (tree) {
      case 0:
      case 3:
        statusMessage = "Computation in progress. Please check back later!";
        break;
      case 2:
        statusMessage = "Tree creation failed!";
        break;
      default:
        // TODO: process error
        statusMessage = "Tree unavailable!";
        break;
    }
    return statusMessage;
  }

  handleTaxonModeOpen = () => {
    const currentTree = this.state.phyloTreeMap[this.state.selectedPhyloTreeId];
    if (
      this.state.sidebarMode === "taxonDetails" &&
      this.state.sidebarVisible &&
      currentTree.taxid === this.state.sidebarConfig.taxonId
    ) {
      this.setState({
        sidebarVisible: false
      });
    } else {
      this.setState({
        sidebarVisible: true,
        sidebarConfig: {
          parentTaxonId: currentTree.parent_taxid,
          taxonId: currentTree.taxid,
          taxonName: currentTree.tax_name
        },
        sidebarMode: "taxonDetails"
      });
    }
  };

  handleSampleNodeClick = (sampleId, pipelineRunId) => {
    if (!sampleId) {
      this.setState({
        sidebarVisible: false
      });
      return;
    }

    if (
      this.state.sidebarVisible &&
      this.state.sidebarMode === "sampleDetails" &&
      this.state.selectedSampleId === sampleId
    ) {
      this.setState({
        sidebarVisible: false
      });
    } else {
      this.setState({
        selectedSampleId: sampleId,
        selectedPipelineRunId: pipelineRunId,
        sidebarConfig: {
          sampleId,
          onMetadataUpdate: this.handleMetadataUpdate,
          showReportLink: true
        },
        sidebarMode: "sampleDetails",
        sidebarVisible: true
      });
    }
  };

  closeSidebar = () => {
    this.setState({
      sidebarVisible: false
    });
  };

  render() {
    if (!this.state.selectedPhyloTreeId) {
      return (
        <div className={cs.noTreeBanner}>
          No phylogenetic trees were found. You can create trees from the report
          page.
        </div>
      );
    }

    let currentTree = this.state.phyloTreeMap[this.state.selectedPhyloTreeId];
    return (
      <div className={cs.phyloTreeListView}>
        <ViewHeader title="Phylogenetic Trees" className={cs.viewHeader}>
          <ViewHeader.Content>
            <ViewHeader.Pretitle>
              Phylogenetic Tree{" "}
              {currentTree.tax_name && (
                <span>
                  &nbsp;-&nbsp;
                  <span
                    className={cs.taxonName}
                    onClick={this.handleTaxonModeOpen}
                  >
                    {currentTree.tax_name}
                  </span>
                </span>
              )}
            </ViewHeader.Pretitle>
            <ViewHeader.Title
              label={currentTree.name}
              id={this.state.selectedPhyloTreeId}
              options={this.props.phyloTrees.map(tree => ({
                label: tree.name,
                id: tree.id,
                onClick: () => this.handleTreeChange(tree.id)
              }))}
            />
          </ViewHeader.Content>
          <ViewHeader.Controls>
            <BasicPopup
              trigger={<ShareButton onClick={this.handleShareClick} />}
              content="A shareable URL will be copied to your clipboard!"
              on="click"
              hideOnScroll
            />{" "}
            {/* TODO: (gdingle): this is admin-only until we have a way of browsing visualizations */}
            {this.props.admin && <SaveButton onClick={this.handleSaveClick} />}{" "}
            <PhyloTreeDownloadButton tree={currentTree} />
          </ViewHeader.Controls>
        </ViewHeader>
        <Divider />
        <DetailsSidebar
          visible={this.state.sidebarVisible}
          mode={this.state.sidebarMode}
          onClose={this.closeSidebar}
          params={this.state.sidebarConfig}
        />
        <NarrowContainer>
          {currentTree.newick ? (
            <PhyloTreeVis
              newick={currentTree.newick}
              nodeData={currentTree.sampleDetailsByNodeName}
              phyloTreeId={this.state.selectedPhyloTreeId}
              onMetadataUpdate={this.handleMetadataUpdate}
              onSampleNodeClick={this.handleSampleNodeClick}
            />
          ) : (
            <p className={cs.noTreeBanner}>
              {this.getTreeStatus(currentTree.status)}
            </p>
          )}
        </NarrowContainer>
      </div>
    );
  }
}

PhyloTreeListView.propTypes = {
  phyloTrees: PropTypes.array,
  admin: PropTypes.bool
};

export default PhyloTreeListView;
