import React from "react";
import { Input as SemanticInput } from "semantic-ui-react";
import PropTypes from "prop-types";

class Input extends React.Component {
  constructor(props) {
    super(props);
  }

  handleChange = (_, inputProps) => {
    if (this.props.onChange) {
      this.props.onChange(inputProps.value);
    }
  };

  render() {
    let { className, disableAutocomplete, ...props } = this.props;
    className = "idseq-ui " + className;
    console.log("value: ", disableAutocomplete);
    return (
      <SemanticInput
        autoComplete={disableAutocomplete ? "idseq-ui" : null}
        className={className}
        onChange={this.handleChange}
        {...props}
      />
    );
  }
}

Input.propTypes = {
  className: PropTypes.string,
  disableAutocomplete: PropTypes.bool,
  onChange: PropTypes.func,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default Input;
