/*
generateContributionStreakSVG.js
GitHub Contribution Streak SVG Generator Module
Requires GITHUB_TOKEN env var.
*/

import { THEMES } from '../../utils/themes.js';
import { stampSvg } from '../../utils/svgTimestamp.js';

const GITHUB_API = 'https://api.github.com/graphql';

// Helper function to format numbers with comma separators
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Helper function to escape XML special characters
function escapeXML(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// GraphQL query runner
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

// Fetch user basic info and contribution years
async function fetchUserInfo(username, token) {
  const query = `
    query($username: String!) {
      user(login: $username) {
        login
        createdAt
        contributionsCollection {
          contributionYears
        }
      }
    }
  `;

  const data = await runGraphQL(query, { username }, token);
  if (!data || !data.user) {
    throw new Error(`User "${username}" not found`);
  }
  return data.user;
}

// Fetch contribution calendar for a given year
async function fetchContributionCalendar(username, token, year) {
  const fromDate = `${year}-01-01T00:00:00Z`;
  const toDate = `${year}-12-31T23:59:59Z`;

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
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
        }
      }
    }
  `;

  const data = await runGraphQL(query, { login: username, from: fromDate, to: toDate }, token);
  if (!data || !data.user || !data.user.contributionsCollection) {
    return { totalContributions: 0, days: [] };
  }

  const calendar = data.user.contributionsCollection.contributionCalendar;
  const days = [];
  for (const w of calendar.weeks || []) {
    for (const d of w.contributionDays || []) {
      days.push({ date: d.date, count: d.contributionCount });
    }
  }

  return { totalContributions: calendar.totalContributions, days };
}

// Fetch all contribution data across all years
async function fetchAllContributions(username, token, contributionYears) {
  let totalContributions = 0;
  const allDays = [];

  for (const year of contributionYears) {
    const result = await fetchContributionCalendar(username, token, year);
    totalContributions += result.totalContributions;
    allDays.push(...result.days);
  }

  // Sort chronologically
  allDays.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return { totalContributions, allDays };
}

// Add one day to a date string (YYYY-MM-DD)
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

// Calculate streak data from sorted contribution days
function calculateStreaks(allDays, today) {
  if (!allDays.length) {
    return {
      currentStreak: 0,
      currentStreakStart: null,
      currentStreakEnd: null,
      longestStreak: 0,
      longestStreakStart: null,
      longestStreakEnd: null,
    };
  }

  // Build lookup map
  const dayMap = new Map();
  for (const day of allDays) {
    dayMap.set(day.date, day.count);
  }

  // Current streak: count backwards from today
  let currentStreak = 0;
  let currentStreakStart = null;
  let currentStreakEnd = null;

  let checkDate = today;
  // If today has 0 contributions, start from yesterday
  if (!dayMap.get(today) || dayMap.get(today) === 0) {
    checkDate = addDays(today, -1);
  }

  while ((dayMap.get(checkDate) || 0) > 0) {
    currentStreak++;
    currentStreakStart = checkDate;
    if (currentStreakEnd === null) {
      currentStreakEnd = checkDate;
    }
    checkDate = addDays(checkDate, -1);
  }

  // Longest streak: scan forward through all calendar days
  const firstDate = allDays[0].date;
  let longestStreak = 0;
  let longestStreakStart = null;
  let longestStreakEnd = null;

  let tempStreak = 0;
  let tempStreakStart = null;

  let scanDate = firstDate;
  while (scanDate <= today) {
    const count = dayMap.get(scanDate) || 0;
    if (count > 0) {
      tempStreak++;
      if (tempStreakStart === null) {
        tempStreakStart = scanDate;
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
        longestStreakStart = tempStreakStart;
        longestStreakEnd = scanDate;
      }
    } else {
      tempStreak = 0;
      tempStreakStart = null;
    }
    scanDate = addDays(scanDate, 1);
  }

  return {
    currentStreak,
    currentStreakStart,
    currentStreakEnd,
    longestStreak,
    longestStreakStart,
    longestStreakEnd,
  };
}

// Format date as "Mon DD, YYYY"
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// Format date as "Mon DD" (short, no year)
function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

// Main function to generate the SVG
export async function generateContributionStreakSVG(username, opts = {}, theme = 'radical') {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  if (!username) {
    throw new Error('Username is required');
  }

  const animationDuration = opts.animationDuration || 2;
  const colors = THEMES[theme] || THEMES.radical;

  // SVG dimensions
  const width = 550;
  const height = 176;
  const outerPadding = 12;
  const boxGap = 8;
  const boxCount = 3;
  const boxWidth = Math.floor((width - outerPadding * 2 - boxGap * (boxCount - 1)) / boxCount);
  const boxHeight = height - outerPadding * 2;
  const boxRadius = 10;

  try {
    // Fetch user data
    const userData = await fetchUserInfo(username, token);
    const contributionYears = userData.contributionsCollection.contributionYears || [];

    if (!contributionYears.length) {
      throw new Error('No contribution data found');
    }

    // Fetch all contribution data
    const { totalContributions, allDays } = await fetchAllContributions(username, token, contributionYears);

    // Calculate streaks
    const today = new Date().toISOString().split('T')[0];
    const streaks = calculateStreaks(allDays, today);

    // Date labels
    const createdDate = userData.createdAt.split('T')[0];
    const totalDateRange = `${formatDate(createdDate)} - Present`;

    let currentStreakDateLabel;
    if (streaks.currentStreak === 0) {
      currentStreakDateLabel = formatShortDate(today);
    } else if (streaks.currentStreak === 1) {
      currentStreakDateLabel = formatShortDate(streaks.currentStreakEnd);
    } else {
      currentStreakDateLabel = `${formatShortDate(streaks.currentStreakStart)} - ${formatShortDate(streaks.currentStreakEnd)}`;
    }

    let longestStreakDateLabel;
    if (streaks.longestStreak === 0) {
      longestStreakDateLabel = 'N/A';
    } else if (streaks.longestStreak === 1) {
      longestStreakDateLabel = formatDate(streaks.longestStreakStart);
    } else {
      longestStreakDateLabel = `${formatDate(streaks.longestStreakStart)} - ${formatDate(streaks.longestStreakEnd)}`;
    }

    // Ring calculations for center box
    const ringRadius = 30;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const maxStreakForRing = 365;
    const streakPct = Math.min(streaks.currentStreak / maxStreakForRing, 1);
    const dashOffset = ringCircumference * (1 - streakPct);

    // Box positions
    const box1X = outerPadding;
    const box2X = outerPadding + boxWidth + boxGap;
    const box3X = outerPadding + (boxWidth + boxGap) * 2;
    const boxY = outerPadding;

    // Dynamic font size for center number to fit inside ring
    const centerText = formatNumber(streaks.currentStreak);
    const centerFontSize = centerText.length <= 2 ? 28 : centerText.length <= 3 ? 24 : centerText.length <= 5 ? 18 : 14;

    // Animation timing scale
    const timeScale = animationDuration / 2;

    // Generate SVG
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- Created By GitHub Widgets - Authored by cyrus2281 -->
  <!-- Github: https://github.com/cyrus2281/github-widgets -->
  <defs>
    <filter id="cardShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="12"/>
      <feOffset dx="0" dy="4" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.2"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="flameShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.accentA}">
        <animate attributeName="stop-color"
          values="${colors.accentA};${colors.accentC};${colors.accentE};${colors.accentA}"
          dur="6s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" style="stop-color:${colors.accentE}">
        <animate attributeName="stop-color"
          values="${colors.accentE};${colors.accentA};${colors.accentC};${colors.accentE}"
          dur="6s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
  </defs>

  <style>
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes drawRing {
      from { stroke-dashoffset: ${ringCircumference}; }
      to { stroke-dashoffset: ${dashOffset}; }
    }
    @keyframes flameGlow {
      0%, 100% { opacity: 0.85; filter: url(#flameShadow); }
      50% { opacity: 1; filter: url(#flameShadow); }
    }

    .font {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    }

    .box-0 { opacity: 0; animation: slideUp ${(0.6 * timeScale).toFixed(2)}s ease-out forwards ${(0 * timeScale).toFixed(2)}s; }
    .box-1 { opacity: 0; animation: slideUp ${(0.6 * timeScale).toFixed(2)}s ease-out forwards ${(0.15 * timeScale).toFixed(2)}s; }
    .box-2 { opacity: 0; animation: slideUp ${(0.6 * timeScale).toFixed(2)}s ease-out forwards ${(0.3 * timeScale).toFixed(2)}s; }

    .number-left { opacity: 0; animation: fadeIn ${(0.8 * timeScale).toFixed(2)}s ease-out forwards ${(0.3 * timeScale).toFixed(2)}s; }
    .number-center { opacity: 0; animation: fadeIn ${(0.8 * timeScale).toFixed(2)}s ease-out forwards ${(0.8 * timeScale).toFixed(2)}s; }
    .number-right { opacity: 0; animation: fadeIn ${(0.8 * timeScale).toFixed(2)}s ease-out forwards ${(0.5 * timeScale).toFixed(2)}s; }

    .streak-ring {
      stroke-dashoffset: ${ringCircumference};
      animation: drawRing ${(1.5 * timeScale).toFixed(2)}s ease-out forwards ${(0.5 * timeScale).toFixed(2)}s;
    }

    .flame-icon {
      opacity: 0;
      animation: fadeIn ${(0.5 * timeScale).toFixed(2)}s ease-out forwards ${(1.0 * timeScale).toFixed(2)}s, flameGlow 2s ease-in-out infinite ${(1.5 * timeScale).toFixed(2)}s;
    }
  </style>

  <!-- Background -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${colors.bg}" rx="16" filter="url(#cardShadow)"/>

  <!-- Left Box: Total Contributions -->
  <g class="box-0">
    <rect x="${box1X}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="${boxRadius}" fill="${colors.bg}" stroke="${colors.border}" stroke-width="1"/>
    <g class="number-left">
      <text x="${box1X + boxWidth / 2}" y="${boxY + 55}" text-anchor="middle" fill="${colors.title}" class="font" font-size="34" font-weight="700">
        ${escapeXML(formatNumber(totalContributions))}
      </text>
    </g>
    <text x="${box1X + boxWidth / 2}" y="${boxY + 80}" text-anchor="middle" fill="${colors.text}" class="font" font-size="12" font-weight="500">
      Total Contributions
    </text>
    <text x="${box1X + boxWidth / 2}" y="${boxY + 100}" text-anchor="middle" fill="${colors.subtext}" class="font" font-size="10" font-weight="400">
      ${escapeXML(totalDateRange)}
    </text>
  </g>

  <!-- Center Box: Current Streak -->
  <g class="box-1">
    <rect x="${box2X}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="${boxRadius}" fill="${colors.bg}" stroke="${colors.border}" stroke-width="1"/>

    <!-- Ring track -->
    <circle cx="${box2X + boxWidth / 2}" cy="${boxY + boxHeight / 2 - 12}" r="${ringRadius}" fill="none" stroke="${colors.border}" stroke-width="4"/>
    <!-- Ring progress -->
    <circle cx="${box2X + boxWidth / 2}" cy="${boxY + boxHeight / 2 - 12}" r="${ringRadius}" fill="none" stroke="url(#ringGradient)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${ringCircumference}" class="streak-ring" transform="rotate(-90 ${box2X + boxWidth / 2} ${boxY + boxHeight / 2 - 12})"/>

    <!-- Flame icon -->
    <g class="flame-icon" transform="translate(${box2X + boxWidth / 2 - 8}, ${boxY + boxHeight / 2 - 12 - ringRadius - 14}) scale(0.9)">
      <path d="M9 0C7.77 2.84 5.94 4.55 4.96 5.72C3.9 7.09 3 8.59 3 10.5C3 14.09 5.69 17 9 17C12.31 17 15 14.09 15 10.5C15 7 12 3.5 9 0Z" fill="${colors.title}" filter="url(#flameShadow)"/>
      <path d="M9 15C7.07 15 5.5 13.43 5.5 11.5C5.5 10.15 6.37 9.09 7.25 8.15L9 6.25L10.75 8.15C11.63 9.09 12.5 10.15 12.5 11.5C12.5 13.43 10.93 15 9 15Z" fill="${colors.accentC}" opacity="0.7"/>
    </g>

    <!-- Center number -->
    <g class="number-center">
      <text x="${box2X + boxWidth / 2}" y="${boxY + boxHeight / 2 - 5}" text-anchor="middle" fill="${colors.title}" class="font" font-size="${centerFontSize}" font-weight="700">
        ${escapeXML(centerText)}
      </text>
    </g>

    <!-- Label and date -->
    <text x="${box2X + boxWidth / 2}" y="${boxY + boxHeight / 2 + ringRadius + 14}" text-anchor="middle" fill="${colors.text}" class="font" font-size="12" font-weight="500">
      Current Streak
    </text>
    <text x="${box2X + boxWidth / 2}" y="${boxY + boxHeight / 2 + ringRadius + 30}" text-anchor="middle" fill="${colors.subtext}" class="font" font-size="10" font-weight="400">
      ${escapeXML(currentStreakDateLabel)}
    </text>
  </g>

  <!-- Right Box: Longest Streak -->
  <g class="box-2">
    <rect x="${box3X}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="${boxRadius}" fill="${colors.bg}" stroke="${colors.border}" stroke-width="1"/>
    <g class="number-right">
      <text x="${box3X + boxWidth / 2}" y="${boxY + 55}" text-anchor="middle" fill="${colors.title}" class="font" font-size="34" font-weight="700">
        ${escapeXML(formatNumber(streaks.longestStreak))}
      </text>
    </g>
    <text x="${box3X + boxWidth / 2}" y="${boxY + 80}" text-anchor="middle" fill="${colors.text}" class="font" font-size="12" font-weight="500">
      Longest Streak
    </text>
    <text x="${box3X + boxWidth / 2}" y="${boxY + 100}" text-anchor="middle" fill="${colors.subtext}" class="font" font-size="10" font-weight="400">
      ${escapeXML(longestStreakDateLabel)}
    </text>
  </g>
</svg>`.trim();

    return stampSvg(svg);

  } catch (error) {
    const errorHeight = 200;
    return stampSvg(`
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${errorHeight}" viewBox="0 0 ${width} ${errorHeight}">
  <rect x="0" y="0" width="${width}" height="${errorHeight}" fill="${colors.bg}" rx="16"/>
  <text x="${width / 2}" y="80" text-anchor="middle" fill="${colors.error}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="18" font-weight="600">
    Error loading contribution streak
  </text>
  <text x="${width / 2}" y="110" text-anchor="middle" fill="${colors.subtext}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="14">
    ${escapeXML(error.message)}
  </text>
</svg>`.trim());
  }
}
