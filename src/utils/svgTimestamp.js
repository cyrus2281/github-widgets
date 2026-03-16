/**
 * Minify an SVG string by collapsing whitespace to a single line.
 * @param {string} svgString - The SVG markup
 * @returns {string} Minified SVG
 */
export function minifySvg(svgString) {
  if (!svgString) return "";

  return svgString
    // Remove line breaks and tabs
    .replace(/[\n\r\t]+/g, " ")
    // Remove whitespace between tags
    .replace(/>\s+</g, "><")
    // Collapse multiple spaces
    .replace(/\s{2,}/g, " ")
    // Remove spaces around = in attributes
    .replace(/\s*=\s*/g, "=")
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Append a generation timestamp comment to an SVG string, then minify.
 * @param {string} svgString - The SVG markup
 * @returns {string} Stamped and minified SVG
 */
export function stampSvg(svgString) {
  const timestamp = new Date().toISOString();
  const stamped = svgString.replace(/<\/svg>\s*$/, `<!-- Generated: ${timestamp} --></svg>`);
  return minifySvg(stamped);
}
