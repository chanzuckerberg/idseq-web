class SampleUpload extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.csrf = this.props.csrf;
    this.addProject = this.addProject.bind(this);
    this.state = {
      allProjects: props.projects ? props.projects : null,
      invalidProject: false,
      errorMessage: '',
    }
  }

  componentDidMount() {
    console.log(axios);
    $('select').material_select();
  }

  handleSubmit(e) {
    e.preventDefault();
    if(!this.isFormInValid()) {
      this.createSample()
    }
  }

  clearError() {
    // this.setState({ showFailedLogin: false })
  }

  gotoPage(path) {
    location.href = `${path}`
  }

  componentDidUpdate() {
    this.handleProjectSubmit ? this.handleProjectSubmit : null
  }

  addProject(e) {
    e.preventDefault();
    if (!this.isProjectValid()) {
      var that = this;
      axios.post('/projects.json', {
        project: {
          name: this.refs.new_project.value,
        },
        authenticity_token: this.csrf
      })
      .then((response) => {
        var newProjectList = that.state.allProjects.slice();
        console.log(newProjectList, that.state.allProjects, that.state.allProjects.slice(), 'initial');
        newProjectList.push(response.data);
        console.log(newProjectList, 'updated');
        that.setState({
          allProjects: newProjectList,
        }, () => {
          $('select').material_select();
        })
      })
      .catch((error) => {
        console.log(error)
        that.setState({
          errorMessage: 'Failed to add project'
        })
      });
    }
  }

  isProjectValid() {
    if (this.refs.new_project.value === '') {
      this.setState({
        invalidProject: true,
        errorMessage: 'Please enter valid project name'
      })
      return true;
    } else {
      return false;
    }
  }

  createSample() {
    console.log('got called', this.refs)
    var that = this;
    axios.post('/samples', {
      sample: {
        name: this.refs.name.value,
        project_name: this.refs.project.value,
        project_id: this.refs.project.id,
        input_files_attributes: [{source_type: 's3', source: this.refs.first_file_source.value },
        {source_type: 's3', source: this.refs.second_file_source.value}],
        s3_preload_result_path: this.refs.s3_preload_result_path.value,
        job_queue: this.refs.job_queue.value,
        memory: this.refs.memory.value,
        status: 'created'
      },
      authenticity_token: this.csrf
    })
    .then(function (response) {
      console.log(response.data);
      // that.gotoPage('/samples')
    })
    .catch(function (error) {
      console.log(error)
      // that.setState({
      //   showFailedLogin: true,
      //   errorMessage: 'Sample upload failed'
      // })
    });
  }

  isFormInvalid() {

  }

  renderProjectList(projects) {
    return (
      projects.map((project, i) => {
        return (
          <option key={i} ref="project" ></option>
        )
      })
    )
  }

  renderSampleForm() {
    return (
      <div className="form-wrapper">
        <form ref="form" onSubmit={ this.handleSubmit }>
          <div className="row title">
            <p className="col s6 signup">Sample Upload</p>
          </div>
          <div className="row content-wrapper">
            <div className="row field-row">
              <div className="col s6 input-field">
                <i className="sample fa fa-envelope" aria-hidden="true"></i>
                <input ref= "name" type="text" className="" onFocus={ this.clearError }  />
                <label htmlFor= "sample_name">Name</label>
              </div>
              <div className="col s6 project-list input-field">{this.state.all}
                   <select> 
                  { this.state.allProjects.length ? 
                      this.state.allProjects.map((project, i) => {
                        return <option key={i} ref="project" id={project.id} value={project.name}>{project.name}</option>
                      }) : <option>No projects to display</option>
                    }
                  </select>
              </div>
            </div>
          
            <div className="row field-row">
              <div className="col s6 input-field">
                <i className="sample fa fa-envelope" aria-hidden="true"></i>
                <input ref= "s3_preload_result_path" type="text" className="" onFocus={ this.clearError } placeholder="Optional" />
                <label htmlFor="sample_s3_preload_result_path">Preload results path (s3 only)</label>
              </div>
              <div className="col s4 project-wrapper"> 
                  <input ref= "new_project" type="text" className="project_input" onFocus={ this.clearError } placeholder="Add a project if desired project is not on the list" />
              </div>
              <div className="col s2 btn-add">
                <a onClick={ this.addProject }className="waves-effect waves-light btn"><i className="fa fa-plus" aria-hidden="true"></i></a>
              </div>
            </div>
          
              <div className="field-row input-field">
                <i className="sample fa fa-envelope" aria-hidden="true"></i>
                <input ref= "first_file_source" type="text" className="" onFocus={ this.clearError } placeholder="Required" />
                <label htmlFor="sample_first_file_source">Read 1 fastq s3 path</label>
              </div>

              <div className="field-row input-field">
                <i className="sample fa fa-envelope" aria-hidden="true"></i>
                <input ref= "second_file_source" type="text" className="" onFocus={ this.clearError } placeholder="Required" />
                <label htmlFor="sample_second_file_source">Read 2 fastq s3 path</label>
              </div>

              

              <div className="row field-row">
                <div className="col s6 input-field">
                  <i className="sample fa fa-envelope" aria-hidden="true"></i>
                  <input ref= "job_queue" type="text" className="" onFocus={ this.clearError } placeholder="Optional" />
                  <label htmlFor="sample_job_queue">Job queue</label>
                </div>

              <div className="col s6 input-field">
                <i className="sample fa fa-envelope" aria-hidden="true"></i>
                <input ref= "memory" type="text" className="" onFocus={ this.clearError } placeholder="Optional" />
                <label htmlFor="sample_memory">Sample memory (in mbs)</label>
              </div>
            </div>
        </div>
        <div onClick={ this.handleSubmit } className="center-align login-wrapper">Submit</div>
      </form>
    </div>
    )
  }

  render() {
    return (
      <div>
        { this.renderSampleForm() }
      </div>
    )
  }
}