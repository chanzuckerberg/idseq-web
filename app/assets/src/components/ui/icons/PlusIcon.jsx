import React from "react";
import PropTypes from "prop-types";

const PlusIcon = props => {
  return (
    <svg
      className={props.className}
      viewBox="0 0 14 14"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      fill="#cccccc"
    >
      <g id="Symbols" strokeWidth="1" fillRule="evenodd">
        <g id="Sample-Table" transform="translate(-1161.000000, -2.000000)">
          <path
            d="M1170.8,9 C1170.8,9.3864 1170.4864,9.7 1170.1,9.7 L1168.7,9.7 L1168.7,11.1 C1168.7,11.4864 1168.3864,11.8 1168,11.8 C1167.6136,11.8 1167.3,11.4864 1167.3,11.1 L1167.3,9.7 L1165.9,9.7 C1165.5136,9.7 1165.2,9.3864 1165.2,9 C1165.2,8.6136 1165.5136,8.3 1165.9,8.3 L1167.3,8.3 L1167.3,6.9 C1167.3,6.5136 1167.6136,6.2 1168,6.2 C1168.3864,6.2 1168.7,6.5136 1168.7,6.9 L1168.7,8.3 L1170.1,8.3 C1170.4864,8.3 1170.8,8.6136 1170.8,9 M1168,14.6 C1164.9123,14.6 1162.4,12.0877 1162.4,9 C1162.4,5.9123 1164.9123,3.4 1168,3.4 C1171.0877,3.4 1173.6,5.9123 1173.6,9 C1173.6,12.0877 1171.0877,14.6 1168,14.6 M1168,2 C1164.1339,2 1161,5.1339 1161,9 C1161,12.8661 1164.1339,16 1168,16 C1171.8661,16 1175,12.8661 1175,9 C1175,5.1339 1171.8661,2 1168,2"
            id="plus_circle-[#1427]"
          />
        </g>
      </g>
    </svg>
  );
};

PlusIcon.propTypes = {
  className: PropTypes.string
};

export default PlusIcon;
