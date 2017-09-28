class PipelineList extends React.Component {
  constructor(props, context) {
    super(props, context);
  }

  componentDidMount() {
    console.log(this.props.outputData, this.props);
  }

  render() {
    return (
      <div>
        <Header />
        <div className="sub-header-home">
          <div className="container">
            <div className="content">
              <div className="title">
                All Projects  > { this.props.outputData.project_info.name }
              </div>

              <div className="sub-title">
                { this.props.outputData.project_info.name }
              </div>

              <div className="title-filter">
                <i className="fa fa-bar-chart" aria-hidden="true"></i>
                <span>PIPELINES OUTPUTS</span>
              </div>
            </div>
          </div>
        </div>
        <div className="content-wrapper">
          <div className="container sample-container">
            {!this.props.pipelineOutputs ? 'Nothing to show' :
              <table className="pagination bordered highlight">
                <thead>
                <tr>
                  <th>Name</th>
                  <th>Date Uploaded</th>
                  <th>Total Reads</th>
                  <th>Final Reads</th>
                  <th>Percentage Reads</th>
                </tr>
                </thead>

                {this.props.pipelineOutputs.map((output, i) => {
                  return (
                    <tbody key={i}>
                    <tr>
                      <td><a href={'/pipeline_outputs/' + output.id}>
                        <i className="fa fa-flask" aria-hidden="true"></i> {this.props.outputData.sample_info.name} </a>
                      </td>
                      <td><a href={'/pipeline_outputs/' + output.id}>{moment(output.created_at).format(' L,  h:mm a')}</a></td>
                      <td><a href={'/pipeline_outputs/' + output.id}>{output.total_reads}</a></td>
                      <td><a href={'/pipeline_outputs/' + output.id}>{output.remaining_reads }</a></td>
                      <td><a href={'/pipeline_outputs/' + output.id}>{(output.remaining_reads/output.total_reads * 100).toFixed(2) }%</a></td>
                    </tr>
                    </tbody>
                  )
                })}
              </table>
              
            }
          </div>
        </div>
      </div>
    )
  }

}

