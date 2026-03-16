/*
generateRepositoryCard.js
GitHub Repository Card SVG Generator Module
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

// Helper function to wrap text into multiple lines
function wrapText(text, maxWidth) {
  if (!text) return [];
  
  const approxCharWidth = 6; // Approximate width of a character in pixels
  const maxCharsPerLine = Math.floor(maxWidth / approxCharWidth);
  
  const words = text.split(/\s+/);
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
      // If a single word is longer than maxCharsPerLine, split it
      if (word.length > maxCharsPerLine) {
        let remainingWord = word;
        while (remainingWord.length > maxCharsPerLine) {
          lines.push(remainingWord.substring(0, maxCharsPerLine));
          remainingWord = remainingWord.substring(maxCharsPerLine);
        }
        currentLine = remainingWord;
      } else {
        currentLine = word;
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
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

// Fetch repository data from GitHub GraphQL API
async function fetchRepositoryData(owner, name, token) {
  const query = `
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        name
        owner {
          login
        }
        description
        primaryLanguage {
          name
        }
        stargazerCount
        forkCount
      }
    }
  `;

  const data = await runGraphQL(query, { owner, name }, token);
  if (!data || !data.repository) {
    throw new Error(`Repository "${owner}/${name}" not found`);
  }

  return data.repository;
}

/**
 * Generate a GitHub repository card SVG
 * @param {string} userName - GitHub username
 * @param {string} repoName - Repository name
 * @param {Object} [opts={}] - Options object
 * @param {boolean} [opts.showUserName=true] - Whether to show username
 * @param {boolean} [opts.showLanguage=true] - Whether to show language
 * @param {boolean} [opts.showStars=true] - Whether to show stars
 * @param {boolean} [opts.showForks=true] - Whether to show forks
 * @param {number} [opts.width=400] - Card width
 * @param {number} [opts.height=120] - Card height
 * @param {string} [theme='radical'] - Theme name
 * @returns {Promise<string>} SVG string
 */
export async function generateRepositoryCard(userName, repoName, opts = {}, theme = 'radical') {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  // Merge options with defaults
  const options = {
    showUserName: opts.showUserName !== false,
    showLanguage: opts.showLanguage !== false,
    showStars: opts.showStars !== false,
    showForks: opts.showForks !== false,
    width: opts.width || 400,
    height: opts.height || 120,
    ...opts
  };

  // Get theme colors
  const colors = THEMES[theme] || THEMES.radical;

  try {
    // Fetch repository data
    const repoData = await fetchRepositoryData(userName, repoName, token);

    // Build repository display name
    const repoDisplayName = options.showUserName 
      ? `${repoData.owner.login}/${repoData.name}`
      : repoData.name;

    // Extract data from API response
    const description = repoData.description || null;
    const language = repoData.primaryLanguage?.name || null;
    const stars = repoData.stargazerCount || 0;
    const forks = repoData.forkCount || 0;

    // Calculate description wrapping and truncation

    const descriptionLineHeight = 14;
    const cardPadding = 32; // 16px on each side
    const availableTextWidth = options.width - cardPadding;
    
    // Calculate available height for description
    const headerHeight = 40; // Space for repo name and icon
    const statsHeight = 40; // Space for stats section at bottom
    const availableDescriptionHeight = options.height - headerHeight - statsHeight;
    
    // Calculate maximum lines that can fit
    const maxLines = Math.floor(availableDescriptionHeight / descriptionLineHeight);
    
    // Wrap description text
    let descriptionLines = [];
    if (description && maxLines > 0) {
      const wrappedLines = wrapText(description, availableTextWidth);
      
      // Truncate if exceeds max lines
      if (wrappedLines.length > maxLines) {
        descriptionLines = wrappedLines.slice(0, maxLines);
        // Add ellipsis to last line
        const lastLine = descriptionLines[maxLines - 1];
        if (lastLine.length > 3) {
          descriptionLines[maxLines - 1] = lastLine.substring(0, lastLine.length - 3) + '...';
        } else {
          descriptionLines[maxLines - 1] = lastLine + '...';
        }
      } else {
        descriptionLines = wrappedLines;
      }
    }
    
    // Calculate stats section Y position based on whether description exists
    const descriptionStartY = 55;

    // Language color mapping (common languages)
    const languageColors = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#3178c6',
      'Python': '#3572A5',
      'Java': '#b07219',
      'C++': '#f34b7d',
      'C': '#555555',
      'C#': '#178600',
      'PHP': '#4F5D95',
      'Ruby': '#701516',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'Swift': '#ffac45',
      'Kotlin': '#A97BFF',
      'Dart': '#00B4AB',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Shell': '#89e051',
      'Vue': '#41b883',
      'React': '#61dafb',
    };

    const languageColor = language ? (languageColors[language] || colors.accentA) : colors.accentA;

    const starsTransformX = options.showLanguage && language ? 120 : 0;
    const forksTransformX = starsTransformX + (options.showStars ? 70 : 0);

    // Generate SVG
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}">
  <!-- Created By GitHub Widgets - Authored by cyrus2281 -->
  <!-- Github: https://github.com/cyrus2281/github-widgets -->
  <defs>
    <!-- Drop shadow filter -->
    <filter id="cardShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.2"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Gradient for border -->
    <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.accentA};stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:${colors.accentB};stop-opacity:0.3"/>
    </linearGradient>
  </defs>
  
  <style>
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(var(--slide-in-offset, 0px)); }
    }
    
    .repo-card {
      animation: fadeIn 0.6s ease-out forwards;
    }
    
    .repo-name {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 16px;
      font-weight: 600;
      animation: slideIn 0.6s ease-out forwards 0.1s;
      opacity: 0;
    }
    
    .repo-icon {
      animation: fadeIn 0.6s ease-out forwards 0.2s;
      opacity: 0;
    }
    
    .stat-item {
      animation: slideIn 0.5s ease-out forwards;
      opacity: 0;
    }
    
    .stat-item-1 { animation-delay: 0.3s; }
    .stat-item-2 { animation-delay: 0.4s; }
    .stat-item-3 { animation-delay: 0.5s; }
    
    .stat-text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 13px;
      font-weight: 500;
    }
    
    .language-text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 13px;
      font-weight: 400;
    }
    
    .repo-description {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 12px;
      font-weight: 400;
      animation: slideIn 0.6s ease-out forwards 0.2s;
      opacity: 0;
    }
  </style>
  
  <!-- Card background with shadow -->
  <g class="repo-card">
    <rect x="0" y="0" width="${options.width}" height="${options.height}"
          fill="${colors.bg}" rx="8"
          stroke="url(#borderGradient)" stroke-width="1"
          filter="url(#cardShadow)"/>
    
    <!-- Repository icon -->
    <g class="repo-icon" transform="translate(16, 20)">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="${colors.subtext}">
        <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/>
      </svg>
    </g>
    
    <!-- Repository name -->
    <text x="40" y="32" fill="${colors.title}" class="repo-name">
      ${escapeXML(repoDisplayName)}
    </text>
    
    ${descriptionLines.length > 0 ? `
    <!-- Repository description -->
    <g class="repo-description">
      ${descriptionLines.map((line, index) => `
      <text x="16" y="${descriptionStartY + (index * descriptionLineHeight)}" fill="${colors.subtext}">
        ${escapeXML(line)}
      </text>`).join('')}
    </g>
    ` : ''}
    
    <!-- Stats section -->
    <g transform="translate(16, ${options.height - 32})">
      ${options.showLanguage && language ? `
      <!-- Language -->
      <g class="stat-item stat-item-1" style="--slide-in-offset: 0px">
        <circle cx="6" cy="6" r="6" fill="${languageColor}"/>
        <text x="18" y="10" fill="${colors.text}" class="language-text">
          ${escapeXML(language)}
        </text>
      </g>
      ` : ''}
      
      ${options.showStars ? `
      <!-- Stars -->
      <g class="stat-item stat-item-2" style="--slide-in-offset: ${starsTransformX}px" transform="translate(${starsTransformX}, 0)">
        <svg x="0" y="-2" width="14" height="14" viewBox="0 0 16 16" fill="${colors.warning}">
          <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
        </svg>
        <text x="20" y="10" fill="${colors.text}" class="stat-text">
          ${formatNumber(stars)}
        </text>
      </g>
      ` : ''}
      
      ${options.showForks ? `
      <!-- Forks -->
      <g class="stat-item stat-item-3" style="--slide-in-offset: ${forksTransformX}px" transform="translate(${forksTransformX}, 0)">
        <svg x="0" y="-2" width="14" height="14" viewBox="0 0 16 16" fill="${colors.subtext}">
          <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/>
        </svg>
        <text x="20" y="10" fill="${colors.text}" class="stat-text">
          ${formatNumber(forks)}
        </text>
      </g>
      ` : ''}
    </g>
  </g>
</svg>`.trim();

    return stampSvg(svg);

  } catch (error) {
    // Generate error SVG
    const errorHeight = 120;
    return stampSvg(`
<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${errorHeight}" viewBox="0 0 ${options.width} ${errorHeight}">
  <rect x="0" y="0" width="${options.width}" height="${errorHeight}" fill="${colors.bg}" rx="8"/>
  <text x="${options.width / 2}" y="50" text-anchor="middle" fill="${colors.error}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="14" font-weight="600">
    Error loading repository
  </text>
  <text x="${options.width / 2}" y="75" text-anchor="middle" fill="${colors.subtext}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="12">
    ${escapeXML(error.message)}
  </text>
</svg>`.trim());
  }
}