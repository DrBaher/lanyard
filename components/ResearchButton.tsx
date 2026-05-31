"use client";

import { useState } from "react";
import { research, summaryParagraphs, type ResearchKind, type ResearchResult } from "@/lib/research";
import { IconSearch } from "./Icons";
import { Modal } from "./Modal";

export function ResearchButton({
  kind,
  name,
  context,
  label = "Research",
}: {
  kind: ResearchKind;
  name: string;
  context?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      setResult(await research(kind, { name, context }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="btn" onClick={run} type="button">
        <IconSearch size={17} /> {label}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Research · ${name}`}>
        {loading && (
          <p className="muted flex items-center gap-2">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-edge border-t-fg motion-reduce:animate-none" />
            Looking up {name}…
          </p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}

        {result && (
          <div className="space-y-3">
            {result.stub && (
              <p className="chip">Preview — connect an LLM key to go live</p>
            )}
            {result.cached && !result.stub && (
              <p className="chip">Saved result · tap-free & offline</p>
            )}
            <div className="space-y-2.5">
              {summaryParagraphs(result.summary).map((p, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-body">{p}</p>
              ))}
            </div>
            {result.bullets && result.bullets.length > 0 && (
              <ul className="list-disc space-y-2 border-t border-edge pl-5 pt-3 text-[15px] leading-relaxed text-body marker:text-brand">
                {result.bullets.flatMap(summaryParagraphs).map((b, i) => (
                  <li key={i} className="pl-1">{b}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
