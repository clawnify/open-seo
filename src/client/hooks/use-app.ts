import { useState, useEffect, useCallback } from "preact/hooks";
import { api } from "../api";
import type { Post, Plan, Stats, AppStatus, KeywordDiscovery, CompetitorResult, RankingsResult } from "../types";

export function useAppState() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [calendarData, setCalendarData] = useState<Record<string, Post[]>>({});
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const clearError = useCallback(() => setError(""), []);

  const loadPosts = useCallback(async () => {
    try { setPosts(await api<Post[]>("GET", "/api/posts")); } catch (e: any) { setError(e.message); }
  }, []);
  const loadPlans = useCallback(async () => {
    try { setPlans(await api<Plan[]>("GET", "/api/plans")); } catch (e: any) { setError(e.message); }
  }, []);
  const loadStats = useCallback(async () => {
    try { setStats(await api<Stats>("GET", "/api/stats")); } catch (e: any) { setError(e.message); }
  }, []);
  const loadCalendar = useCallback(async (month: string) => {
    try {
      setCalendarData(await api<Record<string, Post[]>>("GET", `/api/posts/calendar?month=${month}`));
    } catch (e: any) { setError(e.message); }
  }, []);

  useEffect(() => {
    Promise.all([
      loadPosts(),
      loadPlans(),
      loadStats(),
      api<AppStatus>("GET", "/api/status").then(setStatus).catch(() => {}),
    ]).then(() => setLoading(false));
  }, []);

  // ── Plan CRUD ──
  const createPlan = useCallback(async (data: Partial<Plan>) => {
    try { const p = await api<Plan>("POST", "/api/plans", data); await loadPlans(); await loadStats(); return p; }
    catch (e: any) { setError(e.message); return null; }
  }, [loadPlans, loadStats]);
  const updatePlan = useCallback(async (id: number, data: Partial<Plan>) => {
    try { await api("PUT", `/api/plans/${id}`, data); await loadPlans(); }
    catch (e: any) { setError(e.message); }
  }, [loadPlans]);
  const deletePlan = useCallback(async (id: number) => {
    try { await api("DELETE", `/api/plans/${id}`); await loadPlans(); await loadStats(); }
    catch (e: any) { setError(e.message); }
  }, [loadPlans, loadStats]);

  // ── Produce ──
  const generateIdeas = useCallback(async (topic: string, audience?: string, count?: number) => {
    try { return (await api<{ titles: string[] }>("POST", "/api/ideas", { topic, audience, count })).titles; }
    catch (e: any) { setError(e.message); return []; }
  }, []);
  const generateArticle = useCallback(async (data: { keyword: string; title?: string; plan_id?: number }) => {
    try { const p = await api<Post>("POST", "/api/generate", data); await loadPosts(); await loadStats(); return p; }
    catch (e: any) { setError(e.message); return null; }
  }, [loadPosts, loadStats]);

  // ── Research ──
  const discoverKeywords = useCallback(async (seed: string, audience?: string) => {
    try { return await api<KeywordDiscovery>("POST", "/api/research/keywords", { seed, audience }); }
    catch (e: any) { setError(e.message); return null; }
  }, []);
  const researchCompetitors = useCallback(async (seed: string) => {
    try { return await api<CompetitorResult>("POST", "/api/research/competitors", { seed }); }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  // ── Measure ──
  const refreshRankings = useCallback(async () => {
    try { const r = await api<RankingsResult>("POST", "/api/measure/rankings/refresh"); await loadPosts(); return r; }
    catch (e: any) { setError(e.message); return null; }
  }, [loadPosts]);

  // ── Post CRUD ──
  const createPost = useCallback(async (data: Partial<Post>) => {
    try { const p = await api<Post>("POST", "/api/posts", data); await loadPosts(); await loadStats(); return p; }
    catch (e: any) { setError(e.message); return null; }
  }, [loadPosts, loadStats]);
  const updatePost = useCallback(async (id: number, data: Partial<Post>) => {
    try { const p = await api<Post>("PUT", `/api/posts/${id}`, data); await loadPosts(); await loadStats(); return p; }
    catch (e: any) { setError(e.message); return null; }
  }, [loadPosts, loadStats]);
  const deletePost = useCallback(async (id: number) => {
    try { await api("DELETE", `/api/posts/${id}`); await loadPosts(); await loadStats(); }
    catch (e: any) { setError(e.message); }
  }, [loadPosts, loadStats]);
  const publishPost = useCallback(async (id: number) => {
    try { const r = await api<{ ok: boolean; url?: string }>("POST", `/api/posts/${id}/publish`); await loadPosts(); await loadStats(); return r; }
    catch (e: any) { setError(e.message); return null; }
  }, [loadPosts, loadStats]);

  return {
    posts, plans, stats, status, calendarData, calendarMonth,
    loading, error, clearError, setCalendarMonth,
    loadPosts, loadPlans, loadStats, loadCalendar,
    createPlan, updatePlan, deletePlan,
    generateIdeas, generateArticle,
    discoverKeywords, researchCompetitors, refreshRankings,
    createPost, updatePost, deletePost, publishPost,
  };
}
