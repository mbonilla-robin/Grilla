import type { PostStatus } from "@/lib/types";
import type { QuincenaId } from "@/lib/editorial-cadence";

export interface CadencePost {
  id: string;
  organization_id: string;
  status: PostStatus;
  scheduled_at: string;
  created_by: string;
}

export interface QuincenaBoardSnapshot {
  orgId: string;
  orgName: string;
  quincena: QuincenaId;
  publishYear: number;
  publishMonth: number;
  posts: CadencePost[];
  creatorName: string | null;
  creatorUserId: string | null;
}

const REVIEW_READY_STATUSES: PostStatus[] = [
  "review",
  "approved",
  "scheduled",
  "published",
];

export function postQuincena(scheduledAt: string): QuincenaId | null {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return null;

  const day = date.getDate();
  if (day >= 1 && day <= 15) return "Q1";
  if (day >= 16) return "Q2";
  return null;
}

export function postMatchesQuincena(
  post: CadencePost,
  publishYear: number,
  publishMonth: number,
  quincena: QuincenaId
): boolean {
  const date = new Date(post.scheduled_at);
  if (Number.isNaN(date.getTime())) return false;
  if (date.getFullYear() !== publishYear || date.getMonth() !== publishMonth) {
    return false;
  }
  return postQuincena(post.scheduled_at) === quincena;
}

export function filterPostsForQuincena(
  posts: CadencePost[],
  publishYear: number,
  publishMonth: number,
  quincena: QuincenaId
): CadencePost[] {
  return posts.filter((post) =>
    postMatchesQuincena(post, publishYear, publishMonth, quincena)
  );
}

export function creatorHasUploadedGrids(posts: CadencePost[]): boolean {
  return posts.length > 0;
}

export function allPostsInReview(posts: CadencePost[]): boolean {
  if (posts.length === 0) return false;
  return posts.every((post) => post.status === "review");
}

export function allPostsHandedToCm(posts: CadencePost[]): boolean {
  if (posts.length === 0) return false;
  return posts.every((post) => REVIEW_READY_STATUSES.includes(post.status));
}

export function getCadencePublishRange(now: Date): { start: string; end: string } {
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = new Date(year, month, 1);
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const end = new Date(nextYear, nextMonth + 1, 0, 23, 59, 59, 999);

  return { start: start.toISOString(), end: end.toISOString() };
}

export function buildQuincenaSnapshots(options: {
  orgs: { id: string; name: string }[];
  posts: CadencePost[];
  creatorsByOrg: Map<string, { userId: string; name: string | null } | null>;
  contexts: {
    id: QuincenaId;
    publishYear: number;
    publishMonth: number;
  }[];
}): QuincenaBoardSnapshot[] {
  const { orgs, posts, creatorsByOrg, contexts } = options;
  const snapshots: QuincenaBoardSnapshot[] = [];

  for (const org of orgs) {
    const orgPosts = posts.filter((post) => post.organization_id === org.id);
    const orgCreator = creatorsByOrg.get(org.id) ?? null;

    for (const ctx of contexts) {
      const quincenaPosts = filterPostsForQuincena(
        orgPosts,
        ctx.publishYear,
        ctx.publishMonth,
        ctx.id
      );

      snapshots.push({
        orgId: org.id,
        orgName: org.name,
        quincena: ctx.id,
        publishYear: ctx.publishYear,
        publishMonth: ctx.publishMonth,
        posts: quincenaPosts,
        creatorName: orgCreator?.name ?? null,
        creatorUserId: orgCreator?.userId ?? null,
      });
    }
  }

  return snapshots;
}
