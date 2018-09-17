import React from "react";
import Divider from "../../layout/Divider";
import Dropdown from "../../ui/controls/dropdowns/Dropdown";
import FilterRow from "../../layout/FilterRow";
import QueryString from "query-string";
import PhyloTreeVis from "./PhyloTreeVis";
import PropTypes from "prop-types";
import ViewHeader from "../../layout/ViewHeader";
import DownloadButtonDropdown from "../../ui/controls/dropdowns/DownloadButtonDropdown";

class PhyloTreeListView extends React.Component {
  constructor(props) {
    super(props);

    let urlParams = this.parseUrlParams();
    this.phyloTreeMap = new Map(props.phyloTrees.map(tree => [tree.id, tree]));

    this.state = {
      selectedPhyloTreeId: urlParams.treeId || (props.phyloTrees || []).id
    };

    this.handleTreeChange = this.handleTreeChange.bind(this);
  }

  parseUrlParams() {
    let urlParams = QueryString.parse(location.search, {
      arrayFormat: "bracket"
    });
    urlParams.treeId = parseInt(urlParams.treeId);
    return urlParams;
  }

  handleTreeChange(_, newPhyloTreeId) {
    this.setState({
      selectedPhyloTreeId: newPhyloTreeId.value
    });
  }

  getTreeStatus(tree) {
    let statusMessage = "";
    switch (tree) {
      case 0:
      case 3:
        statusMessage = "Tree not yet completed!";
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

  render() {
    if (!this.state.selectedPhyloTreeId) {
      // TEMP HACK for when there is no tree yet.
      // TODO: replace this entire block with a proper solution.
      let currentUrl = window.location.href;
      if (currentUrl.includes("taxid") && currentUrl.includes("project_id")) {
        // Redirect from e.g. "/phylo_trees/index?taxid=1868215&project_id=91"
        // to "/phylo_trees/new?taxid=1868215&project_id=91"
        let currentUrl = window.location.href;
        location.href = currentUrl.replace("index", "new");
      } else {
        // If no taxid/project is selected, just say there's no tree instead of a broken page
        return (
          <p className="phylo-tree-list-view__no-tree-banner">
            No trees yet. You can create trees from the report page.
          </p>
        );
      }
    }

    let currentTree = this.phyloTreeMap.get(this.state.selectedPhyloTreeId);
    return (
      <div className="phylo-tree-list-view">
        <div className="phylo-tree-list-view__narrow-container">
          <ViewHeader title="Phylogenetic Trees">
            <DownloadButtonDropdown
              options={[{ text: "SNP annotations", value: "SNP_annotations" }]}
              onClick={() => {
                location.href = `/phylo_trees/${currentTree.id}/download_snps`;
              }}
            />
          </ViewHeader>
        </div>
        <Divider />
        <div className="phylo-tree-list-view__narrow-container">
          <FilterRow>
            <Dropdown
              label="Tree: "
              onChange={this.handleTreeChange}
              options={this.props.phyloTrees.map(tree => ({
                value: tree.id,
                text: tree.name
              }))}
              value={this.state.selectedPhyloTreeId}
            />
          </FilterRow>
        </div>
        <Divider />
        <div className="phylo-tree-list-view__narrow-container">
          {currentTree.newick ? (
            <PhyloTreeVis
              newick={currentTree.newick}
              nodeData={currentTree.sampleDetailsByNodeName}
            />
          ) : (
            <p className="phylo-tree-list-view__no-tree-banner">
              {this.getTreeStatus(currentTree.status)}
            </p>
          )}
        </div>
      </div>
    );
  }
}

PhyloTreeListView.propTypes = {
  phyloTrees: PropTypes.array
};

export default PhyloTreeListView;
