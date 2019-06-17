import React, { Component } from "react";
import PropTypes from "prop-types";

import cs from "./heatmap_private.scss";

/**
 * This class was created by the following process:
 * Extracted CSS to heatmap_private.scss.
 * From Adobe generated SVG to JSX using https://magic.reactjs.net/htmltojsx.htm.
 * Transformed CSS classnames.
 */
export default class HeatmapPrivate extends Component {
  static propTypes = {
    className: PropTypes.string,
  };

  render() {
    return (
      <svg
        className={this.props.className}
        version="1.1"
        id="Layer_1"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        x="0px"
        y="0px"
        viewBox="0 0 38 38"
        style={{ enableBackground: "new 0 0 38 38" }}
        xmlSpace="preserve"
      >
        <g>
          <defs>
            <path
              id="SVGID_1_"
              d="M-323.4-3.1c0.2-0.2,0.5-0.4,0.8-0.4h3.6c0.3,0,0.6,0.1,0.8,0.4l1,1.2c0.6,0.8,1.6,1.2,2.5,1.2h12.6
      c0.3,0,0.6,0.1,0.8,0.3c0.2,0.2,0.3,0.5,0.3,0.8l-0.1,0.6h-22.4l-0.4-3.3C-323.7-2.6-323.6-2.9-323.4-3.1z M-300.4,17.1
      c-0.1,0.8-0.7,1.3-1.5,1.3h-20.8c-0.8,0-1.4-0.6-1.5-1.3l-1.2-12.7c0-0.3,0.1-0.6,0.3-0.8c0.2-0.2,0.5-0.4,0.8-0.4h23.9
      c0.3,0,0.6,0.1,0.8,0.4c0.2,0.2,0.3,0.5,0.3,0.8L-300.4,17.1z M-327.5,4.6l1.1,12.7c0.2,1.9,1.8,3.3,3.7,3.3h20.8
      c1.9,0,3.5-1.4,3.7-3.3l1.1-12.7c0.1-0.9-0.2-1.9-0.8-2.5c-0.2-0.3-0.5-0.5-0.8-0.7l0.1-0.7c0.1-0.9-0.2-1.8-0.8-2.5
      c-0.6-0.7-1.5-1.1-2.4-1.1h-12.6c-0.3,0-0.6-0.1-0.8-0.4l-1-1.2c-0.6-0.7-1.6-1.2-2.5-1.2h-3.6c-0.9,0-1.8,0.4-2.5,1.1
      c-0.6,0.7-0.9,1.6-0.8,2.6l0.4,3.3c-0.4,0.2-0.9,0.5-1.2,0.8C-327.3,2.8-327.6,3.7-327.5,4.6z"
            />
          </defs>
          <use
            xlinkHref="#SVGID_1_"
            style={{ overflow: "visible", fill: "#A300DF" }}
          />
          <clipPath id="SVGID_2_">
            <use xlinkHref="#SVGID_1_" style={{ overflow: "visible" }} />
          </clipPath>
          <g className={cs.st1}>
            <defs>
              <rect
                id="SVGID_3_"
                x="-518.7"
                y="-790.7"
                width={1478}
                height={1395}
              />
            </defs>
            <use
              xlinkHref="#SVGID_3_"
              style={{ overflow: "visible", fill: "#A300DF" }}
            />
            <clipPath id="SVGID_4_">
              <use xlinkHref="#SVGID_3_" style={{ overflow: "visible" }} />
            </clipPath>
          </g>
        </g>
        <g>
          <defs>
            <circle id="SVGID_5_" cx="-302.2" cy="18.8" r="7.5" />
          </defs>
          <clipPath id="SVGID_6_">
            <use xlinkHref="#SVGID_5_" style={{ overflow: "visible" }} />
          </clipPath>
          <g className={cs.st3}>
            <defs>
              <rect
                id="SVGID_7_"
                x="-518.7"
                y="-790.7"
                width={1478}
                height={1395}
              />
            </defs>
            <clipPath id="SVGID_8_">
              <use xlinkHref="#SVGID_7_" style={{ overflow: "visible" }} />
            </clipPath>
          </g>
        </g>
        <g>
          <defs>
            <path
              id="SVGID_9_"
              d="M-303.9,12.6c0.1,0,0.1,0,0.2,0.1c0.1,0.2,0.2,0.3,0.2,0.5c0.2,0.4,0.2,0.8,0.1,1.2
      c-0.2,0.4-0.7,0.6-1.1,0.8c-0.8,0.4-1.6,1.1-2.1,1.9c0,0-0.1,0.1-0.1,0.1c-0.1,0-0.1,0-0.2-0.1c-0.1-0.1-0.2-0.1-0.2-0.2
      c0,0-0.1,0-0.1,0.1c-0.1,0.4,0.1,0.9,0.5,1.1c0.1,0,0.1,0.1,0.2,0.1c0.1,0.2,0,0.4,0,0.6c0,0.2,0.3,0.4,0.6,0.4s0.5-0.2,0.8-0.2
      c0.6-0.2,1.2-0.1,1.7,0.2c0.2,0.2,0.5,0.4,0.7,0.6c0.2,0.2,0.5,0.3,0.8,0.2c0.1,0,0.1,0,0.2,0.1c0.1,0.2,0,0.6-0.2,0.8
      c-0.2,0.2-0.5,0.4-0.7,0.7c-0.5,0.6-0.7,1.5-1.1,2.2c-0.1,0.1-0.2,0.2-0.2,0.4c-0.1,0.2-0.1,0.4-0.1,0.7c0,0,0,0.1-0.1,0.1
      c-0.1,0-0.2-0.1-0.3-0.1c-0.1,0-0.1-0.1-0.1-0.2c-0.2-0.9-0.5-1.8-0.9-2.6c-0.2-0.3-0.4-0.7-0.7-0.8c-0.1-0.1-0.2-0.1-0.2-0.2
      c0-0.1,0-0.2,0-0.2c0.1-0.8-0.3-1.7-1-2.2c-0.1-0.1-0.2-0.2-0.3-0.3s-0.1-0.3-0.1-0.4s-0.3-0.3-0.4-0.4c-0.1,0-0.1-0.1-0.1-0.2
      C-307.9,15-306.1,13.2-303.9,12.6z M-300.8,12.5c0.3,0.1,0.6,0.2,0.8,0.2c0.2,0.1,0.3,0.2,0.5,0.2c0.8,0.4,1.5,0.9,2.1,1.6
      c0,0,0.1,0.1,0.1,0.2c0,0.1,0,0.3,0,0.4c0,0.1-0.1,0.2-0.1,0.2c0,0.2,0.2,0.3,0.3,0.3c0.1,0,0.2,0,0.4,0c0.1,0,0.2,0.1,0.2,0.2
      c0.1,0.2,0.2,0.4,0.2,0.5c0.3,0.7,0.4,1.4,0.5,2.2c0,0.1,0,0.2-0.1,0.3c-0.1,0.1-0.2,0.3-0.3,0.5c-0.2,0.4-0.4,0.9-0.7,1.3
      c-0.2,0.2-0.3,0.3-0.4,0.6c-0.1,0.2,0,0.3-0.1,0.5c0,0.1-0.1,0.1-0.2,0c-0.2-0.4-0.4-0.8-0.5-1.2c-0.1-0.3-0.1-0.6-0.2-0.9
      s-0.3-0.6-0.6-0.8c-0.3-0.2-0.7-0.1-1-0.2c-0.3,0-0.7-0.1-0.9-0.3c-0.1-0.1-0.2-0.3-0.2-0.4c-0.2-0.8,0.3-1.7,1-2.1
      c0.1-0.1,0.2-0.1,0.3-0.2c0.2-0.2,0.3-0.4,0.2-0.7c0-0.1-0.1-0.1-0.1-0.1c-0.2,0.1-0.4,0.1-0.5,0.2c-0.1,0-0.2,0-0.2-0.1
      c0-0.3,0-0.6,0.1-0.9c0.1-0.3,0.2-0.7,0-1c0-0.1-0.1-0.1-0.2-0.1c-0.3,0-0.6,0-0.9,0c0,0,0,0,0,0c0.2-0.1,0.3-0.2,0.4-0.3
      C-300.9,12.5-300.8,12.5-300.8,12.5z M-301.6,11.4c-4.5-0.4-8.3,3.4-7.9,7.9c0.3,3.6,3.2,6.4,6.7,6.7c4.5,0.4,8.3-3.4,7.9-7.9
      C-295.2,14.6-298,11.7-301.6,11.4z"
            />
          </defs>
          <clipPath id="SVGID_10_">
            <use xlinkHref="#SVGID_9_" style={{ overflow: "visible" }} />
          </clipPath>
          <g className={cs.st5}>
            <defs>
              <rect
                id="SVGID_11_"
                x="-518.7"
                y="-790.7"
                width={1478}
                height={1395}
              />
            </defs>
            <clipPath id="SVGID_12_">
              <use xlinkHref="#SVGID_11_" style={{ overflow: "visible" }} />
            </clipPath>
          </g>
        </g>
        <g>
          <defs>
            <path
              id="SVGID_13_"
              d="M-807.8,27.7c-0.4,0-0.7,0.3-0.7,0.6c0,0.2,0.1,0.4,0.4,0.6v0.9c0,0.2,0.2,0.3,0.4,0.3s0.4-0.1,0.4-0.3
      v-0.9c0.2-0.1,0.4-0.3,0.4-0.6C-807.1,28-807.4,27.7-807.8,27.7z"
            />
          </defs>
          <clipPath id="SVGID_14_">
            <use xlinkHref="#SVGID_13_" style={{ overflow: "visible" }} />
          </clipPath>
          <g className={cs.st7}>
            <defs>
              <rect
                id="SVGID_15_"
                x="-1026.7"
                y="-650.8"
                width={1478}
                height={1395}
              />
            </defs>
            <clipPath id="SVGID_16_">
              <use xlinkHref="#SVGID_15_" style={{ overflow: "visible" }} />
            </clipPath>
          </g>
        </g>
        <g>
          <path
            className={cs.st10}
            d="M29,23.8c-1,0-1.8,0.8-1.8,1.8v0.9h3.5v-0.9C30.8,24.6,30,23.8,29,23.8z"
          />
          <path
            className={cs.st10}
            d="M29,27.9c-0.4,0-0.6,0.3-0.6,0.6c0,0.2,0.1,0.4,0.3,0.6V30c0,0.2,0.1,0.3,0.3,0.3c0.2,0,0.3-0.1,0.3-0.3v-0.9
      c0.2-0.1,0.3-0.3,0.3-0.6C29.7,28.2,29.4,27.9,29,27.9z"
          />
          <path
            className={cs.st10}
            d="M29,20.3c-4.1,0-7.5,3.4-7.5,7.5s3.4,7.5,7.5,7.5s7.5-3.4,7.5-7.5S33.2,20.3,29,20.3z M32.5,30.8
      c0,0.5-0.4,0.9-0.9,0.9h-5.2c-0.5,0-0.9-0.4-0.9-0.9v-3.5c0-0.5,0.4-0.9,0.9-0.9v-0.9c0-1.4,1.2-2.6,2.6-2.6c1.4,0,2.6,1.2,2.6,2.6
      v0.9c0.5,0,0.9,0.4,0.9,0.9V30.8z"
          />
        </g>
        <path
          className={cs.st0}
          d="M21.6,28.8h-2.7v-4.3h3.4c0.5-1,1.3-1.9,2.2-2.6v-2.9h4.3v1.4c0.1,0,0.2,0,0.3,0c0.5,0,1.1,0.1,1.6,0.2V6.3
      c0-0.5-0.4-0.9-0.9-0.9l-23.3,0c0,0-0.1,0-0.1,0h0c-0.5,0-0.8,0.4-0.8,0.9v23.3c0,0.5,0.4,0.9,0.9,0.9h15.7
      C21.8,30,21.7,29.4,21.6,28.8z M24.5,7.2h4.3v4.3h-4.3V7.2z M24.5,13.4h4.3v3.7h-4.3V13.4z M18.9,7.2h3.7v4.3h-3.7V7.2z M18.9,13.4
      h3.7v3.7h-3.7V13.4z M18.9,18.9h3.7v3.7h-3.7V18.9z M11.5,28.8H7.2v-4.3h4.3V28.8z M11.5,22.6H7.2v-3.7h4.3V22.6z M11.5,17.1H7.2
      v-3.7h4.3V17.1z M11.5,11.5H7.2V7.2h4.3V11.5z M17.1,28.8h-3.7v-4.3h3.7V28.8z M17.1,22.6h-3.7v-3.7h3.7V22.6z M17.1,17.1h-3.7v-3.7
      h3.7V17.1z M17.1,11.5h-3.7V7.2h3.7V11.5z"
        />
      </svg>
    );

    return (
      <svg
        className={this.props.className}
        version="1.1"
        id="Layer_1"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        x="0px"
        y="0px"
        viewBox="0 0 38 38"
        style={{ enableBackground: "new 0 0 38 38" }}
        xmlSpace="preserve"
      >
        <g>
          <defs>
            <path
              id="SVGID_1_"
              d="M-281.4-3.1c0.2-0.2,0.5-0.4,0.8-0.4h3.6c0.3,0,0.6,0.1,0.8,0.4l1,1.2c0.6,0.8,1.6,1.2,2.5,1.2h12.6
            c0.3,0,0.6,0.1,0.8,0.3c0.2,0.2,0.3,0.5,0.3,0.8l-0.1,0.6h-22.4l-0.4-3.3C-281.7-2.6-281.6-2.9-281.4-3.1z M-258.4,17.1
            c-0.1,0.8-0.7,1.3-1.5,1.3h-20.8c-0.8,0-1.4-0.6-1.5-1.3l-1.2-12.7c0-0.3,0.1-0.6,0.3-0.8c0.2-0.2,0.5-0.4,0.8-0.4h23.9
            c0.3,0,0.6,0.1,0.8,0.4c0.2,0.2,0.3,0.5,0.3,0.8L-258.4,17.1z M-285.5,4.6l1.1,12.7c0.2,1.9,1.8,3.3,3.7,3.3h20.8
            c1.9,0,3.5-1.4,3.7-3.3l1.1-12.7c0.1-0.9-0.2-1.9-0.8-2.5c-0.2-0.3-0.5-0.5-0.8-0.7l0.1-0.7c0.1-0.9-0.2-1.8-0.8-2.5
            c-0.6-0.7-1.5-1.1-2.4-1.1h-12.6c-0.3,0-0.6-0.1-0.8-0.4l-1-1.2c-0.6-0.7-1.6-1.2-2.5-1.2h-3.6c-0.9,0-1.8,0.4-2.5,1.1
            c-0.6,0.7-0.9,1.6-0.8,2.6l0.4,3.3c-0.4,0.2-0.9,0.5-1.2,0.8C-285.3,2.8-285.6,3.7-285.5,4.6z"
            />
          </defs>
          <use
            xlinkHref="#SVGID_1_"
            style={{ overflow: "visible", fill: "#A300DF" }}
          />
          <clipPath id="SVGID_2_">
            <use xlinkHref="#SVGID_1_" style={{ overflow: "visible" }} />
          </clipPath>
          <g className={cs.st1}>
            <defs>
              <rect
                id="SVGID_3_"
                x="-476.7"
                y="-790.7"
                width={1478}
                height={1395}
              />
            </defs>
            <use
              xlinkHref="#SVGID_3_"
              style={{ overflow: "visible", fill: "#A300DF" }}
            />
            <clipPath id="SVGID_4_">
              <use xlinkHref="#SVGID_3_" style={{ overflow: "visible" }} />
            </clipPath>
          </g>
        </g>
        <g>
          <defs>
            <circle id="SVGID_5_" cx="-260.2" cy="18.8" r="7.5" />
          </defs>
          <clipPath id="SVGID_6_">
            <use xlinkHref="#SVGID_5_" style={{ overflow: "visible" }} />
          </clipPath>
          <g className={cs.st3}>
            <defs>
              <rect
                id="SVGID_7_"
                x="-476.7"
                y="-790.7"
                width={1478}
                height={1395}
              />
            </defs>
            <clipPath id="SVGID_8_">
              <use xlinkHref="#SVGID_7_" style={{ overflow: "visible" }} />
            </clipPath>
          </g>
        </g>
        <g>
          <defs>
            <path
              id="SVGID_9_"
              d="M-261.9,12.6c0.1,0,0.1,0,0.2,0.1c0.1,0.2,0.2,0.3,0.2,0.5c0.2,0.4,0.2,0.8,0.1,1.2
            c-0.2,0.4-0.7,0.6-1.1,0.8c-0.8,0.4-1.6,1.1-2.1,1.9c0,0-0.1,0.1-0.1,0.1c-0.1,0-0.1,0-0.2-0.1c-0.1-0.1-0.2-0.1-0.2-0.2
            c0,0-0.1,0-0.1,0.1c-0.1,0.4,0.1,0.9,0.5,1.1c0.1,0,0.1,0.1,0.2,0.1c0.1,0.2,0,0.4,0,0.6c0,0.2,0.3,0.4,0.6,0.4s0.5-0.2,0.8-0.2
            c0.6-0.2,1.2-0.1,1.7,0.2c0.2,0.2,0.5,0.4,0.7,0.6c0.2,0.2,0.5,0.3,0.8,0.2c0.1,0,0.1,0,0.2,0.1c0.1,0.2,0,0.6-0.2,0.8
            c-0.2,0.2-0.5,0.4-0.7,0.7c-0.5,0.6-0.7,1.5-1.1,2.2c-0.1,0.1-0.2,0.2-0.2,0.4c-0.1,0.2-0.1,0.4-0.1,0.7c0,0,0,0.1-0.1,0.1
            c-0.1,0-0.2-0.1-0.3-0.1c-0.1,0-0.1-0.1-0.1-0.2c-0.2-0.9-0.5-1.8-0.9-2.6c-0.2-0.3-0.4-0.7-0.7-0.8c-0.1-0.1-0.2-0.1-0.2-0.2
            c0-0.1,0-0.2,0-0.2c0.1-0.8-0.3-1.7-1-2.2c-0.1-0.1-0.2-0.2-0.3-0.3s-0.1-0.3-0.1-0.4s-0.3-0.3-0.4-0.4c-0.1,0-0.1-0.1-0.1-0.2
            C-265.9,15-264.1,13.2-261.9,12.6z M-258.8,12.5c0.3,0.1,0.6,0.2,0.8,0.2c0.2,0.1,0.3,0.2,0.5,0.2c0.8,0.4,1.5,0.9,2.1,1.6
            c0,0,0.1,0.1,0.1,0.2c0,0.1,0,0.3,0,0.4c0,0.1-0.1,0.2-0.1,0.2c0,0.2,0.2,0.3,0.3,0.3c0.1,0,0.2,0,0.4,0c0.1,0,0.2,0.1,0.2,0.2
            c0.1,0.2,0.2,0.4,0.2,0.5c0.3,0.7,0.4,1.4,0.5,2.2c0,0.1,0,0.2-0.1,0.3c-0.1,0.1-0.2,0.3-0.3,0.5c-0.2,0.4-0.4,0.9-0.7,1.3
            c-0.2,0.2-0.3,0.3-0.4,0.6c-0.1,0.2,0,0.3-0.1,0.5c0,0.1-0.1,0.1-0.2,0c-0.2-0.4-0.4-0.8-0.5-1.2c-0.1-0.3-0.1-0.6-0.2-0.9
            s-0.3-0.6-0.6-0.8c-0.3-0.2-0.7-0.1-1-0.2c-0.3,0-0.7-0.1-0.9-0.3c-0.1-0.1-0.2-0.3-0.2-0.4c-0.2-0.8,0.3-1.7,1-2.1
            c0.1-0.1,0.2-0.1,0.3-0.2c0.2-0.2,0.3-0.4,0.2-0.7c0-0.1-0.1-0.1-0.1-0.1c-0.2,0.1-0.4,0.1-0.5,0.2c-0.1,0-0.2,0-0.2-0.1
            c0-0.3,0-0.6,0.1-0.9c0.1-0.3,0.2-0.7,0-1c0-0.1-0.1-0.1-0.2-0.1c-0.3,0-0.6,0-0.9,0c0,0,0,0,0,0c0.2-0.1,0.3-0.2,0.4-0.3
            C-258.9,12.5-258.8,12.5-258.8,12.5z M-259.6,11.4c-4.5-0.4-8.3,3.4-7.9,7.9c0.3,3.6,3.2,6.4,6.7,6.7c4.5,0.4,8.3-3.4,7.9-7.9
            C-253.2,14.6-256,11.7-259.6,11.4z"
            />
          </defs>
          <clipPath id="SVGID_10_">
            <use xlinkHref="#SVGID_9_" style={{ overflow: "visible" }} />
          </clipPath>
          <g className={cs.st5}>
            <defs>
              <rect
                id="SVGID_11_"
                x="-476.7"
                y="-790.7"
                width={1478}
                height={1395}
              />
            </defs>
            <clipPath id="SVGID_12_">
              <use xlinkHref="#SVGID_11_" style={{ overflow: "visible" }} />
            </clipPath>
          </g>
        </g>
        <g>
          <defs>
            <path
              id="SVGID_13_"
              d="M-765.8,27.7c-0.4,0-0.7,0.3-0.7,0.6c0,0.2,0.1,0.4,0.4,0.6v0.9c0,0.2,0.2,0.3,0.4,0.3s0.4-0.1,0.4-0.3
            v-0.9c0.2-0.1,0.4-0.3,0.4-0.6C-765.1,28-765.4,27.7-765.8,27.7z"
            />
          </defs>
          <clipPath id="SVGID_14_">
            <use xlinkHref="#SVGID_13_" style={{ overflow: "visible" }} />
          </clipPath>
          <g className={cs.st7}>
            <defs>
              <rect
                id="SVGID_15_"
                x="-984.7"
                y="-650.8"
                width={1478}
                height={1395}
              />
            </defs>
            <clipPath id="SVGID_16_">
              <use xlinkHref="#SVGID_15_" style={{ overflow: "visible" }} />
            </clipPath>
          </g>
        </g>
        <path
          className={cs.st10}
          d="M29.7,20.7c-4.6-0.4-8.5,3.5-8.1,8.1c0.3,3.6,3.2,6.6,6.9,6.9c4.6,0.4,8.5-3.5,8.1-8.1
        C36.3,23.9,33.4,20.9,29.7,20.7z M30.6,21.7c0.3,0.1,0.6,0.2,0.9,0.3c0.2,0.1,0.3,0.2,0.5,0.2c0.8,0.4,1.5,0.9,2.1,1.6
        c0,0,0.1,0.1,0.1,0.2c0,0.1,0,0.3,0,0.4c0,0.1-0.1,0.2-0.1,0.3c0,0.2,0.2,0.3,0.3,0.3c0.1,0,0.3,0,0.4,0c0.1,0,0.2,0.1,0.2,0.2
        c0.1,0.2,0.2,0.4,0.2,0.5c0.3,0.7,0.4,1.4,0.5,2.2c0,0.1,0,0.2-0.1,0.3c-0.1,0.1-0.3,0.3-0.4,0.5c-0.2,0.4-0.4,1-0.7,1.3
        c-0.2,0.2-0.4,0.4-0.4,0.6c-0.1,0.2,0,0.4-0.1,0.5c0,0.1-0.1,0.1-0.2,0c-0.3-0.4-0.4-0.8-0.5-1.2c-0.1-0.3-0.1-0.6-0.2-1
        c-0.1-0.3-0.3-0.6-0.6-0.8c-0.3-0.2-0.7-0.1-1-0.2c-0.4,0-0.7-0.1-1-0.4c-0.1-0.1-0.2-0.3-0.2-0.4c-0.2-0.8,0.3-1.7,1-2.1
        c0.1-0.1,0.2-0.1,0.3-0.2c0.2-0.2,0.3-0.4,0.2-0.7c0-0.1-0.1-0.1-0.1-0.1c-0.2,0.1-0.4,0.1-0.5,0.2c-0.1,0-0.2,0-0.2-0.1
        c0-0.3,0-0.6,0.1-1c0.1-0.4,0.2-0.7,0-1c0-0.1-0.1-0.1-0.2-0.1c-0.3,0-0.6,0-0.9,0c0,0,0,0,0,0c0.2-0.1,0.3-0.2,0.4-0.4
        C30.5,21.8,30.6,21.7,30.6,21.7z M27.4,21.8c0.1,0,0.1,0,0.2,0.1c0.1,0.2,0.2,0.3,0.3,0.5c0.2,0.4,0.3,0.9,0.1,1.2
        c-0.2,0.4-0.7,0.6-1.1,0.9c-0.9,0.4-1.6,1.1-2.1,1.9c0,0-0.1,0.1-0.1,0.1c-0.1,0-0.1,0-0.2-0.1c-0.1-0.1-0.2-0.1-0.3-0.2
        c0,0-0.1,0-0.1,0.1c-0.1,0.4,0.1,0.9,0.5,1.1c0.1,0,0.1,0.1,0.2,0.1c0.1,0.2,0,0.4,0,0.6c0,0.3,0.4,0.4,0.6,0.4
        c0.3,0,0.5-0.2,0.8-0.3c0.6-0.2,1.2-0.1,1.7,0.2c0.3,0.2,0.5,0.4,0.7,0.6c0.2,0.2,0.5,0.3,0.8,0.3c0.1,0,0.1,0,0.2,0.1
        c0.1,0.3,0,0.6-0.2,0.8c-0.2,0.3-0.5,0.4-0.7,0.7c-0.5,0.6-0.7,1.5-1.1,2.2c-0.1,0.1-0.2,0.3-0.3,0.4c-0.1,0.2-0.1,0.4-0.1,0.7
        c0,0,0,0.1-0.1,0.1c-0.1,0-0.2-0.1-0.3-0.1c-0.1,0-0.1-0.1-0.1-0.2c-0.2-0.9-0.5-1.8-0.9-2.7c-0.2-0.3-0.4-0.7-0.7-0.9
        c-0.1-0.1-0.2-0.1-0.2-0.2c0-0.1,0-0.2,0-0.2c0.1-0.9-0.3-1.8-1-2.3c-0.1-0.1-0.3-0.2-0.3-0.3s-0.1-0.3-0.1-0.4
        c-0.1-0.1-0.3-0.3-0.4-0.4c-0.1,0-0.1-0.1-0.1-0.2C23.4,24.3,25.1,22.4,27.4,21.8z"
        />
        <path
          className={cs.st0}
          d="M21.7,28.8h-2.8v-4.3h3.7c0.5-0.9,1.1-1.6,1.9-2.2v-3.4h4.3v1.7c0.1,0,0.2,0,0.4,0c0.5,0,1,0.1,1.4,0.1V6.3
        c0-0.5-0.4-0.9-0.9-0.9l-23.3,0c0,0-0.1,0-0.1,0h0c-0.5,0-0.8,0.4-0.8,0.9v23.3c0,0.5,0.4,0.9,0.9,0.9H22
        C21.8,30,21.7,29.4,21.7,28.8z M24.5,7.2h4.3v4.3h-4.3V7.2z M24.5,13.4h4.3v3.7h-4.3V13.4z M18.9,7.2h3.7v4.3h-3.7V7.2z M18.9,13.4
        h3.7v3.7h-3.7V13.4z M18.9,18.9h3.7v3.7h-3.7V18.9z M11.5,28.8H7.2v-4.3h4.3V28.8z M11.5,22.6H7.2v-3.7h4.3V22.6z M11.5,17.1H7.2
        v-3.7h4.3V17.1z M11.5,11.5H7.2V7.2h4.3V11.5z M17.1,28.8h-3.7v-4.3h3.7V28.8z M17.1,22.6h-3.7v-3.7h3.7V22.6z M17.1,17.1h-3.7v-3.7
        h3.7V17.1z M17.1,11.5h-3.7V7.2h3.7V11.5z"
        />
      </svg>
    );
  }
}
