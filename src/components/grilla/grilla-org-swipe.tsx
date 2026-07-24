"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/lib/types";

interface GrillaOrgSwipeProps {
  organizations: Organization[];
  currentOrgId: string;
  month?: string;
  children: ReactNode;
}

const SWIPE_THRESHOLD = 72;
const WHEEL_THRESHOLD = 90;
const AXIS_LOCK_RATIO = 1.35;
const MAX_DRAG = 140;
const WHEEL_IDLE_MS = 140;
const WHEEL_SCALE = 0.85;

function orgHref(orgId: string, month?: string) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : "";
  return `/org/${orgId}/grilla${qs}`;
}

export function GrillaOrgSwipe({
  organizations,
  currentOrgId,
  month,
  children,
}: GrillaOrgSwipeProps) {
  const router = useRouter();
  const index = organizations.findIndex((o) => o.id === currentOrgId);
  const canSwipe = organizations.length > 1 && index >= 0;

  const prevOrg = canSwipe
    ? organizations[(index - 1 + organizations.length) % organizations.length]
    : null;
  const nextOrg = canSwipe
    ? organizations[(index + 1) % organizations.length]
    : null;

  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"undecided" | "horizontal" | "vertical">("undecided");
  const offsetRef = useRef(0);
  const navigating = useRef(false);
  const draggingRef = useRef(false);
  const exitingRef = useRef<"left" | "right" | null>(null);
  const canSwipeRef = useRef(canSwipe);
  const prevOrgRef = useRef(prevOrg);
  const nextOrgRef = useRef(nextOrg);
  const wheelAxis = useRef<"undecided" | "horizontal" | "vertical">("undecided");
  const wheelAccum = useRef(0);
  const wheelIdleTimer = useRef<number | null>(null);

  canSwipeRef.current = canSwipe;
  prevOrgRef.current = prevOrg;
  nextOrgRef.current = nextOrg;
  exitingRef.current = exiting;

  const goTo = useCallback(
    (orgId: string, direction: "left" | "right") => {
      if (navigating.current || orgId === currentOrgId) return;
      navigating.current = true;
      setExiting(direction);
      exitingRef.current = direction;
      setOffset(direction === "left" ? -MAX_DRAG * 1.4 : MAX_DRAG * 1.4);
      window.setTimeout(() => {
        router.push(orgHref(orgId, month));
      }, 160);
    },
    [currentOrgId, month, router]
  );

  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  useEffect(() => {
    if (!canSwipe || !prevOrg || !nextOrg) return;
    router.prefetch(orgHref(prevOrg.id, month));
    router.prefetch(orgHref(nextOrg.id, month));
  }, [canSwipe, prevOrg, nextOrg, month, router]);

  useEffect(() => {
    navigating.current = false;
    setExiting(null);
    exitingRef.current = null;
    setOffset(0);
    offsetRef.current = 0;
    setDragging(false);
    draggingRef.current = false;
    wheelAxis.current = "undecided";
    wheelAccum.current = 0;
    if (wheelIdleTimer.current) {
      window.clearTimeout(wheelIdleTimer.current);
      wheelIdleTimer.current = null;
    }
  }, [currentOrgId]);

  // Touch + trackpad (wheel) listeners
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || !canSwipe) return;

    function resetOffset() {
      setOffset(0);
      offsetRef.current = 0;
    }

    function commitFromDelta(dx: number, threshold: number) {
      if (dx <= -threshold && nextOrgRef.current) {
        goToRef.current(nextOrgRef.current.id, "left");
        return true;
      }
      if (dx >= threshold && prevOrgRef.current) {
        goToRef.current(prevOrgRef.current.id, "right");
        return true;
      }
      return false;
    }

    function onTouchStart(e: TouchEvent) {
      if (!canSwipeRef.current || navigating.current || exitingRef.current) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "button, a, input, textarea, select, [role='dialog'], [data-no-org-swipe]"
        )
      ) {
        axis.current = "vertical";
        return;
      }
      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
      axis.current = "undecided";
      draggingRef.current = true;
      setDragging(true);
    }

    function onTouchMove(e: TouchEvent) {
      if (
        !canSwipeRef.current ||
        !draggingRef.current ||
        navigating.current ||
        exitingRef.current
      ) {
        return;
      }
      if (axis.current === "vertical") return;

      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;

      if (axis.current === "undecided") {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) * AXIS_LOCK_RATIO >= Math.abs(dx)) {
          axis.current = "vertical";
          draggingRef.current = false;
          setDragging(false);
          resetOffset();
          return;
        }
        axis.current = "horizontal";
      }

      if (axis.current === "horizontal" && e.cancelable) {
        e.preventDefault();
      }

      const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));
      offsetRef.current = clamped;
      setOffset(clamped);
    }

    function onTouchEnd() {
      if (!canSwipeRef.current || navigating.current) return;
      const dx = offsetRef.current;
      draggingRef.current = false;
      setDragging(false);

      if (axis.current !== "horizontal") {
        resetOffset();
        return;
      }

      if (!commitFromDelta(dx, SWIPE_THRESHOLD)) {
        resetOffset();
      }
    }

    function finishWheelGesture() {
      wheelIdleTimer.current = null;
      if (navigating.current || exitingRef.current) {
        wheelAxis.current = "undecided";
        wheelAccum.current = 0;
        return;
      }

      const wasHorizontal = wheelAxis.current === "horizontal";
      wheelAxis.current = "undecided";
      draggingRef.current = false;
      setDragging(false);

      if (!wasHorizontal) {
        wheelAccum.current = 0;
        return;
      }

      const dx = offsetRef.current;
      wheelAccum.current = 0;

      if (!commitFromDelta(dx, WHEEL_THRESHOLD)) {
        resetOffset();
      }
    }

    function onWheel(e: WheelEvent) {
      if (!canSwipeRef.current || navigating.current || exitingRef.current) {
        return;
      }
      if (draggingRef.current && axis.current === "horizontal") return;

      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "button, a, input, textarea, select, [role='dialog'], [data-no-org-swipe]"
        )
      ) {
        return;
      }

      // Normalize line/page deltas to pixel-ish values
      const modeScale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 40 : 1;
      let dx = e.deltaX * modeScale;
      let dy = e.deltaY * modeScale;

      // Some mice send horizontal via shift + vertical wheel
      if (e.shiftKey && Math.abs(dx) < Math.abs(dy)) {
        dx = dy;
        dy = 0;
      }

      if (wheelAxis.current === "undecided") {
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
        if (Math.abs(dy) * AXIS_LOCK_RATIO >= Math.abs(dx)) {
          wheelAxis.current = "vertical";
        } else {
          wheelAxis.current = "horizontal";
          draggingRef.current = true;
          setDragging(true);
        }
      }

      if (wheelAxis.current === "vertical") {
        // Let the page scroll; reset after idle so next gesture can be horizontal
        if (wheelIdleTimer.current) window.clearTimeout(wheelIdleTimer.current);
        wheelIdleTimer.current = window.setTimeout(() => {
          wheelAxis.current = "undecided";
          wheelAccum.current = 0;
          wheelIdleTimer.current = null;
        }, WHEEL_IDLE_MS);
        return;
      }

      // Horizontal trackpad swipe — block browser back/forward + page scroll
      if (e.cancelable) e.preventDefault();

      // Positive deltaX = fingers moved left = content to the left = next org
      wheelAccum.current += dx;
      const visual = Math.max(
        -MAX_DRAG,
        Math.min(MAX_DRAG, -wheelAccum.current * WHEEL_SCALE)
      );
      offsetRef.current = visual;
      setOffset(visual);

      if (wheelIdleTimer.current) window.clearTimeout(wheelIdleTimer.current);
      wheelIdleTimer.current = window.setTimeout(finishWheelGesture, WHEEL_IDLE_MS);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
      if (wheelIdleTimer.current) window.clearTimeout(wheelIdleTimer.current);
    };
  }, [canSwipe]);

  if (!canSwipe) {
    return <>{children}</>;
  }

  const peekOrg = offset < -12 ? nextOrg : offset > 12 ? prevOrg : null;
  const peekSide = offset < 0 ? "right" : "left";

  return (
    <div className="relative overflow-hidden">
      {peekOrg && (
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 z-10 flex w-16 items-center justify-center sm:w-20",
            peekSide === "right" ? "right-0" : "left-0"
          )}
          aria-hidden
        >
          <div
            className={cn(
              "flex max-w-[4.5rem] flex-col items-center gap-1.5 rounded-xl bg-brand/90 px-2 py-3 text-center shadow-sm",
              peekSide === "right" ? "mr-1" : "ml-1"
            )}
            style={{
              opacity: Math.min(1, Math.abs(offset) / SWIPE_THRESHOLD),
              transform: `scale(${0.85 + Math.min(0.15, Math.abs(offset) / SWIPE_THRESHOLD / 6)})`,
            }}
          >
            <Building2 size={14} className="text-brand-foreground" />
            <span className="line-clamp-3 text-[10px] font-semibold leading-tight text-brand-foreground">
              {peekOrg.name}
            </span>
          </div>
        </div>
      )}

      <div
        ref={surfaceRef}
        className={cn(
          "will-change-transform",
          !dragging && "transition-transform duration-200 ease-out",
          exiting && "transition-transform duration-150 ease-in opacity-80"
        )}
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>

      <div
        className="mt-5 flex items-center justify-center gap-1.5 pb-1 md:mt-6"
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
              disabled={navigating.current || !!exiting}
              onClick={() => {
                if (active || navigating.current) return;
                const direction = i > index ? "left" : "right";
                goTo(org.id, direction);
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
