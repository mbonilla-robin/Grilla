"use client";

import Link from "next/link";
import { useState } from "react";
import type { QuincenaProgressCard } from "@/lib/quincena-progress";
import { homeStaggerDelay } from "@/lib/home-motion";
import { QuincenaProgressBar } from "./quincena-progress-bar";
import { EmptyState } from "./home-ui";

function QuincenaProgressCardItem({
  card,
  index = 0,
}: {
  card: QuincenaProgressCard;
  index?: number;
}) {
  const [animKey, setAnimKey] = useState(0);

  return (
    <Link
      href={card.calendarHref}
      className="quincena-card block rounded-xl border border-border bg-surface p-3.5 shadow-sm home-animate-in"
      style={{ animationDelay: homeStaggerDelay(index, 0.1, 0.08) }}
      onMouseEnter={() => setAnimKey((key) => key + 1)}
    >
      <p className="text-body text-sm font-medium leading-snug line-clamp-2">
        {card.title}
      </p>

      <div className="mt-3 space-y-1.5">
        <QuincenaProgressBar card={card} index={index} animKey={animKey} />
        <p className="text-caption">
          {card.summaryText}
          <span className="text-muted"> · {card.totalCount} posts</span>
        </p>
      </div>

      {card.milestone && (
        <p className="text-caption mt-2.5 text-muted">{card.milestone}</p>
      )}
    </Link>
  );
}

export function QuincenaProgressCards({
  cards,
}: {
  cards: QuincenaProgressCard[];
}) {
  if (cards.length === 0) {
    return (
      <EmptyState text="No hay quincenas en preparación con posts programados." />
    );
  }

  return (
    <>
      <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory -mx-1 px-1 pb-0.5 sm:hidden">
        {cards.map((card, index) => (
          <div key={card.id} className="w-[78vw] max-w-[260px] shrink-0 snap-start">
            <QuincenaProgressCardItem card={card} index={index} />
          </div>
        ))}
      </div>

      <div className="hidden sm:grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => (
          <QuincenaProgressCardItem key={card.id} card={card} index={index} />
        ))}
      </div>
    </>
  );
}
