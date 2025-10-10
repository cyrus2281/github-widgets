/*
generateUserStatsSVG.js
GitHub User Stats SVG Generator Module
Requires GITHUB_TOKEN env var.
*/

import { THEMES } from '../../utils/themes.js';

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

// Fetch user stats
async function fetchUserStats(username, token) {
  const query = `
    query($username: String!) {
      user(login: $username) {
        name
        login
        repositories(ownerAffiliations: OWNER) {
          totalCount
        }
        contributionsCollection {
          totalCommitContributions
          restrictedContributionsCount
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          contributionYears
        }
        repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
          totalCount
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

// Fetch total stars across all repositories
async function fetchTotalStars(username, token) {
  const query = `
    query($username: String!, $after: String) {
      user(login: $username) {
        repositories(first: 100, after: $after, ownerAffiliations: OWNER) {
          nodes {
            stargazerCount
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;
  
  let totalStars = 0;
  let hasNextPage = true;
  let after = null;
  
  while (hasNextPage) {
    const data = await runGraphQL(query, { username, after }, token);
    if (!data || !data.user || !data.user.repositories) {
      break;
    }
    
    const repos = data.user.repositories.nodes;
    totalStars += repos.reduce((sum, repo) => sum + (repo.stargazerCount || 0), 0);
    
    hasNextPage = data.user.repositories.pageInfo.hasNextPage;
    after = data.user.repositories.pageInfo.endCursor;
  }
  
  return totalStars;
}

// Fetch total commits (all time) - approximation using contribution years
async function fetchTotalCommits(username, token, contributionYears) {
  let totalCommits = 0;
  
  // Fetch commits for each year
  for (const year of contributionYears) {
    const fromDate = `${year}-01-01T00:00:00Z`;
    const toDate = `${year}-12-31T23:59:59Z`;
    
    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            restrictedContributionsCount
          }
        }
      }
    `;
    
    const data = await runGraphQL(query, { username, from: fromDate, to: toDate }, token);
    if (data && data.user && data.user.contributionsCollection) {
      totalCommits += data.user.contributionsCollection.totalCommitContributions;
      totalCommits += data.user.contributionsCollection.restrictedContributionsCount;
    }
  }
  
  return totalCommits;
}

// Main function to generate the SVG
export async function generateUserStatsSVG(username, opts = {}, theme = 'radical') {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  if (!username) {
    throw new Error('Username is required in opts.username');
  }

  // Merge options with defaults
  const options = {
    showHandle: opts.showHandle !== false,
    showStars: opts.showStars !== false,
    showCommits: opts.showCommits !== false,
    showCommitsThisYear: opts.showCommitsThisYear !== false,
    showPRs: opts.showPRs !== false,
    showIssues: opts.showIssues !== false,
    showRepos: opts.showRepos !== false,
    showContributedTo: opts.showContributedTo !== false,
    showLogo: opts.showLogo !== false,
    width: opts.width || 600,
    ...opts
  };

  // Get theme colors
  const colors = THEMES[theme] || THEMES.radical;

  try {
    // Fetch user data
    const userData = await fetchUserStats(username, token);
    const totalStars = options.showStars ? await fetchTotalStars(username, token) : 0;
    
    // Calculate total commits if needed
    let totalCommits = 0;
    if (options.showCommits) {
      const years = userData.contributionsCollection.contributionYears || [];
      totalCommits = await fetchTotalCommits(username, token, years);
    }
    
    // Prepare stats data
    const stats = [];
    
    if (options.showStars) {
      stats.push({ label: 'Total Stars', value: formatNumber(totalStars), icon: 'star' });
    }
    if (options.showCommits) {
      stats.push({ label: 'Total Commits', value: formatNumber(totalCommits), icon: 'commit' });
    }
    if (options.showCommitsThisYear) {
      stats.push({
        label: 'Commits This Year',
        value: formatNumber(userData.contributionsCollection.totalCommitContributions),
        icon: 'calendar'
      });
    }
    if (options.showPRs) {
      stats.push({ 
        label: 'Total PRs', 
        value: formatNumber(userData.contributionsCollection.totalPullRequestContributions), 
        icon: 'pr' 
      });
    }
    if (options.showIssues) {
      stats.push({ 
        label: 'Total Issues', 
        value: formatNumber(userData.contributionsCollection.totalIssueContributions), 
        icon: 'issue' 
      });
    }
    if (options.showRepos) {
      stats.push({ 
        label: 'Total Repositories', 
        value: formatNumber(userData.repositories.totalCount), 
        icon: 'repo' 
      });
    }
    if (options.showContributedTo) {
      stats.push({ 
        label: 'Contributed To', 
        value: formatNumber(userData.repositoriesContributedTo.totalCount), 
        icon: 'contributed' 
      });
    }

    // Calculate dynamic height based on visible stats
    const nameHandleHeight = 95 - (options.showHandle ? 0 : 30);
    const statHeight = 26; // Height per stat item
    const padding = 15; // Top, right, and bottom padding
    const statsHeight = stats.length * statHeight;
    const height = nameHandleHeight + statsHeight + padding * 2;
    
    // Calculate responsive logo size based on available height
    const availableLogoHeight = height - (padding * 2);
    const logoSize = Math.max(100, Math.min(200, availableLogoHeight ));
    const logoRadius = logoSize / 2;
    
    // Animation timing
    const animationDuration = opts.animationDuration || 2;
    const statAnimationDelay = (index) => {
      return (animationDuration * 0.3 + (index * 0.1)).toFixed(2);
    };
    
    const logoPathLength = 600;
    
    // Generate SVG
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${height}" viewBox="0 0 ${options.width} ${height}">
  <!-- Created By GitHub Widgets - Authored by cyrus2281 -->
  <!-- Github: https://github.com/cyrus2281/github-widgets -->
  <defs>
    <!-- Drop shadow filter for card -->
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
    
    <!-- Gradient for GitHub logo -->
    <linearGradient id="githubGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.accentA};stop-opacity:1">
        <animate attributeName="stop-color"
          values="${colors.accentA};${colors.accentB};${colors.accentC};${colors.accentD};${colors.accentA}"
          dur="6s" repeatCount="indefinite"/>
      </stop>
      <stop offset="50%" style="stop-color:${colors.accentC};stop-opacity:1">
        <animate attributeName="stop-color"
          values="${colors.accentC};${colors.accentD};${colors.accentE};${colors.accentB};${colors.accentC}"
          dur="6s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" style="stop-color:${colors.accentE};stop-opacity:1">
        <animate attributeName="stop-color"
          values="${colors.accentE};${colors.accentA};${colors.accentB};${colors.accentC};${colors.accentE}"
          dur="6s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
    
    <!-- Glow filter -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
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
    
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes drawPath {
      from {
        stroke-dashoffset: ${logoPathLength};
      }
      to {
        stroke-dashoffset: 0;
      }
    }
    
    .title {
      animation: fadeIn 0.8s ease-out forwards;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 28px;
      font-weight: 700;
    }
    
    .name {
      animation: fadeIn 0.8s ease-out forwards 0.2s;
      opacity: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 28px;
      font-weight: 600;
    }
    
    .handle {
      animation: fadeIn 0.8s ease-out forwards 0.3s;
      opacity: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 20px;
      font-weight: 400;
    }
    
    .stat-item {
      opacity: 0;
    }
    
    ${stats.map((_, i) => `
    .stat-${i} { animation: slideIn 0.5s ease-out forwards ${statAnimationDelay(i)}s; }`).join('')}
    
    .stat-label {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 16px;
      font-weight: 400;
    }
    
    .stat-value {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 16px;
      font-weight: 700;
    }
    
    .github-logo path {
      fill: none;
      stroke: url(#githubGradient);
      stroke-width: 0.5;
      stroke-dasharray: ${logoPathLength};
      stroke-dashoffset: ${logoPathLength};
      animation: drawPath 3.5s ease-in-out forwards;
      filter: url(#glow);
    }
    
    @keyframes logoFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .github-logo path.filled {
      fill: url(#githubGradient);
      stroke: none;
      animation: logoFadeIn 0.8s ease-out forwards 3.5s;
      opacity: 0;
      filter: url(#glow);
    }
  </style>
  
  <!-- Background with shadow -->
  <rect x="0" y="0" width="${options.width}" height="${height}" fill="${colors.bg}" rx="16" filter="url(#cardShadow)"/>
  
  <!-- LEFT HALF: Name, Handle, and Stats -->
  <g transform="translate(30, ${padding + 5})">
    <!-- User Name -->
    <text x="0" y="30" fill="${colors.title}" class="name">
      ${escapeXML(userData.name || username)}
    </text>
    
    ${options.showHandle ? `
    <!-- User Handle -->
    <text x="0" y="60" fill="${colors.subtext}" class="handle">
      @${escapeXML(userData.login)}
    </text>
    ` : ''}
    
    <!-- Stats Section -->
    <g transform="translate(0, ${nameHandleHeight})">
      ${stats.map((stat, index) => {
        const baseY = index * statHeight;
        // Use text color for stat labels for better readability
        const statLabelColor = colors.text;
        // Use title color for stat values to make them prominent
        const statValueColor = colors.title;
        // Use different accent colors for icons
        const accentColors = [colors.accentA, colors.accentB, colors.accentC, colors.accentD, colors.accentE];
        const iconAccent = accentColors[index % accentColors.length];
      
      // Icon SVG paths for each stat type
      const iconPaths = {
        star: 'M8 1l2.163 4.382 4.837.703-3.5 3.411.826 4.816L8 12.033l-4.326 2.279.826-4.816-3.5-3.411 4.837-.703L8 1z',
        commit: 'M8 2a6 6 0 100 12A6 6 0 008 2zm0 1.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zM8 5a3 3 0 100 6 3 3 0 000-6z',
        calendar: 'M4 1h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V3a2 2 0 012-2zm0 1a1 1 0 00-1 1v1h10V3a1 1 0 00-1-1H4zm9 3H3v8a1 1 0 001 1h8a1 1 0 001-1V5z',
        pr: 'M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z',
        issue: 'M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z',
        repo: 'M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z',
        contributed: 'M2 5.5a3.5 3.5 0 115.898 2.549 5.507 5.507 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.49 3.49 0 012 5.5zM11 4a.75.75 0 100 1.5 1.5 1.5 0 01.666 2.844.75.75 0 00-.416.672v.352a.75.75 0 00.574.73c1.2.289 2.162 1.2 2.522 2.372a.75.75 0 101.434-.44 5.01 5.01 0 00-2.56-3.012A3 3 0 0011 4z'
      };
      
      const iconPath = iconPaths[stat.icon] || iconPaths.star;
      
        return `
      <!-- Stat ${index}: ${stat.label} -->
      <g class="stat-item stat-${index}">
        <!-- Icon -->
        <svg x="0" y="${baseY}" width="20" height="20" viewBox="0 0 16 16" fill="${iconAccent}">
          <path d="${iconPath}"/>
        </svg>
        
        <!-- Stat Label and Value on same line -->
        <text x="30" y="${baseY + 14}" fill="${statLabelColor}" class="stat-label">
          ${escapeXML(stat.label)}:
        </text>
        <text x="180" y="${baseY + 14}" fill="${statValueColor}" class="stat-value">
          ${escapeXML(stat.value)}
        </text>
      </g>`;
      }).join('\n')}
    </g>
  </g>
  
  ${options.showLogo ? `
  <!-- RIGHT HALF: GitHub Logo (Centered) -->
  <g class="github-logo" transform="translate(${options.width * 0.75 - logoRadius}, ${height / 2 - logoRadius})">
    <circle cx="${logoRadius}" cy="${logoRadius}" r="${logoRadius * 1.1}" fill="url(#githubGradient)" opacity="0.15" filter="url(#glow)"/>
    <g transform="translate(${logoRadius - logoSize * 0.4}, ${logoRadius - logoSize * 0.4}) scale(${logoSize * 0.05})">
      <!-- Animated stroke path that draws the logo -->
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      <!-- Filled path that fades in after drawing completes -->
      <path class="filled" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
    </g>
  </g>
  ` : ''}
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
    Error loading user stats
  </text>
  <text x="${options.width / 2}" y="110" text-anchor="middle" fill="${colors.subtext}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="14">
    ${escapeXML(error.message)}
  </text>
</svg>`.trim();
  }
}
