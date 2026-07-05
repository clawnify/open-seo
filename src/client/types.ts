export type PostStatus = "draft" | "scheduled" | "published" | "failed";

export type View = "dashboard" | "pipeline" | "calendar" | "plans" | "compose";

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
  created_at: string;
  updated_at: string;
}

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
}
