class PipelineList extends React.Component {
  constructor(props, context) {
    super(props, context);

  }

  componentDidMount() {
  }

  render() {
    return (
      <div>
        <Header />
        <div className="sub-header-home">
          <div className="container">
            <div className="content">
              <div className="title">
                All Projects  >  Uganda Project
              </div>

              <div className="sub-title">
                Uganda Project
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
              <table className="bordered highlight">
                <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Total Reads</th>
                  <th>Final Reads</th>
                </tr>
                </thead>

                {this.props.pipelineOutputs.map((output, i) => {
                  return (
                    <tbody key={i}>
                    <tr>
                      <td><a href="/pipeline_outputs/1"><i className="fa fa-flask" aria-hidden="true"></i>{output.id}</a></td>
                      <td><a href="/pipeline_outputs/1">{moment(output.created_at).format('MM-DD-YYYY')}</a></td>
                      <td><a href="/pipeline_outputs/1">{output.total_reads}</a></td>
                      <td><a href="/pipeline_outputs/1">{output.remaining_reads }</a></td>
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


