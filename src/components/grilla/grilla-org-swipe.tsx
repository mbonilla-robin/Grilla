"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { GrillaCards } from "@/components/grilla/grilla-cards";
import {
  fetchGrillaPostsClient,
  getCachedGrillaPosts,
  seedGrillaPostsCache,
} from "@/lib/grilla-posts-client";
import { cn } from "@/lib/utils";
import type { Organization, PostWithAssets } from "@/lib/types";

interface GrillaOrgSwipeProps {
  organizations: Organization[];
  currentOrgId: string;
  month: string;
  posts: PostWithAssets[];
}

const SWIPE_THRESHOLD_RATIO = 0.18;
const VELOCITY_THRESHOLD = 0.35;
const AXIS_LOCK_RATIO = 1.2;
const WHEEL_IDLE_MS = 130;
const WHEEL_SCALE = 1.15;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SNAP_MS = 320;

function orgHref(orgId: string, month: string) {
  return `/org/${orgId}/grilla?month=${encodeURIComponent(month)}`;
}

function PanelGrid({
  orgId,
  posts,
  loading,
}: {
  orgId: string;
  posts: PostWithAssets[] | undefined;
  loading?: boolean;
}) {
  if (loading && !posts) {
    return (
      <div className="grid items-stretch gap-2 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-2xl border border-border bg-neutral-100"
          />
        ))}
      </div>
    );
  }

  return <GrillaCards posts={posts || []} orgId={orgId} />;
}

export function GrillaOrgSwipe({
  organizations,
  currentOrgId,
  month,
  posts,
}: GrillaOrgSwipeProps) {
  const router = useRouter();
  const index = organizations.findIndex((o) => o.id === currentOrgId);
  const canSwipe = organizations.length > 1 && index >= 0;

  const prevOrg = canSwipe && index > 0 ? organizations[index - 1] : null;
  const nextOrg =
    canSwipe && index < organizations.length - 1
      ? organizations[index + 1]
      : null;

  const [neighborPosts, setNeighborPosts] = useState<
    Record<string, PostWithAssets[]>
  >(() => {
    const initial: Record<string, PostWithAssets[]> = {
      [currentOrgId]: posts,
    };
    if (prevOrg) {
      const cached = getCachedGrillaPosts(prevOrg.id, month);
      if (cached) initial[prevOrg.id] = cached;
    }
    if (nextOrg) {
      const cached = getCachedGrillaPosts(nextOrg.id, month);
      if (cached) initial[nextOrg.id] = cached;
    }
    return initial;
  });
  const [loadingNeighbors, setLoadingNeighbors] = useState<
    Record<string, boolean>
  >({});

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const xRef = useRef(0);
  const navigating = useRef(false);
  const draggingRef = useRef(false);
  const axis = useRef<"undecided" | "horizontal" | "vertical">("undecided");
  const startX = useRef(0);
  const startY = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);
  const suppressClick = useRef(false);
  const wheelAxis = useRef<"undecided" | "horizontal" | "vertical">("undecided");
  const wheelIdleTimer = useRef<number | null>(null);
  const prevOrgRef = useRef(prevOrg);
  const nextOrgRef = useRef(nextOrg);
  const canSwipeRef = useRef(canSwipe);

  prevOrgRef.current = prevOrg;
  nextOrgRef.current = nextOrg;
  canSwipeRef.current = canSwipe;

  // Keep server posts + cache in sync
  useEffect(() => {
    seedGrillaPostsCache(currentOrgId, month, posts);
    setNeighborPosts((prev) => ({ ...prev, [currentOrgId]: posts }));
  }, [currentOrgId, month, posts]);

  // Prefetch adjacent org grids so swipe reveals real cards
  useEffect(() => {
    if (!canSwipe) return;
    let cancelled = false;

    async function load(orgId: string) {
      const cached = getCachedGrillaPosts(orgId, month);
      if (cached) {
        if (!cancelled) {
          setNeighborPosts((prev) => ({ ...prev, [orgId]: cached }));
        }
        return;
      }
      setLoadingNeighbors((prev) => ({ ...prev, [orgId]: true }));
      const data = await fetchGrillaPostsClient(orgId, month);
      if (cancelled) return;
      setNeighborPosts((prev) => ({ ...prev, [orgId]: data }));
      setLoadingNeighbors((prev) => ({ ...prev, [orgId]: false }));
    }

    if (prevOrg) void load(prevOrg.id);
    if (nextOrg) void load(nextOrg.id);
    if (prevOrg) router.prefetch(orgHref(prevOrg.id, month));
    if (nextOrg) router.prefetch(orgHref(nextOrg.id, month));

    return () => {
      cancelled = true;
    };
  }, [canSwipe, prevOrg, nextOrg, month, router]);

  const paint = useCallback((x: number, withTransition: boolean) => {
    const track = trackRef.current;
    const w = widthRef.current;
    if (!track || !w) return;
    xRef.current = x;
    track.style.transition = withTransition
      ? `transform ${SNAP_MS}ms ${EASE}`
      : "none";
    // Center panel sits at -w; drag shifts from there
    track.style.transform = `translate3d(${-w + x}px, 0, 0)`;
  }, []);

  const paintRef = useRef(paint);
  paintRef.current = paint;

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const update = () => {
      widthRef.current = el.clientWidth;
      // Reset to centered current panel after measure / org change
      if (!navigating.current) {
        paintRef.current(0, false);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canSwipe, currentOrgId]);

  useEffect(() => {
    navigating.current = false;
    paintRef.current(0, false);
  }, [currentOrgId]);

  const goTo = useCallback(
    (orgId: string, direction: "left" | "right") => {
      if (navigating.current || orgId === currentOrgId) return;
      navigating.current = true;
      suppressClick.current = true;

      const w = widthRef.current || viewportRef.current?.clientWidth || 0;
      // Slide fully to the neighbor grid, then sync the URL
      paintRef.current(direction === "left" ? -w : w, true);

      window.setTimeout(() => {
        router.push(orgHref(orgId, month));
      }, SNAP_MS - 40);
    },
    [currentOrgId, month, router]
  );

  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !canSwipe) return;

    function rubberBand(dx: number) {
      const w = widthRef.current || 1;
      const hasPrev = !!prevOrgRef.current;
      const hasNext = !!nextOrgRef.current;

      if (dx > 0 && !hasPrev) return dx * 0.22;
      if (dx < 0 && !hasNext) return dx * 0.22;
      if (dx > w) return w + (dx - w) * 0.12;
      if (dx < -w) return -w + (dx + w) * 0.12;
      return dx;
    }

    function setXLive(x: number) {
      paintRef.current(rubberBand(x), false);
    }

    function snapBack() {
      draggingRef.current = false;
      paintRef.current(0, true);
    }

    function commitFromDelta(dx: number, vx: number) {
      const w = widthRef.current || 1;
      const threshold = Math.max(48, w * SWIPE_THRESHOLD_RATIO);
      const flickNext = vx < -VELOCITY_THRESHOLD;
      const flickPrev = vx > VELOCITY_THRESHOLD;

      if ((dx <= -threshold || flickNext) && nextOrgRef.current) {
        goToRef.current(nextOrgRef.current.id, "left");
        return true;
      }
      if ((dx >= threshold || flickPrev) && prevOrgRef.current) {
        goToRef.current(prevOrgRef.current.id, "right");
        return true;
      }
      return false;
    }

    function isFormControl(target: EventTarget | null) {
      const node = target as HTMLElement | null;
      return !!node?.closest(
        "input, textarea, select, [role='dialog'], [data-no-org-swipe]"
      );
    }

    function onTouchStart(e: TouchEvent) {
      if (!canSwipeRef.current || navigating.current) return;
      if (isFormControl(e.target)) {
        axis.current = "vertical";
        return;
      }

      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
      lastX.current = t.clientX;
      lastT.current = performance.now();
      velocity.current = 0;
      axis.current = "undecided";
      draggingRef.current = true;
      suppressClick.current = false;
      paintRef.current(xRef.current, false);
    }

    function onTouchMove(e: TouchEvent) {
      if (!canSwipeRef.current || !draggingRef.current || navigating.current) {
        return;
      }
      if (axis.current === "vertical") return;

      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      const now = performance.now();
      const dt = Math.max(1, now - lastT.current);
      velocity.current = ((t.clientX - lastX.current) / dt) * (1000 / 60);
      lastX.current = t.clientX;
      lastT.current = now;

      if (axis.current === "undecided") {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        if (Math.abs(dy) * AXIS_LOCK_RATIO >= Math.abs(dx)) {
          axis.current = "vertical";
          draggingRef.current = false;
          paintRef.current(0, true);
          return;
        }
        axis.current = "horizontal";
        suppressClick.current = true;
      }

      if (axis.current === "horizontal" && e.cancelable) e.preventDefault();
      setXLive(dx);
    }

    function onTouchEnd() {
      if (!canSwipeRef.current || navigating.current) return;
      if (!draggingRef.current) return;
      draggingRef.current = false;

      if (axis.current !== "horizontal") {
        paintRef.current(0, true);
        return;
      }

      if (!commitFromDelta(xRef.current, velocity.current)) {
        snapBack();
      }
    }

    function onClickCapture(e: MouseEvent) {
      if (!suppressClick.current) return;
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }

    function finishWheelGesture() {
      wheelIdleTimer.current = null;
      if (navigating.current) {
        wheelAxis.current = "undecided";
        return;
      }

      const wasHorizontal = wheelAxis.current === "horizontal";
      wheelAxis.current = "undecided";
      draggingRef.current = false;

      if (!wasHorizontal) return;

      if (!commitFromDelta(xRef.current, 0)) {
        snapBack();
      }
    }

    function onWheel(e: WheelEvent) {
      if (!canSwipeRef.current || navigating.current) return;
      if (isFormControl(e.target)) return;

      const modeScale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 40 : 1;
      let dx = e.deltaX * modeScale;
      let dy = e.deltaY * modeScale;

      if (e.shiftKey && Math.abs(dx) < Math.abs(dy)) {
        dx = dy;
        dy = 0;
      }

      if (wheelAxis.current === "undecided") {
        if (Math.abs(dx) < 1.2 && Math.abs(dy) < 1.2) return;
        if (Math.abs(dy) * AXIS_LOCK_RATIO >= Math.abs(dx)) {
          wheelAxis.current = "vertical";
        } else {
          wheelAxis.current = "horizontal";
          draggingRef.current = true;
          paintRef.current(xRef.current, false);
        }
      }

      if (wheelAxis.current === "vertical") {
        if (wheelIdleTimer.current) window.clearTimeout(wheelIdleTimer.current);
        wheelIdleTimer.current = window.setTimeout(() => {
          wheelAxis.current = "undecided";
          wheelIdleTimer.current = null;
        }, WHEEL_IDLE_MS);
        return;
      }

      if (e.cancelable) e.preventDefault();
      setXLive(xRef.current - dx * WHEEL_SCALE);

      if (wheelIdleTimer.current) window.clearTimeout(wheelIdleTimer.current);
      wheelIdleTimer.current = window.setTimeout(
        finishWheelGesture,
        WHEEL_IDLE_MS
      );
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("wheel", onWheel);
      if (wheelIdleTimer.current) window.clearTimeout(wheelIdleTimer.current);
    };
  }, [canSwipe]);

  if (!canSwipe) {
    return <GrillaCards posts={posts} orgId={currentOrgId} />;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div ref={viewportRef} className="relative w-full overflow-hidden">
        <div
          ref={trackRef}
          className="flex w-[300%] will-change-transform"
          style={{ touchAction: "pan-y" }}
        >
          <div
            className="w-1/3 shrink-0 grow-0"
            aria-hidden={!prevOrg}
            style={{ pointerEvents: "none" }}
          >
            {prevOrg ? (
              <PanelGrid
                orgId={prevOrg.id}
                posts={neighborPosts[prevOrg.id]}
                loading={loadingNeighbors[prevOrg.id]}
              />
            ) : (
              <div className="min-h-[8rem]" />
            )}
          </div>

          <div className="w-1/3 shrink-0 grow-0">
            <PanelGrid orgId={currentOrgId} posts={posts} />
          </div>

          <div
            className="w-1/3 shrink-0 grow-0"
            aria-hidden={!nextOrg}
            style={{ pointerEvents: "none" }}
          >
            {nextOrg ? (
              <PanelGrid
                orgId={nextOrg.id}
                posts={neighborPosts[nextOrg.id]}
                loading={loadingNeighbors[nextOrg.id]}
              />
            ) : (
              <div className="min-h-[8rem]" />
            )}
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-1.5"
        role="tablist"
        aria-label="Organizaciones"
      >
        {organizations.map((org, i) => {
          const active = org.id === currentOrgId;
          return (
            <button
              key={org.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={org.name}
              disabled={navigating.current}
              onClick={() => {
                if (active || navigating.current) return;
                goTo(org.id, i > index ? "left" : "right");
              }}
              className={cn(
                "h-1.5 rounded-full transition-all",
                active
                  ? "w-5 bg-foreground"
                  : "w-1.5 bg-border hover:bg-muted"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
