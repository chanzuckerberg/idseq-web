import React from "react";
import PropTypes from "prop-types";

import cs from "./pipeline_step_details_mode.scss";

class PipelineStepDetailsMode extends React.Component {
  renderInputFiles() {
    const { inputFiles } = this.props;
    if (!inputFiles || !inputFiles.length) {
      return null;
    }

    const fileGroupList = inputFiles.map((inputFileGroup, i) => {
      const fileList = inputFileGroup.files.map((file, i) => {
        return (
          <div className={cs.fileLink} key={`${file.fileName}-${i}`}>
            {file.fileName}
          </div>
        );
      });

      // TODO(ezhong): Figure out what to put as fileGroupHeader if input is
      // provided by a user (instead of step output)
      return (
        <div className={cs.fileGroup} key={`inputFileGroup.fromStepName-${i}`}>
          <div
            className={cs.fileGroupHeader}
          >{`From ${inputFileGroup.fromStepName || "Sample"}:`}</div>
          {fileList}
        </div>
      );
    });
    return (
      <div className={cs.stepFilesListBox}>
        <div className={cs.stepFilesListBoxHeader}>Input Files</div>
        {fileGroupList}
      </div>
    );
  }

  renderOutputFiles() {
    const { outputFiles } = this.props;
    if (outputFiles && outputFiles.length) {
      const fileList = outputFiles.map((file, i) => {
        return (
          <div className={cs.fileLink} key={`${file.fileName}-${i}`}>
            {file.fileName}
          </div>
        );
      });
      return (
        <div className={cs.stepFilesListBox}>
          <div className={cs.stepFilesListBoxHeader}>Output Files</div>
          {fileList}
        </div>
      );
    }
  }

  render() {
    const { stepName, description } = this.props;
    return (
      <div className={cs.content}>
        <div className={cs.stepName}>{stepName}</div>
        <div className={cs.description}>{description}</div>
        {this.renderInputFiles()}
        {this.renderOutputFiles()}
      </div>
    );
  }
}

PipelineStepDetailsMode.propTypes = {
  stepName: PropTypes.string,
  description: PropTypes.string,
  inputFiles: PropTypes.arrayOf(
    PropTypes.shape({
      fromStepName: PropTypes.string,
      files: PropTypes.arrayOf(
        PropTypes.shape({ fileName: PropTypes.string.isRequired })
      ).isRequired,
    }).isRequired
  ).isRequired,
  outputFiles: PropTypes.arrayOf(
    PropTypes.shape({
      fileName: PropTypes.string.isRequired,
    }).isRequired
  ).isRequired,
};

export default PipelineStepDetailsMode;
