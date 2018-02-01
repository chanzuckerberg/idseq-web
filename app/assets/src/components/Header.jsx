import React from 'react';
import $ from 'jquery';
import axios from 'axios';

class Header extends React.Component  {
  constructor(props, context) {
    super(props, context);
    this.userSignedIn = this.props.userSignedIn;
    this.userDetails = this.props.userDetails || null;
    this.location = window.location.pathname;
    this.sendMail = this.sendMail.bind(this);
    this.signOut = this.signOut.bind(this);
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

  render() {
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
           { this.userDetails && this.userDetails.admin ? <li onClick={ this.gotoPage.bind(this, '/users/new') }><a href="#!">Create user</a></li> : null }
            <li onClick={ this.sendMail }><a href="#!">Report Feedback</a></li>
            <li className="divider"></li>
            <li onClick={this.signOut}><a href="#">Logout</a></li>
          </ul>

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
