// ViewHeader ignores all children that are not ViewHeader.Content or ViewHeader.Controls.
import cx from "classnames";
import PropTypes from "prop-types";
import React from "react";
import extractChildren from "../../utils/extractChildren";
import Content from "./Content";
import Controls from "./Controls";
import Pretitle from "./Pretitle";
import Title from "./Title";
import cs from "./view_header.scss";

const ViewHeader = ({ className, children }) => {
  const [content, controls] = extractChildren(children, [
    Content.CLASS_NAME,
    Controls.CLASS_NAME,
  ]);

  return (
    <div className={cx(cs.viewHeader, className)}>
      {content}
      <div className={cs.fill} />
      {controls}
    </div>
  );
};

ViewHeader.Content = Content;
ViewHeader.Controls = Controls;
ViewHeader.Title = Title;
ViewHeader.Pretitle = Pretitle;

ViewHeader.propTypes = {
  className: PropTypes.string,
  title: PropTypes.string,
  preTitle: PropTypes.string,
  subTitle: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
};

export default ViewHeader;
