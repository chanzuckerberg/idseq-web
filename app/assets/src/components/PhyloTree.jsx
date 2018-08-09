import axios from "axios";
import React from "react";
import { Button, Checkbox, Input } from "semantic-ui-react";
import PhyloTreeViz from "./PhyloTreeViz";

class PhyloTree extends React.Component {
  constructor(props) {
    super();
    this.csrf = props.csrf;
    this.project = props.project;
    this.samples = props.samples;
    this.phylo_tree = props.phylo_tree;
    this.state = {
      selectedPipelineRunIds: this.phylo_tree
        ? this.phylo_tree.pipeline_runs.map(pr => pr.id)
        : [],
      show_create_button:
        !this.phylo_tree || (this.phylo_tree && this.phylo_tree.status == 2)
      // there is no tree yet, or tree generation failed
    };

    this.updatePipelineRunIdSelection = this.updatePipelineRunIdSelection.bind(
      this
    );
  }

  updatePipelineRunIdSelection(e) {
    let PrId = e.target.getAttribute("data-pipeline-run-id");
    let PrIdList = this.state.selectedPipelineRunIds;
    let index = PrIdList.indexOf(+PrId);
    if (e.target.checked) {
      if (index < 0) {
        PrIdList.push(+PrId);
      }
    } else {
      if (index >= 0) {
        PrIdList.splice(index, 1);
      }
    }
    this.setState({ selectedPipelineRunIds: PrIdList });
  }

  handleInputChange(e, { name, value }) {
    this.setState({ [e.target.id]: value });
  }

  render() {
    let title = (
      <h2>
        Phylogenetic tree for <i>{this.phylo_tree.tax_name}</i> in project{" "}
        <i>{this.project.name}</i>
      </h2>
    );
    let tree_exists = !!this.phylo_tree;
    let sample_list = this.samples.map(function(s, i) {
      return (
        <div>
          <input
            type="checkbox"
            id={s.pipeline_run_id}
            key={s.pipeline_run_id}
            data-pipeline-run-id={s.pipeline_run_id}
            onClick={this.updatePipelineRunIdSelection}
            checked={
              this.state.selectedPipelineRunIds.indexOf(s.pipeline_run_id) >= 0
            }
            disabled={tree_exists || s.taxid_nt_reads < 5}
          />
          <label htmlFor={s.pipeline_run_id}>
            {s.name} ({s.taxid_nt_reads} reads)
          </label>
        </div>
      );
    }, this);
    let tree_name = (
      <Input
        id="treeName"
        placeholder="Name"
        onChange={this.handleInputChange}
        disabled={tree_exists}
      />
    );
    return (
      <div>
        {title}
        <h3>Relevant samples:</h3>
        {tree_name}
        {sample_list}
        <PhyloTreeViz phylo_tree={this.phylo_tree} />
      </div>
    );
  }
}

export default PhyloTree;
