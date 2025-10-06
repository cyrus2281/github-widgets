/*
generateActivitySVG.js
GitHub Activity SVG Generator Module
Requires GITHUB_TOKEN env var.
*/

const GITHUB_API = 'https://api.github.com/graphql';

function parseDateSafe(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
function startOfDayUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}
function endOfDayUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}
function daysBetween(a, b) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}
function formatMonthYear(dateStr) {
  const dt = new Date(dateStr);
  return dt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}
function escapeXML(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function runGraphQL(query, variables, token) {
  const res = await fetch(GITHUB_API, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error('GitHub GraphQL error: ' + JSON.stringify(json.errors));
  }
  return json.data;
}

async function fetchUserBasic(username, token) {
  const query = `
    query ($login: String!) {
      user(login: $login) {
        login
        name
      }
    }
  `;
  const data = await runGraphQL(query, { login: username }, token);
  if (!data || !data.user) throw new Error(`User "${username}" not found`);
  return data.user;
}

async function fetchContributions(username, fromIso, toIso, token) {
  const query = `
    query ($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
          totalCommitContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalIssueContributions
          restrictedContributionsCount
        }
      }
    }
  `;
  const data = await runGraphQL(query, { login: username, from: fromIso, to: toIso }, token);
  const col = data.user && data.user.contributionsCollection;
  if (!col || !col.contributionCalendar) {
    throw new Error('No contribution calendar returned');
  }
  return col;
}

function buildDaysFromCalendar(calendar) {
  const days = [];
  for (const w of calendar.weeks || []) {
    for (const d of w.contributionDays || []) {
      days.push({ date: d.date, count: d.contributionCount });
    }
  }
  days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return days;
}

function niceYTicks(maxCount, targetTicks = 5) {
  const step = Math.ceil(maxCount / (targetTicks - 1)) || 1;
  const ticks = [];
  for (let v = 0; v <= maxCount; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== maxCount) ticks.push(maxCount);
  return ticks;
}

function computePathLength(points) {
  // euclidean sum of consecutive segments
  let L = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    L += Math.hypot(dx, dy);
  }
  return Math.max(1, L); // ensure at least 1 to avoid zero-length issues
}

function generateActivitySVGFromData(user, dayArray, col, startDate, endDate, opts = {}) {
  const colors = {
    bg: '#0b1020',
    card: '#0f1724',
    grid: 'rgba(255,255,255,0.06)',
    text: '#cbd5e1',
    subtext: '#94a3b8',
    accentA: '#ff6b6b',
    accentB: '#7c5cff',
    commits: '#ff6b6b',
    prs: '#facc15',
    reviews: '#22d3ee',
    issues: '#7c5cff'
  };

  const width = opts.width || 900;
  const height = opts.height || 360;
  const padding = opts.padding || { top: 96, right: 48, bottom: 60, left: 64 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (!dayArray || dayArray.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" fill="${colors.bg}" rx="16" />
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="${colors.text}">No data</text>
    </svg>`;
  }

  const counts = dayArray.map((d) => d.count);
  const maxCount = Math.max(...counts, 1);
  const n = dayArray.length;

  function xForIndex(i) {
    if (n === 1) return padding.left + innerW / 2;
    return padding.left + (i / (n - 1)) * innerW;
  }
  function yForCount(c) {
    const t = c / maxCount;
    return padding.top + innerH - t * innerH;
  }

  const points = dayArray.map((d, i) => ({ x: xForIndex(i), y: yForCount(d.count), c: d.count, date: d.date }));

  // Build total line path and area path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const areaPath = [
    `M ${points[0].x.toFixed(2)} ${padding.top + innerH}`,
    ...points.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    `L ${points[points.length - 1].x.toFixed(2)} ${padding.top + innerH}`,
    'Z',
  ].join(' ');

  // Compute accurate path length (sum of segment lengths)
  const rawPathLength = computePathLength(points);
  const pathLength = Math.ceil(rawPathLength); // integer is fine for dasharray

  // X labels - force 4 labels (start, ~33%, ~66%, end)
  const labelCount = 4;
  const xLabels = [];
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i / (labelCount - 1)) * (n - 1));
    xLabels.push({ pos: idx, label: formatMonthYear(dayArray[idx].date) });
  }

  const yTicks = niceYTicks(maxCount, 5);

  const totals = {
    commits: col.totalCommitContributions || 0,
    prs: col.totalPullRequestContributions || 0,
    issues: col.totalIssueContributions || 0,
    reviews: col.totalPullRequestReviewContributions || 0,
    total: (col.contributionCalendar?.totalContributions || 0) + (col.restrictedContributionsCount || 0),
  };

  const titleFull = `Contributions – ${user.name || user.login} (@${user.login})`;

  // Build SVG (inject pathLength into stroke-dasharray and keyframes)
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXML(titleFull)}">
  <!-- Created By GitHub Widgets - Authored by cyrus2281 -->
  <!-- Github: https://github.com/cyrus2281/github-widgets -->
  <defs>
    <linearGradient id="gradLine" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="${colors.accentB}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${colors.accentA}" stop-opacity="1"/>
    </linearGradient>

    <linearGradient id="areaFade" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${colors.accentA}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${colors.accentB}" stop-opacity="0.02"/>
    </linearGradient>

    <filter id="cardShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#000" flood-opacity="0.45"/>
    </filter>

    <style>
      .card-bg { fill: ${colors.card}; }
      .title-main { font: 700 18px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; fill: ${colors.text}; opacity: 0; animation: fadeIn 0.9s ease-out forwards; }
      .title-login { font-weight: 700; fill: ${colors.accentA}; font-family: "SFMono-Regular", ui-monospace, "Roboto Mono", monospace; }
      .subtitle { font: 500 13px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; fill: ${colors.subtext}; opacity: 0; animation: fadeIn 0.9s ease-out forwards 0.35s; }
      .meta { font: 500 13px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; fill: ${colors.subtext}; opacity: 0; animation: fadeIn 0.9s ease-out forwards 0.6s; }
      .total-num { font: 700 15px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; fill: ${colors.text}; }
      .axis-label { font: 400 11px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; fill: ${colors.subtext}; }
      .tick { font: 400 11px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; fill: ${colors.subtext}; }
      .grid-line { stroke: ${colors.grid}; stroke-width: 1; }
      .line { fill: none; stroke: url(#gradLine); stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; animation: drawLine 2s cubic-bezier(.22,.9,.3,1) forwards; }
      .area { fill: url(#areaFade); opacity: 0; animation: fadeArea 1.0s ease-out forwards 0.9s; }
      .point { stroke: none; opacity: 0; animation: fadeIn 0.5s ease-out forwards 1.6s; }

      @keyframes drawLine {
        from { stroke-dashoffset: ${pathLength}; }
        to   { stroke-dashoffset: 0; }
      }
      @keyframes fadeArea { to { opacity: 0.95; } }
      @keyframes fadeIn { to { opacity: 1; } }
    </style>
  </defs>

  <!-- card -->
  <rect x="6" y="6" width="${width - 12}" height="${height - 12}" rx="14" ry="14" class="card-bg" filter="url(#cardShadow)"/>

  <!-- header: title -->
  <g transform="translate(${padding.left}, ${padding.top - 54})">
    <text class="title-main" x="0" y="0">
      Contributions – ${escapeXML(user.name || user.login)} <tspan class="title-login">(@${escapeXML(user.login)})</tspan>
    </text>
    <text class="subtitle" x="0" y="20">
      Commits: ${totals.commits} · PRs: ${totals.prs} · Issues: ${totals.issues} · Reviews: ${totals.reviews}
    </text>
  </g>

  <!-- total inline at top-right -->
  <g transform="translate(${width - padding.right - 8}, ${padding.top - 52})">
    <text class="meta" x="0" y="0" text-anchor="end">Total: <tspan class="total-num">${totals.total}</tspan></text>
  </g>

  <!-- grid horizontal lines and y tick labels -->
  <g>
    ${yTicks
      .map((t) => {
        const y = yForCount(t);
        return `<g>
          <line x1="${padding.left}" x2="${width - padding.right}" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}" class="grid-line" />
          <text class="tick" x="${padding.left - 10}" y="${y.toFixed(2)}" dy="4" text-anchor="end">${t}</text>
        </g>`;
      })
      .join('')}
  </g>

  <!-- area under line (fades in) -->
  <path d="${areaPath}" class="area"/>

  <!-- line (stroke-dasharray set to exact path length for clean single-dash draw) -->
  <path d="${linePath}" class="line" stroke-dasharray="${pathLength} ${pathLength}" stroke-dashoffset="${pathLength}" />

  <!-- points -->
  <g>
    ${points
      .filter((_, i) => i % Math.ceil(Math.max(1, n / 40)) === 0)
      .map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="2.6" class="point" fill="${p.c > 0 ? 'url(#gradLine)' : '#ffffff11'}" />`)
      .join('')}
  </g>

  <!-- x-axis labels (4 evenly spaced labels) -->
  <g>
    ${xLabels
      .map((lbl) => {
        const x = xForIndex(lbl.pos);
        return `<text class="axis-label" x="${x.toFixed(2)}" y="${(height - padding.bottom + 24).toFixed(2)}" text-anchor="middle">${escapeXML(lbl.label)}</text>`;
      })
      .join('')}
  </g>

  <!-- bottom axis line -->
  <line x1="${padding.left}" x2="${width - padding.right}" y1="${(height - padding.bottom).toFixed(2)}" y2="${(height - padding.bottom).toFixed(2)}" stroke="${colors.grid}" stroke-width="1" />
  <!-- Github: https://github.com/cyrus2281/github-widgets -->
</svg>`.trim();

  return svg;
}

async function generateActivitySVG(username, opts = {}) {
  const GITHUB_TOKEN = opts.githubToken || process.env.GITHUB_TOKEN;
  
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is required');
  }
  
  if (!username) {
    throw new Error('username is required');
  }

  let startDate, endDate;
  if (opts.range) {
    const parts = String(opts.range).split(':');
    if (parts.length !== 2) throw new Error('Range must be in format YYYY-MM-DD:YYYY-MM-DD');
    const parsedStart = parseDateSafe(parts[0]);
    const parsedEnd = parseDateSafe(parts[1]);
    if (!parsedStart || !parsedEnd) throw new Error('Invalid date in range');
    startDate = startOfDayUTC(parsedStart);
    endDate = endOfDayUTC(parsedEnd);
    if (startDate.getTime() > endDate.getTime()) throw new Error('Start date must be before end date');
    if (daysBetween(startDate, endDate) > 365) throw new Error('Date range cannot be over one year');
  } else {
    const today = new Date();
    endDate = endOfDayUTC(today);
    const s = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
    s.setUTCDate(s.getUTCDate() - 365);
    startDate = startOfDayUTC(s);
  }

  const user = await fetchUserBasic(username, GITHUB_TOKEN);
  const col = await fetchContributions(username, startDate.toISOString(), endDate.toISOString(), GITHUB_TOKEN);
  const dayArray = buildDaysFromCalendar(col.contributionCalendar);
  const svg = generateActivitySVGFromData(user, dayArray, col, startDate, endDate, opts);
  return svg;
}

export {
  generateActivitySVG,
  parseDateSafe,
  startOfDayUTC,
  endOfDayUTC,
  daysBetween,
  formatMonthYear,
  escapeXML
};
