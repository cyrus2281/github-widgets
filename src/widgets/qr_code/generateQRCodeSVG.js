import QRCode from 'qrcode';
import * as SimpleIcons from 'simple-icons';
import { THEMES } from '../../utils/themes.js';
import { stampSvg } from '../../utils/svgTimestamp.js';

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
 * @returns {Promise<{type: 'svg'|'datauri'|'none', viewBox?: {width:number,height:number}, innerContent?: string, dataURI?: string}>}
 */
async function fetchIconData(slug, url, colorHex) {
  if (slug) {
    const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
    const icon = SimpleIcons[key];
    if (!icon) return { type: 'none' };

    const fillColor = colorHex ? `#${colorHex}` : `#${icon.hex}`;
    return {
      type: 'svg',
      viewBox: { width: 24, height: 24 },
      innerContent: `<path d="${icon.path}" fill="${fillColor}"/>`,
    };
  }

  if (!url) return { type: 'none' };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return { type: 'none' };

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

      return { type: 'svg', viewBox: { width: vbWidth, height: vbHeight }, innerContent };
    } else {
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString('base64');
      return { type: 'datauri', dataURI: `data:${ct};base64,${base64}` };
    }
  } catch {
    return { type: 'none' };
  }
}

/**
 * Generate a QR code SVG with optional centered logo and title.
 * @param {string} content - The content to encode in the QR code
 * @param {Object} opts - Options
 * @param {string} [opts.logo] - Simple Icons slug or custom icon URL
 * @param {string} [opts.logoColor] - Hex color override for logo (no #)
 * @param {boolean} [opts.useThemeColor] - Use theme title color for logo instead of brand color
 * @param {string} [opts.title] - Optional title above the QR code
 * @param {number} [opts.size] - QR code size in pixels (100–800, default 300)
 * @param {number} [opts.margin] - Quiet zone modules (0–4, default 2)
 * @param {boolean} [opts.animate] - Animate logo with vertical axis spin (default false)
 * @param {number} [opts.animationDuration] - Logo spin duration in seconds (1–10, default 3)
 * @param {string} theme - Theme name
 * @returns {Promise<string>} SVG string
 */
export async function generateQRCodeSVG(content, opts = {}, theme = 'radical') {
  const THEME = THEMES[theme] || THEMES.radical;

  const size = Math.max(100, Math.min(800, opts.size || 300));
  const margin = Math.max(0, Math.min(4, opts.margin !== undefined ? opts.margin : 2));
  const animate = opts.animate === true;
  const animationDuration = Math.max(1, Math.min(10, opts.animationDuration || 3));
  const title = opts.title || '';
  const logoInput = opts.logo || '';
  const useThemeColor = opts.useThemeColor === true;
  // Determine effective logo color: explicit override > theme color > brand color (null = use brand)
  const logoColor = opts.logoColor || (useThemeColor ? THEME.title.replace('#', '') : null);

  // Generate QR code matrix (ECL H = up to 30% recoverable, needed for logo overlay)
  const qr = QRCode.create(content, { errorCorrectionLevel: 'H' });
  const moduleCount = qr.modules.size;
  const moduleData = qr.modules.data;

  // Calculate module size to fit the requested size
  const totalModules = moduleCount + 2 * margin;
  const moduleSize = size / totalModules;
  const actualSize = moduleSize * totalModules; // may differ slightly from requested

  // Layout
  const padding = 24;
  const titleHeight = title ? 40 : 0;
  const totalWidth = Math.round(actualSize + 2 * padding);
  const totalHeight = Math.round(actualSize + 2 * padding + titleHeight);
  const qrOriginX = padding;
  const qrOriginY = padding + titleHeight;
  const centerX = qrOriginX + actualSize / 2;
  const centerY = qrOriginY + actualSize / 2;

  // Logo dimensions (25% of QR size, safe for ECL H)
  const logoSize = actualSize * 0.25;
  const logoBgRadius = logoSize * 0.62;

  // Fetch logo icon data if requested
  let iconData = null;
  if (logoInput) {
    const isUrl = logoInput.startsWith('http://') || logoInput.startsWith('https://');
    const colorHex = logoColor ? logoColor.replace('#', '') : null;
    iconData = await fetchIconData(
      isUrl ? null : logoInput,
      isUrl ? logoInput : null,
      colorHex
    );
  }

  // Build dark-module path (one path element for all modules = much faster rendering)
  const pathParts = [];
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (moduleData[row * moduleCount + col]) {
        const x = (qrOriginX + (margin + col) * moduleSize).toFixed(2);
        const y = (qrOriginY + (margin + row) * moduleSize).toFixed(2);
        const s = moduleSize.toFixed(2);
        pathParts.push(`M${x},${y}h${s}v${s}h-${s}Z`);
      }
    }
  }
  const modulePath = pathParts.join('');

  // Determine dark module color: use THEME.title (bright accent) for visual appeal
  // For transparent themes, title may be bright on dark canvas — that's fine for scanning
  const darkColor = THEME.title;

  // For transparent themes, the QR area background needs a fallback so the code is scannable
  const qrBg = THEME.bg === 'transparent' ? (theme.includes('black') ? '#ffffff' : '#0f1724') : THEME.bg;

  // Build SVG
  const svgParts = [];

  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" role="img" aria-label="${escapeXML(title || 'QR Code')}">`);
  svgParts.push(`<!-- Created By GitHub Widgets - Authored by cyrus2281 -->`);

  // Styles and animations
  svgParts.push(`<defs><style>`);
  svgParts.push(`  .qr-title { opacity: 0; animation: qrFadeIn 0.5s ease-out 0.1s forwards; }`);
  if (animate && iconData && iconData.type !== 'none') {
    svgParts.push(`  @keyframes qrLogoSpin {`);
    svgParts.push(`    0%   { transform: rotateY(0deg); }`);
    svgParts.push(`    100% { transform: rotateY(360deg); }`);
    svgParts.push(`  }`);
    svgParts.push(`  .qr-logo { animation: qrLogoSpin ${animationDuration}s linear infinite; transform-origin: ${centerX.toFixed(2)}px ${centerY.toFixed(2)}px; }`);
  }
  svgParts.push(`  @keyframes qrFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }`);
  svgParts.push(`</style></defs>`);

  // Outer background
  svgParts.push(`<rect width="${totalWidth}" height="${totalHeight}" rx="16" fill="${THEME.bg}" stroke="${THEME.border}" stroke-width="1"/>`);

  // QR code area background (explicit so transparent themes are scannable)
  if (THEME.bg === 'transparent') {
    svgParts.push(`<rect x="${qrOriginX}" y="${qrOriginY}" width="${actualSize.toFixed(2)}" height="${actualSize.toFixed(2)}" fill="${qrBg}"/>`);
  }

  // Optional title
  if (title) {
    const titleY = padding + 26;
    svgParts.push(`<text class="qr-title" x="${totalWidth / 2}" y="${titleY}" text-anchor="middle" fill="${THEME.title}" font-family="'Segoe UI',Roboto,sans-serif" font-size="22" font-weight="700">${escapeXML(title)}</text>`);
  }

  // QR modules as a single path
  svgParts.push(`<path d="${modulePath}" fill="${darkColor}"/>`);

  // Logo overlay (only if icon was found)
  if (iconData && iconData.type !== 'none') {
    const logoClass = animate ? ' class="qr-logo"' : '';
    svgParts.push(`<g${logoClass}>`);

    // Background circle to separate logo from QR modules
    svgParts.push(`  <circle cx="${centerX.toFixed(2)}" cy="${centerY.toFixed(2)}" r="${logoBgRadius.toFixed(2)}" fill="${qrBg}"/>`);

    // Logo content
    const halfLogo = logoSize / 2;
    const logoX = centerX - halfLogo;
    const logoY = centerY - halfLogo;

    if (iconData.type === 'svg' && iconData.innerContent) {
      const { width: vbW, height: vbH } = iconData.viewBox;
      const uniformScale = Math.min(logoSize / vbW, logoSize / vbH);
      const scaledW = vbW * uniformScale;
      const scaledH = vbH * uniformScale;
      const offsetX = logoX + (logoSize - scaledW) / 2;
      const offsetY = logoY + (logoSize - scaledH) / 2;
      svgParts.push(`  <g transform="translate(${offsetX.toFixed(2)},${offsetY.toFixed(2)}) scale(${uniformScale.toFixed(4)})">${iconData.innerContent}</g>`);
    } else if (iconData.type === 'datauri') {
      svgParts.push(`  <image href="${iconData.dataURI}" x="${logoX.toFixed(2)}" y="${logoY.toFixed(2)}" width="${logoSize.toFixed(2)}" height="${logoSize.toFixed(2)}"/>`);
    }

    svgParts.push(`</g>`);
  }

  svgParts.push(`</svg>`);

  return stampSvg(svgParts.join('\n'));
}
