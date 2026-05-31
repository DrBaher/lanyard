"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

/**
 * Camera QR/barcode scanner. Requires HTTPS (or localhost) for camera access.
 * Calls onResult with the decoded text once, then stops.
 */
export function QrScanner({
  onResult,
  onCancel,
}: {
  onResult: (text: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let stopped = false;
    let controls: { stop: () => void } | undefined;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, err, c) => {
        controls = c;
        if (stopped) return;
        // The callback fires per frame once the camera is live — drop the
        // "starting camera" overlay on the first one.
        setScanning(true);
        if (result) {
          stopped = true;
          c.stop();
          onResult(result.getText());
        }
      })
      .catch((e) => {
        setError(
          e?.name === "NotAllowedError"
            ? "Camera permission denied. Enable it in your browser settings."
            : "Could not start the camera. Make sure you're on HTTPS."
        );
      });

    return () => {
      stopped = true;
      try {
        controls?.stop();
      } catch {
        /* noop */
      }
    };
  }, [onResult]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-edge bg-black">
        <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/60" />
        {!scanning && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white/90 motion-reduce:animate-none" />
            <span className="text-sm">Starting camera…</span>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn w-full" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
