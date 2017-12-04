class Samples extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.switchProject = this.switchProject.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.defaultSortBy = 'newest';
    const currentSort = SortHelper.currentSort();
    this.columnSorting = this.columnSorting.bind(this);
    this.handleSearchChange = this.handleSearchChange.bind(this);
    this.loadMore = this.loadMore.bind(this);
    this.fetchResults = this.fetchResults.bind(this);
    this.fetchSamples = this.fetchSamples.bind(this);
    this.handleStatusFilterSelect = this.handleStatusFilterSelect.bind(this);
    this.state = {
      project: null,
      totalNumber: null,
      selectedProjectId: null,
      filterParams: null,
      searchParams: '',
      allSamples: [],
      allProjects: [],
      sort_query: currentSort.sort_query ? currentSort.sort_query  : `sort_by=${this.defaultSortBy}`,
      pagesLoaded: 0,
      pageEnd: false,
      initialFetchedSamples: [],
      loading: false,
      isRequesting: false,
      displayEmpty: false
    };
  }

  columnSorting(e) {
    const className = e.target.className;
    const pos = className.indexOf('sort_by');
    const sort_query = className.substr(pos).split(' ')[0];
    this.setState({ sort_query });
    SortHelper.applySort(sort_query);
  }

  handleSearchChange(e) {
    if (e.target.value !== '') {
      this.setState({ searchParams: e.target.value });
    } else {
      this.setState({ 
        searchParams: '',
        pageEnd: false,
        pagesLoaded: 0
      });
      this.fetchResults()
    }
  }


  appendStatusIcon(status) {
    switch(status) {
      case 'WAITING':
        return <i className="waiting fa fa-arrow-up" aria-hidden="true"></i>;
        break;
      case 'INPROGRESS':
        return <i className="uploading fa fa-repeat" aria-hidden="true"></i>;
        break;
      case 'HOST FILTERING':
        return <i className="uploading fa fa-repeat" aria-hidden="true"></i>;
        break;
      case 'ALIGNEMENT':
        return <i className="uploading fa fa-repeat" aria-hidden="true"></i>;
        break;
      case 'FAILED':
        return <i className="failed fa fa-times" aria-hidden="true"></i>;
        break;
      case 'COMPLETE':
        return <i className="complete fa fa-check" aria-hidden="true"></i>;
        break;
      default:
        return <i className="waiting fa fa-arrow-up" aria-hidden="true"></i>;
    }
  }

  formatRunTime(runtime) {
    runtime = Number(runtime);
    var h = Math.floor(runtime / 3600);
    var m = Math.floor(runtime % 3600 / 60);
    var s = Math.floor(runtime % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return hDisplay + mDisplay + sDisplay; 
}

  renderPipelineOutput(samples) {
    var BLANK_TEXT = 'NA'

    return samples.map((sample, i) => {
      let dbSample = sample.db_sample;
      let derivedOutput = sample.derived_sample_output;
      let runInfo = sample.run_info
      let uploader = sample.uploader.name
      let statusClass = !runInfo.job_status_description ? this.applyChunkStatusClass(runInfo) : this.applyClass(runInfo.job_status_description)
      let status = !runInfo.job_status_description ? this.getChunkedStage(runInfo) : runInfo.job_status_description

      rowWithChunkStatus = (
        <div className={statusClass}>
          <span>{this.appendStatusIcon(status)}</span><p className="status">{status}</p>
        </div>
      );
      rowWithoutChunkStatus = (
        <div className={statusClass}>
          <span>{this.appendStatusIcon(status)}</span><p className="status">{status}</p>
        </div>
      )
      return (
        <div className="row job-container" onClick={ this.viewSample.bind(this, dbSample.id)} key={i}>
          <div className="job-card">
            <div className="col s4">
              <p className="sample-name">{dbSample.name}</p>
              <p className="uploader">
                <span>Uploaded {moment(dbSample.created_at).startOf('second').fromNow()}</span>
                { !uploader || uploader === '' ? '' : <span> | by {uploader}</span>} 
              </p>
            </div>
            <div className="reads col s1">
              <p>
              { !derivedOutput.pipeline_output ? BLANK_TEXT : numberWithCommas(derivedOutput.pipeline_output.total_reads) }
              </p>
            </div>
            <div className="reads col s2">
              <p>
              { (!derivedOutput.summary_stats || !derivedOutput.summary_stats.remaining_reads) ? BLANK_TEXT : numberWithCommas(derivedOutput.summary_stats.remaining_reads) }
              { (!derivedOutput.summary_stats || !derivedOutput.summary_stats.percent_remaining) ? '' : ` (${derivedOutput.summary_stats.percent_remaining.toFixed(2)}%)` } 
              </p>
            </div>
            <div className="reads col s2">
              <p>
              { (!derivedOutput.summary_stats || !derivedOutput.summary_stats.compression_ratio) ? BLANK_TEXT : derivedOutput.summary_stats.compression_ratio.toFixed(2) }
              </p>
            </div>
            <div className="reads col s1">
              <p>{ (!derivedOutput.summary_stats || !derivedOutput.summary_stats.qc_percent) ? BLANK_TEXT : `${derivedOutput.summary_stats.qc_percent.toFixed(2)}%`}</p>
            </div>
              <div className={ runInfo.total_runtime ? "reads status-col col s2" : 'reads col s2 no-time'}>{ !runInfo.job_status_description ? rowWithChunkStatus : rowWithoutChunkStatus }
              { runInfo.total_runtime ? <p className="time"><i className="fa fa-clock-o" aria-hidden="true"></i><span>{this.formatRunTime(runInfo.total_runtime)}</span></p> : ''}
            </div>
          </div>
        </div>
      )
    })
  }

  //Load more samples on scroll
  scrollDown() {
    var that = this;
    $(window).scroll(function() {
      if ($(window).scrollTop() > $(document).height() - $(window).height() - 60) {
        { !that.state.isRequesting && !that.state.pageEnd ? that.loadMore() : null }
        return false;
      }
    });
  }

  //fetch first set of samples
  fetchSamples() {
    axios.get(`/project_samples`).then((res) => {
      if (!res.data.samples.length) {
        this.setState({ displayEmpty: true });
      }
      this.setState((prevState) => ({
        loading: false,
        displayEmpty: false,
        initialFetchedSamples: res.data.samples,
        allSamples: res.data.samples,
        pagesLoaded: prevState.pagesLoaded+1,
        totalNumber: res.data.total_count
      }))
    }).catch((err) => {
      this.setState((prevState) => ({
        loading: false,
        allSamples: [],
        pagesLoaded: 0,
      }))
    })
  }

  //fetch all Projects
  fetchProjects() {
    axios.get(`/projects.json`).then((res) => {
      this.setState({ 
        allProjects: res.data,
        loading: false,
      })
    }).catch((err) => {
      this.setState({ 
        allProjects: [],
        loading: false,
      })
    })
  }

  //fetch data used by projects page
  fetchProjectPageData() {
    this.setState({ loading: true })
    this.fetchProjects();
    this.fetchSamples();
  }

  //load more paginated samples
  loadMore() {
    const params = this.getParams();
    this.setState({ isRequesting: true })
    axios.get(`/project_samples${params}`).then((res) => {
      this.setState((prevState) => ({
        isRequesting: false,
        allSamples: [...prevState.allSamples, ...res.data.samples],
        pagesLoaded: prevState.pagesLoaded+1,
        pageEnd: res.data.samples.length >= 15 ? false : true,
      }))
    }).catch((err) => {
      this.setState((prevState) => ({
        isRequesting: false,
        allSamples: [...prevState.allSamples],
        pagesLoaded: prevState.pagesLoaded,
        pageEnd: prevState.pageEnd
      }))
    })
  }

  //fetch project, filter and search params
  getParams() {
    const projectId = parseInt(this.state.selectedProjectId);
    
    const paramsWithProject = `?filter=${this.state.filterParams}&page=${this.state.pagesLoaded+1}&project_id=${projectId}&search=${this.state.searchParams}`;

    const paramsWithoutProject = `?filter=${this.state.filterParams}&page=${this.state.pagesLoaded+1}&search=${this.state.searchParams}`;

    const params = projectId ? paramsWithProject : paramsWithoutProject;
    return params;
  }

  //fetch results from filtering, search or switching projects
  fetchResults() {
    const params = this.getParams();
    axios.get(`/project_samples${params}`).then((res) => {
      if (!res.data.samples.length) {
        this.setState({ displayEmpty: true });
      }
      this.setState((prevState) => ({
        loading: false,
        displayEmpty: false,
        initialFetchedSamples: res.data.samples,
        allSamples: res.data.samples,
        totalNumber: res.data.total_count,
        pagesLoaded: prevState.pagesLoaded+1
      }));
    })
  }

  applyClass(status) {
    if(status === 'COMPLETE') {
      return 'complete';
    } else if (status === 'WAITING') {
      return 'waiting';
    } else if (status === 'INPROGRESS') {
      return 'uploading';
    } else if (status === 'FAILED') {
      return 'failed';
    }
  }

  applyChunkStatusClass(runInfo) {
    let postProcess = runInfo['Post Processing']
    let hostFiltering = runInfo['Host Filtering']
    let alignment = runInfo['GSNAPL/RAPSEARCH alignment']
    if (postProcess) {
      return postProcess === 'LOADED' ? 'complete' : 'uploading';
    } else if(alignment) {
      return alignment === 'FAILED' ? 'failed' : 'uploading';
    } else if(hostFiltering) {
      return hostFiltering === 'FAILED' ? 'failed' : 'uploading';
    }
  }

  getChunkedStage(runInfo) {
    let postProcess = runInfo['Post Processing']
    let hostFiltering = runInfo['Host Filtering']
    let alignment = runInfo['GSNAPL/RAPSEARCH alignment']
    if (postProcess === 'FAILED' || alignment === 'FAILED' || hostFiltering === 'FAILED') {
      return 'FAILED';
    } else if (postProcess) {
      if (postProcess === 'LOADED')
        return 'COMPLETE';
      else
        return  'POST PROCESSING';
    } else if (alignment) {
      return 'ALIGNMENT';
    } else if (hostFiltering) {
      return 'HOST FILTERING';
    }  else {
      return 'WAITING';
    }
  }

  //handle search when query is passed
  handleSearch(e) {
    if (e.target.value !== '' && e.key === 'Enter') {
      this.setState({
        loading: true,
        pagesLoaded: 0, 
        pageEnd: false, 
        searchParams: e.target.value 
      }, () => {
        this.fetchResults(); 
      });
    }
  }

  //Select or switch Project
  switchProject(e) {
    let id = e.target.getAttribute('data-id');
    this.setState({ 
      selectedProjectId: id, 
      pageEnd: false
    });
    this.fetchProjectDetails(id)
  }

  fetchProjectDetails(projId) {
    if (!projId) {
      this.setState({
        selectedProjectId: null,
        project: null,
        pagesLoaded: 0,
        pageEnd: false,
      });
      this.fetchSamples();
    } else {
      axios.get(`projects/${projId}.json`).then((res) => {
        this.setState({ 
          pagesLoaded: 0,
          project: res.data
        })
        this.fetchResults();
      }).catch((err) => {
        this.setState({ project: null})
      })
    }
  }

  viewSample(id) {
    location.href = `/samples/${id}`;
  }

  getActiveSort(className) {
    if(className) {
      const sort = SortHelper.getFilter('sort_by');
      if (sort === className) {
        return 'active';
      } else if (className === this.defaultSortBy && !sort) {
        return 'active';
      }
    }
  }

  renderTable(samples) {
    const tableHead = (
      <div className="row wrapper">
        <div className="row table-container">
          <div className="col s4"><span>Name</span></div>
          <div className="col s1">Total Reads</div>
          <div className="col s2">Non-Host reads</div>
          <div className="col s2">Compression Ratio</div>
          <div className="col s1">Quality</div>
          <div className="col s2 status-dropdown" data-activates="dropdownstatus"><i className="status-filter fa fa-caret-down"></i>Status</div>
        </div>
      </div>
    )
    return (
    <div className="content-wrapper">
      <div className="sample-container">
        <div className="row search-box">
          <span className="icon"><i className="fa fa-search" aria-hidden="true"></i></span>
          <input id="search" value={this.state.searchParams} onChange={this.handleSearchChange}  type="search" onKeyDown={this.handleSearch} className="search" placeholder='Search for Sample'/>{ this.state.showSearchLoader ? <i className='fa fa-spinner fa-spin fa-lg'></i> : null }
        </div>
          {/* Dropdown menu */}
          <ul id='dropdownstatus' className='status dropdown-content'>
          <li><a className="title"><b>Filter by status</b></a></li>
          <li className="divider"></li>
          <li className="filter-item" data-status="WAITING" onClick={ this.handleStatusFilterSelect } ><a data-status="WAITING" className="filter-item waiting">Waiting</a><i data-status="WAITING" className="filter fa fa-check"></i></li>
          <li className="filter-item" data-status="UPLOADING" onClick={ this.handleStatusFilterSelect }><a data-status="UPLOADING" className="filter-item uploading">In Progress</a><i data-status="UPLOADING"  className="filter fa fa-check"></i></li>
          <li className="filter-item" data-status="CHECKED" onClick={ this.handleStatusFilterSelect }><a data-status="CHECKED" className="filter-item complete">Complete</a><i data-status="CHECKED" className="filter fa fa-check"></i></li>
          <li className="filter-item" onClick={ this.handleStatusFilterSelect } data-status="FAILED" ><a data-status="FAILED" className="filter-item failed">Failed</a><i data-status="FAILED" className="filter fa fa-check"></i></li>
            <li className="divider"></li>
          <li className="filter-item" data-status="ALL" onClick={ this.handleStatusFilterSelect }><a data-status="ALL" className="filter-item all">All</a><i data-status="ALL" className="filter all fa fa-check"></i></li>
          </ul>
          { tableHead }
          { samples.length ? this.renderPipelineOutput(samples) : this.renderEmptyTable() }
      </div>
      { !this.state.pageEnd && this.state.initialFetchedSamples && this.state.initialFetchedSamples.length > 14 ? <div className="scroll">
        <i className='fa fa-spinner fa-spin fa-3x'></i>
      </div> : "" }
      { this.state.loading ? <div className="scroll">
        <i className='fa fa-spinner fa-spin fa-3x'></i>
      </div> : "" }
    </div>
    )
  }

  initializeProjectList() {
    $('.project-toggle').click((e) => {
      e.stopPropagation();
      const arrowElement = $(e.toElement)[0];
      const top = arrowElement.offsetTop;
      const height = arrowElement.offsetHeight;
      const width = arrowElement.offsetWidth;
      const left = arrowElement.offsetLeft;
      $('.dropdown-bubble').css({ top: `${(top + height) + 20}px`, left: `${(left - width) - 5}px`});
      $('.dropdown-bubble').slideToggle(200);
    });
    $(document).click(() => { $('.dropdown-bubble').slideUp(200); });
  }

  componentDidMount() {
    $('.filter').hide()
    this.fetchProjectPageData();
    this.scrollDown();
    this.initializeProjectList();
    this.displayPipelineStatusFilter();
    this.displayCheckMarks(this.state.urlFilterQuery);
  }

  // initialize filter dropdown
  displayPipelineStatusFilter() {
    const textSize = 14
    $('.status-dropdown').dropdown({
      belowOrigin: true,
      stopPropagation: false,
      constrainWidth: true
    });
    $(".dropdown-content>li>a").css("font-size", textSize)
  }

  displayCheckMarks(filter) {
    $(`.filter[data-status="${filter}"]`).show();
  }
  

  //handle filtering when a filter is selected from list
  handleStatusFilterSelect(e) {
    let status = e.target.getAttribute('data-status');
    this.setState({
      loading: true,
      pagesLoaded: 0,
      pageEnd: false, 
      filterParams: status 
    }, () => {
      this.fetchResults(); 
    });
  }

  render() {
    return (
      <div>
        <div className="sub-header-home">
          <div className="sub-header-items">
            <div className="content">
              <div  className="upload">
                <a href='/samples/new'>
                  <i className="fa fa-flask" aria-hidden="true"/>
                  <span>Upload sample</span>
                </a>
              </div>

              <div className="sub-title">
                <span>{ (!this.state.project) ? 'All projects' : this.state.project.name }<i className='fa fa-angle-down project-toggle'></i></span>
                <div className='dropdown-bubble'>
                  <div className="dropdown-container">
                    <ul>
                      <li onClick={this.switchProject} className="title">
                        <a >All projects </a>
                      </li>
                      { this.state.allProjects.map((project, i) => {
                        return (
                          <li key={i}>
                            <a data-id={project.id} onClick={this.switchProject} >
                              { project.name }
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="title-filter">
                <span><i>{this.state.allSamples.length === 0 ? 'No sample found' : ( this.state.allSamples.length === 1 ? '1 sample found' : `${this.state.allSamples.length} out of ${this.state.totalNumber} samples found`)}</i></span>
              </div>
            </div>
          </div>
        </div>
          {this.renderTable(this.state.allSamples)}
      </div>
    )
  }

}

