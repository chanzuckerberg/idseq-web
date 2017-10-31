class BulkUploadImport extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.projects = props.projects || [];
    this.hostGenomes = props.host_genomes || [];
    this.hostName = this.hostGenomes.length ? this.hostGenomes[0].name : '';
    this.hostId = this.hostGenomes.length ? this.hostGenomes[0].id : null;
    this.handleImportSubmit = this.handleImportSubmit.bind(this);
    this.handleUploadSubmit = this.handleUploadSubmit.bind(this);
    this.csrf = props.csrf;
    this.handleProjectSubmit = this.handleProjectSubmit.bind(this);
    this.clearError = this.clearError.bind(this);
    this.handleProjectChange = this.handleProjectChange.bind(this);
    this.handleProjectChangeForSample = this.handleProjectChangeForSample.bind(this);
    this.handleHostChange = this.handleHostChange.bind(this);
    this.handleHostChangeForSample = this.handleHostChangeForSample.bind(this);
    this.handleBulkPathChange = this.handleBulkPathChange.bind(this);
    this.selectSample = this.selectSample.bind(this);
    this.state = {
      allProjects: this.projects || [],
      hostGenomes: this.hostGenomes || [],
      invalid: false,
      errorMessage: '',
      imported: false,
      success: false,
      successMessage: '',
      hostName: this.hostName,
      hostId: this.hostId,
      project: 'Select a Project',
      projectId: null,
      selectedBulkPath: '',
      samples: [],
      selectedSampleIndices: [],
      createdSampleIds: []
    }
  }

  componentDidMount() {
    this.initializeSelectTag();
    $(ReactDOM.findDOMNode(this.refs.projectSelect)).on('change',this.handleProjectChange);
    $(ReactDOM.findDOMNode(this.refs.hostSelect)).on('change',this.handleHostChange);
  }

  selectSample(e) {
    // current array of options
    const sample_list = this.state.selectedSampleIndices
    //console.log(sample_list)

    let index

    // check if the check box is checked or unchecked
    if (e.target.checked) {
      // add the numerical value of the checkbox to options array
      sample_list.push(+e.target.id)
    } else {
      // or remove the value from the unchecked checkbox from the array
      index = sample_list.indexOf(+e.target.id)
      sample_list.splice(index, 1)
    }

    // update the state with the new array of options
    this.setState({ selectedSampleIndices: sample_list })
  }

  handleUploadSubmit(e) {
    e.preventDefault();
    this.bulkUploadSubmit();
  }

  handleImportSubmit(e) {
    e.preventDefault();
    this.clearError();
    if(!this.isImportFormInvalid()) {
      this.bulkUploadImport()
    }
  }

  initializeSelectTag() {
    $('select').material_select();
  }

  clearError() {
    this.setState({
      invalid: false,
      success: false
     })
  }

  gotoPage(path) {
    location.href = `${path}`
  }


  handleProjectSubmit(e) {
    e.preventDefault();
    this.clearError();
    if(!this.isProjectInvalid()) {
      this.addProject()
    }
  }

  addProject() {
    var that = this;
    axios.post('/projects.json', {
      project: {
        name: this.refs.new_project.value
      },
      authenticity_token: this.csrf
    })
    .then((response) => {
      var newProjectList = that.state.allProjects.slice();
      newProjectList.push(response.data);
      that.setState({
        allProjects: newProjectList,
        project: response.data.name,
        projectId: response.data.id,
        success: true,
        successMessage: 'Project added successfully'
      }, () => {
        this.refs.new_project.value = '';
        that.initializeSelectTag();
      });
    })
    .catch((error) => {
      that.setState({
        invalid: true,
        errorMessage: 'Project exists already or is invalid'
      })
    });
  }

  isProjectInvalid() {
    if (this.refs.new_project.value === '' && this.state.project === 'Select a project') {
      this.setState({
        invalid: true,
        errorMessage: 'Please enter valid project name'
      })
      return true;
    } else {
      return false;
    }
  }

  bulkUploadImport() {
    var that = this;
    //console.log(this.state)
    axios.get('/samples/bulk_import.json', {
      params: {
        project_id: this.state.projectId,
        host_genome_id: this.state.hostId,
        bulk_path: this.state.selectedBulkPath,
        authenticity_token: this.csrf
      }
    })
    .then(function (response) {
      that.setState({
        success: true,
        successMessage: 'Samples imported. Pick the ones you want to submit.',
        samples: response.data.samples,
        imported: true
      });
    }).catch(function (error) {
     that.setState({
      invalid: true,
       errorMessage: JSON.stringify(error.response)
     })
    });
  }

  bulkUploadSubmit() {
    var that = this;
    //console.log(this.state)
    var samples = []
    this.state.selectedSampleIndices.map((idx) => {
      samples.push(this.state.samples[idx])
    })
    axios.post('/samples/bulk_upload.json', {
      samples: samples
    })
    .then(function (response) {
      that.setState({
        success: true,
        successMessage: 'Samples created. Redirecting...',
        createdSampleIds: response.data.sample_ids
      });
      setTimeout(() => {
        that.gotoPage(`/?ids=${that.state.createdSampleIds.join(',')}`);
      }, 5000)
    }).catch(function (error) {
     that.setState({
      invalid: true,
       errorMessage: JSON.stringify(error.response)
     })
    });
  }

  filePathValid(str) {
    var regexPrefix = /s3:\/\//;
    if (str.match(regexPrefix)) {
      return true;
    } else {
      return false;
    }
  }

  isImportFormInvalid() {
    if (this.refs.bulk_path === '') {
        this.setState({
          invalid: true,
          errorMessage: 'Please fill in the S3 bulk_path path'
        })
        return true;
    } else if ( !this.filePathValid(this.refs.bulk_path.value)) {
        this.setState({
          invalid: true,
          errorMessage: 'Please fill in a valid bulk_path '
        })
        return true;
    }
    return false;
  }

  handleProjectChange(e) {
    this.setState({
      project: e.target.value.trim(),
      projectId: e.target.selectedIndex
    })
    this.clearError();
  }

  handleProjectChangeForSample(e) {
    const samples = this.state.samples
    samples[e.target.id].project_id = this.state.allProjects[e.target.selectedIndex].id
    this.setState({
      samples: samples
    })
    this.clearError();
  }

  handleHostChangeForSample(e) {
    const samples = this.state.samples
    samples[e.target.id].host_genome_id = this.state.hostGenomes[e.target.selectedIndex].id
    this.setState({
      samples: samples
    })
    this.clearError();
  }


  handleHostChange(e) {
    this.setState({
      hostName: e.target.value.trim(),
      hostId: this.state.hostGenomes[e.target.selectedIndex].id
    })
    this.clearError();
  }

  handleBulkPathChange(e) {
    this.setState({
      selectedBulkPath: e.target.value.trim()
    })
  }

  renderBulkUploadSubmitForm() {
    return (
      <div className="form-wrapper">
        <form ref="form" onSubmit={ this.handleUploadSubmit }>
          <div className="row title">
            <p className="col s6 signup">Bulk Upload</p>
          </div>
          <div className="row content-wrapper">
            <div className="row header">
              <div className="col s4 ">Name</div>
              <div className="col s4 ">Project</div>
              <div className="col s4 ">Host</div>
            </div>
      {
        this.state.samples.map((sample, i) => {
          return (
            <div className="row field-row" key={i} >
              <div className="col s4">
			  <input ref="samples_list" type="checkbox" id={i} className="filled-in" value={ this.state.selectedSampleIndices.indexOf(i) < 0? 0:1 } onChange = { this.selectSample } />
			  <label htmlFor={i}> {sample.name}</label>
             </div>

              <div className="col s4">
				<select className="browser-default" id={i} onChange={ this.handleProjectChangeForSample} value={sample.project_id}>
					 { this.state.allProjects.length ?
						this.state.allProjects.map((project, j) => {
						  return <option ref= "project" key={j} value={project.id}>{project.name}</option>
						}) : <option>No projects to display</option>
					  }
				</select>
             </div>

              <div className="col s4">
				<select className="browser-default" id={i} onChange={ this.handleHostChangeForSample} value={sample.host_genome_id}>
					 { this.state.hostGenomes.length ?
						this.state.hostGenomes.map((host_genome, j) => {
						  return <option ref= "genome" key={j} value={host_genome.id}>{host_genome.name}</option>
						}) : <option>No host genomes to display</option>
					  }
				</select>
              </div>
              <div className="col s12">
                <p>{sample.input_files_attributes[0].source } </p>
                <p> {sample.input_files_attributes[1].source } </p>
              </div>
              <div><hr/></div>
            </div>
          )
        })
      }
      </div>
      <input className="hidden" type="submit"/>
      <div onClick={ this.handleUploadSubmit } className="center login-wrapper">Submit</div>
      </form>
    </div>
    )
  }
  renderBulkUploadImportForm() {
    return (
      <div className="form-wrapper">
        <form ref="form" onSubmit={ this.handleImportSubmit }>
          <div className="row title">
            <p className="col s6 signup">Bulk Upload</p>
          </div>
          { this.state.success ? <div className="success-info" >
                <i className="fa fa-success"></i>
                 <span>{this.state.successMessage}</span>
                </div> : null }
              { this.state.invalid ? <div className="error-info" >
                  <i className="fa fa-error"></i>
                  <span>{this.state.errorMessage}</span>
              </div> : null }
          <div className="row content-wrapper">
              <div className="row field-row">
                <div className="input-field col s6 project-list">
                   <select ref="projectSelect" className="" id="sample" onChange={ this.handleProjectChange } value={this.state.project}>
                    <option disabled defaultValue>{this.state.project}</option>
                   { this.state.allProjects.length ?
                      this.state.allProjects.map((project, i) => {
                        return <option ref= "project" key={i} id={project.id} >{project.name}</option>
                      }) : <option>No projects to display</option>
                    }
                  </select>
                  <label>Project List</label>
              </div>
              <div className="input-field col s6">
                    <div className="row">
                      <input className="col s11 project-input" ref= "new_project" type="text" onFocus={ this.clearError } placeholder="Add a project if desired project is not on the list" />
                      <input className="col s1 add-icon" value="&#xf067;" type="button" onClick={ this.handleProjectSubmit } />
                    </div>
                    <label htmlFor="new_project">Default Project</label>
              </div>
            </div>
            <div className="row field-row">
              <div className="col s6 input-field genome-list">
                  <select ref="hostSelect" name="host" className="" id="host" onChange={ this.handleHostChange } value={this.state.hostName}>
                      { this.state.hostGenomes.length ?
                          this.state.hostGenomes.map((host, i) => {
                            return <option ref= "host" key={i} id={host.id}>{host.name}</option>
                          }) : <option>No host genomes to display</option>
                        }
                  </select>
                  <label>Default Host Genome</label>
              </div>
            </div>
            <div className="field-row input-field align">
                <i className="sample fa fa-link" aria-hidden="true"></i>
                <input ref= "bulk_path" type="text" className="path" onFocus={ this.clearError } placeholder="Required" onChange={ this.handleBulkPathChange } />
                <label htmlFor="bulk_path">S3 Bulk Upload Path </label>
            </div>
          </div>
        <input className="hidden" type="submit"/>
        <div onClick={ this.handleImportSubmit } className="center login-wrapper">Submit</div>
      </form>
    </div>
    )
  }

  render() {
    return (
      <div>
        { this.state.imported ? this.renderBulkUploadSubmitForm(): this.renderBulkUploadImportForm() }
          <div className="bottom">
            <span className="back" onClick={ this.gotoPage.bind(this, '/samples') } >Samples</span>|
            <span className="home" onClick={ this.gotoPage.bind(this, '/')}>Home</span>
          </div>
      </div>
    )
  }
}
