import type { DesignBrief, DesignBriefSlide, BriefColorRef } from "@/lib/types";
import { extractHexColors, mergeColorRefs } from "@/lib/brief-colors";
import { parseTextInstructionBlocks } from "@/lib/brief-text";
import { VisualConceptDisplay } from "@/components/grilla/visual-concept-display";

function ColorSwatch({
  hex,
  name,
  role,
  size = "md",
}: {
  hex: string;
  name?: string;
  role?: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <span
      className="inline-flex items-center gap-1.5 align-middle rounded-md border border-border/80 bg-surface px-1.5 py-0.5 mr-1 mb-0.5"
      title={[name, role, hex].filter(Boolean).join(" · ")}
    >
      <span
        className={`${dim} rounded-sm border border-black/10 shrink-0`}
        style={{ backgroundColor: hex }}
      />
      {(name || role) && (
        <span className="text-[11px] text-foreground/80">
          {name || role}
        </span>
      )}
      <span className="text-[10px] font-mono text-muted">{hex}</span>
    </span>
  );
}

function ColorPalette({ colors }: { colors: BriefColorRef[] }) {
  if (colors.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((color) => (
        <ColorSwatch
          key={color.hex}
          hex={color.hex}
          name={color.name}
          role={color.role}
        />
      ))}
    </div>
  );
}

function ColorRichText({ text }: { text: string }) {
  const parts = text.split(/(#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b)/g);

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (/^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(part)) {
          return <ColorSwatch key={`${part}-${i}`} hex={part} size="sm" />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function TextInstructionsDisplay({ text }: { text: string }) {
  const blocks = parseTextInstructionBlocks(text);

  if (!blocks) {
    return <ColorRichText text={text} />;
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "notice":
            return (
              <p key={i} className="text-xs text-amber-800/90 italic">
                {block.content}
              </p>
            );
          case "labeled":
            return (
              <div key={i} className="space-y-0.5">
                <p className="text-sm leading-snug">
                  <span className="font-semibold text-foreground">{block.label}:</span>{" "}
                  <span className="text-foreground/90">{block.content}</span>
                </p>
                {block.details && (
                  <p className="text-xs leading-relaxed text-muted pl-0">
                    <ColorRichText text={block.details} />
                  </p>
                )}
              </div>
            );
          case "bullets":
            return (
              <ul key={i} className="list-disc pl-5 space-y-1.5 text-sm leading-snug text-foreground/90">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <span>{item.text}</span>
                    {item.details && (
                      <span className="block text-xs text-muted mt-0.5">
                        <ColorRichText text={item.details} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            );
          case "paragraph":
            return (
              <div key={i} className="space-y-0.5">
                <p className="text-sm leading-relaxed text-foreground/90">{block.content}</p>
                {block.details && (
                  <p className="text-xs leading-relaxed text-muted">
                    <ColorRichText text={block.details} />
                  </p>
                )}
              </div>
            );
        }
      })}
    </div>
  );
}

function BriefSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <div className="text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

function slideColorRefs(
  slide: DesignBriefSlide,
  palette?: BriefColorRef[]
): BriefColorRef[] {
  const fromStructured = slide.colors_used ?? [];
  const fromLegacy = (slide.colors ?? []).map((hex) => ({ hex }));
  const fromText = mergeColorRefs(
    extractHexColors(
      [
        slide.text_instructions,
        slide.image_treatment,
        slide.layout,
        slide.visual_concept,
      ]
        .filter(Boolean)
        .join(" ")
    ).map((hex) => ({ hex }))
  );

  return mergeColorRefs(fromStructured, fromLegacy, fromText, palette);
}

function isStructuredSlide(slide: DesignBriefSlide) {
  return Boolean(
    slide.visual_concept ||
      slide.text_instructions ||
      slide.image_treatment ||
      slide.layout
  );
}

function StructuredSlide({
  slide,
  showSlideNumber,
}: {
  slide: DesignBriefSlide;
  showSlideNumber?: boolean;
}) {
  const formatLine =
    slide.format_label ||
    (slide.focus ? `Diseño de Post (Focus: ${slide.focus})` : null);

  return (
    <div className="rounded-lg border border-border px-4 py-4 space-y-4 bg-neutral-50/50">
      {showSlideNumber && (
        <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
          Slide {slide.slide}
        </p>
      )}
      {formatLine && (
        <p className="text-sm font-medium text-foreground">{formatLine}</p>
      )}

      {slide.colors_used && slide.colors_used.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
            Colores de este slide
          </p>
          <ColorPalette colors={slide.colors_used} />
        </div>
      )}

      {slide.visual_concept && (
        <VisualConceptDisplay text={slide.visual_concept} />
      )}
      {slide.text_instructions && (
        <BriefSection label="Instrucciones de Texto:">
          <TextInstructionsDisplay text={slide.text_instructions} />
        </BriefSection>
      )}
      {slide.image_treatment && (
        <BriefSection label="Tratamiento de Imagen:">
          <ColorRichText text={slide.image_treatment} />
        </BriefSection>
      )}
      {slide.layout && (
        <BriefSection label="Layout:">
          <ColorRichText text={slide.layout} />
        </BriefSection>
      )}
    </div>
  );
}

function LegacySlide({ slide }: { slide: DesignBriefSlide }) {
  const colors = slideColorRefs(slide);

  return (
    <div className="rounded-lg border border-border px-4 py-3 space-y-1.5 bg-neutral-50/50">
      <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
        Slide {slide.slide}
      </p>
      {slide.title && <p className="text-sm font-semibold">{slide.title}</p>}
      {slide.subtitle && <p className="text-sm text-muted">{slide.subtitle}</p>}
      {slide.body && <p className="text-sm leading-relaxed">{slide.body}</p>}
      {slide.image_prompt && (
        <p className="text-xs text-muted border border-border rounded px-2 py-1.5 bg-surface mt-2">
          {slide.image_prompt}
        </p>
      )}
      {colors.length > 0 && <ColorPalette colors={colors} />}
    </div>
  );
}

function BrandKitBar({ brief }: { brief: DesignBrief }) {
  if (brief.brand_kit_configured === false) {
    return (
      <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-amber-900">
          Sin Brand Kit configurado
        </p>
        <p className="text-xs leading-relaxed text-amber-800/90">
          Esta marca aún no tiene colores ni tipografías definidos. El brief no
          incluye identidad visual de marca — configúrala en Brand Kit para
          futuros briefs.
        </p>
      </div>
    );
  }

  const palette = brief.brand_palette;
  if (!palette) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 space-y-3">
      <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
        Brand kit aplicado
      </p>
      {palette.colors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted">Colores</p>
          <ColorPalette colors={palette.colors} />
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span>
          Título:{" "}
          <span className="text-foreground font-medium" style={{ fontFamily: palette.fonts.heading }}>
            {palette.fonts.heading}
          </span>
        </span>
        <span>
          Cuerpo:{" "}
          <span className="text-foreground font-medium" style={{ fontFamily: palette.fonts.body }}>
            {palette.fonts.body}
          </span>
        </span>
      </div>
    </div>
  );
}

export function BriefDisplay({ brief }: { brief: DesignBrief }) {
  const slides = brief.slides ?? [];
  const isStructured = slides.some(isStructuredSlide);

  return (
    <div className="space-y-4">
      <BrandKitBar brief={brief} />

      {brief.execution_title && (
        <p className="text-sm font-semibold leading-snug">
          🎨 Ejecución: {brief.execution_title}
        </p>
      )}

      {slides.map((slide) =>
        isStructuredSlide(slide) ? (
          <StructuredSlide
            key={slide.slide}
            slide={slide}
            showSlideNumber={slides.length > 1}
          />
        ) : (
          <LegacySlide key={slide.slide} slide={slide} />
        )
      )}

      {brief.strategic_note && (
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-amber-900">
            💡 Nota Estratégica para el Diseñador:
          </p>
          <p className="text-sm leading-relaxed text-amber-950/90">
            &ldquo;<ColorRichText text={brief.strategic_note} />&rdquo;
          </p>
        </div>
      )}

      {brief.notes && !isStructured && (
        <p className="text-xs text-muted px-1">{brief.notes}</p>
      )}
      {brief.notes && isStructured && brief.notes.startsWith("Gemini falló") && (
        <p className="text-xs text-red-600 px-1">{brief.notes}</p>
      )}
    </div>
  );
}
