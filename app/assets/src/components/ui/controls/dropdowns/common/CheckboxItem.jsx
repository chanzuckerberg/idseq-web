import cx from "classnames";
import PropTypes from "prop-types";
import React from "react";
import { IconCheckSmall } from "~ui/icons";
import BareDropdown from "../BareDropdown";
import cs from "./checkbox_item.scss";

const CheckboxItem = ({ value, label, checked, onOptionClick, boxed }) => (
  <BareDropdown.Item
    onClick={e => {
      e.stopPropagation();
      onOptionClick(value, !checked);
    }}
  >
    <div className={cs.listElement}>
      <div
        className={cx(
          checked && cs.checked,
          cs.listCheckmark,
          boxed && cs.boxed
        )}
      >
        <IconCheckSmall className={cs.icon} />
      </div>
      <div className={cs.listLabel}>{label}</div>
    </div>
  </BareDropdown.Item>
);

CheckboxItem.propTypes = {
  value: PropTypes.any,
  label: PropTypes.string,
  checked: PropTypes.bool,
  onOptionClick: PropTypes.func,
};

export default CheckboxItem;
