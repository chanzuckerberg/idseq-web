import React from 'react';
import $ from 'jquery';
import axios from 'axios';
import SampleUpload from './SampleUpload';

class Header extends React.Component  {
  constructor(props, context) {
    super(props, context);
    this.userSignedIn = this.props.userSignedIn;
    this.userDetails = this.props.userDetails || null;
    this.location = window.location.pathname;
    this.sendMail = this.sendMail.bind(this);
    this.signOut = this.signOut.bind(this);
    this.openCliModal = this.openCliModal.bind(this);
    this.user_auth_token = props.user_auth_token;
    $(document).ready(function() {
      $('.modal').modal();
    });
  }

  componentDidMount() {
   this.displayProfileMenu();
  }

  displayProfileMenu() {
    $('.profile-dropdown').dropdown({
      belowOrigin: true,
      stopPropagation: false
    });
  }

  gotoPage(path) {
    location.href = `${path}`
  }

  signOut() {
    axios(`${this.props.signoutEndpoint}.json`,
          { method: "DELETE",  withCredentials: true }
    ).then(
      (res) => {
        this.gotoPage(this.props.signInEndpoint);
      }
    )
  }

  sendMail() {
    var link = "mailto:regger@chanzuckerberg.com?Subject=Report%20Feedback"
    window.location.href = link;
  }

  openCliModal() {
    $('#cli_modal').modal('open');
  }

  render() {
    let cli_modal = (
      <div id="cli_modal" className="modal project-popup">
        <div className="modal-content">
          <p>1. Install and configure the Amazon Web Services Command Line Interface (AWS CLI).</p>
          <p>2. Install the IDseq CLI:</p>
          <p><span className="code">pip install git+https://github.com/chanzuckerberg/idseq-cli.git</span></p>
          <p>3. Upload a sample using a command of the form:</p>
          <div className="code">
            <p>idseq -p '<span className="code-to-edit">Your Project Name</span>' -s '<span className="code-to-edit">Your Sample Name</span>' \</p>
            <p> -u https://idseq.net -e <span className="code-personal">{this.userDetails.email}</span> -t <span className="code-personal">{this.user_auth_token}</span> \</p>
            <p> --r1 <span className="code-to-edit">your_sample_R1</span>.fastq.gz --r2 <span className="code-to-edit">your_sample_R2</span>.fastq.gz</p>
          </div>
          <p>The project you specify must already exist on IDseq: you can create it using the <span className="code">+ New project</span> button on the sample upload page.</p>
          <p className='upload-question'>For more information on the IDseq CLI, have a look at its <a href='https://github.com/chanzuckerberg/idseq-web/blob/master/README.md' target='_blank'>GitHub repository</a>.</p>
          <button className='modal-close'>Done</button>
        </div>
      </div>
    );
    return (
      <div className='header-row row'>
        <div className="page-loading">
          <div className="btn disabled">
            <i className="fa fa-spinner fa-spin"/>
            <span className='spinner-label'></span>
          </div>
        </div>
        <div className="site-header col s12">
          {/* Dropdown menu */}
          <ul id="dropdown1" className="dropdown-content">
            <li onClick={ this.gotoPage.bind(this, '/samples/new') }><a href="#!">New sample</a></li>
            <li><a onClick={ this.openCliModal } href="#!">New sample (command line)</a></li>
            { this.userDetails && this.userDetails.admin ? <li onClick={ this.gotoPage.bind(this, '/users/new') }><a href="#!">Create user</a></li> : null }
            <li onClick={ this.sendMail }><a href="#!">Report Feedback</a></li>
            <li className="divider"></li>
            <li onClick={this.signOut}><a href="#">Logout</a></li>
          </ul>
          { cli_modal }
          <div>
            <div className="">
              <div href="/" className="left brand-details">
                { /* <i className='fa sidebar-drawer fa-indent'></i> */ }
                <a href='/'>
                  <div className="brand-short">
                    ID.seq
                  </div>
                  <div className="brand-long">
                    Infectious Disease Platform
                  </div>
                </a>
              </div>

              <div className={ this.userSignedIn ? "right hide-on-med-and-down header-right-nav" : "right hide-on-med-and-down header-right-nav menu" }>
                { this.userSignedIn ? <div className='profile-header-dropdown'><a className="dropdown-button profile-dropdown" data-activates="dropdown1">
                    { this.userDetails.email } <i className="fa fa-angle-down"></i>
                    </a></div>:  (this.location === '/users/sign_in' ? null : <div className="login"><span onClick={ this.gotoPage.bind(this, '/users/sign_in') }>Login</span></div>)
                 }
              </div>
            </div>
          </div>
        </div>
      </div>

    )
  }
}

export default Header;
