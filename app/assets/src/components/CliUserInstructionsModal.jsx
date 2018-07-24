import React from "react";
import { Modal, Button, Form, TextArea } from "semantic-ui-react";
import PropTypes from "prop-types";

class CliUserInstructionsModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = { open: false };
    this.close = this.close.bind(this);
    this.open = this.open.bind(this);
  }

  // These are needed since Modal.open = this.state.open
  open() {
    this.setState({ open: true });
  }

  close() {
    this.setState({ open: false });
  }

  render() {
    const singleUploadCmd =
      "idseq -e " +
      this.props.email +
      " -t " +
      this.props.authToken +
      " -p 'Your Project Name' -s 'Your Sample Name' --r1 your_sample_R1.fastq.gz --r2 your_sample_R2.fastq.gz --host-genome-name 'Human'`";

    const bulkUploadCmd =
      "idseq -e " +
      this.props.email +
      " -t " +
      this.props.authToken +
      " -p 'Your Project Name' --bulk . --host-genome-name 'Human'";

    const modalContent = (
      <div>
        <p className="instruction-heading">
          {
            "(1) Install and configure the Amazon Web Services Command Line Interface (AWS CLI): "
          }
        </p>
        <p>
          {"Link: "}
          <span className="code">
            https://docs.aws.amazon.com/cli/latest/userguide/installing.html
          </span>
        </p>
        <p>
          Verify it works by running <span className="code">aws help</span>,
          which should display usage instructions. You do not need to set up AWS
          credentials.
        </p>
        <p className="instruction-heading">(2) Install the IDseq CLI:</p>
        <div>
          <span className="code">
            pip install git+https://github.com/chanzuckerberg/idseq-cli.git
            --upgrade
          </span>
          <p className="instruction-medium-margin-top">
            - Make sure you have Python 2 or 3 installed already.
          </p>
          <p>
            - Tips: Try running with <span className="code">pip2</span> or{" "}
            <span className="code">pip3</span> depending on your configuration.
            Try <span className="code">sudo pip</span> if you run into
            permissions errors. You can use this same command in the future to
            update the CLI if needed.
          </p>
        </div>
        <p />
        <p className="instruction-heading">(3) Upload a single sample:</p>
        <div className="code center-code">
          <p>
            idseq -e <span className="code-personal">{this.props.email}</span>{" "}
            -t <span className="code-personal">{this.props.authToken}</span> \
            <br />-p '<span className="code-to-edit">Your Project Name</span>'
            -s '<span className="code-to-edit">Your Sample Name</span>' \
            <br /> --r1 <span className="code-to-edit">
              your_sample_R1
            </span>.fastq.gz --r2{" "}
            <span className="code-to-edit">your_sample_R2</span>.fastq.gz
            --host-genome-name <span className="code-to-edit">'Human'</span>
          </p>
        </div>
        <p className="instruction-medium-margin-top">
          Edit the command in this text box and copy-and-paste:
          <Form className="instruction-medium-margin-top">
            <TextArea
              className="code-personal"
              defaultValue={singleUploadCmd}
              autoHeight
            />
          </Form>
        </p>
        <p className="instruction-medium-margin-top">
          {
            "- Supported file types are: .fastq/.fq/.fasta/.fa or .fastq.gz/.fq.gz/.fasta.gz/.fa.gz"
          }
        </p>
        <p>
          {
            "- Currently supported host genome values: 'Human', 'Mosquito', 'Tick', 'ERCC only'"
          }
        </p>
        <p>
          {
            '- Tips: Avoid copying commands into programs like TextEdit because it may change "straight quotes" into “smart quotes” (“ ‘ ’ ”) which will not be parsed correctly in your terminal.'
          }
        </p>
        <p>
          {
            "- The '\\' symbol means to continue on the next line in the terminal. If you use this in your command, make sure it is not followed by a space before the line break."
          }
        </p>
        <p>
          {"- Your authentication token for uploading is: "}
          <span className="code-personal">{this.props.authToken}</span>
          {"  Keep this private like a password!"}
        </p>
        <p className="instruction-heading">
          (Optional) Run the program in interactive mode:
        </p>
        <p>
          Having trouble? Just run <span className="code">idseq</span> without
          any parameters and the program will guide you through the process.
        </p>
        <p className="instruction-heading">
          (Optional) Upload samples in bulk mode by specifying a folder:
        </p>
        <div className="code center-code">
          <p>
            idseq -e <span className="code-personal">{this.props.email}</span>{" "}
            -t <span className="code-personal">{this.props.authToken}</span> -p
            '<span className="code-to-edit">Your Project Name</span>' \
            <br /> --bulk{" "}
            <span className="code-to-edit">
              /path/to/your/folder{" "}
            </span>--host-genome-name{" "}
            <span className="code-to-edit">'Human'</span>
          </p>
        </div>
        <p className="instruction-medium-margin-top">
          Edit the command in this text box and copy-and-paste:
          <Form className="instruction-medium-margin-top">
            <TextArea
              className="code-personal"
              defaultValue={bulkUploadCmd}
              autoHeight
            />
          </Form>
        </p>
        <p className="instruction-medium-margin-top">
          {
            "- The '.' refers to the current folder in your terminal. The program will try to auto-detect files in the folder."
          }
        </p>
        <p className="upload-question">
          For more information on the IDseq CLI, have a look at its{" "}
          <a
            href="https://github.com/chanzuckerberg/idseq-cli"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub repository
          </a>.
        </p>
      </div>
    );
    return (
      <Modal
        trigger={this.props.trigger}
        onOpen={this.open}
        onClose={this.close}
        open={this.state.open}
        className="cli-modal"
      >
        <Modal.Header>Command Line Upload Instructions</Modal.Header>
        <Modal.Content>{modalContent}</Modal.Content>
        <Modal.Actions>
          <Button primary onClick={this.close}>
            Close
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }
}

CliUserInstructionsModal.propTypes = {
  trigger: PropTypes.node,
  email: PropTypes.string,
  authToken: PropTypes.string
};

export default CliUserInstructionsModal;
