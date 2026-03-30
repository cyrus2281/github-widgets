import * as SimpleIcons from 'simple-icons';
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
 * Get icon data for inline SVG rendering.
 * Slug-based icons are resolved from the bundled simple-icons package (no network request).
 * Custom URL icons are fetched from the network and inlined if SVG, or embedded as data URI.
 * @param {string|null} slug - Simple Icons slug
 * @param {string|null} url - Direct icon URL
 * @param {string|null} colorHex - Hex color without # (e.g. "ffffff")
 * @returns {Promise<{type: 'svg'|'datauri'|'none', viewBox?: {width:number,height:number}, innerContent?: string, dataURI?: string, brandTitle: string|null}>}
 */
async function fetchIconData(slug, url, colorHex) {
  if (slug) {
    // Resolve from bundled simple-icons — no network request, works in all environments
    const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
    const icon = SimpleIcons[key];
    if (!icon) return { type: 'none', brandTitle: null };

    const fillColor = colorHex ? `#${colorHex}` : `#${icon.hex}`;
    return {
      type: 'svg',
      viewBox: { width: 24, height: 24 },
      innerContent: `<path d="${icon.path}" fill="${fillColor}"/>`,
      brandTitle: icon.title,
    };
  }

  if (!url) return { type: 'none', brandTitle: null };

  // Custom URL: fetch from network and inline SVG content, or embed as data URI for raster images
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return { type: 'none', brandTitle: null };

    const ct = (res.headers.get('content-type') || 'image/svg+xml').split(';')[0].trim();

    if (ct.includes('svg')) {
      const text = await res.text();

      const viewBoxMatch = text.match(/viewBox="([^"]+)"/);
      const vbParts = (viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24').split(/[\s,]+/).map(Number);
      const vbWidth = vbParts[2] || 24;
      const vbHeight = vbParts[3] || 24;

      let innerContent = text
        .replace(/<\?xml[^>]*\?>/g, '')
        .replace(/<title>[^<]*<\/title>/g, '')
        .replace(/<desc>[^<]*<\/desc>/g, '')
        .replace(/<svg[^>]*>/g, '')
        .replace(/<\/svg>/g, '')
        .trim();

      if (colorHex) {
        const color = `#${colorHex}`;
        innerContent = innerContent.replace(/fill="[^"]*"/g, `fill="${color}"`);
        if (!innerContent.includes('fill=')) {
          innerContent = `<g fill="${color}">${innerContent}</g>`;
        }
      }

      return { type: 'svg', viewBox: { width: vbWidth, height: vbHeight }, innerContent, brandTitle: null };
    } else {
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString('base64');
      return { type: 'datauri', dataURI: `data:${ct};base64,${base64}`, brandTitle: null };
    }
  } catch {
    return { type: 'none', brandTitle: null };
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
    skillEntries.map(e => fetchIconData(e.slug || null, e.url || null, fetchColorHex))
  );

  // Attach icon data and resolve display titles
  let iconIdx = 0;
  for (const entry of entries) {
    if (entry.type === 'skill') {
      const result = iconResults[iconIdx++];
      entry.iconData = result;
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

    if (item.iconData && item.iconData.type === 'svg' && item.iconData.innerContent) {
      // Inline SVG content directly — avoids GitHub proxy stripping data: URIs from <image> elements
      const { width: vbW, height: vbH } = item.iconData.viewBox;
      const uniformScale = Math.min(iconSize / vbW, iconSize / vbH);
      const scaledW = vbW * uniformScale;
      const scaledH = vbH * uniformScale;
      const offsetX = iconX + (iconSize - scaledW) / 2;
      const offsetY = iconY + (iconSize - scaledH) / 2;
      svgParts.push(`<g transform="translate(${offsetX.toFixed(2)},${offsetY.toFixed(2)}) scale(${uniformScale.toFixed(4)})">${item.iconData.innerContent}</g>`);
    } else if (item.iconData && item.iconData.type === 'datauri') {
      svgParts.push(`<image href="${item.iconData.dataURI}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}"/>`);
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
