// Shared, pre-warmable Tesseract OCR worker.
//
// Tesseract.js fetches a worker script, the WASM core, and the English
// traineddata on first use (a few MB). Calling Tesseract.recognize() directly
// also spins up and tears down a throwaway worker per call. Here we keep ONE
// worker alive for the session and let callers warm it up ahead of time, so by
// the time the user captures a badge it's ready, and repeat scans are instant.
//
// Everything runs on-device; no image or text leaves the browser.

import type { Worker } from "tesseract.js";

export type OcrState = "idle" | "warming" | "ready" | "error";

let workerPromise: Promise<Worker> | null = null;
let state: OcrState = "idle";
const listeners = new Set<(s: OcrState) => void>();

// Forwarded only during an active recognize() so the UI can show a %.
let recognizeProgress: ((pct: number) => void) | null = null;

export function getOcrState(): OcrState {
  return state;
}

export function subscribeOcr(fn: (s: OcrState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setState(s: OcrState) {
  state = s;
  listeners.forEach((fn) => fn(s));
}

/**
 * Begin loading the OCR worker if it isn't already. Idempotent and safe to call
 * eagerly (e.g. when the scan screen opens). Returns the shared worker.
 */
export function warmupOcr(): Promise<Worker> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OCR is browser-only"));
  }
  if (!workerPromise) {
    setState("warming");
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      // Point Tesseract at the self-hosted assets in /public/tesseract so the
      // worker, WASM core, and English data load from our own origin — OCR
      // works on the show floor even with no/poor connectivity. `1` selects
      // the LSTM-only engine, which matches the *-lstm core we ship.
      const worker = await createWorker("eng", 1, {
        workerPath: "/tesseract/worker.min.js",
        corePath: "/tesseract",
        langPath: "/tesseract/lang",
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text" && recognizeProgress) {
            recognizeProgress(Math.round(m.progress * 100));
          }
        },
      });
      setState("ready");
      return worker;
    })();
    // On failure, reset so a later attempt (e.g. once back online) can retry.
    workerPromise.catch(() => {
      workerPromise = null;
      setState("error");
    });
  }
  return workerPromise;
}

/** Recognise text from an image/canvas using the shared (warmed) worker. */
export async function recognizeBadge(
  image: HTMLCanvasElement | HTMLImageElement,
  onProgress?: (pct: number) => void
): Promise<string> {
  recognizeProgress = onProgress ?? null;
  try {
    const worker = await warmupOcr();
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    recognizeProgress = null;
  }
}

/** Release the worker (e.g. to free memory). Optional. */
export async function terminateOcr(): Promise<void> {
  if (!workerPromise) return;
  const p = workerPromise;
  workerPromise = null;
  setState("idle");
  try {
    (await p).terminate();
  } catch {
    /* already gone */
  }
}
