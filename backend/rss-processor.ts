/**
 * HomeSmart.ca — Feed ingestion + AI processing pipeline.
 *
 * 1. Pulls construction / home-building / architecture RSS feeds.
 * 2. Sends each fresh item to DeepSeek (deepseek-v4-flash, JSON mode) which
 *    extracts the Job-To-Be-Done and maps it onto one node of the 6×6×6
 *    morphological matrix, then writes the article in enforced human voice.
 * 3. Validates the output (shape + banned-word scan, one retry with feedback).
 * 4. Publishes to headless WordPress as a `jtbd_posts` entry.
 *
 * Run once:      npm run rss:process
 * Run on a loop: npm run rss:loop   (see backend/rss-loop.ts)
 */
import Parser from 'rss-parser';
import { marked } from 'marked';

/* ----------------------------------------------------------------- config */

const DEEPSEEK_API_KEY = required('DEEPSEEK_API_KEY');
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const WP_URL = required('WP_URL').replace(/\/$/, '');
const WP_AUTH_KEY = required('WP_AUTH_KEY'); // "username:application-password"
const MAX_ITEMS_PER_RUN = Number(process.env.MAX_ITEMS_PER_RUN || 5);

const DEFAULT_FEEDS = [
  'https://www.constructiondive.com/feeds/news/',
  'https://www.canadianconstructionnetwork.com/feed/',
  'https://www.archdaily.com/feed',
  'https://www.greenbuildingadvisor.com/feed',
  'https://www.jlconline.com/rss/all-content.xml',
];

const FEEDS = (process.env.RSS_FEEDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const ACTIVE_FEEDS = FEEDS.length ? FEEDS : DEFAULT_FEEDS;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name} (see .env.example)`);
    process.exit(1);
  }
  return value;
}

/* -------------------------------------------------- morphological matrix */

export const MATRIX = {
  interrogative: ['Who', 'What', 'Where', 'When', 'Why', 'How'],
  relational: ['Direct', 'Indirect', 'Opposite', 'Inverse', 'Parallel', 'Cross'],
  scale: ['One', 'Partial', 'Many', 'Any', 'All', 'None'],
} as const;

/* ------------------------------------------------------ output contract */

export interface JtbdAnalysis {
  jtbd_title: string;
  pre_conditions: string[];
  post_conditions: string[];
  tools_resources: string[];
  actions_objects_outcomes: {
    action: string;
    object: string;
    outcome: string;
  };
  morphological_node: {
    interrogative: string;
    relational: string;
    scale: string;
    solution_concept: string;
  };
  solution_status: 'Existing' | 'Speculative';
  post_content_markdown: string;
  meta_title: string;
  meta_description: string;
}

export const BANNED_WORDS = [
  'delve', 'tapestry', 'game-changer', 'game changer', 'seamless', 'seamlessly',
  'revolutionary', 'revolutionize', 'testament', 'spearhead', 'elevate',
  'robust', 'paramount', 'unleash', 'navigating', 'navigate the', 'landscape',
  'vital', 'realm', 'furthermore', 'moreover', 'in conclusion', 'dive into',
  'unlock', 'leverage', 'cutting-edge', 'cutting edge', 'transformative',
  'in today’s', "in today's", 'ever-evolving', 'holistic', 'synergy',
];

const SYSTEM_PROMPT = `You are a senior construction consultant who writes field notes for HomeSmart.ca, a Canadian site read by builders, renovators, and serious homeowners. You analyze industry news and turn it into practical innovation blueprints.

## Task
Given a news item, do all of the following and return ONE JSON object:

1. Extract the core Job-To-Be-Done (JTBD): what real job is a builder or homeowner trying to get done? Identify pre-conditions (what must be true before), post-conditions (what is true after success), tools/resources involved, and the central action → object → outcome triple.

2. Map the JTBD onto exactly ONE node of the 6×6×6 morphological matrix (216 alternatives). Pick the node that produces the most non-obvious, useful solution angle:
   - interrogative: Who | What | Where | When | Why | How
   - relational: Direct | Indirect | Opposite | Inverse | Parallel | Cross
   - scale: One | Partial | Many | Any | All | None
   Then write a one-sentence solution_concept generated from that node (e.g. "Inverse + When + Partial" → invert the timing for part of the process).

3. Mark solution_status "Existing" if the solution is in use today, "Speculative" if the node generated a concept not yet on the market.

4. Write the article (post_content_markdown, 400-700 words, Markdown with ## subheads).

## Writing rules — non-negotiable
- Voice: an experienced construction consultant or job-site innovator sharing practical notes. First-person plural ("we tested", "we measured") or direct second person ("if you're framing this...").
- Lead with the problem and the practical fix in the first two sentences. No warm-up paragraph, no scene-setting, no "In the world of construction...".
- Vary sentence length. Short punchy points mixed with complete technical breakdowns. Real numbers, temperatures, costs, dimensions, code references wherever the source supports them.
- No balanced corporate summaries, no artificial fluff, no "In conclusion" endings. End on a concrete recommendation or a caution.
- BANNED words/phrases (never use, any casing): delve, tapestry, game-changer, seamless, revolutionary, testament, spearhead, elevate, robust, paramount, unleash, navigating/navigate the, landscape, vital, realm, furthermore, moreover, dive into, unlock, leverage, cutting-edge, transformative, "in today's", ever-evolving, holistic, synergy.
- meta_title: under 60 chars plus " | HomeSmart.ca", written for search intent, not clickbait.
- meta_description: 140-160 chars, states the concrete problem and fix.

## Output — return ONLY this JSON object, nothing else
{
  "jtbd_title": "string",
  "pre_conditions": ["string"],
  "post_conditions": ["string"],
  "tools_resources": ["string"],
  "actions_objects_outcomes": { "action": "string", "object": "string", "outcome": "string" },
  "morphological_node": { "interrogative": "How", "relational": "Direct", "scale": "All", "solution_concept": "string" },
  "solution_status": "Existing",
  "post_content_markdown": "string",
  "meta_title": "string",
  "meta_description": "string"
}`;

/* ---------------------------------------------------------- DeepSeek call */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function deepseekChat(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    throw new Error(`DeepSeek API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek returned an empty completion');
  return content;
}

/* -------------------------------------------------------------- validation */

export function findBannedWords(analysis: JtbdAnalysis): string[] {
  const haystack = [analysis.post_content_markdown, analysis.meta_title, analysis.meta_description, analysis.jtbd_title]
    .join(' ')
    .toLowerCase();
  return BANNED_WORDS.filter((word) => haystack.includes(word.toLowerCase()));
}

export function validateShape(value: unknown): asserts value is JtbdAnalysis {
  const v = value as Partial<JtbdAnalysis>;
  const fail = (msg: string) => {
    throw new Error(`Invalid analysis shape: ${msg}`);
  };
  if (!v || typeof v !== 'object') fail('not an object');
  if (typeof v.jtbd_title !== 'string' || !v.jtbd_title) fail('jtbd_title');
  for (const key of ['pre_conditions', 'post_conditions', 'tools_resources'] as const) {
    if (!Array.isArray(v[key])) fail(key);
  }
  const aoo = v.actions_objects_outcomes;
  if (!aoo || typeof aoo.action !== 'string' || typeof aoo.object !== 'string' || typeof aoo.outcome !== 'string') {
    fail('actions_objects_outcomes');
  }
  const node = v.morphological_node;
  if (!node) fail('morphological_node');
  if (!MATRIX.interrogative.includes(node!.interrogative as never)) fail(`interrogative "${node!.interrogative}"`);
  if (!MATRIX.relational.includes(node!.relational as never)) fail(`relational "${node!.relational}"`);
  if (!MATRIX.scale.includes(node!.scale as never)) fail(`scale "${node!.scale}"`);
  if (v.solution_status !== 'Existing' && v.solution_status !== 'Speculative') fail('solution_status');
  if (typeof v.post_content_markdown !== 'string' || v.post_content_markdown.length < 200) fail('post_content_markdown');
  if (typeof v.meta_title !== 'string' || !v.meta_title) fail('meta_title');
  if (typeof v.meta_description !== 'string' || !v.meta_description) fail('meta_description');
}

/* -------------------------------------------------------------- analysis */

export async function analyzeNewsItem(item: FeedItem): Promise<JtbdAnalysis> {
  const userMessage = [
    `Source: ${item.sourceName}`,
    `Headline: ${item.title}`,
    `Published: ${item.pubDate || 'unknown'}`,
    `URL: ${item.link}`,
    '',
    'Article text / summary:',
    item.content.slice(0, 6000),
  ].join('\n');

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];

  let lastError = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await deepseekChat(messages);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
      validateShape(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      messages.push(
        { role: 'assistant', content: raw },
        { role: 'user', content: `Your JSON failed validation: ${lastError}. Return the corrected JSON object only.` },
      );
      continue;
    }
    const banned = findBannedWords(parsed as JtbdAnalysis);
    if (banned.length) {
      lastError = `banned words present: ${banned.join(', ')}`;
      messages.push(
        { role: 'assistant', content: raw },
        {
          role: 'user',
          content: `Rewrite the article. These banned words appeared: ${banned.join(', ')}. Replace them with plain trade language a site supervisor would actually say. Return the full corrected JSON object only.`,
        },
      );
      continue;
    }
    return parsed as JtbdAnalysis;
  }
  throw new Error(`Analysis failed after retry: ${lastError}`);
}

/* ------------------------------------------------------------- WordPress */

const wpAuthHeader = `Basic ${Buffer.from(WP_AUTH_KEY).toString('base64')}`;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function wpPostExists(slug: string): Promise<boolean> {
  const res = await fetch(
    `${WP_URL}/wp-json/wp/v2/jtbd_posts?slug=${encodeURIComponent(slug)}&status=publish,draft&_fields=id`,
    { headers: { Authorization: wpAuthHeader }, signal: AbortSignal.timeout(15_000) },
  );
  if (!res.ok) return false;
  const rows = (await res.json()) as unknown[];
  return rows.length > 0;
}

async function publishToWordPress(analysis: JtbdAnalysis, item: FeedItem): Promise<number> {
  const slug = slugify(analysis.jtbd_title);
  const html = await marked.parse(analysis.post_content_markdown);
  const meta = {
    meta_title: analysis.meta_title,
    meta_description: analysis.meta_description,
    post_content_markdown: analysis.post_content_markdown,
    pre_conditions: analysis.pre_conditions.join('\n'),
    post_conditions: analysis.post_conditions.join('\n'),
    tools_resources: analysis.tools_resources.join('\n'),
    action: analysis.actions_objects_outcomes.action,
    object: analysis.actions_objects_outcomes.object,
    outcome: analysis.actions_objects_outcomes.outcome,
    matrix_interrogative: analysis.morphological_node.interrogative,
    matrix_relational: analysis.morphological_node.relational,
    matrix_scale: analysis.morphological_node.scale,
    solution_concept: analysis.morphological_node.solution_concept,
    solution_status: analysis.solution_status,
    source_url: item.link,
    source_name: item.sourceName,
    lead_status: 'open',
  };

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/jtbd_posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: wpAuthHeader },
    body: JSON.stringify({
      title: analysis.jtbd_title,
      slug,
      status: 'publish',
      content: html,
      meta,
      // If ACF Pro + "Show in REST" is enabled the same keys land in field groups:
      acf: meta,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`WordPress publish failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const created = (await res.json()) as { id: number };
  return created.id;
}

/* ------------------------------------------------------------------ feeds */

export interface FeedItem {
  title: string;
  link: string;
  content: string;
  pubDate?: string;
  sourceName: string;
}

const parser = new Parser({ timeout: 20_000 });

async function fetchFeedItems(): Promise<FeedItem[]> {
  const items: FeedItem[] = [];
  for (const url of ACTIVE_FEEDS) {
    try {
      const feed = await parser.parseURL(url);
      const sourceName = feed.title || new URL(url).hostname;
      for (const entry of feed.items.slice(0, 10)) {
        if (!entry.title || !entry.link) continue;
        items.push({
          title: entry.title,
          link: entry.link,
          content: entry.contentSnippet || entry.content || entry.summary || entry.title,
          pubDate: entry.isoDate || entry.pubDate,
          sourceName,
        });
      }
      console.log(`✔ ${sourceName}: ${feed.items.length} items`);
    } catch (err) {
      console.warn(`✘ Feed failed ${url}: ${err instanceof Error ? err.message : err}`);
    }
  }
  // Newest first
  return items.sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime());
}

/* -------------------------------------------------------------------- run */

export async function run(): Promise<void> {
  console.log(`HomeSmart RSS processor — ${ACTIVE_FEEDS.length} feeds, max ${MAX_ITEMS_PER_RUN} posts/run`);
  const items = await fetchFeedItems();
  let published = 0;

  for (const item of items) {
    if (published >= MAX_ITEMS_PER_RUN) break;
    try {
      // Cheap pre-check with a provisional slug from the headline to skip
      // items we've likely already processed (final dedupe is on jtbd slug).
      const analysis = await analyzeNewsItem(item);
      const slug = slugify(analysis.jtbd_title);
      if (await wpPostExists(slug)) {
        console.log(`↷ skip (exists): ${slug}`);
        continue;
      }
      const id = await publishToWordPress(analysis, item);
      published++;
      console.log(
        `✔ published #${id} [${analysis.morphological_node.interrogative}/${analysis.morphological_node.relational}/${analysis.morphological_node.scale}] ${analysis.jtbd_title}`,
      );
    } catch (err) {
      console.error(`✘ ${item.title}: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`Done — ${published} post(s) published.`);
}

// Execute when run directly (npm run rss:process)
const isMain = process.argv[1]?.endsWith('rss-processor.ts');
if (isMain) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
