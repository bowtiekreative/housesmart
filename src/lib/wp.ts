/**
 * Headless WordPress client for the `jtbd_posts` custom post type.
 *
 * Reads through the WP REST API. When WP_URL isn't configured or WordPress is
 * unreachable (local dev, first deploy before content exists), it falls back
 * to bundled sample posts so the site still renders end-to-end.
 */
import { SAMPLE_POSTS } from './sample-data';

export interface MorphologicalNode {
  interrogative: 'Who' | 'What' | 'Where' | 'When' | 'Why' | 'How';
  relational: 'Direct' | 'Indirect' | 'Opposite' | 'Inverse' | 'Parallel' | 'Cross';
  scale: 'One' | 'Partial' | 'Many' | 'Any' | 'All' | 'None';
  solution_concept: string;
}

export interface JtbdPost {
  id: string;
  slug: string;
  title: string;
  date: string;
  meta_title: string;
  meta_description: string;
  content_markdown: string;
  pre_conditions: string[];
  post_conditions: string[];
  tools_resources: string[];
  action: string;
  object: string;
  outcome: string;
  morphological_node: MorphologicalNode;
  solution_status: 'Existing' | 'Speculative';
  source_url?: string;
  source_name?: string;
}

const WP_URL = (process.env.WP_URL || import.meta.env?.WP_URL || '').replace(/\/$/, '');

interface WpRestPost {
  id: number;
  slug: string;
  date: string;
  title: { rendered: string };
  acf?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

function fields(raw: WpRestPost): Record<string, unknown> {
  // ACF exposes fields under `acf`; register_post_meta exposes them under `meta`.
  return { ...(raw.meta ?? {}), ...(raw.acf ?? {}) };
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function mapPost(raw: WpRestPost): JtbdPost {
  const f = fields(raw);
  const node = (typeof f.morphological_node === 'object' && f.morphological_node) || {
    interrogative: f.matrix_interrogative,
    relational: f.matrix_relational,
    scale: f.matrix_scale,
    solution_concept: f.solution_concept,
  };
  const n = node as Record<string, unknown>;
  return {
    id: String(raw.id),
    slug: raw.slug,
    title: decodeEntities(raw.title.rendered),
    date: raw.date,
    meta_title: String(f.meta_title || decodeEntities(raw.title.rendered)),
    meta_description: String(f.meta_description || ''),
    content_markdown: String(f.post_content_markdown || ''),
    pre_conditions: toList(f.pre_conditions),
    post_conditions: toList(f.post_conditions),
    tools_resources: toList(f.tools_resources),
    action: String(f.action || ''),
    object: String(f.object || ''),
    outcome: String(f.outcome || ''),
    morphological_node: {
      interrogative: (n.interrogative as MorphologicalNode['interrogative']) || 'How',
      relational: (n.relational as MorphologicalNode['relational']) || 'Direct',
      scale: (n.scale as MorphologicalNode['scale']) || 'One',
      solution_concept: String(n.solution_concept || ''),
    },
    solution_status: f.solution_status === 'Speculative' ? 'Speculative' : 'Existing',
    source_url: f.source_url ? String(f.source_url) : undefined,
    source_name: f.source_name ? String(f.source_name) : undefined,
  };
}

async function wpFetch(path: string): Promise<WpRestPost[] | null> {
  if (!WP_URL) return null;
  try {
    const res = await fetch(`${WP_URL}/wp-json/wp/v2/jtbd_posts${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as WpRestPost[];
  } catch {
    return null;
  }
}

export async function getAllPosts(limit = 100): Promise<JtbdPost[]> {
  const raw = await wpFetch(`?per_page=${Math.min(limit, 100)}&orderby=date&order=desc&_embed=false`);
  if (raw && raw.length) return raw.map(mapPost);
  return SAMPLE_POSTS;
}

export async function getPostBySlug(slug: string): Promise<JtbdPost | null> {
  const raw = await wpFetch(`?slug=${encodeURIComponent(slug)}`);
  if (raw && raw.length) return mapPost(raw[0]);
  return SAMPLE_POSTS.find((p) => p.slug === slug) ?? null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8211;|&ndash;/g, '–');
}
