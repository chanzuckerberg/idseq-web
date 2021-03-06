import { forbidExtraProps } from "airbnb-prop-types";
import cx from "classnames";
import PropTypes from "prop-types";
import React from "react";
import { Sidebar as SemanticSidebar } from "semantic-ui-react";
import { IconClose } from "~ui/icons";
import cs from "./sidebar.scss";

class Sidebar extends React.Component {
  render() {
    const { children, className, ...props } = this.props;
    return (
      <SemanticSidebar
        {...props}
        animation="overlay"
        className={cx(cs.sidebar, className, cs[this.props.direction])}
      >
        {children}
        <div onClick={this.props.onClose}>
          <IconClose className={cs.closeIcon} />
        </div>
      </SemanticSidebar>
    );
  }
}

Sidebar.propTypes = forbidExtraProps({
  direction: PropTypes.string /* top, left, right, bottom */,
  width: PropTypes.string /* very thin, thin, wide, very wide */,
  visible: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
  onClose: PropTypes.func.isRequired,
});

Sidebar.defaultProps = {
  direction: "right",
};

export default Sidebar;
