import React from "react";
import { map } from "lodash/fp";

import ColumnHeaderTooltip from "~ui/containers/ColumnHeaderTooltip";
import Dropdown from "~ui/controls/dropdowns/Dropdown";
import RadioButton from "~ui/controls/RadioButton";
import IconSample from "~ui/icons/IconSample";
import { IconInfoSmall } from "~/components/ui/icons";
import { CONSENSUS_GENOME_DOC_LINK } from "~utils/documentationLinks";
import PropTypes from "~utils/propTypes";
import { WORKFLOWS } from "~utils/workflows";
import { logAnalyticsEvent, withAnalytics } from "~/api/analytics";

import cs from "./workflow_selector.scss";

export const CG_WETLAB_OPTIONS = [
  {
    text: "ARTIC v3",
    value: "artic",
  },
  {
    text: "ARTIC v3 - Short Amplicons (275 bp)",
    value: "artic_short_amplicons",
  },
  {
    text: "MSSPE",
    value: "msspe",
  },
  {
    text: "Combined MSSPE & ARTIC v3",
    value: "combined_msspe_artic",
  },
  {
    text: "SNAP",
    value: "snap",
  },
  {
    text: "AmpliSeq",
    value: "ampliseq",
  },
];

class WorkflowSelector extends React.Component {
  renderWetlabSelector = () => {
    const { onWetlabProtocolChange, selectedWetlabProtocol } = this.props;
    return (
      <div className={cs.wetlabOption}>
        <div className={cs.title}>Wetlab protocol:</div>
        <Dropdown
          className={cs.dropdown}
          onChange={value =>
            withAnalytics(
              onWetlabProtocolChange(value),
              "WorkflowSelector_wetlab-protocol_selected",
              {
                wetlabOption: value,
              }
            )
          }
          options={CG_WETLAB_OPTIONS}
          placeholder="Select"
          value={selectedWetlabProtocol}
        ></Dropdown>
      </div>
    );
  };

  render() {
    const { onWorkflowToggle, selectedWorkflows = new Set() } = this.props;
    return (
      <div className={cs.workflowSelector}>
        <div className={cs.header}>Analysis Type</div>
        <div
          className={cs.workflowOption}
          onClick={() => onWorkflowToggle(WORKFLOWS.SHORT_READ_MNGS.value)}
        >
          <RadioButton
            selected={selectedWorkflows.has(WORKFLOWS.SHORT_READ_MNGS.value)}
            className={cs.radioButton}
          />
          <IconSample className={cs.iconSample} />
          <div className={cs.optionText}>
            <div className={cs.title}>Metagenomics</div>
            <div className={cs.description}>
              Run your samples through our metagenomics pipeline.
            </div>
          </div>
        </div>
        <div
          className={cs.workflowOption}
          onClick={() => onWorkflowToggle(WORKFLOWS.CONSENSUS_GENOME.value)}
        >
          <RadioButton
            selected={selectedWorkflows.has(WORKFLOWS.CONSENSUS_GENOME.value)}
            className={cs.radioButton}
          />
          <IconSample className={cs.iconSample} />
          <div className={cs.optionText}>
            <div className={cs.title}>
              SARS-CoV-2 Consensus Genome
              <ColumnHeaderTooltip
                trigger={
                  <span>
                    <IconInfoSmall className={cs.infoIcon} />
                  </span>
                }
                content="Consensus genome aligns short reads to a SARS-CoV-2 reference genome."
                link={CONSENSUS_GENOME_DOC_LINK}
                onClick={() =>
                  logAnalyticsEvent(
                    "WorkflowSelector_consensus-genome-doc-link_clicked"
                  )
                }
              />
            </div>
            <div className={cs.description}>
              Run your samples through our new pipeline to get consensus genomes
              for SARS-CoV-2. Our assembly supports wet lab protocols:{" "}
              {map("text", CG_WETLAB_OPTIONS).join(", ")}.
            </div>
            {selectedWorkflows.has(WORKFLOWS.CONSENSUS_GENOME.value) &&
              this.renderWetlabSelector()}
          </div>
        </div>
      </div>
    );
  }
}

WorkflowSelector.propTypes = {
  onWetlabProtocolChange: PropTypes.func,
  onWorkflowToggle: PropTypes.func,
  selectedWetlabProtocol: PropTypes.string,
  selectedWorkflows: PropTypes.instanceOf(Set),
};

export default WorkflowSelector;
