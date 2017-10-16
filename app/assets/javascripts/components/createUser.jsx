class CreateUser extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.csrf = this.props.csrf;
    this.handleSubmit = this.handleSubmit.bind(this);
    this.clearError = this.clearError.bind(this)
    this.gotoPage = this.gotoPage.bind(this);
    this.state = {
      isChecked: false,
      success: false,
      showFailed: false,
      errorMessage: '',
      successMessage: ''
    }
  }

  handleSubmit(e) {
    e.preventDefault();
    if(!this.isFormInvalid()) {
      this.createUser()
    }
  }

  gotoPage(path) {
    location.href = `${path}`
  }

  clearError() {
    this.setState({ showFailed: false })
  }

  isFormInvalid() {
    if (this.refs.email.value === '' && this.refs.password.value === '' && this.refs.password_confirmation.value === '' && this.refs.authentication_token.value === '') {
      this.setState({ 
        showFailed: true,
        errorMessage: 'Please fill all fields'
      })
      return true;
    } else if (this.refs.email.value === '') {
      this.setState({ 
        showFailed: true,
        errorMessage: 'Please enter email'
      })
      return true;
    } else if (this.refs.password_confirmation.value === '') {
      this.setState({ 
        showFailed: true,
        errorMessage: 'Please re-enter password'
      })
      return true;
    } else if (this.refs.authentication_token.value === '') {
      this.setState({ 
        showFailed: true,
        errorMessage: 'Please enter authentication token'
      })
      return true;
    } 
    else {
      return false;
    }
  }

  createUser() {
    var that = this;
    axios.post('/users.json', { 
       user: {
        email: this.refs.email.value,
        password: this.refs.password.value,
        password_confirmation: this.refs.password_confirmation.value,
        authentication_token: this.refs.authentication_token.value
      },
      authenticity_token: this.csrf
    }).then(function(res) {
      that.setState({
        success: true,
        successMessage: 'User created successfully'
      })
      setTimeout(function() {
        location.href = '/';
      }, 1000)
    })
    .catch(function(err) {
      that.setState({
        showFailed: true,
        errorMessage: 'Failed to create user'
      })
    })
  }

  renderCreateUser() {
    return (
      <div className="form-wrapper">
          <div className="row">
            <form ref="form" className="new_user" id="new_user" onSubmit={ this.handleSubmit }>
              <div className="row title">
                <p className="col s6 signup">Create User</p>
              </div>
              { this.state.success ? <div className="success-info" >
                <i className="fa fa-success"></i>
                 <span>{this.state.successMessage}</span>
                </div> : null }
              { this.state.showFailed ? <div className="error-info" >
                  <i className="fa fa-error"></i>
                  <span>{this.state.errorMessage}</span>
              </div> : null }
              <div className="row content-wrapper">
                <div className="input-field">
                  <i className="fa fa-envelope" aria-hidden="true"></i>
                  <input ref= "email" type="email" className="" onFocus={ this.clearError }  />
                  <label htmlFor="user_email">Email</label>
                </div>
                <div className="input-field">
                  <i className="fa fa-key" aria-hidden="true"></i>
                  <input ref= "password" type="password" className="" onFocus={ this.clearError }   />
                  <label htmlFor="user_password">Password</label>
                </div>
                <div className="input-field">
                  <i className="fa fa-check-circle" aria-hidden="true"></i>
                  <input ref= "password_confirmation" type="password" className="" onFocus={ this.clearError }   />
                  <label htmlFor="user_password_confirmation">Confirm Password</label>
                </div>
                <div className="input-field">
                  <i className="fa fa-unlock" aria-hidden="true"></i>
                  <input ref= "authentication_token" type="text" className="" onFocus={ this.clearError }   />
                  <label htmlFor="user_authentication_token">Authentication Token</label>
                </div>
              </div>
              <input className="hidden" type="submit"/>
              <div onClick={ this.handleSubmit } className="center-align login-wrapper">Submit</div>
            </form>
          </div>
        </div>
    )
  }

  render() {
    return (
      <div>
        { this.renderCreateUser() }
      </div>
    )
  }
}
