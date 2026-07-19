import * as cheerio from "cheerio";

export interface ExtractedPage {
  url: string;
  title: string;
  description: string;
  markdown: string;
  text: string;
  links: { href: string; text: string }[];
  meta: Record<string, string>;
  structured: {
    emails: string[];
    phones: string[];
    socials: string[];
    technologies: string[];
  };
  stats: {
    htmlBytes: number;
    wordCount: number;
    linkCount: number;
  };
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/g;

const SOCIAL_HOSTS = [
  "twitter.com",
  "x.com",
  "linkedin.com",
  "github.com",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "t.me",
];

const TECH_HINTS: Record<string, RegExp> = {
  React: /react/i,
  Nextjs: /_next\/static|__NEXT_DATA__/i,
  Vue: /vue\.js|__vue__/i,
  Angular: /ng-version|angular/i,
  WordPress: /wp-content|wp-includes/i,
  Cloudflare: /cloudflare|cf-ray/i,
  GoogleAnalytics: /google-analytics|gtag\/js|UA-\d|G-[A-Z0-9]+/i,
  Stripe: /js\.stripe\.com/i,
};

export function extractPage(url: string, html: string): ExtractedPage {
  const $ = cheerio.load(html);

  // strip noise
  $("script, style, noscript, svg, iframe").remove();

  const title = $("title").first().text().trim() || $("h1").first().text().trim() || "";
  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  const meta: Record<string, string> = {};
  $("meta").each((_, el) => {
    const name = $(el).attr("name") || $(el).attr("property");
    const content = $(el).attr("content");
    if (name && content) meta[name] = content.slice(0, 500);
  });

  const links: { href: string; text: string }[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    try {
      const abs = new URL(href, url).toString();
      links.push({ href: abs, text: $(el).text().replace(/\s+/g, " ").trim().slice(0, 120) });
    } catch {
      /* skip */
    }
  });

  // markdown-ish
  const parts: string[] = [];
  if (title) parts.push(`# ${title}`, "");
  if (description) parts.push(`> ${description}`, "");

  $("h1,h2,h3,h4,p,li,pre,code,blockquote").each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase?.() || el.type;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!text) return;
    if (tag === "h1") parts.push(`# ${text}`);
    else if (tag === "h2") parts.push(`## ${text}`);
    else if (tag === "h3") parts.push(`### ${text}`);
    else if (tag === "h4") parts.push(`#### ${text}`);
    else if (tag === "li") parts.push(`- ${text}`);
    else if (tag === "pre" || tag === "code") parts.push("```", text, "```");
    else if (tag === "blockquote") parts.push(`> ${text}`);
    else parts.push(text);
    parts.push("");
  });

  const markdown = parts.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 120_000);
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 80_000);

  const emails = Array.from(new Set((text.match(EMAIL_RE) || []).slice(0, 50)));
  const phones = Array.from(
    new Set(
      (text.match(PHONE_RE) || [])
        .map((p) => p.trim())
        .filter((p) => p.replace(/\D/g, "").length >= 8)
        .slice(0, 30)
    )
  );

  const socials = Array.from(
    new Set(
      links
        .filter((l) => SOCIAL_HOSTS.some((h) => l.href.includes(h)))
        .map((l) => l.href)
        .slice(0, 40)
    )
  );

  const technologies = Object.entries(TECH_HINTS)
    .filter(([, re]) => re.test(html))
    .map(([name]) => name);

  return {
    url,
    title,
    description,
    markdown,
    text,
    links: dedupeLinks(links).slice(0, 200),
    meta,
    structured: { emails, phones, socials, technologies },
    stats: {
      htmlBytes: Buffer.byteLength(html, "utf8"),
      wordCount: text.split(/\s+/).filter(Boolean).length,
      linkCount: links.length,
    },
  };
}

function dedupeLinks(links: { href: string; text: string }[]) {
  const seen = new Set<string>();
  const out: { href: string; text: string }[] = [];
  for (const l of links) {
    if (seen.has(l.href)) continue;
    seen.add(l.href);
    out.push(l);
  }
  return out;
}
