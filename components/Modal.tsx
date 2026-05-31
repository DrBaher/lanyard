"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconX } from "./Icons";

/**
 * Accessible modal / bottom-sheet: bottom-anchored on mobile, centred on
 * desktop. Closes on backdrop tap or Escape, locks the page scroll, traps Tab
 * focus inside, and restores focus to the trigger on close. The body scrolls
 * when content is long.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const lastFocused = document.activeElement as HTMLElement | null;
    dialog?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const f = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lastFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-edge bg-panel outline-none sm:max-h-[80vh] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-2 border-b border-edge p-4">
          <h3 id={titleId} className="section-title min-w-0">{title}</h3>
          <button
            className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center text-muted"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
