import { mkdir, writeFile } from "node:fs/promises";

const TODAY = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "full",
  timeZone: "Asia/Singapore",
}).format(new Date());

const TOPICS = [
  {
    id: "stripe",
    title: "Stripe & Rivals",
    color: "#635bff",
    queries: [
      "Stripe payments news",
      "Adyen PayPal Block agentic commerce payments",
    ],
    implication:
      "For a Stripe PM covering Greater China, the competitive signal is worth tracking for product packaging, enterprise sales, and partner strategy.",
  },
  {
    id: "fintech",
    title: "Fintech",
    color: "#0f766e",
    queries: ["fintech payments stablecoin RWA tokenization fraud"],
    implication:
      "The development may shape customer demand, compliance expectations, or platform risk controls across cross-border payment flows.",
  },
  {
    id: "china",
    title: "Greater China",
    color: "#b42318",
    queries: [
      "Greater China payments Alipay WeChat Pay digital yuan cross-border regulation",
      "China economy news Hong Kong Taiwan",
    ],
    implication:
      "The China, Hong Kong, or Taiwan angle matters for market access, localization choices, and merchant operating confidence.",
  },
  {
    id: "tech",
    title: "AI & Commerce Tech",
    color: "#7c3aed",
    queries: ["AI agentic commerce technology news payments"],
    implication:
      "The commerce angle is relevant because agentic buying, identity, and checkout automation could change how merchants integrate payments.",
  },
  {
    id: "world",
    title: "World",
    color: "#334155",
    queries: ["world top news headlines business economy"],
    implication:
      "The broader macro signal may affect consumer demand, merchant sentiment, FX exposure, or operating risk.",
  },
];

function escapeHtml(value = "") {
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
    .replaceAll("&#039;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(value = "") {
  return decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "News";
  }
}

function headline(title) {
  return stripTags(title)
    .replace(/\s+-\s+[^-]+$/, "")
    .split(/\s+/)
    .slice(0, 14)
    .join(" ");
}

function twoSentenceSummary(item, implication) {
  const cleanTitle = headline(item.title);
  const description = stripTags(item.description)
    .replace(/\s*Read more.*$/i, "")
    .split(/(?<=[.!?])\s+/)[0];
  const first =
    description && description.length > 45
      ? description
      : `${cleanTitle} was among the latest reports tracked in global news feeds.`;
  return `${first.replace(/\s+/g, " ").trim()} ${implication}`;
}

function extractItems(xml) {
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => {
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
      pubDate: pick("pubDate"),
      source: pick("source"),
    };
  });
  return items.filter((item) => item.title && item.link?.startsWith("http"));
}

async function fetchBingNews(query) {
  const url = new URL("https://www.bing.com/news/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "rss");
  url.searchParams.set("setlang", "en-US");
  url.searchParams.set("cc", "US");
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MorningBriefingBot/1.0; +https://github.com/)",
    },
  });
  if (!response.ok) {
    throw new Error(`Bing News RSS failed for "${query}": ${response.status}`);
  }
  return extractItems(await response.text());
}

async function getTopicStories(topic) {
  const seen = new Set();
  const stories = [];
  for (const query of topic.queries) {
    try {
      const items = await fetchBingNews(query);
      for (const item of items) {
        const key = `${headline(item.title).toLowerCase()}|${hostname(item.link)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        stories.push({
          headline: headline(item.title),
          summary: twoSentenceSummary(item, topic.implication),
          source: item.source || hostname(item.link),
          url: item.link,
          published: item.pubDate,
        });
        if (stories.length === 6) return stories;
      }
    } catch (error) {
      console.warn(error.message);
    }
  }
  return stories;
}

const sections = [];
for (const topic of TOPICS) {
  sections.push({
    id: topic.id,
    title: topic.title,
    color: topic.color,
    stories: await getTopicStories(topic),
  });
}

const briefing = {
  date: TODAY,
  generatedAt: new Date().toISOString(),
  timezone: "Asia/Singapore",
  sections,
};

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Morning Briefing</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fb;
      --ink: #172033;
      --muted: #5d6677;
      --line: #dfe4ec;
      --panel: #ffffff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.45;
    }
    header {
      padding: 28px 18px 18px;
      background: #ffffff;
      border-bottom: 1px solid var(--line);
    }
    .wrap {
      width: min(920px, 100%);
      margin: 0 auto;
    }
    h1 {
      margin: 0 0 6px;
      font-size: clamp(1.85rem, 7vw, 3.4rem);
      letter-spacing: 0;
      line-height: 1;
    }
    .date {
      color: var(--muted);
      margin: 0 0 18px;
      font-size: 0.98rem;
    }
    button {
      border: 0;
      border-radius: 8px;
      background: #172033;
      color: white;
      font: inherit;
      font-weight: 700;
      padding: 11px 14px;
      min-height: 44px;
    }
    main { padding: 18px; }
    details {
      background: var(--panel);
      border: 1px solid var(--line);
      border-left: 6px solid var(--accent);
      border-radius: 8px;
      margin: 0 auto 14px;
      overflow: hidden;
    }
    summary {
      cursor: pointer;
      list-style: none;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      font-weight: 800;
      font-size: 1.05rem;
    }
    summary::-webkit-details-marker { display: none; }
    .count {
      color: var(--muted);
      font-weight: 600;
      font-size: 0.9rem;
      white-space: nowrap;
    }
    .stories {
      border-top: 1px solid var(--line);
      padding: 4px 16px 12px;
    }
    article {
      padding: 14px 0;
      border-bottom: 1px solid var(--line);
    }
    article:last-child { border-bottom: 0; }
    h2 {
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
      color: var(--muted);
      font-size: 0.9rem;
    }
    a {
      color: var(--accent);
      font-weight: 800;
      text-decoration: none;
      white-space: nowrap;
    }
    .empty {
      color: var(--muted);
      padding: 14px 0;
    }
  </style>
</head>
<body>
  <header>
    <div class="wrap">
      <h1>Morning Briefing</h1>
      <p class="date">${escapeHtml(TODAY)} · Stripe PM lens for Greater China</p>
      <button id="play" type="button">Play Briefing</button>
    </div>
  </header>
  <main class="wrap" id="app"></main>
  <script type="application/json" id="briefing-data">${escapeHtml(JSON.stringify(briefing))}</script>
  <script>
    const data = JSON.parse(document.getElementById("briefing-data").textContent);
    const app = document.getElementById("app");
    app.innerHTML = data.sections.map((section, index) => \`
      <details style="--accent: \${section.color}" \${index === 0 ? "open" : ""}>
        <summary>
          <span>\${section.title}</span>
          <span class="count">\${section.stories.length} stories</span>
        </summary>
        <div class="stories">
          \${section.stories.length ? section.stories.map(story => \`
            <article>
              <h2>\${story.headline}</h2>
              <p>\${story.summary}</p>
              <div class="meta">
                <span>\${story.source}</span>
                <a href="\${story.url}" target="_blank" rel="noopener noreferrer">Read -&gt;</a>
              </div>
            </article>
          \`).join("") : \`<p class="empty">No stories found for this section on this run.</p>\`}
        </div>
      </details>
    \`).join("");

    document.getElementById("play").addEventListener("click", () => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang === "en-GB") || voices.find(v => v.lang.startsWith("en"));
      const text = data.sections.map(section =>
        section.title + ". " + section.stories.map(story =>
          story.headline + ". " + story.summary
        ).join(" ")
      ).join(" ");
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88;
      utterance.pitch = 0.96;
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    });
  </script>
</body>
</html>`;

await mkdir("site", { recursive: true });
await writeFile("site/index.html", html, "utf8");
await writeFile("site/briefing.json", `${JSON.stringify(briefing, null, 2)}\n`, "utf8");

console.log(`Generated ${sections.reduce((sum, section) => sum + section.stories.length, 0)} stories.`);
