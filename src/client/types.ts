export type PostStatus = "draft" | "scheduled" | "published" | "failed";

export type View = "research" | "produce" | "publish" | "measure" | "optimize" | "compose";

export interface Plan {
  id: number;
  name: string;
  keyword: string;
  audience: string;
  notes: string;
  created_at: string;
}

export interface Post {
  id: number;
  plan_id: number | null;
  title: string;
  keyword: string;
  meta_description: string;
  content_html: string;
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  queue_job_id: string | null;
  wp_post_id: number | null;
  published_url: string | null;
  error: string | null;
  rank: number | null;
  rank_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RankingsResult =
  | { live: false }
  | { live: true; domain: string | null; checked: number; unchecked: number };

export interface Stats {
  total: number;
  drafts: number;
  scheduled: number;
  published: number;
  failed: number;
  plans: number;
  daily: Array<{ day: string; count: number }>;
}

export interface AppStatus {
  wordpress_connected: boolean;
  ai: boolean;
  research_live: boolean;
}

export type KeywordIntent = "informational" | "commercial" | "transactional" | "navigational";
export type Difficulty = "Low" | "Medium" | "High";
export type ResearchSource = "live" | "ai";

export interface KeywordIdea {
  keyword: string;
  intent: KeywordIntent;
  difficulty: Difficulty;
  angle: string;
}

export interface KeywordDiscovery {
  source: ResearchSource;
  ideas: KeywordIdea[];
}

export interface Competitor {
  position: number;
  domain: string;
  title: string;
  url: string;
}

export type CompetitorResult =
  | { live: true; seed: string; competitors: Competitor[]; gaps: string[] }
  | { live: false };
