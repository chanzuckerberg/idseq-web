import axios from "axios";
import React from "react";
import { Button, Checkbox } from "semantic-ui-react";
import PhyloTreeViz from "./PhyloTreeViz";

class PhyloTree extends React.Component {
  constructor(props) {
    super();
    this.csrf = props.csrf;
    this.taxon = props.taxon;
    this.project = props.project;
    this.samples = props.samples;
    this.phylo_tree = props.phylo_tree;
    this.state = {
      selectedPipelineRunIds: this.phylo_tree
        ? this.phylo_tree.pipeline_runs.map(pr => pr.id)
        : [],
      show_create_button:
        !this.phylo_tree || (this.phylo_tree && this.phylo_tree.status == 2)
    };

    this.createTree = this.createTree.bind(this);
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

  createTree() {
    let pipeline_run_ids = this.state.selectedPipelineRunIds;
    var that = this;
    axios
      .post(
        `/phylo_trees/create?project_id=${this.project.id}&taxid=${
          this.taxon.taxid
        }&pipeline_run_ids=${pipeline_run_ids}`,
        {
          tax_level: this.taxon.tax_level,
          tax_name: this.taxon.name,
          authenticity_token: this.csrf
        }
      )
      .then(res => {
        that.setState({
          show_create_button: !(res.data.status === "ok"),
          status_message: res.data.message
        });
      });
  }

  render() {
    let title = (
      <h2>
        Phylogenetic tree for <i>{this.taxon.name}</i> in project{" "}
        <i>{this.project.name}</i>
      </h2>
    );
    console.log(!!this.phylo_tree);
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
            disabled={!!this.phylo_tree}
          />
          <label htmlFor={s.pipeline_run_id}>
            {s.name} ({s.taxid_nt_reads} reads)
          </label>
        </div>
      );
    }, this);
    return (
      <div>
        {title}
        <h3>Relevant samples:</h3>
        {sample_list}
        {this.phylo_tree ? <PhyloTreeViz phylo_tree={this.phylo_tree} /> : null}
        {this.state.show_create_button ? (
          <Button primary onClick={this.createTree}>
            Create Tree
          </Button>
        ) : null}
        <p>{this.state.status_message}</p>
      </div>
    );
  }
}

export default PhyloTree;
