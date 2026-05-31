"use client";

import { ResearchButton } from "./ResearchButton";
import { IconSearch } from "./Icons";
import { summaryParagraphs, type ResearchKind } from "@/lib/research";
import type { StoredResearch } from "@/lib/research-data";

/**
 * Shows the pre-generated, shared dossier inline by default. Falls back to the
 * live "Research" button when there's no stored dossier for this subject (e.g.
 * a contact you just met).
 */
export function ResearchPanel({
  research,
  kind,
  name,
  context,
}: {
  research: StoredResearch | null;
  kind: ResearchKind;
  name: string;
  context?: string;
}) {
  if (!research) return <ResearchButton kind={kind} name={name} context={context} />;

  // Split any bullet that bundled several points behind a " - " so each fact
  // is its own scannable line.
  const bullets = (research.bullets ?? []).flatMap(summaryParagraphs);

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 section-title"><IconSearch size={18} /> Research</h2>
        <span className="text-xs text-muted">Claude + web search</span>
      </div>
      <div className="space-y-2.5">
        {summaryParagraphs(research.summary).map((p, i) => (
          <p key={i} className="text-[15px] leading-relaxed text-body">{p}</p>
        ))}
      </div>
      {bullets.length > 0 && (
        <ul className="list-disc space-y-2 border-t border-edge pl-5 pt-3 text-[15px] leading-relaxed text-body marker:text-brand">
          {bullets.map((b, i) => (
            <li key={i} className="pl-1">{b}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
