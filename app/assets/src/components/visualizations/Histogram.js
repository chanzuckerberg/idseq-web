import { histogram, extent, min, max, mean, deviation } from "d3-array";
import cx from "classnames";
import { axisBottom, axisLeft } from "d3-axis";
import { select, event as currentEvent, mouse } from "d3-selection";
import { scaleLinear, scaleLog } from "d3-scale";
import { map } from "lodash/fp";

import ArrayUtils from "~/components/utils/ArrayUtils";
import { CategoricalColormap } from "../utils/colormaps/CategoricalColormap";
import cs from "./histogram.scss";

export default class Histogram {
  constructor(container, data, options) {
    this.g = null;
    this.container = select(container);
    this.data = this.parseData(data);

    this.margins = options.margins || {
      top: 20,
      right: 40,
      bottom: 40,
      left: 40,
    };

    this.size = {
      width: container.clientWidth || 800,
      height: container.clientHeight || 400,
    };

    this.options = Object.assign(
      {
        colormap: "viridis",
        labelX: "",
        labelY: "",
        seriesNames: null,
        showStatistics: true,
        refValues: [],
        // If true, the data is already binned, i.e. the data is an array of
        // { x0, length }
        skipBin: false,
        hoverBuffer: 5,
        xScaleLog: false,
      },
      options
    );

    // The x-center of the last bar that was hovered over.
    // Since the histogram can take multiple data series, this is easier to store than [seriesIndex, dataIndex]
    this.lastHoveredBarX = null;

    // remove any previous charts
    this.container.selectAll("svg").remove();

    this.svg = this.container
      .append("svg")
      .attr("width", this.size.width)
      .attr("height", this.size.height);
    this.svg.remove;
  }

  parseData(data) {
    // basic parsing to support multiple series
    // does not support all bad inputs
    if (!Array.isArray(data)) return null;

    if (!Array.isArray(data[0])) return [data];

    return data;
  }

  xAxis(g, x) {
    g
      .attr(
        "transform",
        `translate(0,${this.size.height - this.margins.bottom})`
      )
      .call(axisBottom(x).tickSizeOuter(0));

    // if using log10 scale, set the number of ticks according to the size of
    // the domain (in powers of 10) to prevent extra labels from showing up
    if (this.options.xScaleLog) {
      let nTicks = Math.log10(x.domain()[1]) + 1;
      g.call(axisBottom(x).ticks(nTicks));
    }

    g
      .append("text")
      .attr("x", this.size.width - this.margins.right)
      .attr("y", +30)
      .attr("fill", "#000")
      .attr("font-weight", "bold")
      .attr("text-anchor", "end")
      .attr("class", cs.labelX)
      .text(this.options.labelX);

    g.select(".domain").attr("class", cs.xAxis);

    g.selectAll(".tick line").attr("class", cs.xAxisTickLine);

    g.selectAll(".tick text").attr("class", cs.xAxisTickText);
  }

  yAxis(g, y) {
    const axis = this.options.numTicksY
      ? axisLeft(y).ticks(this.options.numTicksY)
      : axisLeft(y);

    g.attr("transform", `translate(${this.margins.left},0)`).call(axis);

    g.select(".domain").remove();

    g.selectAll(".tick text").attr("class", cs.yAxisTickText);
    g.selectAll(".tick line").attr("class", cs.yAxisTickLine);

    g
      .select(".tick:last-of-type text")
      .clone()
      .attr("x", 4)
      .attr("y", -30 - (this.options.labelYOffset || 0))
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "end")
      .attr("font-weight", "bold")
      .attr("class", cx(cs.labelY, this.options.labelYLarge && cs.large))
      .text(this.options.labelY);
  }

  getDomain = () => {
    if (this.options.domain) {
      return this.options.domain;
    }

    let mins = [];
    let maxs = [];
    for (let i = 0; i < this.data.length; i++) {
      let series = this.data[i];
      let minMax = extent(series);
      mins.push(minMax[0]);
      maxs.push(minMax[1]);

      // make the chart is large enough to hold reference lines
      if (this.options.refValues && this.options.refValues.length) {
        let values = this.options.refValues.map(v => parseFloat(v.values[i]));
        mins.push(min(values));
        maxs.push(max(values));
      }
    }

    // cannot include 0 values in log scale's domain, since log(0) is -Infinity
    return this.options.xScaleLog ? [1, max(maxs)] : [min(mins), max(maxs)];
  };

  getBins = x => {
    if (this.options.skipBins) {
      return this.data;
    }

    let bins = [];
    for (let i = 0; i < this.data.length; i++) {
      bins[i] = histogram()
        .domain(x.domain())
        .thresholds(x.ticks(20))(this.data[i]);
    }
    return bins;
  };

  getBarWidth = () => {
    if (this.options.skipBins) {
      return (
        (this.size.width - this.margins.right - this.margins.left) /
        (this.options.numBins ||
          max(map(seriesData => seriesData.length, this.data)))
      );
    }

    return (
      (this.size.width - this.margins.right - this.margins.left) /
      (this.data.length * 20)
    );
  };

  getColors = () => {
    if (this.options.colors) {
      return this.options.colors;
    }

    return new CategoricalColormap().getNScale(this.data.length + 1);
  };

  getBarOpacity = () => {
    return this.options.barOpacity || 0.8;
  };

  // Find the bar x-center that is closest to svgX, within hoverBuffer.
  onMouseMove = () => {
    if (this.sortedBarCenters.length == 0) {
      return;
    }

    // svgX is an x coordinate relative to the svg container.
    // All the bar "endpoints" are within this same coordinate space.
    const svgX = mouse(this.svg.node())[0];
    const closestBarCenters = ArrayUtils.findClosestNeighbors(
      this.sortedBarCenters,
      svgX
    );

    let closestX = null;

    if (closestBarCenters.length === 1) {
      closestX = closestBarCenters[0];
    } else {
      closestX =
        Math.abs(closestBarCenters[0] - svgX) <
        Math.abs(closestBarCenters[1] - svgX)
          ? closestBarCenters[0]
          : closestBarCenters[1];
    }

    // Only return if we are at most hoverBuffer away from the closest bar.
    const buffer = this.getBarWidth() / 2 + this.options.hoverBuffer;

    const dataIndices =
      Math.abs(closestX - svgX) < buffer
        ? this.barCentersToIndices[closestX]
        : null;

    const lastDataIndices = this.lastHoveredBarX
      ? this.barCentersToIndices[this.lastHoveredBarX]
      : null;

    if (this.lastHoveredBarX !== closestX && dataIndices !== null) {
      if (this.options.onHistogramBarEnter) {
        this.options.onHistogramBarEnter(dataIndices);
      }
      this.highlightBar(dataIndices, true);
      this.highlightBar(lastDataIndices, false);
      this.lastHoveredBarX = closestX;
    } else if (dataIndices === null && this.lastHoveredBarX) {
      if (this.options.onHistogramBarExit) {
        this.options.onHistogramBarExit();
      }
      this.highlightBar(lastDataIndices, false);
      this.lastHoveredBarX = null;
    }

    if (dataIndices !== null && this.options.onHistogramBarHover) {
      // Coordinates with respect to the viewport.
      this.options.onHistogramBarHover(
        currentEvent.clientX,
        currentEvent.clientY
      );
    }
  };

  onMouseLeave = () => {
    if (this.options.onHistogramBarExit) {
      this.options.onHistogramBarExit();
    }

    const lastDataIndices = this.lastHoveredBarX
      ? this.barCentersToIndices[this.lastHoveredBarX]
      : null;
    this.highlightBar(lastDataIndices, false);
    this.lastHoveredBarX = null;
  };

  highlightBar = (dataIndices, shouldHighlight) => {
    if (!dataIndices || !this.options.hoverColors) {
      return;
    }

    const [seriesIndex, barIndex] = dataIndices;

    const highlightColor = shouldHighlight
      ? this.options.hoverColors[seriesIndex]
      : this.getColors()[seriesIndex];

    this.svg
      .select(`.bar-${seriesIndex} .rect-${barIndex}`)
      .attr("fill", highlightColor);
  };

  update() {
    if (!this.data) return;

    let colors = this.getColors();

    const domain = this.getDomain();

    let x = this.options.xScaleLog ? scaleLog().clamp(true) : scaleLinear();
    x
      .domain(domain)
      .nice()
      .range([this.margins.left, this.size.width - this.margins.right]);

    const bins = this.getBins(x);

    let y = scaleLinear()
      .domain([0, max(bins.map(seriesBins => max(seriesBins, d => d.length)))])
      .nice()
      .range([this.size.height - this.margins.bottom, this.margins.top]);

    this.svg.append("g").call(this.xAxis.bind(this), x);
    this.svg.append("g").call(this.yAxis.bind(this), y);

    let barWidth = this.getBarWidth();
    const barOpacity = this.getBarOpacity();

    // Maps from x-coordinate to the data plotted at that x-coordinate.
    // Used for hovering.
    const barCentersToIndices = {};
    const barCenters = [];

    for (let i = 0; i < bins.length; i++) {
      // if using log scale for x, the histogram bins should be variable width
      // so the x and width attributes need to be calculated differently
      // TODO(julie): is there a better way to consolidate this?
      this.options.xScaleLog
        ? this.svg
            .append("g")
            .attr("class", `bar-${i}`)
            .attr("fill", colors[i])
            .selectAll("rect")
            .data(bins[i])
            .enter()
            .append("rect")
            .attr("class", (_, index) => `rect-${index}`)
            .attr("x", d => x(d.x0) + i * ((x(d.x1) - x(d.x0)) / 2))
            .attr("width", d => (x(d.x1) - x(d.x0)) / 2)
            .attr("y", d => y(d.length))
            .attr("height", d => y(0) - y(d.length))
            .style("opacity", barOpacity)
        : this.svg
            .append("g")
            .attr("class", `bar-${i}`)
            .attr("fill", colors[i])
            .selectAll("rect")
            .data(bins[i])
            .enter()
            .append("rect")
            .attr("class", (_, index) => `rect-${index}`)
            .attr("x", d => x(d.x0) + i * barWidth)
            .attr("width", d => barWidth)
            .attr("y", d => y(d.length))
            .attr("height", d => y(0) - y(d.length))
            .style("opacity", barOpacity);

      bins[i].forEach((bin, index) => {
        const xMidpoint = x(bin.x0) + i * barWidth + barWidth / 2;
        barCentersToIndices[xMidpoint] = [i, index];
        barCenters.push(xMidpoint);
      });

      if (this.options.showStatistics) {
        let avg = mean(this.data[i]);
        let dev = deviation(this.data[i]);

        let stats = this.svg.append("g");

        stats
          .append("line")
          .attr("stroke", colors[i])
          .attr("x1", x(avg))
          .attr("x2", x(avg))
          .attr("y1", this.margins.top)
          .attr("y2", this.size.height - this.margins.bottom);

        let rect0 = max([x(avg - dev), this.margins.left]);
        let rect1 = min([x(avg + dev), this.size.width - this.margins.right]);
        let rectWidth = rect1 - rect0;

        stats
          .append("rect")
          .attr("fill", colors[i])
          .attr("fill-opacity", 0.2)
          .attr("x", rect0)
          .attr("width", rectWidth)
          .attr("y", this.margins.top)
          .attr(
            "height",
            this.size.height - this.margins.top - this.margins.bottom
          )
          .lower();
      }

      if (this.options.refValues && this.options.refValues.length) {
        let refs = this.svg.append("g").attr("class", "refs");

        for (let ref of this.options.refValues) {
          refs
            .append("line")
            .attr("stroke", colors[i])
            .style("stroke-dasharray", "4, 4")
            .attr("x1", x(ref.values[i]))
            .attr("x2", x(ref.values[i]))
            .attr("y1", this.margins.top)
            .attr("y2", this.size.height - this.margins.bottom);
          refs
            .append("text")
            .attr("x", -this.margins.top)
            .attr("y", x(ref.values[i]) - 4)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "end")
            .attr("font-weight", "bold")
            .attr("font-size", 10)
            .style("fill", colors[i])
            .text(ref.name);
        }
      }
    }

    this.barCentersToIndices = barCentersToIndices;
    this.sortedBarCenters = barCenters.sort((a, b) => a - b);

    this.svg
      .append("rect")
      .attr("class", cs.hoverRect)
      .attr("transform", `translate(${this.margins.left}, ${this.margins.top})`)
      .attr("width", this.size.width - this.margins.right - this.margins.left)
      .attr("height", this.size.height - this.margins.top - this.margins.bottom)
      .on("mousemove", this.onMouseMove)
      .on("mouseleave", this.onMouseLeave);

    if (this.options.seriesNames) {
      let legend = this.svg
        .append("g")
        .attr("class", "histogram__legend")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .attr("text-anchor", "end")
        .selectAll("g")
        .data(this.options.seriesNames)
        .enter()
        .append("g")
        .attr("transform", (_, i) => `translate(-20,${(i + 1) * 20})`);

      legend
        .append("rect")
        .attr("x", this.size.width - 5)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", (_, i) => colors[i]);

      legend
        .append("text")
        .attr("x", this.size.width - 10)
        .attr("y", this.margins.top)
        .attr("dy", -9)
        .attr("alignment-baseline", "middle")
        .text(d => d);
    }
  }
}
