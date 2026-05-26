import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { parseSizeToMB } from "../utils/buildTimeEstimator";

interface SystemCleanupChartProps {
  orphansSize: string;
  systemCacheSize: string;
  aurCacheSize: string;
}

export default function SystemCleanupChart({ orphansSize, systemCacheSize, aurCacheSize }: SystemCleanupChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Parse values to MB
    const oSize = parseSizeToMB(orphansSize || "0 B");
    const sSize = parseSizeToMB(systemCacheSize || "0 B");
    const aSize = parseSizeToMB(aurCacheSize || "0 B");

    const data = [
      { label: "Orphans", value: oSize, color: "#f43f5e" }, // rose-500
      { label: "Pacman Cache", value: sSize, color: "#6366f1" }, // indigo-500
      { label: "AUR Build Dirs", value: aSize, color: "#06b6d4" }, // cyan-500
    ].filter((d) => d.value > 0);

    // Filtered out if everything is zero
    if (data.length === 0) {
      data.push({ label: "Empty", value: 1, color: "#334155" }); // slate-700
    }

    const width = 200;
    const height = 200;
    const radius = Math.min(width, height) / 2;

    const arc = d3.arc<any>().innerRadius(radius * 0.55).outerRadius(radius * 0.9);
    const hoverArc = d3.arc<any>().innerRadius(radius * 0.55).outerRadius(radius);

    const pie = d3.pie<any>().value((d) => d.value).sort(null);
    const color = d3.scaleOrdinal<string, string>().domain(data.map((d) => d.label)).range(data.map((d) => d.color));

    let svg = d3.select(chartRef.current).select<SVGSVGElement>("svg");
    let chartGroup = svg.select<SVGGElement>("g.chart-group");
    let tooltip = d3.select(chartRef.current).select<HTMLDivElement>("div.tooltip");

    if (svg.empty()) {
      svg = d3.select(chartRef.current)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

      chartGroup = svg.append("g")
        .attr("class", "chart-group")
        .attr("transform", `translate(${width / 2},${height / 2})`);
        
      tooltip = d3.select(chartRef.current)
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0)
        .style("background", "rgba(0,0,0,0.8)")
        .style("border", "1px solid rgba(255,255,255,0.1)")
        .style("color", "white")
        .style("padding", "4px 8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("transform", "translate(-50%, -150%)")
        .style("z-index", "10");
    }

    const parsedData = pie(data);

    // Bind data
    const paths = chartGroup.selectAll<SVGPathElement, any>("path")
      .data(parsedData, (d: any) => d.data.label);

    // Remove old
    paths.exit()
      .transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .style("opacity", 0)
      .remove();

    // Add new
    const pathsEnter = paths.enter()
      .append("path")
      .attr("fill", (d) => color(d.data.label) as string)
      .attr("stroke", "#0b0e14")
      .attr("stroke-width", "2px")
      .each(function(d) {
         (this as any)._current = Object.assign({}, d, { startAngle: d.startAngle, endAngle: d.startAngle }); 
      });

    // Update enter + update
    pathsEnter.merge(paths)
      .on("mouseover", function(event, d) {
         d3.select(this).transition().duration(300).ease(d3.easeCubicOut).attr("d", hoverArc as any); 
         if (d.data.label !== "Empty") {
           tooltip.transition().duration(200).style("opacity", 1);
           tooltip
             .html(`<strong>${d.data.label}</strong><br/>${Math.round(d.data.value)} MB`)
             .style("left", (event.pageX) + "px")
             .style("top", (event.pageY) + "px");
         }
      })
      .on("mousemove", function(event) {
         tooltip
           .style("left", (event.offsetX + width / 2) + "px")
           .style("top", (event.offsetY + height / 2) + "px");
      })
      .on("mouseout", function() {
         d3.select(this).transition().duration(300).ease(d3.easeCubicInOut).attr("d", arc as any);
         tooltip.transition().duration(500).style("opacity", 0);
      })
      .transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .attrTween("d", function(d) {
        const interpolate = d3.interpolate((this as any)._current, d);
        (this as any)._current = interpolate(1);
        return function(t) {
          return arc(interpolate(t)) as string;
        };
      });

  }, [orphansSize, systemCacheSize, aurCacheSize]);

  return <div ref={chartRef} className="relative flex justify-center items-center" />;
}
