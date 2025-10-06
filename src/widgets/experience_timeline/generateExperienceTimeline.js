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
 *  - width (default 1200)
 *  - heightPerLane (default 80)
 *  - margin (default { top: 100, right: 120, bottom: 30, left: 30 })
 *  - embedLogos (default true)
 *
 * Returns: Promise<string> SVG markup
 */
async function generateExperienceTimeline(csvString, opts = {}) {
  const {
    width = 1200,
    heightPerLane = 80,
    margin = { top: 100, right: 120, bottom: 30, left: 30 },
    embedLogos = true,
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

  // title
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", 28)
    .attr("fill", THEME.title)
    .attr("font-weight", "700")
    .text("Experience Timeline");

  // baseline Y
  const baselineY = margin.top + contentHeight / 2;

  // draw baseline
  svg
    .append("line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", baselineY)
    .attr("y2", baselineY)
    .attr("stroke", THEME.icon)
    .attr("stroke-width", 2)
    .attr("stroke-opacity", 0.95);

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

  // draw duration bars (behind)
  const barGroup = svg.append("g").attr("class", "bars");
  for (const it of items) {
    const x1 = xScale(it.start);
    const x2 = xScale(it.end || now);
    const y = laneToY(it.lane);
    const w = Math.max(6, x2 - x1);
    barGroup
      .append("rect")
      .attr("x", Math.min(x1, x2))
      .attr("y", y - 10)
      .attr("width", w)
      .attr("height", 18)
      .attr("rx", 9)
      .attr("fill", it.color)
      .attr("fill-opacity", 0.14)
      .attr("stroke", it.color)
      .attr("stroke-opacity", 0.45)
      .attr("stroke-width", 1.2);
  }

  // draw connectors (out and back)
  const connectorGroup = svg.append("g").attr("class", "connectors");
  for (const it of items) {
    const startX = xScale(it.start);
    const endX = xScale(it.end || now);
    const nodeY = laneToY(it.lane);

    if (nodeY === baselineY) {
      connectorGroup
        .append("line")
        .attr("x1", startX)
        .attr("x2", startX)
        .attr("y1", baselineY - 6)
        .attr("y2", baselineY + 6)
        .attr("stroke", THEME.icon)
        .attr("stroke-width", 1.2);
    } else {
      const outControlX = startX + Math.min(60, (endX - startX) * 0.25);
      const pathOut = `M ${startX} ${baselineY} C ${outControlX} ${baselineY} ${outControlX} ${nodeY} ${startX} ${nodeY}`;
      connectorGroup.append("path").attr("d", pathOut).attr("fill", "none").attr("stroke", THEME.icon).attr("stroke-width", 1.6).attr("stroke-opacity", 0.95);

      const inControlX = endX - Math.min(60, (endX - startX) * 0.25);
      const pathIn = `M ${endX} ${baselineY} C ${inControlX} ${baselineY} ${inControlX} ${nodeY} ${endX} ${nodeY}`;
      connectorGroup.append("path").attr("d", pathIn).attr("fill", "none").attr("stroke", THEME.icon).attr("stroke-width", 1.6).attr("stroke-opacity", 0.95);
    }
  }

  // nodes and label blocks
  const nodeGroup = svg.append("g").attr("class", "nodes");
  const nodeRadius = 9;
  const logoSize = 26;
  const lineHeight = 16;

  for (const it of items) {
    const nx = xScale(it.start);
    const ny = laneToY(it.lane);

    // node circle
    nodeGroup
      .append("circle")
      .attr("cx", nx)
      .attr("cy", ny)
      .attr("r", nodeRadius)
      .attr("fill", it.color)
      .attr("stroke", "#111")
      .attr("stroke-width", 1.2);

    // stacked label block placement
    const hasTitle = Boolean(it.title);
    const blockX = nx + nodeRadius + 12;
    let topY;
    if (ny < baselineY) {
      // node is above baseline - place block above node
      const blockHeight = (hasTitle ? 2 : 1) * lineHeight;
      topY = ny - nodeRadius - 8 - blockHeight;
    } else {
      // node is on baseline or below - place block below node
      topY = ny + nodeRadius + 8;
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

      nodeGroup
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
    nodeGroup
      .append("text")
      .attr("x", textStartX)
      .attr("y", companyY)
      .attr("font-size", 13)
      .attr("font-weight", 700)
      .attr("fill", THEME.title)
      .text(it.company);

    if (hasTitle) {
      nodeGroup
        .append("text")
        .attr("x", textStartX)
        .attr("y", companyY + lineHeight)
        .attr("font-size", 12)
        .attr("fill", THEME.text)
        .text(it.title);
    }
  }

  return svg.node().outerHTML;
}

export {
  generateExperienceTimeline,
}


// Testing / Example
(async () => {
const sample = `company,start,end,title,logo,color
Google,2025-10,,AI/ML Engineer,https://media.licdn.com/dms/image/v2/D4E0BAQGv3cqOuUMY7g/company-logo_200_200/B4EZmhegXHGcAM-/0/1759350753990/google_logo?e=1762387200&v=beta&t=-zaBKb9mi3dGWMN0VnY1a_uyxnnSKXMFaTQxLVkWQHE,#4285F4
Spotify,2024-08,2025-06,Sr Software Developer,https://media.licdn.com/dms/image/v2/C560BAQFkDzx_7dqq3A/company-logo_200_200/company-logo_200_200/0/1631377935713?e=1762387200&v=beta&t=pykID6d3e7pWiaJXNRr1Ba_t-Z9sO68gPCu44cg8sPg,#FF0000
Netflix,2024-04,2024-12,Software Engineer - Contract,https://media.licdn.com/dms/image/v2/D4E0BAQGMva5_E8pUjw/company-logo_200_200/company-logo_200_200/0/1736276678240/netflix_logo?e=1762387200&v=beta&t=OuJ_CRXny8ug-kr4LC0wlP_hlHwKcl4DPR2aezfXOno,#00FF00
Amazon,2022-01,2024-08,Software Developer,https://media.licdn.com/dms/image/v2/C560BAQHTvZwCx4p2Qg/company-logo_200_200/company-logo_200_200/0/1630640869849/amazon_logo?e=1762387200&v=beta&t=usWXjoCYSFuCVHZsiWkLRzgXZMnFI_R1F2Xx5EqSpwA,#00F
Meta, 2020-06,2021-10,Web Developer,https://media.licdn.com/dms/image/v2/D560BAQHBmbxCDP0JQQ/company-logo_200_200/B56ZlkdQSaI8AI-/0/1758327015620/meta_logo?e=1762387200&v=beta&t=JT78XixgnVFyn1bGFUMc2EvEVGaXHPBnPArsETxWFVk,#FF0
`;
const svg = await generateExperienceTimeline(sample);
console.log(svg);
})();
