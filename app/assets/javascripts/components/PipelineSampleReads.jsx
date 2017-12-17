class PipelineSampleReads extends React.Component {
  constructor(props) {
    super(props);
    this.pipelineOutput = props.pipelineOutput;
    this.csrf = props.csrf;
    this.allBackgrounds = props.all_backgrounds
    this.rerunPath = props.rerun_path;
    this.sampleInfo = props.sampleInfo;
    this.projectInfo = props.projectInfo;

    this.reportPresent =  props.reportPresent;
    this.reportTime = props.reportTime;
    this.allCategories  = props.allCategories
    this.reportDetails  = props.reportDetails
    this.reportPageParams  = props.reportPageParams

    this.jobStatistics = props.jobStatistics;
    this.summary_stats = props.summary_stats;
    this.gotoReport = this.gotoReport.bind(this);
    this.sampleId = this.sampleInfo.id;
    this.host_genome = props.host_genome;
    this.pipelineStatus = props.sample_status
    this.pipelineRun = props.pipelineRun
    this.rerunPipeline = this.rerunPipeline.bind(this);
    this.state = {
      rerun: false,
      failureText: 'Sample run failed'
    };
    this.TYPE_PROMPT = "Type here...";
    this.TISSUE_TYPES = ["Bronchoalveolar lavage", "Cerebrospinal fluid",
                         "Nasopharyngeal swab", "Plasma", "Serum", "Solid tissue", 
                         "Stool", "Synovial fluid", "Whole blood", "Other"];
    this.NUCLEOTIDE_TYPES = ["DNA", "RNA"];
    this.DROPDOWN_OPTIONS = { sample_tissue: this.TISSUE_TYPES,
                              sample_template: this.NUCLEOTIDE_TYPES };
    this.DROPDOWN_METADATA_FIELDS = Object.keys(this.DROPDOWN_OPTIONS);
    this.handleDropdownChange = this.handleDropdownChange.bind(this);
  }

  render_metadata_dropdown(label, field) {
    let dropdown_options = this.DROPDOWN_OPTIONS[field]
    let display_value = this.sampleInfo[field] ? this.sampleInfo[field] : dropdown_options[dropdown_options.length-1]
    return (
      <tr>
        <td>{label}</td>
        <td className="sample-notes">
          <select ref={field} name={field} className="" id={field} onChange={this.handleDropdownChange} value={display_value}>
            { dropdown_options.map((option_value, i) => {
                return <option ref={field} key={i}>{option_value}</option>
              }) 
            }
          </select>
        </td>
      </tr>
    );
  }

  render_metadata_textfield(label, field, line_break) {
    let display_value = this.sampleInfo[field] && this.sampleInfo[field].trim() !== "" ? this.sampleInfo[field] : this.TYPE_PROMPT
    let title = <td>{label}</td>
    let editable = 
        <td className="sample-notes">
          <pre suppressContentEditableWarning={true} contentEditable={true} id={field}>
            {display_value}
          </pre>
        </td>
    if (line_break === 0) {
      return (
        <tr>{title}{editable}</tr>
      );
    } else {
      return (
        <div>
          <tr>{title}</tr>
          <tr>{editable}</tr>
        </div>
      );
    }
  }

  gotoReport() {
    $('ul.tabs').tabs('select_tab', 'reports');
    PipelineSampleReads.setTab('pipeline_display','reports');
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
      rerun: true
    })
    axios.put(`${this.rerunPath}.json`, {
      authenticity_token: this.csrf
    }).then((response) => {
    // this should set status to UPLOADING/IN PROGRESS after rerun
    }).catch((error) => {
      this.setState({
        rerun: false,
        failureText: 'Failed to re-run Pipeline'
      })
    })
  }

  static getActive(section, tab) {
    return (window.localStorage.getItem(section) === tab) ? 'active' : '';
  }

  static setTab(section, tab) {
    window.localStorage.setItem(section, tab);
  }

  componentDidMount() {
    $('ul.tabs').tabs();
    this.listenNoteChanges();
    this.initializeSelectTag();
    for (var i = 0; i < this.DROPDOWN_METADATA_FIELDS.length; i++) {
      let field = this.DROPDOWN_METADATA_FIELDS[i];
      $(ReactDOM.findDOMNode(this.refs[field])).on('change',this.handleDropdownChange);
    }
  }

  initializeSelectTag() {
    $('select').material_select();
  }

  handleDropdownChange(e) {
    const field = e.target.id;
    const value = this.DROPDOWN_OPTIONS[field][e.target.selectedIndex];
    axios.post('/samples/' + this.sampleInfo.id + '/save_metadata.json', {
      field: field, value: value
    })
    .then((response) => {
      if (response.data.status === 'success') {
        $('.note-saved-success')
        .html(`<i class='fa fa-check-circle'></i> ${response.data.message}`)
        .css('display', 'inline-block')
        .delay(1000)
        .slideUp(200);
      } else {
        $('.note-save-failed')
        .html(`<i class='fa fa-frown-o'></i> ${response.data.message}`)
        .css('display', 'inline-block')
        .delay(1000)
        .slideUp(200);
      }
    }).catch((error) => {
      $('.note-save-failed')
      .html(`<i class='fa fa-frown-o'></i> Something went wrong!`)
      .css('display', 'inline-block')
      .delay(1000)
      .slideUp(200);
    });
  }

  listenNoteChanges() {
    let currentText = '';
    $('.sample-notes').focusin((e) => {
      currentText = e.target.innerText.trim();
      if (currentText === this.TYPE_PROMPT) {
        e.target.innerText = '';
      }
    });

    $('.sample-notes').focusout((e) => {
      const newText = e.target.innerText.trim();
      const field = e.target.id;
      if (newText !== currentText) {
        axios.post('/samples/' + this.sampleInfo.id + '/save_metadata.json', {
          field: field,
          value: newText
        })
        .then((response) => {
          if (response.data.status === 'success') {
            $('.note-saved-success')
            .html(`<i class='fa fa-check-circle'></i> ${response.data.message}`)
            .css('display', 'inline-block')
            .delay(1000)
            .slideUp(200);
          } else {
            $('.note-save-failed')
            .html(`<i class='fa fa-frown-o'></i> ${response.data.message}`)
            .css('display', 'inline-block')
            .delay(1000)
            .slideUp(200);
          }
        }).catch((error) => {
          $('.note-save-failed')
          .html(`<i class='fa fa-frown-o'></i> Something went wrong!`)
          .css('display', 'inline-block')
          .delay(1000)
          .slideUp(200);
        });
      };
      if (newText.trim() === '') {
        e.target.innerText = this.TYPE_PROMPT;
      }
    });
  }

  render() {
    let d_report = null;
    if(this.reportPresent) {
      d_report = <PipelineSampleReport
        sample_id = {this.sampleId}
        report_ts = {this.reportTime}
        all_categories = {this.allCategories}
        all_backgrounds = {this.allBackgrounds}
        report_details = {this.reportDetails}
        report_page_params = {this.reportPageParams}
      />;
    } else {
      d_report = <div className="center-align text-grey text-lighten-2 no-report">{ this.pipelineInProgress() ? <div>Sample Waiting ...<p><i className='fa fa-spinner fa-spin fa-3x'></i></p></div> :
        <div>
          <h6 className="failed"><i className="fa fa-frown-o"></i>  {this.state.failureText}  </h6>
          <p>
           { !this.state.rerun ? <a onClick={ this.rerunPipeline }className="custom-button small"><i className="fa fa-repeat left"></i>RERUN PIPELINE</a>
            : null }
            </p>
        </div> }
      </div>
    }

    let pipeline_run = null;
    let download_section = null;
    var BLANK_TEXT = 'unknown'
    if (this.pipelineOutput) {
      pipeline_run = (
        <div className="data">
          <div className="row">
            <div className="col s5">
              <table>
                <tbody>
                <tr>
                  <td>Total reads</td>
                  <td>{ numberWithCommas(this.pipelineOutput.total_reads) }</td>
                </tr>
                <tr>
                  <td>Non-host reads</td>
                  <td>{ !this.summary_stats.remaining_reads ? BLANK_TEXT : numberWithCommas(this.summary_stats.remaining_reads) } { !this.summary_stats.percent_remaining ? '' : `(${this.summary_stats.percent_remaining.toFixed(2)}%)` }</td>
                </tr>
                <tr>
                  <td>Unmapped reads</td>
                  <td>{ !this.summary_stats.unmapped_reads ? BLANK_TEXT : numberWithCommas(this.summary_stats.unmapped_reads) }</td>
                </tr>
                </tbody>
              </table>
            </div>
            <div className="col s7">
              <table>
                <tbody>
                <tr>
                  <td>Passed quality control</td>
                  <td>{ !this.summary_stats.qc_percent ? BLANK_TEXT : `${this.summary_stats.qc_percent.toFixed(2)}%` }</td>
                </tr>
                <tr>
                  <td>Duplicate compression ratio</td>
                  <td>{ !this.summary_stats.compression_ratio ? BLANK_TEXT : this.summary_stats.compression_ratio.toFixed(2) }</td>
                </tr>
                <tr>
                  <td>Date processed</td>
                  <td>{ !this.summary_stats.last_processed_at ? BLANK_TEXT : moment(this.summary_stats.last_processed_at).startOf('second').fromNow() }</td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
    );

    download_section = (
      <div>
        <a className="custom-button" href= { `/pipeline_outputs/${this.pipelineOutput.id}/nonhost_fasta` }>
          <i className="fa fa-cloud-download left"></i> DOWNLOAD NON HOST READS
        </a>
        <a className="custom-button" href= { `/pipeline_outputs/${this.pipelineOutput.id}/unidentified_fasta` }>
          <i className="fa fa-cloud-download left"></i> DOWNLOAD UNIDENTIFIED READS
        </a>
        <a className="custom-button" href= { this.sampleInfo.sample_output_folder_url }>
          <i className="fa fa-cloud-download left"></i> GO TO RESULTS FOLDER
        </a>
      </div>
    );

    } else {
      pipeline_run = (
        <div className="center">
          There is no pipeline output for this sample
        </div>
      );
    }
    return (
      <div>
        <SubHeader>
          <div className="sub-header">
            <div className="title">
              PIPELINE
            </div>

            <div className="sub-title">
              <a href={`/?project_id=${this.projectInfo.id}`}> {this.projectInfo.name} </a> > { this.sampleInfo.name }
            </div>

            <div className="sub-header-navigation">
              <div className="nav-content">
                <ul className="tabs tabs-transparent">
                  <li className="tab">
                    <a href="#details" className=''>Details</a>
                  </li>
                  <li className="tab">
                    <a href="#reports" className='active'>Report</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </SubHeader>
        <div id="details" className="tab-screen col s12">
          <div className='center'>
            <span className='note-action-feedback note-saved-success'>
            </span>
            <span className='note-action-feedback note-save-failed'>
            </span>
          </div>

          <div className="container tab-screen-content">
            <div className="row">
              <div className="col s9">

                <div className="row">
                  <div className="col s12">
                    <div className="content-title">
                      SAMPLE INFO
                    </div>

                    <div className="data">
                      <div className="row">
                        <div className="col s6">
                          <table>
                            <tbody>
                              <tr>
                                <td>Host</td>
                                <td> { !this.host_genome ? BLANK_TEXT : this.host_genome.name } </td>
                              </tr>
                              <tr>
                                <td>Upload date</td>
                                <td>{moment(this.sampleInfo.created_at).startOf('second').fromNow()}</td>
                              </tr>
                              {this.render_metadata_textfield("Location", "sample_location", 0)}
                            </tbody>
                          </table>
                        </div>
                        <div className="col s6">
                          <table className="responsive-table">
                            <tbody>
                              {this.render_metadata_dropdown("Tissue type", "sample_tissue")}
                              {this.render_metadata_dropdown("Nucleotide type", "sample_template")}
                              {this.render_metadata_textfield("Patient ID", "sample_host", 0)}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col s12">
                          <table>
                            <tbody>
                              {this.render_metadata_textfield("Notes", "sample_notes", 1)}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="data-divider"/>

                <div className="row">
                  <div className="col s12">
                    <div className="content-title">
                      PIPELINE OUTPUT
                    </div>
                    { pipeline_run }
                  </div>
                </div>
              </div>

              <div className="col s3 download-area">
                <a className="custom-button" href={ this.sampleInfo.sample_input_folder_url }>
                  <i className="fa fa-cloud-download left"></i> GO TO SOURCE DATA
                </a>
                { download_section }

              </div>

            </div>
          </div>
        </div>
        <div id="reports" className="reports-screen tab-screen col s12">
          { d_report }
        </div>
      </div>
    )
  }
}
