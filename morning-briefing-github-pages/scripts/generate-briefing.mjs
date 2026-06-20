import { mkdir, writeFile } from "node:fs/promises";

const today = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "full",
  timeZone: "Asia/Singapore",
}).format(new Date());

const topics = [
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
    title: "AI & Commerce Tech",
    color: "#7c3aed",
    queries: ["AI agentic commerce technology news payments"],
    angle:
      "The commerce angle is relevant because agentic buying, identity, and checkout automation could change how merchants integrate payments.",
  },
  {
    title: "World",
    color: "#334155",
    queries: ["world top news headlines business economy"],
    angle:
      "The broader macro signal may affect consumer demand, merchant sentiment, FX exposure, or operating risk.",
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
