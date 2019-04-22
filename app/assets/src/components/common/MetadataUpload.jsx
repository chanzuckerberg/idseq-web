import React from "react";
import cx from "classnames";
import _fp, { filter, keyBy, concat } from "lodash/fp";

import MetadataCSVUpload from "~/components/common/MetadataCSVUpload";
import PropTypes from "~/components/utils/propTypes";
import AlertIcon from "~ui/icons/AlertIcon";
import Tabs from "~/components/ui/controls/Tabs";
import { getAllHostGenomes } from "~/api";
import { getProjectMetadataFields } from "~/api/metadata";
import { logAnalyticsEvent, withAnalytics } from "~/api/analytics";
import LoadingIcon from "~ui/icons/LoadingIcon";
import { getURLParamString } from "~/helpers/url";

import cs from "./metadata_upload.scss";
import MetadataManualInput from "./MetadataManualInput";
import IssueGroup from "./IssueGroup";

const map = _fp.map.convert({ cap: false });

class MetadataUpload extends React.Component {
  state = {
    currentTab: "Manual Input",
    issues: {
      errors: [],
      warnings: []
    },
    projectMetadataFields: null,
    hostGenomes: [],
    validatingCSV: false
  };

  async componentDidMount() {
    const [projectMetadataFields, hostGenomes] = await Promise.all([
      getProjectMetadataFields(this.props.project.id),
      getAllHostGenomes()
    ]);
    this.setState({
      projectMetadataFields: keyBy("key", projectMetadataFields),
      hostGenomes
    });
  }

  handleTabChange = tab => {
    this.setState({ currentTab: tab, issues: null });
    // When the tab changes, reset state.
    this.props.onMetadataChange({
      metadata: null,
      issues: null,
      wasManual: tab === "Manual Input"
    });
    logAnalyticsEvent("MetadataUpload_tab_changed", {
      tab
    });
  };

  // MetadataCSVUpload validates metadata before calling onMetadataChangeCSV.
  onMetadataChangeCSV = ({ metadata, issues, validatingCSV }) => {
    this.props.onMetadataChange({ metadata, issues, wasManual: false });
    this.setState({
      issues,
      validatingCSV
    });
    logAnalyticsEvent("MetadataUpload_csv-metadata_changed", {
      errors: issues.errors.length,
      warnings: issues.warnings.length,
      validatingCSV
    });
  };

  // MetadataManualInput doesn't validate metadata before calling onMetadataChangeManual.
  // This happens when Continue is clicked in the parent component.
  onMetadataChangeManual = ({ metadata }) => {
    if (this.props.onDirty) {
      this.props.onDirty();
    }
    this.props.onMetadataChange({ metadata, wasManual: true });
    logAnalyticsEvent("MetadataUpload_manual-metadata_changed");
  };

  getCSVUrl = () => {
    const params = {
      ...(this.props.samplesAreNew
        ? { new_sample_names: map("name", this.props.samples) }
        : {}),
      project_id: this.props.project.id
    };

    return `/metadata/metadata_template_csv?${getURLParamString(params)}`;
  };

  renderTab = () => {
    if (this.state.currentTab === "Manual Input") {
      if (!this.props.samples || !this.state.projectMetadataFields) {
        return <div className={cs.loadingMsg}>Loading...</div>;
      } else {
        return (
          <MetadataManualInput
            project={this.props.project}
            samples={this.props.samples}
            samplesAreNew={this.props.samplesAreNew}
            onMetadataChange={this.onMetadataChangeManual}
            withinModal={this.props.withinModal}
            projectMetadataFields={this.state.projectMetadataFields}
            hostGenomes={this.state.hostGenomes}
          />
        );
      }
    }

    if (this.state.currentTab === "CSV Upload") {
      return (
        <React.Fragment>
          <div>
            <span
              className={cs.link}
              onClick={withAnalytics(
                this.props.onShowCSVInstructions,
                "MetadataUpload_instruction-link_clicked"
              )}
            >
              View CSV Upload Instructions
            </span>
          </div>
          <MetadataCSVUpload
            className={cs.metadataCSVUpload}
            samples={this.props.samples}
            onMetadataChange={this.onMetadataChangeCSV}
            project={this.props.project}
            samplesAreNew={this.props.samplesAreNew}
            visible={this.props.visible}
            onDirty={this.props.onDirty}
          />
          <a
            className={cs.link}
            href={this.getCSVUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Metadata CSV Template
          </a>
          {this.state.validatingCSV && (
            <div className={cs.validationMessage}>
              <LoadingIcon className={cs.loadingIcon} />
              Validating metadata...
            </div>
          )}
        </React.Fragment>
      );
    }
    return null;
  };

  // issueType is "error" or "warning".
  renderIssue = (issue, issueType, index) => {
    if (issue.isGroup) {
      return (
        <IssueGroup
          caption={issue.caption}
          headers={issue.headers}
          rows={issue.rows}
          key={index}
          type={issueType}
          className={cs.issueGroup}
        />
      );
    } else {
      // Some issues are still plain strings.
      return (
        <div className={cx(cs.issue, cs[issueType])} key={index}>
          <AlertIcon className={cx(cs.icon, cs[issueType])} />
          {issue}
        </div>
      );
    }
  };

  renderIssues = () => {
    const issues = this.props.issues || this.state.issues;
    const hasErrors = issues && issues.errors.length > 0;
    const hasWarnings = issues && issues.warnings.length > 0;

    if (!hasErrors && !hasWarnings) return null;

    return (
      <div className={cs.issues}>
        {hasErrors && (
          <div className={cs.errors}>
            <div className={cs.header}>
              {this.state.currentTab === "Manual Input"
                ? "Fix the following errors."
                : "Fix these errors and upload your CSV again."}
            </div>
            <div>
              {issues.errors.map((error, index) =>
                this.renderIssue(error, "error", index)
              )}
            </div>
          </div>
        )}
        {hasWarnings && (
          <div className={cs.warnings}>
            <div className={cs.header}>Warnings</div>
            <div>
              {issues.warnings.map((warning, index) =>
                this.renderIssue(warning, "warning", index)
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  render() {
    const { hostGenomes, projectMetadataFields, currentTab } = this.state;
    const { samplesAreNew } = this.props;
    const requiredFields = concat(
      "Host Genome",
      map("name", filter(["is_required", 1], projectMetadataFields))
    );
    return (
      <div className={cx(cs.metadataUpload, this.props.className)}>
        {samplesAreNew && (
          <div className={cs.info}>
            <div className={cs.details}>
              <span className={cs.label}>{`Required fields: `}</span>
              {requiredFields && requiredFields.join(", ")}
            </div>
            <div className={cs.details}>
              <span className={cs.label}>{`Available host genomes: `}</span>
              {hostGenomes && hostGenomes.map(h => h.name).join(", ")}
            </div>
            <div className={cs.details}>
              <span>
                <a
                  href="/metadata/dictionary"
                  className={cs.link}
                  target="_blank"
                  onClick={() =>
                    logAnalyticsEvent(
                      "MetadataUpload_full-dictionary-link_clicked"
                    )
                  }
                >
                  View Full Metadata Dictionary
                </a>
              </span>
            </div>
          </div>
        )}
        <div>
          {!samplesAreNew && (
            <span>
              <a
                href="/metadata/dictionary"
                className={cs.link}
                target="_blank"
                onClick={() =>
                  logAnalyticsEvent("MetadataUpload_dictionary-link_clicked")
                }
              >
                View Metadata Dictionary
              </a>
            </span>
          )}
        </div>
        <Tabs
          className={cs.tabs}
          tabs={["Manual Input", "CSV Upload"]}
          value={currentTab}
          onChange={this.handleTabChange}
        />
        {this.renderTab()}
        {this.renderIssues()}
      </div>
    );
  }
}

MetadataUpload.propTypes = {
  className: PropTypes.string,
  issues: PropTypes.shape({
    errors: PropTypes.arrayOf(PropTypes.string),
    warnings: PropTypes.arrayOf(PropTypes.string)
  }),
  onMetadataChange: PropTypes.func.isRequired,
  onShowCSVInstructions: PropTypes.func.isRequired,
  project: PropTypes.Project,
  samples: PropTypes.arrayOf(PropTypes.Sample),
  samplesAreNew: PropTypes.bool,
  withinModal: PropTypes.bool,
  visible: PropTypes.bool,
  // Immediately called when the user changes anything, even before validation has returned.
  // Can be used to disable the header navigation.
  onDirty: PropTypes.func
};

export default MetadataUpload;
