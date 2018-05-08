import React from "react";
import ReactDOM from "react-dom";
import moment from "moment";
import $ from "jquery";
import axios from "axios";
import Cookies from "js-cookie";
import { Button, Icon, Divider, Popup } from "semantic-ui-react";
import numberWithCommas from "../helpers/strings";
import SubHeader from "./SubHeader";
import ERCCScatterPlot from "./ERCCScatterPlot";
import PipelineSampleReport from "./PipelineSampleReport";
import BasicPopup from "./BasicPopup";

class PipelineSampleReads extends React.Component {
  constructor(props) {
    super(props);
    this.can_edit = props.can_edit;
    this.csrf = props.csrf;
    this.gitVersion = props.gitVersion;
    this.allBackgrounds = props.all_backgrounds;
    this.rerunPath = props.rerun_path;
    this.sampleInfo = props.sampleInfo;
    this.projectInfo = props.projectInfo;
    this.sample_map = props.project_sample_ids_names;

    this.reportPresent = props.reportPresent;
    this.reportTime = props.reportTime;
    this.allCategories = props.allCategories;
    this.reportDetails = props.reportDetails;
    this.pipelineRunRetriable = props.pipelineRunRetriable;
    this.pipelineVersions = props.pipeline_versions;

    this.jobStatistics = props.jobStatistics;
    this.summary_stats = props.summary_stats;
    this.gotoReport = this.gotoReport.bind(this);
    this.refreshPage = this.refreshPage.bind(this);
    this.sampleId = this.sampleInfo.id;
    this.host_genome = props.host_genome;
    this.pipelineStatus = props.sample_status;
    this.pipelineRun = props.pipelineRun;
    this.rerunPipeline = this.rerunPipeline.bind(this);
    this.canSeeAlignViz = props.can_see_align_viz;
    this.state = {
      rerunStatus: "failed",
      rerunStatusMessage: "Sample run failed",
      watched_taxids: props.reportDetails
        ? props.reportDetails.watched_taxids
        : [],
      confirmed_taxids: props.reportDetails
        ? props.reportDetails.confirmed_taxids
        : [],
      confirmed_names: props.reportDetails
        ? props.reportDetails.confirmed_names
        : [],
      sample_name: props.sampleInfo.name
    };
    this.TYPE_PROMPT = "-";
    this.NUCLEOTIDE_TYPES = ["-", "DNA", "RNA"];
    this.DROPDOWN_OPTIONS = {
      sample_tissue: PipelineSampleReads.fetchTissueTypes(),
      sample_template: this.NUCLEOTIDE_TYPES
    };
    this.DROPDOWN_METADATA_FIELDS = Object.keys(this.DROPDOWN_OPTIONS);
    this.handleDropdownChange = this.handleDropdownChange.bind(this);
    this.deleteSample = this.deleteSample.bind(this);
    this.toggleHighlightTaxon = this.toggleHighlightTaxon.bind(this);
  }

  refreshPage(overrides) {
    const new_params = Object.assign(
      {},
      this.props.reportPageParams,
      overrides
    );
    window.location =
      location.protocol +
      "//" +
      location.host +
      location.pathname +
      "?" +
      $.param(new_params);
  }

  deleteSample() {
    axios
      .delete(`/samples/${this.sampleInfo.id}.json`, {
        data: { authenticity_token: this.csrf }
      })
      .then(() => {
        location.href = `/?project_id=${this.projectInfo.id}`;
      })
      .catch(err => {});
  }

  toggleHighlightTaxon(e) {
    let taxid = e.target.getAttribute("data-tax-id");
    let name = e.target.getAttribute("data-tax-name");
    let strength = e.target.getAttribute("data-confirmation-strength");
    let current_taxids = this.state[strength + "_taxids"];
    let action =
      current_taxids.indexOf(parseInt(taxid)) >= 0
        ? "remove_taxon_confirmation"
        : "add_taxon_confirmation";
    axios
      .post(`/samples/${this.sampleId}/${action}`, {
        taxid: taxid,
        name: name,
        strength: strength,
        authenticity_token: this.csrf
      })
      .then(res => {
        this.setState({
          watched_taxids: res.data.watched_taxids,
          confirmed_taxids: res.data.confirmed_taxids,
          confirmed_names: res.data.confirmed_names
        });
      });
  }

  render_metadata_dropdown(label, field) {
    let dropdown_options = this.DROPDOWN_OPTIONS[field];
    let display_value = this.sampleInfo[field] ? this.sampleInfo[field] : "-";
    return (
      <div className="row detail-row">
        <div className="col s6 label">{label}</div>
        <div className="col s6">
          <div className="sample-notes">
            <div
              className="details-value custom-select-dropdown select-dropdown"
              data-activates={field}
            >
              <div className="details-text">{display_value}</div>
              <i className="fa fa-chevron-down right" />
            </div>
            {this.can_edit ? (
              <ul id={field} className="dropdown-content details-dropdown">
                {dropdown_options.map((option_value, i) => {
                  return (
                    <li
                      onClick={e => {
                        this.handleDropdownChange(field, i, e);
                      }}
                      ref={field}
                      key={`version_${i}`}
                    >
                      {option_value}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  render_metadata_textfield_wide(label, hash, field, blank_value, editable) {
    let value = hash[field];
    if (hash[field] instanceof Array) value = hash[field].join("; ");
    return (
      <div className="details-container col s12">
        <div className="details-title note">{label}</div>
        <div className={"sample-notes note " + (editable ? "edit-wide" : "")}>
          <pre
            className="details-value"
            suppressContentEditableWarning
            contentEditable={editable}
            id={field}
          >
            {value && value.trim() !== "" ? value : blank_value}
          </pre>
        </div>
      </div>
    );
  }

  render_metadata_textfield(label, field, popupContent) {
    let display_value = this.TYPE_PROMPT;
    if (this.sampleInfo[field] && this.sampleInfo[field].trim() !== "")
      display_value = this.sampleInfo[field];
    let labelElem = <div className="col s6 label">{label}</div>;
    if (popupContent)
      labelElem = <BasicPopup trigger={labelElem} content={popupContent} />;
    return (
      <div className="row detail-row">
        {labelElem}
        <div className="col s6">
          <div
            className={
              "details-value sample-notes " + (this.can_edit ? "edit" : "")
            }
          >
            <pre
              suppressContentEditableWarning
              contentEditable={this.can_edit}
              id={field}
            >
              {display_value}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  render_metadata_numfield(label, field) {
    let display_value = this.sampleInfo[field] || this.TYPE_PROMPT;
    return (
      <div className="row detail-row">
        <div className="col s6 label">{label}</div>
        <div className="col s6">
          <div
            className={
              "details-value sample-notes " + (this.can_edit ? "edit" : "")
            }
          >
            <pre
              suppressContentEditableWarning
              contentEditable={this.can_edit}
              id={field}
            >
              {display_value}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  gotoReport() {
    $("ul.tabs").tabs("select_tab", "reports");
    PipelineSampleReads.setTab("pipeline_display", "reports");
  }

  pipelineInProgress() {
    if (this.pipelineRun === null) {
      return true;
    } else if (this.pipelineRun.finalized === 1) {
      return false;
    }
    return true;
  }
  rerunPipeline() {
    this.setState({
      rerunStatus: "waiting",
      rerunStatusMessage: (
        <span>
          <br />
          <i className="fa fa-circle-o-notch fa-spin fa-fw" />
          Adding sample to queue ...
        </span>
      )
    });
    axios
      .put(`${this.rerunPath}.json`, {
        authenticity_token: this.csrf
      })
      .then(response => {
        this.setState({
          rerunStatus: "success",
          rerunStatusMessage: "Rerunning sample"
        });
        // this should set status to UPLOADING/IN PROGRESS after rerun
      })
      .catch(error => {
        this.setState({
          rerunStatus: "failed",
          rerunStatusMessage: (
            <span>
              <br />
              <i className="fa fa-frown-o fa-fw" />Failed to re-run Pipeline
            </span>
          )
        });
      });
  }

  static getActive(section, tab) {
    return window.localStorage.getItem(section) === tab ? "active" : "";
  }

  static setTab(section, tab) {
    window.localStorage.setItem(section, tab);
  }

  static fetchTissueTypes() {
    let tissue_types = [
      "-",
      "Bronchoalveolar lavage",
      "Cerebrospinal fluid",
      "Nasopharyngeal swab",
      "Plasma",
      "Serum",
      "Solid tissue",
      "Stool",
      "Synovial fluid",
      "Whole blood",
      "Whole insect",
      "Insect abdomen",
      "Insect engorged abdomen",
      "Insect head"
    ];
    return tissue_types;
  }

  fetchParams(param) {
    let urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  getDownloadLink() {
    const param_background_id = this.fetchParams("background_id");
    const cookie_background_id = Cookies.get("background_id");
    const defaultBackground = cookie_background_id
      ? `?background_id=${cookie_background_id}`
      : "";
    const csv_background_id_param = param_background_id
      ? `?background_id=${param_background_id}`
      : defaultBackground;
    return `/samples/${this.sampleId}/report_csv${csv_background_id_param}`;
  }

  componentDidMount() {
    $(".sample-select-dropdown").dropdown({
      belowOrigin: true
    });

    $("ul.tabs").tabs();
    this.listenNoteChanges();
    this.initializeSelectTag();
    $(".custom-select-dropdown").dropdown({
      belowOrigin: true
    });
    for (var i = 0; i < this.DROPDOWN_METADATA_FIELDS.length; i++) {
      let field = this.DROPDOWN_METADATA_FIELDS[i];
      $(ReactDOM.findDOMNode(this.refs[field])).on(
        "change",
        this.handleDropdownChange
      );
    }
  }

  initializeSelectTag() {
    $("select").material_select();
  }

  handleDropdownChange(field, position, element) {
    const parent = $(element.target).parent();
    const value = this.DROPDOWN_OPTIONS[field][position];
    const prevValue = parent
      .prev()
      .text()
      .trim();
    if (prevValue !== value) {
      parent.prev().html(
        `<div class='details-text'>
        ${value}
       </div>
       <i class="fa fa-chevron-down right"/>`
      );
      axios
        .post("/samples/" + this.sampleInfo.id + "/save_metadata.json", {
          field: field,
          value: value,
          authenticity_token: this.csrf
        })
        .then(response => {
          if (response.data.status === "success") {
            $(".note-saved-success")
              .html(
                `<i class='fa fa-check-circle'></i> ${response.data.message}`
              )
              .css("display", "inline-block")
              .delay(1000)
              .slideUp(200);
          } else {
            $(".note-save-failed")
              .html(`<i class='fa fa-frown-o'></i> ${response.data.message}`)
              .css("display", "inline-block")
              .delay(1000)
              .slideUp(200);
          }
        })
        .catch(() => {
          $(".note-save-failed")
            .html(`<i class='fa fa-frown-o'></i> Something went wrong!`)
            .css("display", "inline-block")
            .delay(1000)
            .slideUp(200);
        });
    }
  }

  listenNoteChanges() {
    if (!this.can_edit) {
      return;
    }
    let currentText = "";
    $(".sample-notes").focusin(e => {
      currentText = e.target.innerText.trim();
      if (currentText === this.TYPE_PROMPT) {
        e.target.innerText = "";
      }
    });

    $(".sample-notes").focusout(e => {
      const newText = e.target.innerText.trim();
      const field = e.target.id;
      if (newText !== currentText) {
        axios
          .post("/samples/" + this.sampleInfo.id + "/save_metadata.json", {
            field: field,
            value: newText,
            authenticity_token: this.csrf
          })
          .then(response => {
            if (response.data.status === "success") {
              $(".note-saved-success")
                .html(
                  `<i class='fa fa-check-circle'></i> ${response.data.message}`
                )
                .css("display", "inline-block")
                .delay(1000)
                .slideUp(200);
              if (field === "name") {
                // update the name displayed in the header in real-time
                this.setState({ sample_name: newText });
              }
            } else if (response.data.status === "failed") {
              $(".note-save-failed")
                .html(
                  `<i class='fa fa-frown-o'></i> ${response.data.message} ${
                    response.data.errors
                  }`
                )
                .css("display", "inline-block")
                .delay(1000)
                .slideUp(200);
              // Reset back to the old text
              e.target.innerText = currentText;
            }
          })
          .catch(() => {
            $(".note-save-failed")
              .html(`<i class='fa fa-frown-o'></i> Something went wrong!`)
              .css("display", "inline-block")
              .delay(1000)
              .slideUp(200);
          });
      }
      if (newText.trim() === "") {
        e.target.innerText = this.TYPE_PROMPT;
      }
    });
  }

  renderERCC() {
    if (!this.props.ercc_comparison) {
      return;
    }

    return (
      <div className="row last-row">
        <div className="col s12">
          <div className="content-title">ERCC Spike In Counts</div>
          <ERCCScatterPlot ercc_comparison={this.props.ercc_comparison} />
        </div>
      </div>
    );
  }

  render() {
    let d_report = null;
    let waitingSpinner = (
      <div>
        Sample Waiting ...
        <p>
          <i className="fa fa-spinner fa-spin fa-3x" />
        </p>
      </div>
    );

    let date_available =
      this.summary_stats && this.summary_stats.last_processed_at;
    let run_date_display = !date_available
      ? BLANK_TEXT
      : moment(this.summary_stats.last_processed_at)
          .startOf("second")
          .fromNow();
    let run_date_display_augmented = !date_available
      ? ""
      : "| data processed " + run_date_display;
    let pipeline_versions =
      this.pipelineVersions.length > 1 ? (
        <span>
          {" "}
          | switch to
          {this.pipelineVersions.map((version, i) => {
            const phash = { pipeline_version: version };
            return version != this.props.reportPageParams.pipeline_version ? (
              <a
                key={i}
                onClick={e => {
                  this.refreshPage(phash);
                }}
              >
                {" "}
                {version}{" "}
              </a>
            ) : null;
          }, this)}
        </span>
      ) : null;

    if (this.reportPresent) {
      d_report = (
        <PipelineSampleReport
          sample_id={this.sampleId}
          csrf={this.csrf}
          report_ts={this.reportTime}
          git_version={this.gitVersion}
          all_categories={this.allCategories}
          all_backgrounds={this.allBackgrounds}
          report_details={this.reportDetails}
          can_see_align_viz={this.canSeeAlignViz}
          can_edit={this.can_edit}
          confirmed_taxids={this.state.confirmed_taxids}
          watched_taxids={this.state.watched_taxids}
          toggleHighlightTaxon={this.toggleHighlightTaxon}
          refreshPage={this.refreshPage}
        />
      );
    } else if (this.pipelineInProgress()) {
      d_report = (
        <div className="center-align text-grey text-lighten-2 no-report sample-wait-top">
          {waitingSpinner}
        </div>
      );
    } else {
      d_report = (
        <div className="center-align text-grey text-lighten-2 no-report">
          <h6 className={this.state.rerunStatus}>
            {this.state.rerunStatus === "success"
              ? waitingSpinner
              : this.state.rerunStatusMessage}
          </h6>
        </div>
      );
    }

    let pipeline_run = null;
    const BLANK_TEXT = "unknown";
    if (this.pipelineRun && this.pipelineRun.total_reads) {
      pipeline_run = (
        <div className="data">
          <div className="row">
            <div className="col s6">
              <div className="row detail-row">
                <div className="col s6 label">Total reads</div>
                <div className="details-value col s6 plain">
                  {numberWithCommas(this.pipelineRun.total_reads)}
                </div>
              </div>
              <div className="row detail-row">
                <div className="col s6 label">ERCC reads</div>
                <div className="details-value col s6 plain">
                  {!this.pipelineRun.total_ercc_reads
                    ? 0
                    : numberWithCommas(this.pipelineRun.total_ercc_reads)}
                  {!this.pipelineRun.total_ercc_reads
                    ? ""
                    : ` (${(
                        100.0 *
                        this.pipelineRun.total_ercc_reads /
                        this.pipelineRun.total_reads
                      ).toFixed(2)}%)`}
                </div>
              </div>
              <div className="row detail-row">
                <div className="col s6 label">Non-host reads</div>
                <div
                  className={`details-value col s6 plain ${
                    !this.summary_stats.remaining_reads ? BLANK_TEXT : ""
                  }`}
                >
                  {!this.summary_stats.remaining_reads
                    ? BLANK_TEXT
                    : numberWithCommas(this.summary_stats.remaining_reads)}
                  {!this.summary_stats.percent_remaining
                    ? ""
                    : ` (${this.summary_stats.percent_remaining.toFixed(2)}%)`}
                </div>
              </div>
              <div className="row detail-row">
                <div className="col s6 label">Unmapped reads</div>
                <div
                  className={`details-value col s6 plain ${
                    !this.summary_stats.unmapped_reads ? BLANK_TEXT : ""
                  }`}
                >
                  {!this.summary_stats.unmapped_reads
                    ? BLANK_TEXT
                    : numberWithCommas(this.summary_stats.unmapped_reads)}
                </div>
              </div>
            </div>
            <div className="col s6">
              <div className="row detail-row">
                <div className="col s6 label">Passed quality control</div>
                <div
                  className={`details-value col s6 plain ${
                    !this.summary_stats.qc_percent ? BLANK_TEXT : ""
                  }`}
                >
                  {!this.summary_stats.qc_percent
                    ? BLANK_TEXT
                    : `${this.summary_stats.qc_percent.toFixed(2)}%`}
                </div>
              </div>
              <div className="row detail-row">
                <div className="col s6 label">Compression ratio</div>
                <div
                  className={`details-value col s6 plain ${
                    !this.summary_stats.compression_ratio ? BLANK_TEXT : ""
                  }`}
                >
                  {!this.summary_stats.compression_ratio
                    ? BLANK_TEXT
                    : this.summary_stats.compression_ratio.toFixed(2)}
                </div>
              </div>
              <div className="row detail-row">
                <div className="col s6 label">Date processed</div>
                <div
                  className={`details-value col s6 plain ${
                    !this.summary_stats.last_processed_at ? BLANK_TEXT : ""
                  }`}
                >
                  {run_date_display}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      pipeline_run = (
        <div className="center">
          There is no pipeline output for this sample
        </div>
      );
    }

    let assembly_download = null;
    if (
      this.reportDetails &&
      this.reportDetails.assembled_taxids.indexOf("all") >= 0
    ) {
      assembly_download = (
        <a
          className="custom-button"
          href={`/samples/${this.sampleInfo.id}/all`}
        >
          <i className="fa fa-cloud-download" />
          Non-Host Assemblies
        </a>
      );
    }

    let download_section = null;
    if (this.pipelineRun && this.pipelineRun.total_reads) {
      download_section = (
        <div>
          <a
            className="custom-button"
            href={`/samples/${this.sampleInfo.id}/nonhost_fasta`}
          >
            <i className="fa fa-cloud-download" />
            Non-Host Reads
          </a>
          <a
            className="custom-button"
            href={`/samples/${this.sampleInfo.id}/unidentified_fasta`}
          >
            <i className="fa fa-cloud-download" />
            Unmapped Reads
          </a>
          <a
            className="custom-button"
            href={`/samples/${this.sampleInfo.id}/results_folder`}
          >
            <i className="fa fa-folder-open" />
            Results Folder
          </a>
          {assembly_download}
        </div>
      );
    }

    let sample_dropdown = "";
    if (this.sample_map && Object.keys(this.sample_map).length > 1) {
      sample_dropdown = (
        <div
          className="dropdown-button sample-select-dropdown"
          data-activates="sample-list"
        >
          <span className="sample-name-label">{this.state.sample_name}</span>
          <i className="fa fa-chevron-down right" />

          <ul
            id="sample-list"
            className="dropdown-content sample-dropdown-content"
          >
            {Object.keys(this.sample_map).map((sample_id, i) => {
              if (parseInt(sample_id) !== parseInt(this.sampleId)) {
                return (
                  <li key={i}>
                    <a href={`/samples/${sample_id}`}>
                      {this.sample_map[sample_id]}
                    </a>
                  </li>
                );
              }
            })}
          </ul>
        </div>
      );
    } else {
      sample_dropdown = (
        <span className="sample-name-label">{this.state.sample_name}</span>
      );
    }

    let version_display = !this.pipelineRun
      ? ""
      : !this.pipelineRun.version
        ? ""
        : !this.pipelineRun.version.pipeline
          ? ""
          : "v" + this.pipelineRun.version.pipeline;
    if (version_display != "" && this.pipelineRun.version.nt) {
      version_display = version_display + ", NT " + this.pipelineRun.version.nt;
    }
    if (version_display != "" && this.pipelineRun.version.nr) {
      version_display = version_display + ", NR " + this.pipelineRun.version.nr;
    }

    let retriable = this.pipelineRunRetriable ? (
      <div className="row">
        <div className="col s12">
          <div className="content-title">Retry Pipeline</div>
          <h6 className={this.state.rerunStatus}>
            {this.state.rerunStatus === "success" ? waitingSpinner : null}
          </h6>
          <p>
            Pipeline was not 100% successful. Sample status:{" "}
            <b>{this.pipelineStatus}</b> <br />
            {this.state.rerunStatus === "failed" && this.can_edit ? (
              <a onClick={this.rerunPipeline} className="custom-button small">
                <i className="fa fa-repeat" />
                RETRY PIPELINE
              </a>
            ) : null}
          </p>
        </div>
      </div>
    ) : null;

    let delete_sample_button = (
      <Button onClick={this.deleteSample} className="delete-button">
        Delete sample
      </Button>
    );

    return (
      <div>
        <SubHeader>
          <div className="sub-header">
            <div className="title">
              PIPELINE {version_display} {run_date_display_augmented}{" "}
              {pipeline_versions}
            </div>
            <div className="row">
              <div className="sub-title col s9">
                <a href={`/?project_id=${this.projectInfo.id}`}>
                  {this.projectInfo.name + " "}
                </a>
                > {sample_dropdown}
                {this.sampleInfo.status == "created"
                  ? delete_sample_button
                  : null}
              </div>
              <div className="col no-padding s3 right-align">
                <div className="report-action-buttons">
                  <a className="right" href={this.getDownloadLink()}>
                    <Button
                      icon
                      labelPosition="left"
                      className="icon link download-btn"
                    >
                      <Icon className="cloud download alternate" />
                      <span>Download</span>
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            <div className="sub-header-navigation">
              <div className="nav-content">
                <ul className="tabs tabs-transparent">
                  <li className="tab">
                    <a href="#reports" className="active">
                      Report
                    </a>
                  </li>
                  <li className="tab">
                    <a href="#details" className="">
                      Details
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </SubHeader>
        <Divider className="reports-divider" />
        <div id="details" className="tab-screen col s12">
          <div className="center">
            <span className="note-action-feedback note-saved-success" />
            <span className="note-action-feedback note-save-failed" />
          </div>

          <div className="container tab-screen-content">
            <div className="row">
              <div className="col s9">
                <div className="row">
                  <div className="col s12">
                    <div className="content-title">Sample Details</div>
                    <div className="data">
                      <div className="row">
                        <div className="col s6">
                          <div className="row detail-row">
                            <div className="col s6 label">Host</div>
                            <div
                              className={`details-value col s6 plain
                            ${!this.host_genome ? BLANK_TEXT : ""}`}
                            >
                              {!this.host_genome
                                ? BLANK_TEXT
                                : this.host_genome.name}
                            </div>
                          </div>

                          <div className="row detail-row">
                            <div className="col s6 label">Upload date</div>
                            <div className="details-value col s6 plain">
                              {moment(this.sampleInfo.created_at)
                                .startOf("second")
                                .fromNow()}
                            </div>
                          </div>
                          {this.render_metadata_textfield(
                            "Location",
                            "sample_location"
                          )}
                          {this.render_metadata_dropdown(
                            "Tissue type",
                            "sample_tissue"
                          )}
                          {this.render_metadata_dropdown(
                            "Nucleotide type",
                            "sample_template"
                          )}
                          {this.render_metadata_textfield(
                            "Unique ID",
                            "sample_unique_id"
                          )}
                          {this.render_metadata_textfield(
                            "Sample collection date",
                            "sample_date"
                          )}
                        </div>
                        <div className="col s6">
                          {this.render_metadata_textfield(
                            "Library prep",
                            "sample_library",
                            "Type of library preparation protocol (e.g. Nextera)"
                          )}
                          {this.render_metadata_textfield(
                            "Sequencer",
                            "sample_sequencer",
                            "e.g. Illumina NovaSeq"
                          )}
                          {this.render_metadata_numfield(
                            "RNA/DNA input (pg)",
                            "sample_input_pg"
                          )}
                          {this.render_metadata_numfield(
                            "Batch (#)",
                            "sample_batch"
                          )}
                          {this.render_metadata_textfield(
                            "Known organisms",
                            "sample_organism",
                            "Known hits that may or may not have been in this report"
                          )}
                          {this.render_metadata_textfield(
                            "Detection method",
                            "sample_detection",
                            "Method for detecting known organisms"
                          )}
                        </div>
                      </div>
                      <div className="row">
                        {this.render_metadata_textfield_wide(
                          "Name",
                          this.sampleInfo,
                          "name",
                          this.TYPE_PROMPT,
                          this.can_edit
                        )}
                        {this.render_metadata_textfield_wide(
                          "Manually confirmed hits (from Report tab)",
                          this.state,
                          "confirmed_names",
                          "None",
                          false
                        )}
                        {this.render_metadata_textfield_wide(
                          "Notes",
                          this.sampleInfo,
                          "sample_notes",
                          this.TYPE_PROMPT,
                          this.can_edit
                        )}
                        {this.render_metadata_textfield_wide(
                          "Clinical diagnosis",
                          this.sampleInfo,
                          "sample_diagnosis",
                          this.TYPE_PROMPT,
                          this.can_edit
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col s12">
                    <div className="content-title">PIPELINE OUTPUT</div>
                    {pipeline_run}
                  </div>
                </div>
                {this.renderERCC()}
                {retriable}
              </div>

              <div className="col s3 download-area">
                <div className="download-title">Download Reads</div>
                <a
                  className="custom-button"
                  href={`/samples/${this.sampleInfo.id}/fastqs_folder`}
                >
                  <i className="fa fa-folder-open" />
                  Source Data
                </a>
                {download_section}
              </div>
            </div>
          </div>
        </div>
        <div
          id="reports"
          className="reports-screen container tab-screen col s12"
        >
          {d_report}
        </div>
      </div>
    );
  }
}

export default PipelineSampleReads;
