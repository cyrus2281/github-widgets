import * as d3 from "d3";
import fs from "fs";
import { JSDOM } from "jsdom";

/**
 * generateExperienceTimeline
 *
 * CSV header must be: company,start,end,title,logo,color
 * - start and end accept YYYY or YYYY-MM or YYYY-MM-DD
 * - empty end means present
 *
 * Options:
 * - width (default 1200)
 * - heightPerLane (default 80)
 * - margin (default { top: 100, right: 120, bottom: 30, left: 30 })
 * - embedLogos (default true)
 * - includeStartDate (default true)
 * - includeEndDate (default true)
 * - animationTotalDuration (default 5) total animation time in seconds
 * - baseFontSize (default 12) base font size in pixels for relative scaling
 *
 * Returns: Promise<string> SVG markup
 */
async function generateExperienceTimeline(csvString, opts = {}) {
  const {
    width = 1200,
    heightPerLane = 80,
    margin = { top: 100, right: 30, bottom: 30, left: 30 },
    embedLogos = true,
    includeStartDate = true,
    includeEndDate = true,
    animationTotalDuration = 5,
    baseFontSize = 12
  } = opts;

  const THEME = {
    bg: "#141321",
    title: "#fe428e",
    icon: "#f8d847",
    text: "#a9fef7",
    accent: "#fe428e",
    axis: "#2b2436",
  };

  // lightweight DOM for d3
  const dom = new JSDOM("<!DOCTYPE html><svg xmlns='http://www.w3.org/2000/svg'><!-- Created By GitHub Widgets - Authored by cyrus2281 --><!-- Github: https://github.com/cyrus2281/github-widgets --></svg>");
  const document = dom.window.document;
  const svgEl = document.querySelector("svg");

  // parse CSV rows using d3 helper
  const rows = d3.csvParse(csvString.trim());

  function parseYMD(s) {
    if (!s) return null;
    const parts = s.split("-");
    const y = parseInt(parts[0], 10);
    const m = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
    const d = parts[2] ? parseInt(parts[2], 10) : 1;
    return new Date(Date.UTC(y, m, d));
  }

  const now = new Date();

  const items = rows.map((r, i) => {
    const startRaw = (r.start || "").trim();
    const endRaw = (r.end || "").trim();
    const start = parseYMD(startRaw);
    if (!start || Number.isNaN(start.getTime())) {
      throw new Error(`Invalid start date in row ${i + 1}: "${r.start}"`);
    }
    const end = endRaw ? parseYMD(endRaw) : null;
    return {
      id: i,
      company: (r.company || "").trim(),
      title: (r.title || "").trim(),
      logo: (r.logo || "").trim(),
      colorRaw: (r.color || "").trim(),
      start,
      end,
      startRaw,
      endRaw,
    };
  });

  // time scale auto
  const minTime = d3.min(items, (d) => d.start);
  const maxTime = d3.max(items, (d) => (d.end ? d.end : now));
  const xScale = d3.scaleTime().domain([minTime, maxTime]).range([margin.left, width - margin.right]);

  // sort and lane allocation (greedy)
  items.sort((a, b) => {
    if (a.start.getTime() !== b.start.getTime()) return a.start - b.start;
    const aEnd = (a.end || now).getTime();
    const bEnd = (b.end || now).getTime();
    return bEnd - aEnd;
  });

  const laneLastEnd = [];
  for (const it of items) {
    const s = it.start.getTime();
    const e = (it.end || now).getTime();
    let assigned = -1;
    for (let li = 0; li < laneLastEnd.length; li++) {
      if (laneLastEnd[li] <= s) {
        assigned = li;
        laneLastEnd[li] = e;
        break;
      }
    }
    if (assigned === -1) {
      laneLastEnd.push(e);
      assigned = laneLastEnd.length - 1;
    }
    it.lane = assigned;
  }

  const laneCount = Math.max(1, d3.max(items, (d) => d.lane) + 1);
  const contentHeight = (Math.ceil(laneCount / 2) * heightPerLane) * 2;
  const height = margin.top + margin.bottom + contentHeight;

  svgEl.setAttribute("width", width);
  svgEl.setAttribute("height", height);
  svgEl.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const svg = d3.select(svgEl);

  // background
  svg.append("rect").attr("x", 0).attr("y", 0).attr("width", width).attr("height", height).attr("fill", THEME.bg);

  const baselineDuration = animationTotalDuration * 0.15;
  const datesDuration = animationTotalDuration * 0.1;
  const jobsDuration = animationTotalDuration * 0.75;

  const datesDelay = baselineDuration;
  const jobsStartTime = datesDelay + datesDuration;
  const durationPerJob = jobsDuration / Math.max(1, items.length);
  const jobPartAnimDuration = durationPerJob * 0.5;

  const style = `
    :root {
      --baseline-duration: ${baselineDuration}s;
      --dates-duration: ${datesDuration}s;
      --dates-delay: ${datesDelay}s;
    }
    .timeline-baseline {
      stroke-dasharray: ${width};
      stroke-dashoffset: ${width};
      animation: draw-line var(--baseline-duration) ease-out forwards, fade-in-baseline var(--baseline-duration) ease-out forwards;
      stroke-opacity: 0;
    }
    .date-label, .job-group > text, .job-group > image, .job-group > circle {
      opacity: 0;
    }
    .date-label {
      animation: fade-in-element var(--dates-duration) var(--dates-delay) ease-out forwards;
    }
    .job-group > text, .job-group > image, .job-group > circle {
      animation: fade-in-element ${jobPartAnimDuration}s ease-out forwards;
      animation-delay: inherit;
    }
    .job-bar {
      width: 0;
      animation:
        trigger-width-growth ${jobPartAnimDuration}s forwards;
      fill-opacity: 0.14;
      stroke-opacity: 0.45;
      animation-delay: inherit;
    }
    .job-connector {
      stroke-dasharray: 200;
      stroke-dashoffset: 200;
      animation: draw-line ${jobPartAnimDuration}s ease-out forwards;
      animation-delay: inherit;
      stroke-opacity: 0.95;
    }
    .job-connector-in {
      stroke-dasharray: 200;
      stroke-dashoffset: 200;
      animation: draw-line ${jobPartAnimDuration}s ease-out forwards;
      animation-delay: inherit;
      stroke-opacity: 0.95;
    }
    @keyframes draw-line {
      to { stroke-dashoffset: 0; }
    }
    @keyframes fade-in-element {
      to { opacity: 1; }
    }
    @keyframes fade-in-baseline {
      to { stroke-opacity: 0.95; }
    }
    @keyframes trigger-width-growth {
      to { width: var(--final-width); }
    }
  `;
  svg.append("style").text(style);

  // title
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", Math.round(baseFontSize * 2.33 * 10) / 10)
    .attr("fill", THEME.title)
    .attr("font-weight", "700")
    .text("Experience Timeline");

  // baseline Y
  const baselineY = margin.top + contentHeight / 2;

  // draw baseline
  svg
    .append("line")
    .attr("class", "timeline-baseline")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", baselineY)
    .attr("y2", baselineY)
    .attr("stroke", THEME.icon)
    .attr("stroke-width", 2);

  // helper: lane index to Y coordinate
  function laneToY(lane) {
    if (lane === 0) return baselineY;
    const pairIndex = Math.ceil(lane / 2);
    const isUp = lane % 2 === 1;
    const offset = pairIndex * heightPerLane;
    return isUp ? baselineY - offset : baselineY + offset;
  }

  // color normalization
  function normalizeColor(c) {
    if (!c) return THEME.accent;
    return c;
  }
  for (const it of items) it.color = normalizeColor(it.colorRaw);

  // fetch/convert logo to data URI (support local and remote)
  async function logoToDataURI(url) {
    if (!url) return null;
    // local file path
    if (/^(?:\.{0,2}\/|[a-zA-Z]:\\|file:\/\/)/.test(url)) {
      try {
        let path = url;
        if (url.startsWith("file://")) path = url.replace("file://", "");
        const buf = await fs.promises.readFile(path);
        const ext = path.split(".").pop().toLowerCase();
        const mime = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/svg+xml";
        return `data:${mime};base64,${buf.toString("base64")}`;
      } catch (e) {
        return null;
      }
    } else {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        const buf = Buffer.from(arr);
        const ct = res.headers.get("content-type") || "image/png";
        return `data:${ct};base64,${buf.toString("base64")}`;
      } catch (e) {
        return null;
      }
    }
  }

  if (embedLogos) {
    await Promise.all(items.map(async (it) => (it.logoData = it.logo ? await logoToDataURI(it.logo) : null)));
  } else {
    items.forEach((it) => (it.logoData = null));
  }

  // nodes and label blocks
  const jobsGroup = svg.append("g").attr("class", "jobs");
  const nodeRadius = 9;
  const logoSize = 26;
  const lineHeight = 16;

  // Date labels (drawn separately for unified animation)
  if (includeStartDate || includeEndDate) {
    const dateLabelGroup = svg.append("g").attr("class", "date-labels");
    const drawnLabelXCoords = new Set();
    const labelProximityThreshold = 20; // Min horizontal pixels between labels

    for (const it of items) {
      const ny = laneToY(it.lane);
      const onBaseline = ny === baselineY;
      const labelY = onBaseline ? ny - nodeRadius - 4 : ny + nodeRadius + 4;
      const dominantBaseline = onBaseline ? "auto" : "hanging";

      // Start date
      if (includeStartDate) {
        const nx = xScale(it.start);
        const isTooCloseToOtherLabel = [...drawnLabelXCoords].some((x) => Math.abs(x - nx) < labelProximityThreshold);
        if (!isTooCloseToOtherLabel) {
          dateLabelGroup
            .append("text")
            .attr("class", "date-label")
            .attr("x", nx)
            .attr("y", labelY)
            .attr("dominant-baseline", dominantBaseline)
            .attr("text-anchor", "middle")
            .attr("font-size", Math.round(baseFontSize * 0.83 * 10) / 10)
            .attr("fill", THEME.text)
            .text(it.startRaw);
          drawnLabelXCoords.add(nx);
        }
      }

      // End date
      if (includeEndDate && it.end) {
        const ex = xScale(it.end);
        const isEndTooClose = [...drawnLabelXCoords].some((x) => Math.abs(x - ex) < labelProximityThreshold);
        if (!isEndTooClose) {
          dateLabelGroup
            .append("text")
            .attr("class", "date-label")
            .attr("x", ex)
            .attr("y", labelY)
            .attr("dominant-baseline", dominantBaseline)
            .attr("text-anchor", "middle")
            .attr("font-size", Math.round(baseFontSize * 0.83 * 10) / 10)
            .attr("fill", THEME.text)
            .text(it.endRaw);
          drawnLabelXCoords.add(ex);
        }
      }
    }
  }

  for (const [i, it] of items.entries()) {
    const x1 = xScale(it.start);
    const x2 = xScale(it.end || now);
    const y = laneToY(it.lane);
    const w = Math.max(6, x2 - x1);

    const delay = jobsStartTime + i * durationPerJob;
    const itemGroup = jobsGroup
      .append("g")
      .attr("class", "job-group")
      .attr("style", `--final-width: ${w}px; animation-delay: ${delay}s; transition-delay: ${delay}s;`);

    // duration bar
    itemGroup
      .append("rect")
      .attr("class", "job-bar")
      .attr("x", Math.min(x1, x2))
      .attr("y", y - 10)
      .attr("width", w)
      .attr("height", 18)
      .attr("rx", 9)
      .attr("fill", it.color)
      .attr("stroke", it.color)
      .attr("stroke-width", 1.2);

    // Draw connectors from baseline to node
    if (y === baselineY) {
      // Simple vertical line for baseline jobs
      itemGroup
        .append("line")
        .attr("class", "job-connector")
        .attr("x1", x1)
        .attr("x2", x1)
        .attr("y1", y - 6)
        .attr("y2", y + 6)
        .attr("stroke", THEME.icon)
        .attr("stroke-width", 1.2);
    } else {
      // Curved path for jobs off-baseline
      const outControlX = x1 + Math.min(60, (x2 - x1) * 0.25);
      const pathOut = `M ${x1} ${baselineY} C ${outControlX} ${baselineY} ${outControlX} ${y} ${x1} ${y}`;
      itemGroup
        .append("path")
        .attr("class", "job-connector")
        .attr("d", pathOut)
        .attr("fill", "none")
        .attr("stroke", THEME.icon)
        .attr("stroke-width", 1.6);
        }
        
        // Draw closing connectors from node back to baseline
        const endX = xScale(it.end || now);
        if (it.end || y !== baselineY) {
          const closingConnectorDelay = delay + jobPartAnimDuration;
          if (y === baselineY) {
            itemGroup
              .append("line")
              .attr("class", "job-connector-in")
              .attr("x1", endX)
              .attr("x2", endX)
              .attr("y1", y - 6)
              .attr("y2", y + 6)
              .attr("stroke", THEME.icon)
              .attr("stroke-width", 1.2)
              .attr("style", `animation-delay: ${closingConnectorDelay}s;`);
          } else {
            const inControlX = endX - Math.min(60, (endX - x1) * 0.25);
            const pathIn = `M ${endX} ${y} C ${inControlX} ${y} ${inControlX} ${baselineY} ${endX} ${baselineY}`;
            itemGroup
              .append("path")
              .attr("class", "job-connector-in")
              .attr("d", pathIn)
              .attr("fill", "none")
              .attr("stroke", THEME.icon)
              .attr("stroke-width", 1.6)
              .attr("style", `animation-delay: ${closingConnectorDelay}s;`);
          }
        }

    // node circle
    itemGroup
      .append("circle")
      .attr("cx", x1)
      .attr("cy", y)
      .attr("r", nodeRadius)
      .attr("fill", it.color)
      .attr("stroke", "#111")
      .attr("stroke-width", 1.2);

    // stacked label block placement
    const hasTitle = Boolean(it.title);
    const blockX = x1 + nodeRadius + 12;
    let topY;
    if (y < baselineY) {
      // node is above baseline - place block above node
      const blockHeight = (hasTitle ? 2 : 1) * lineHeight;
      topY = y - nodeRadius - 8 - blockHeight;
    } else {
      // node is on baseline or below - place block below node
      topY = y + nodeRadius + 8;
    }

    // logo (absolute positioned so clip path can use exact coords)
    if (it.logoData) {
      const logoX = blockX - logoSize - 6; // small gap
      const logoY = topY;
      const clipId = `logo_clip_${it.id}`;
      // clip path
      svg
        .append("clipPath")
        .attr("id", clipId)
        .append("circle")
        .attr("cx", logoX + logoSize / 2)
        .attr("cy", logoY + logoSize / 2)
        .attr("r", logoSize / 2);

      itemGroup
        .append("image")
        .attr("href", it.logoData)
        .attr("x", logoX)
        .attr("y", logoY)
        .attr("width", logoSize)
        .attr("height", logoSize)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .attr("clip-path", `url(#${clipId})`);
    }

    // company and title stacked
    const textStartX = it.logoData ? blockX : blockX - (logoSize + 6); // if no logo, shift left
    const companyY = topY + lineHeight - 2;
    itemGroup
      .append("text")
      .attr("x", textStartX)
      .attr("y", companyY)
      .attr("font-size", Math.round(baseFontSize * 1.08 * 10) / 10)
      .attr("font-weight", 700)
      .attr("fill", THEME.title)
      .text(it.company);

    if (hasTitle) {
      itemGroup
        .append("text")
        .attr("x", textStartX)
        .attr("y", companyY + lineHeight)
        .attr("font-size", baseFontSize)
        .attr("fill", THEME.text)
        .text(it.title);
    }
  }

  return svg.node().outerHTML;
}

export {
  generateExperienceTimeline,
}
