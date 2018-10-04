import React from "react";
import PropTypes from "prop-types";

class ForgotPassword extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="login-form forgot-password">
        <div className="row">
          <form action={this.props.endpoint} method="POST" className="new_user">
            <div className="mail">
              <br />
              <div className="form-title">Forgot your password?</div>
              {/* this html is generated by devise (rails gem) so it should be safe to inject */}
              <div
                className="devise-errors"
                dangerouslySetInnerHTML={{ __html: this.props.errors }}
              />
            </div>
            <div className="row content-wrapper">
              <div className="input-field">
                <i className="sample fa fa-envelope" aria-hidden="true" />
                <input
                  type="hidden"
                  name="authenticity_token"
                  value={this.props.csrf}
                />
                <input
                  type="email"
                  id="user_password"
                  name={this.props.emailLabel}
                  className="user_password"
                  placeholder="Enter your registered email"
                />
                <label htmlFor="user_password">Email</label>
              </div>
            </div>
            <button
              type="submit"
              className="center-align col s12 login-wrapper"
            >
              Recover password
            </button>
          </form>
        </div>
      </div>
    );
  }
}

ForgotPassword.propTypes = {
  endpoint: PropTypes.string,
  errors: PropTypes.string,
  csrf: PropTypes.string,
  emailLabel: PropTypes.string
};

ForgotPassword.defaultProps = {
  endpoint: PropTypes.string,
  errors: PropTypes.string,
  csrf: PropTypes.string,
  emailLabel: PropTypes.string
};

export default ForgotPassword;
