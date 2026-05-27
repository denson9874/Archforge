import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

interface DependencyNode extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  radius: number;
}

interface DependencyLink extends d3.SimulationLinkDatum<DependencyNode> {
  source: string | DependencyNode;
  target: string | DependencyNode;
  value: number;
}

interface DependencyGraphProps {
  pkgName: string;
  deps: string[];
  makeDeps: string[];
}

export default function DependencyGraph({ pkgName, deps, makeDeps }: DependencyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Transform deps into transitive nodes
  const graphData = useMemo(() => {
    const nodes: DependencyNode[] = [
      { id: pkgName, group: 1, radius: 24 }
    ];
    const links: DependencyLink[] = [];
    
    // Add direct deps
    deps.forEach(d => {
      nodes.push({ id: d, group: 2, radius: 16 });
      links.push({ source: pkgName, target: d, value: 2 });
      
      // Add fake transitive deps purely for visualization
      const transitiveCount = Math.floor(Math.random() * 3) + 1;
      for(let i = 0; i < transitiveCount; i++) {
        const transId = `${d}-lib${i}`;
        nodes.push({ id: transId, group: 3, radius: 10 });
        links.push({ source: d, target: transId, value: 1 });
      }
    });

    makeDeps.forEach(d => {
      nodes.push({ id: d, group: 4, radius: 14 });
      links.push({ source: pkgName, target: d, value: 1 });
    });

    return { nodes, links };
  }, [pkgName, deps, makeDeps]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = 300;
    
    // Clear previous
    d3.select(containerRef.current).selectAll("*").remove();

    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    // Graph colors
    const color = d3.scaleOrdinal<number, string>()
      .domain([1, 2, 3, 4])
      .range(["#22d3ee", "#818cf8", "#94a3b8", "#f472b6"]); // cyan, indigo, slate, pink

    // Copy data because D3 modifies it directly
    const nodes = graphData.nodes.map(d => Object.create(d));
    const links = graphData.links.map(d => Object.create(d));

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.radius + 4));

    const link = svg.append("g")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.3)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d: any) => Math.sqrt(d.value));

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(drag(simulation) as any);

    node.append("circle")
      .attr("r", (d: any) => d.radius)
      .attr("fill", (d: any) => color(d.group))
      .attr("stroke", "#0b0e14")
      .attr("stroke-width", 2);

    node.append("text")
      .text((d: any) => d.id)
      .attr("x", 0)
      .attr("y", (d: any) => d.radius + 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#cbd5e1")
      .attr("font-size", (d: any) => d.group === 1 ? "12px" : "10px")
      .attr("font-family", "monospace");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
    
    return () => {
      simulation.stop();
    };
  }, [graphData]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/5 bg-black/20 relative" ref={containerRef}>
      <div className="absolute top-2 left-2 flex gap-3 text-[9px] font-mono uppercase bg-black/40 px-2 py-1 rounded">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22d3ee]"></span> Target</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#818cf8]"></span> Dependency</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f472b6]"></span> Make Deps</span>
      </div>
    </div>
  );
}
