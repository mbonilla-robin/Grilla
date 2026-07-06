"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const LOADING_WORDS = ["organizaciones", "asignaciones", "tareas"] as const;
export const MIN_DURATION_MS = 3000;
const OVERLAY_ID = "grilla-loading-overlay";

function LoadingDots() {
  return (
    <span className="inline-flex shrink-0 w-[1.1em]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-loading-dot"
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          .
        </span>
      ))}
    </span>
  );
}

function LoadingContent() {
  const carouselWords = [...LOADING_WORDS, LOADING_WORDS[0]];

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <p className="flex items-baseline text-base text-brand-foreground">
          <span className="shrink-0">Cargando&nbsp;</span>
          <span
            className="relative inline-block h-[1.25em] overflow-hidden align-bottom font-bold"
            aria-hidden
          >
            <span className="block animate-loading-words">
              {carouselWords.map((word, i) => (
                <span
                  key={`${word}-${i}`}
                  className="block h-[1.25em] leading-[1.25em]"
                  aria-hidden={i === carouselWords.length - 1 ? true : undefined}
                >
                  {word}
                </span>
              ))}
            </span>
          </span>
          <LoadingDots />
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center px-6 pb-10">
        <img
          src="/grilla-logo.svg"
          alt="Grilla"
          width={188}
          height={100}
          className="h-9 w-auto"
        />
      </div>
    </>
  );
}

function buildPersistHtml() {
  const carouselWords = [...LOADING_WORDS, LOADING_WORDS[0]];
  const wordsHtml = carouselWords
    .map(
      (word) =>
        `<span class="block h-[1.25em] leading-[1.25em]">${word}</span>`
    )
    .join("");

  const dotsHtml = [0, 1, 2]
    .map(
      (i) =>
        `<span class="animate-loading-dot" style="animation-delay:${i * 0.15}s">.</span>`
    )
    .join("");

  return `
    <div class="absolute inset-0 flex items-center justify-center px-6">
      <p class="flex items-baseline text-base text-brand-foreground">
        <span class="shrink-0">Cargando&nbsp;</span>
        <span class="relative inline-block h-[1.25em] overflow-hidden align-bottom font-bold">
          <span class="block animate-loading-words">${wordsHtml}</span>
        </span>
        <span class="inline-flex shrink-0 w-[1.1em]">${dotsHtml}</span>
      </p>
    </div>
    <div class="absolute inset-x-0 bottom-0 flex justify-center px-6 pb-10">
      <img src="/grilla-logo.svg" alt="Grilla" width="188" height="100" class="h-9 w-auto" />
    </div>
  `;
}

function persistOverlay(startAt: number) {
  const remaining = MIN_DURATION_MS - (Date.now() - startAt);
  if (remaining <= 0) return;

  document.getElementById(OVERLAY_ID)?.remove();

  const shell = document.createElement("div");
  shell.id = OVERLAY_ID;
  shell.className = "fixed inset-0 z-[9999] brand-screen pointer-events-none";
  shell.setAttribute("aria-live", "polite");
  shell.setAttribute("aria-busy", "true");
  shell.innerHTML = buildPersistHtml();

  document.body.appendChild(shell);

  const fadeAt = Math.max(0, remaining - 350);
  setTimeout(() => {
    shell.style.transition = "opacity 350ms ease";
    shell.style.opacity = "0";
  }, fadeAt);

  setTimeout(() => shell.remove(), remaining);
}

export function LoadingOverlay() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.getElementById(OVERLAY_ID)?.remove();
    setMounted(true);

    return () => {
      document.getElementById(OVERLAY_ID)?.remove();
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      id={OVERLAY_ID}
      className="fixed inset-0 z-[9999] brand-screen"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingContent />
    </div>,
    document.body
  );
}

/** Usado por loading.tsx de Next.js — respeta duración mínima al desmontar */
export function AppLoading() {
  const startAt = useRef(Date.now());

  useEffect(() => {
    startAt.current = Date.now();

    return () => {
      persistOverlay(startAt.current);
    };
  }, []);

  return <LoadingOverlay />;
}
