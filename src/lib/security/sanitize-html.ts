/**
 * Minimal rich-text sanitizer for product content.
 * Allows headings, lists, bold, italic, paragraphs, and safe http(s) links.
 * Strips scripts, event handlers, and javascript: URLs.
 */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "a",
]);

export function sanitizeProductHtml(input: string): string {
  if (!input) return "";

  let html = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/on\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");

  html = html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, tag: string, attrs: string) => {
    const name = tag.toLowerCase();
    const closing = full.startsWith("</");
    if (!ALLOWED_TAGS.has(name)) return "";
    if (closing) return `</${name}>`;
    if (name === "br") return "<br />";
    if (name === "a") {
      const hrefMatch = attrs.match(/href\s*=\s*(['"])(.*?)\1/i);
      const href = hrefMatch?.[2]?.trim() ?? "";
      if (!/^https?:\/\//i.test(href) && !href.startsWith("/")) {
        return "<a>";
      }
      const safeHref = href.replace(/"/g, "&quot;");
      return `<a href="${safeHref}" rel="noopener noreferrer">`;
    }
    return `<${name}>`;
  });

  return html.trim();
}

export function sanitizePlainText(input: string, max = 5000): string {
  return input.replace(/[<>]/g, "").slice(0, max).trim();
}
