import { THEMES } from '../../utils/themes.js';
import { stampSvg } from '../../utils/svgTimestamp.js';

/**
 * Parse the pipe-separated skills input string into structured entries.
 * @param {string} skillsString - Pipe-separated skill entries
 * @returns {Array<{type: 'skill'|'header', title: string, slug?: string, url?: string}>}
 */
function parseSkillsInput(skillsString) {
  if (!skillsString || typeof skillsString !== 'string') return [];

  const segments = skillsString.split('|').map(s => s.trim()).filter(Boolean);
  const entries = [];

  for (const segment of segments) {
    // Section header: --Title--
    const headerMatch = segment.match(/^--(.+)--$/);
    if (headerMatch) {
      entries.push({ type: 'header', title: headerMatch[1].trim() });
      continue;
    }

    // Check for title:idOrUrl format
    const colonIndex = segment.indexOf(':');
    if (colonIndex > 0) {
      const left = segment.substring(0, colonIndex).trim();
      const right = segment.substring(colonIndex + 1).trim();

      if (right.startsWith('http://') || right.startsWith('https://')) {
        // Title:URL format
        entries.push({ type: 'skill', title: left, url: right });
      } else if (right) {
        // Title:slug format
        entries.push({ type: 'skill', title: left, slug: right });
      }
      continue;
    }

    // Plain slug
    entries.push({ type: 'skill', title: segment, slug: segment.toLowerCase() });
  }

  return entries;
}

/**
 * Escape special XML characters.
 * @param {string} str
 * @returns {string}
 */
function escapeXML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Fetch an SVG icon and convert to a base64 data URI.
 * @param {string|null} slug - Simple Icons slug
 * @param {string|null} url - Direct icon URL
 * @param {string|null} colorHex - Hex color without # (e.g. "ffffff")
 * @returns {Promise<{dataURI: string|null, brandTitle: string|null}>}
 */
async function fetchIconAsDataURI(slug, url, colorHex) {
  const targetUrl = slug
    ? `https://cdn.simpleicons.org/${encodeURIComponent(slug)}${colorHex ? '/' + colorHex : ''}`
    : url;

  if (!targetUrl) return { dataURI: null, brandTitle: null };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return { dataURI: null, brandTitle: null };

    let text = await res.text();
    const ct = res.headers.get('content-type') || 'image/svg+xml';

    // Extract brand title from simpleicons SVG <title> tag
    let brandTitle = null;
    const titleMatch = text.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) brandTitle = titleMatch[1];

    // For custom URL SVGs, apply color override if requested
    if (!slug && colorHex && ct.includes('svg')) {
      const color = '#' + colorHex;
      // Replace fill attributes on all elements
      text = text.replace(/fill="[^"]*"/g, `fill="${color}"`);
      // If no fill attribute exists, add one to the root <svg> element
      if (!text.includes('fill=')) {
        text = text.replace(/<svg/, `<svg fill="${color}"`);
      }
    }

    // Convert SVG text to base64 data URI
    const base64 = Buffer.from(text).toString('base64');
    const dataURI = `data:${ct.split(';')[0]};base64,${base64}`;

    return { dataURI, brandTitle };
  } catch {
    return { dataURI: null, brandTitle: null };
  }
}

/**
 * Generate a skill table SVG.
 * @param {string} skillsString - Pipe-separated skill entries
 * @param {Object} opts - Options
 * @param {string} theme - Theme name
 * @returns {Promise<string>} SVG string
 */
export async function generateSkillTableSVG(skillsString, opts = {}, theme = 'radical') {
  const THEME = THEMES[theme] || THEMES.radical;

  const columns = Math.max(1, Math.min(10, opts.columns || 4));
  const iconSize = Math.max(16, Math.min(128, opts.iconSize || 48));
  const gap = Math.max(0, Math.min(64, opts.gap !== undefined ? opts.gap : 16));
  const showTitles = opts.showTitles !== false;
  const useOriginalColors = opts.useOriginalColors !== false;
  const iconColor = opts.iconColor || null;
  const animationDuration = opts.animationDuration || 1;
  const title = opts.title || '';
  const subtitle = opts.subtitle || '';

  // Determine icon fetch color
  let fetchColorHex = null;
  if (iconColor) {
    fetchColorHex = iconColor.replace('#', '');
  } else if (!useOriginalColors) {
    fetchColorHex = THEME.text.replace('#', '');
  }
  // If useOriginalColors && no iconColor override, fetchColorHex stays null (brand colors)

  const entries = parseSkillsInput(skillsString);
  if (entries.length === 0) {
    return stampSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100">
      <rect width="400" height="100" rx="16" fill="${THEME.bg}" stroke="${THEME.border}" stroke-width="1"/>
      <text x="200" y="55" text-anchor="middle" fill="${THEME.subtext}" font-family="'Segoe UI',Roboto,sans-serif" font-size="14">No skills provided</text>
    </svg>`);
  }

  // Fetch all icons in parallel
  const skillEntries = entries.filter(e => e.type === 'skill');
  const iconResults = await Promise.all(
    skillEntries.map(e => fetchIconAsDataURI(e.slug || null, e.url || null, fetchColorHex))
  );

  // Attach icon data and resolve display titles
  let iconIdx = 0;
  for (const entry of entries) {
    if (entry.type === 'skill') {
      const result = iconResults[iconIdx++];
      entry.dataURI = result.dataURI;
      // Use brand title from SVG if available and entry title is just the slug
      if (result.brandTitle && entry.slug && entry.title === entry.slug) {
        entry.displayTitle = result.brandTitle;
      } else {
        entry.displayTitle = entry.title;
      }
    }
  }

  // Layout constants
  const padding = 24;
  const cellPadding = 12;
  const cellWidth = iconSize + cellPadding * 2;
  const titleLineHeight = showTitles ? 18 : 0;
  const cellHeight = iconSize + cellPadding * 2 + titleLineHeight;
  const headerHeight = 36;
  const headerGapBefore = 8;
  const headerGapAfter = 4;

  const totalWidth = columns * cellWidth + (columns - 1) * gap + padding * 2;

  // Calculate layout positions
  let currentY = padding;
  let currentCol = 0;
  const positioned = [];

  // Title area
  if (title) {
    currentY += 28;
  }
  if (subtitle) {
    currentY += 20;
  }
  if (title || subtitle) {
    currentY += 12;
  }

  let animIndex = 0;
  for (const entry of entries) {
    if (entry.type === 'header') {
      // Section headers always start a new row
      if (currentCol > 0) {
        currentY += cellHeight + gap;
        currentCol = 0;
      }
      if (positioned.length > 0) {
        currentY += headerGapBefore;
      }
      positioned.push({
        ...entry,
        x: padding,
        y: currentY,
        animIndex: animIndex++,
      });
      currentY += headerHeight + headerGapAfter;
      currentCol = 0;
      continue;
    }

    // Skill entry
    const x = padding + currentCol * (cellWidth + gap);
    const y = currentY;
    positioned.push({
      ...entry,
      x,
      y,
      animIndex: animIndex++,
    });

    currentCol++;
    if (currentCol >= columns) {
      currentCol = 0;
      currentY += cellHeight + gap;
    }
  }

  // Final height calculation
  if (currentCol > 0) {
    currentY += cellHeight;
  }
  const totalHeight = currentY + padding;

  // Animation delay per item
  const delayPerItem = animationDuration / Math.max(animIndex, 1);

  // Build SVG
  const svgParts = [];

  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" role="img" aria-label="${escapeXML(title || 'Skill Table')}">`);
  svgParts.push(`<!-- Created By GitHub Widgets - Authored by cyrus2281 -->`);

  // Styles and animations
  svgParts.push(`<defs><style>
    @keyframes fadeScaleIn {
      0% { opacity: 0; transform: scale(0.7); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes slideDown {
      0% { opacity: 0; transform: translateY(-10px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .skill-cell {
      opacity: 0;
      animation: fadeScaleIn 0.4s ease-out forwards;
    }
    .section-header {
      opacity: 0;
      animation: slideDown 0.3s ease-out forwards;
    }
    .title-text {
      opacity: 0;
      animation: fadeIn 0.5s ease-out forwards;
    }
  </style></defs>`);

  // Background
  svgParts.push(`<rect width="${totalWidth}" height="${totalHeight}" rx="16" fill="${THEME.bg}" stroke="${THEME.border}" stroke-width="1"/>`);

  // Title
  let titleY = padding;
  if (title) {
    titleY += 22;
    svgParts.push(`<text class="title-text" x="${totalWidth / 2}" y="${titleY}" text-anchor="middle" fill="${THEME.title}" font-family="'Segoe UI',Roboto,sans-serif" font-size="22" font-weight="700">${escapeXML(title)}</text>`);
  }
  if (subtitle) {
    titleY += 22;
    svgParts.push(`<text class="title-text" x="${totalWidth / 2}" y="${titleY}" text-anchor="middle" fill="${THEME.subtext}" font-family="'Segoe UI',Roboto,sans-serif" font-size="14" style="animation-delay: 0.1s">${escapeXML(subtitle)}</text>`);
  }

  // Render entries
  for (const item of positioned) {
    const delay = (item.animIndex * delayPerItem).toFixed(2);

    if (item.type === 'header') {
      const lineY = item.y + headerHeight - 6;
      svgParts.push(`<g class="section-header" style="animation-delay: ${delay}s">`);
      svgParts.push(`<text x="${padding + 4}" y="${item.y + 22}" fill="${THEME.title}" font-family="'Segoe UI',Roboto,sans-serif" font-size="15" font-weight="600">${escapeXML(item.title)}</text>`);
      svgParts.push(`<line x1="${padding}" y1="${lineY}" x2="${totalWidth - padding}" y2="${lineY}" stroke="${THEME.grid}" stroke-width="1"/>`);
      svgParts.push(`</g>`);
      continue;
    }

    // Skill cell
    const cellCenterX = item.x + cellWidth / 2;
    const iconX = cellCenterX - iconSize / 2;
    const iconY = item.y + cellPadding;

    svgParts.push(`<g class="skill-cell" style="animation-delay: ${delay}s; transform-origin: ${cellCenterX}px ${item.y + cellHeight / 2}px">`);

    // Cell background (subtle)
    svgParts.push(`<rect x="${item.x}" y="${item.y}" width="${cellWidth}" height="${cellHeight - titleLineHeight}" rx="10" fill="${THEME.fadeShadow}"/>`);

    if (item.dataURI) {
      svgParts.push(`<image href="${item.dataURI}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}"/>`);
    } else {
      // Placeholder for failed icons
      svgParts.push(`<rect x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" rx="8" fill="${THEME.grid}" stroke="${THEME.border}" stroke-width="1"/>`);
      svgParts.push(`<text x="${cellCenterX}" y="${iconY + iconSize / 2 + 5}" text-anchor="middle" fill="${THEME.subtext}" font-family="'Segoe UI',Roboto,sans-serif" font-size="16">?</text>`);
    }

    if (showTitles && item.displayTitle) {
      const textY = item.y + cellPadding + iconSize + cellPadding + 12;
      // Truncate long titles
      const maxChars = Math.floor(cellWidth / 7);
      const displayText = item.displayTitle.length > maxChars
        ? item.displayTitle.substring(0, maxChars - 1) + '…'
        : item.displayTitle;
      svgParts.push(`<text x="${cellCenterX}" y="${textY}" text-anchor="middle" fill="${THEME.text}" font-family="'Segoe UI',Roboto,sans-serif" font-size="11">${escapeXML(displayText)}</text>`);
    }

    svgParts.push(`</g>`);
  }

  svgParts.push(`</svg>`);

  return stampSvg(svgParts.join('\n'));
}
