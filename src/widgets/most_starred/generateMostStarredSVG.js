/*
generateMostStarredSVG.js
Most Starred Repositories SVG Generator Module
Requires GITHUB_TOKEN env var.
*/

import { THEMES } from '../../utils/themes.js';

const GITHUB_API = 'https://api.github.com/graphql';

// Helper function to format numbers with comma separators
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Helper function to truncate text with ellipsis
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Helper function to wrap text into multiple lines
function wrapText(text, maxCharsPerLine) {
  if (!text) return [''];
  if (text.length <= maxCharsPerLine) return [text];
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
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

// Fetch most starred repositories
async function fetchMostStarredRepos(username, top, token) {
  const query = `
    query($username: String!, $top: Int!) {
      user(login: $username) {
        repositories(first: $top, orderBy: {field: STARGAZERS, direction: DESC}, ownerAffiliations: OWNER) {
          nodes {
            name
            description
            stargazerCount
            forkCount
            owner {
              login
            }
          }
        }
      }
    }
  `;
  
  const data = await runGraphQL(query, { username, top }, token);
  if (!data || !data.user) {
    throw new Error(`User "${username}" not found`);
  }
  if (!data.user.repositories || !data.user.repositories.nodes) {
    throw new Error('No repositories found');
  }
  
  return data.user.repositories.nodes;
}

// Main function to generate the SVG
export async function generateMostStarredSVG(username, opts = {}, theme = 'radical') {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  // Merge options with defaults
  const options = {
    top: opts.top || 3,
    title: opts.title || 'Most Starred',
    width: 700,
    ...opts
  };

  // Get theme colors
  const colors = THEMES[theme] || THEMES.radical;

  try {
    // Fetch repositories
    const repos = await fetchMostStarredRepos(username, options.top, token);
    
    
    if (!repos || repos.length === 0) {
      throw new Error('No repositories found for this user');
    }

    // Calculate dynamic height
    const cardCount = repos.length;
    const height = 96 + 48 + (cardCount * 130) + ((cardCount - 1) * 16);
    
    // Animation timing configuration
    const animationDuration = opts.animationDuration || 3.5; // seconds
    const cardAnimationDelay = (index) => {
      return (animationDuration * ((index + 1) / (cardCount + 2))).toFixed(2);
    };
    
    // SVG dimensions and padding
    const padding = { top: 96, right: 48, bottom: 48, left: 48 };
    
    // Generate SVG
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${height}" viewBox="0 0 ${options.width} ${height}">
  <defs>
    <!-- Drop shadow filter -->
    <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
      <feOffset dx="0" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Glowing gradient definition -->
    <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.accentA};stop-opacity:1">
        <animate attributeName="stop-color" 
          values="${colors.accentA};${colors.accentB};${colors.accentC};${colors.accentA}" 
          dur="6s" repeatCount="indefinite"/>
      </stop>
      <stop offset="50%" style="stop-color:${colors.accentB};stop-opacity:1">
        <animate attributeName="stop-color" 
          values="${colors.accentB};${colors.accentC};${colors.accentA};${colors.accentB}" 
          dur="6s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" style="stop-color:${colors.accentC};stop-opacity:1">
        <animate attributeName="stop-color" 
          values="${colors.accentC};${colors.accentA};${colors.accentB};${colors.accentC}" 
          dur="6s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
    
    <!-- Glow filter for border effect -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <style>
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideInCard {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes glowPulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    
    @keyframes glowRotate {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: 1000; }
    }
    
    .title {
      animation: fadeIn 0.8s ease-out forwards;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 24px;
      font-weight: 700;
    }
    
    .subtitle { 
      animation: fadeIn 0.8s ease-out forwards 0.2s;
      opacity: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 16px;
      font-weight: 400;
    }
    
    .card {
      opacity: 0;
    }
    
    ${repos.map((_, i) => `
    .card-${i} { animation: slideInCard 0.6s ease-out forwards ${cardAnimationDelay(i)}s; }`).join('')}
    
    .glow-border {
      animation: glowPulse 3s ease-in-out infinite, glowRotate 8s linear infinite;
    }
    
    .repo-name {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 18px;
      font-weight: 600;
    }
    
    .repo-desc {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 14px;
      font-weight: 400;
    }
    
    .stat-text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 15px;
      font-weight: 500;
    }
    
    .stat-text-fork {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
    }
  </style>
  
  <!-- Background -->
  <rect x="0" y="0" width="${options.width}" height="${height}" fill="${colors.bg}" rx="16"/>
  
  <!-- Title -->
  <text x="${options.width / 2}" y="48" text-anchor="middle" fill="${colors.title}" class="title">
    ${escapeXML(options.title)}
  </text>
  
  <!-- Subtitle -->
  <text x="${options.width / 2}" y="72" text-anchor="middle" fill="${colors.subtext}" class="subtitle">
    @${escapeXML(username)}
  </text>
  
  <!-- Repository Cards -->
  ${repos.map((repo, index) => {
    const cardY = padding.top + (index * 146); // 130px card + 16px spacing
    const cardX = padding.left;
    const cardWidth = options.width - padding.left - padding.right;
    const cardHeight = 130;
    
    // Wrap description text to multiple lines
    const description = repo.description || 'No description provided';
    const truncatedDesc = truncateText(description, 170);
    const descLines = wrapText(truncatedDesc, 85);
    
    return `
  <!-- Card ${index} -->
  <g class="card card-${index}">
    <!-- Card background with shadow -->
    <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}"
          fill="${colors.bg}" rx="12"
          stroke="${colors.border}" stroke-width="1"
          filter="url(#dropShadow)"/>
    
    <!-- Glowing border -->
    <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}"
          fill="none" rx="12"
          stroke="url(#glowGradient)" stroke-width="2"
          stroke-dasharray="20 10"
          filter="url(#glow)"
          class="glow-border"/>
    
    <!-- Repository name -->
    <text x="${cardX + 20}" y="${cardY + 32}" fill="${colors.text}" class="repo-name">
      ${escapeXML(repo.owner.login)}/${escapeXML(repo.name)}
    </text>
    
    <!-- Description (multi-line) -->
    <text x="${cardX + 20}" y="${cardY + 56}" fill="${colors.subtext}" class="repo-desc">
      ${descLines.map((line, i) => `<tspan x="${cardX + 20}" dy="${i === 0 ? 0 : 18}">${escapeXML(line)}</tspan>`).join('')}
    </text>
    
    <!-- Star icon and count -->
    <g transform="translate(${cardX + 20}, ${cardY + 106})">
      <svg x="0" y="-8" width="16" height="16" viewBox="0 0 16 16" fill="${colors.warning}">
        <path d="M8 0l2.163 6.636h6.978l-5.652 4.106 2.163 6.636L8 13.272l-5.652 4.106 2.163-6.636L0 6.636h6.978z"/>
      </svg>
      <text x="22" y="0" fill="${colors.text}" class="stat-text" alignment-baseline="middle">
        ${formatNumber(repo.stargazerCount)}
      </text>
    </g>
    
    <!-- Fork icon and count -->
    <g transform="translate(${cardX + 120}, ${cardY + 106})">
      <svg x="0" y="-7" width="14" height="14" viewBox="0 0 14 14" fill="${colors.subtext}">
        <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/>
      </svg>
      <text x="22" y="0" fill="${colors.subtext}" class="stat-text-fork" alignment-baseline="middle">
        ${formatNumber(repo.forkCount)}
      </text>
    </g>
  </g>`;
  }).join('\n')}
</svg>`.trim();

    return svg;
    
  } catch (error) {
    // Generate error SVG
    const errorHeight = 200;
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${errorHeight}" viewBox="0 0 ${options.width} ${errorHeight}">
  <rect x="0" y="0" width="${options.width}" height="${errorHeight}" fill="${colors.bg}" rx="16"/>
  <text x="${options.width / 2}" y="80" text-anchor="middle" fill="${colors.error}" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="18" font-weight="600">
    Error loading repositories
  </text>
  <text x="${options.width / 2}" y="110" text-anchor="middle" fill="${colors.subtext}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="14">
    ${escapeXML(error.message)}
  </text>
</svg>`.trim();
  }
}