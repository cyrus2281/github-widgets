/**
 * Append a generation timestamp comment to an SVG string.
 * @param {string} svgString - The SVG markup
 * @returns {string} SVG with a timestamp comment before the closing </svg> tag
 */
export function stampSvg(svgString) {
  const timestamp = new Date().toISOString();
  return svgString.replace(/<\/svg>\s*$/, `<!-- Generated: ${timestamp} -->\n</svg>`);
}
