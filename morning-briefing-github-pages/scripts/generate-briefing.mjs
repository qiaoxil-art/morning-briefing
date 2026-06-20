import { mkdir, writeFile } from "node:fs/promises";

const today = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "full",
  timeZone: "Asia/Singapore",
}).format(new Date());

const topics = [
  {
    title: "World",
    color: "#334155",
    queries: ["world top news headlines business economy"],
    angle:
      "The broader macro signal may affect consumer demand, merchant sentiment, FX exposure, or operating risk.",
  },
  {
    title: "Greater China",
    color: "#b42318",
    queries: [
      "Greater China payments Alipay WeChat Pay digital yuan cross-border regulation",
      "China economy news Hong Kong Taiwan",
    ],
    angle:
      "The China, Hong Kong, or Taiwan angle matters for market access, localization choices, and merchant operating confidence.",
  },
  {
    title: "Tech",
    color: "#7c3aed",
    queries: ["AI agentic commerce technology news payments"],
    angle:
      "The commerce angle is relevant because agentic buying, identity, and checkout automation could change how merchants integrate payments.",
  },
  {
    title: "Stripe & Rivals",
    color: "#635bff",
    queries: ["Stripe payments news", "Adyen PayPal Block agentic commerce payments"],
    angle:
      "For a Stripe PM covering Greater China, the competitive signal is worth tracking for product packaging, enterprise sales, and partner strategy.",
  },
  {
    title: "Fintech",
    color: "#0f766e",
    queries: ["fintech payments stablecoin RWA tokenization fraud"],
    angle:
      "The development may shape customer demand, compliance expectations, or platform risk controls across cross-border payment flows.",
  },
];

function htmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function decodeEntities(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#039;", "'");
}

function stripTags(value = "") {
  return decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function sourceFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "News";
  }
}

function makeHeadline(title) {
  return stripTags(title)
    .replace(/\s+-\s+[^-]+$/, "")
    .split(/\s+/)
    .slice(0, 14)
    .join(" ");
}

function makeSummary(item, angle) {
  const description = stripTags(item.description).split(/(?<=[.!?])\s+/)[0];
  const firstSentence =
    description && description.length > 45
      ? description
      : `${makeHeadline(item.title)} was among the latest reports tracked in global news feeds.`;
  return `${firstSentence} ${angle}`;
}

function extractItems(xml) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)]
    .map((match) => {
      const block = match[0];
      const pick = (tag) => {
        const found = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
        if (!found) return "";
        return decodeEntities(found[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim());
      };
      return {
        title: pick("title"),
        link: pick("link"),
        description: pick("description"),
        source: pick("source"),
      };
    })
    .filter((item) => item.title && item.link.startsWith("http"));
}

async function fetchNews(query) {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", `${query} when:2d`);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 MorningBriefingBot",
    },
  });
  if (!response.ok) throw new Error(`News fetch failed: ${response.status}`);
  return extractItems(await response.text());
}

async function getStories(topic) {
  const stories = [];
  const seen = new Set();

  for (const query of topic.queries) {
    try {
      const items = await fetchNews(query);
      for (const item of items) {
        const key = `${makeHeadline(item.title).toLowerCase()}|${sourceFromUrl(item.link)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        stories.push({
          headline: makeHeadline(item.title),
          summary: makeSummary(item, topic.angle),
          source: item.source || sourceFromUrl(item.link),
          url: item.link,
        });
        if (stories.length === 6) return stories;
      }
    } catch (error) {
      console.warn(`${query}: ${error.message}`);
    }
  }

  return stories;
}

const sections = [];
for (const topic of topics) {
  sections.push({ ...topic, stories: await getStories(topic) });
}
const storyCount = sections.reduce((total, section) => total + section.stories.length, 0);

function renderStories(stories) {
  if (!stories.length) {
    return '<p class="empty">No stories found for this section on this run.</p>';
  }

  return stories
    .map(
      (story) => `
        <article>
          <h3>${htmlEscape(story.headline)}</h3>
          <p>${htmlEscape(story.summary)}</p>
          <div class="meta">
            <span>${htmlEscape(story.source)}</span>
            <a href="${htmlEscape(story.url)}" target="_blank" rel="noopener noreferrer">Read -&gt;</a>
          </div>
        </article>`
    )
    .join("");
}

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Morning Briefing</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f7f8fb;
      color: #172033;
      line-height: 1.45;
    }
    header {
      padding: 28px 18px 20px;
      background: #fff;
      border-bottom: 1px solid #dfe4ec;
    }
    .wrap {
      width: min(920px, 100%);
      margin: 0 auto;
    }
    h1 {
      margin: 0 0 8px;
      font-size: clamp(2rem, 8vw, 4rem);
      line-height: 1;
      letter-spacing: 0;
    }
    .date {
      margin: 0;
      color: #5d6677;
      font-size: 1rem;
    }
    .status {
      margin: 8px 0 0;
      color: #5d6677;
      font-size: 0.92rem;
    }
    main {
      padding: 18px;
    }
    section {
      background: #fff;
      border: 1px solid #dfe4ec;
      border-left: 6px solid var(--accent);
      border-radius: 8px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    h2 {
      margin: 0;
      padding: 16px;
      border-bottom: 1px solid #dfe4ec;
      font-size: 1.08rem;
      letter-spacing: 0;
    }
    article {
      padding: 14px 16px;
      border-bottom: 1px solid #dfe4ec;
    }
    article:last-child {
      border-bottom: 0;
    }
    h3 {
      margin: 0 0 7px;
      font-size: 1.02rem;
      line-height: 1.25;
      letter-spacing: 0;
    }
    p {
      margin: 0 0 8px;
      color: #2e3748;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      color: #5d6677;
      font-size: 0.9rem;
    }
    a {
      color: var(--accent);
      font-weight: 800;
      text-decoration: none;
      white-space: nowrap;
    }
    .empty {
      padding: 14px 16px;
      color: #5d6677;
    }
  </style>
</head>
<body>
  <header>
    <div class="wrap">
      <h1>Morning Briefing</h1>
      <p class="date">${htmlEscape(today)} · Stripe PM lens for Greater China</p>
      <p class="status">${storyCount} stories generated from public news feeds</p>
    </div>
  </header>
  <main class="wrap">
    ${sections
      .map(
        (section) => `
          <section style="--accent: ${htmlEscape(section.color)}">
            <h2>${htmlEscape(section.title)} · ${section.stories.length} stories</h2>
            ${renderStories(section.stories)}
          </section>`
      )
      .join("")}
  </main>
</body>
</html>`;

await mkdir("site", { recursive: true });
await writeFile("site/index.html", page, "utf8");
await writeFile("site/briefing.json", `${JSON.stringify({ today, sections }, null, 2)}\n`, "utf8");

console.log(`Generated ${storyCount} stories.`);
