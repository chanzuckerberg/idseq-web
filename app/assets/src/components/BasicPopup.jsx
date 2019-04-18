import React from "react";
import { Popup } from "semantic-ui-react";
import PropTypes from "prop-types";

class BasicPopup extends React.Component {
  render() {
    return <Popup on="hover" {...this.props} basic />;
  }
}

BasicPopup.propTypes = {
  size: PropTypes.string,
  wide: PropTypes.string,
  inverted: PropTypes.bool
};

BasicPopup.defaultProps = {
  size: "tiny",
  inverted: true
};

export default BasicPopup;
