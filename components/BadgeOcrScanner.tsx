"use client";

import { useEffect, useRef, useState } from "react";
import { parseBadgeText, type OcrGuess } from "@/lib/linkedin";
import { warmupOcr, recognizeBadge, subscribeOcr, getOcrState, type OcrState } from "@/lib/ocr";
import { IconCamera } from "./Icons";

type Status = "starting" | "ready" | "reading";

/**
 * Reads the *printed text* on a badge with on-device OCR (Tesseract.js).
 * Nothing leaves the device. The OCR worker is pre-warmed on mount so it's
 * usually ready before the user captures; we capture a still frame, recognise
 * it, and hand a best-effort {name, company, role} guess back for confirmation.
 * Requires HTTPS (or localhost) for camera access.
 */
export function BadgeOcrScanner({
  onResult,
  onCancel,
}: {
  onResult: (guess: OcrGuess) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [ocrState, setOcrState] = useState<OcrState>(getOcrState());
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Start (or reuse) the OCR worker as soon as the scanner appears, so the
  // model is downloading while the user is still aiming the camera.
  useEffect(() => {
    const unsub = subscribeOcr(setOcrState);
    void warmupOcr().catch(() => {});
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("ready");
      } catch (e) {
        setError(
          (e as DOMException)?.name === "NotAllowedError"
            ? "Camera permission denied. Enable it in your browser settings."
            : "Could not start the camera. Make sure you're on HTTPS."
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);

    setStatus("reading");
    setProgress(0);
    setError(null);
    try {
      const text = await recognizeBadge(canvas, setProgress);
      stopCamera();
      onResult(parseBadgeText(text));
    } catch {
      setError("Couldn't read the badge. Try again, or add the contact manually.");
      setStatus("ready");
    }
  }

  const cameraReady = status === "ready";
  const reading = status === "reading";
  const ocrReady = ocrState === "ready";

  let hint: string;
  if (reading) hint = `Reading badge… ${progress}%`;
  else if (ocrState === "warming") hint = "Preparing text reader… you can frame the badge meanwhile.";
  else if (ocrState === "error") hint = "Couldn't start the text reader. Try again, or add the contact manually.";
  else hint = "Frame the printed name & company in the box, then capture.";

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-edge bg-black">
        <video ref={videoRef} className="aspect-[3/4] w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-x-6 top-1/2 h-28 -translate-y-1/2 rounded-lg border-2 border-white/70" />
        {ocrReady && !reading && (
          <span className="absolute right-2 top-2 rounded-full bg-live/20 px-2 py-0.5 text-[11px] text-live">
            reader ready
          </span>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="muted">{hint}</p>

      <div className="flex gap-2">
        <button
          className="btn btn-brand flex-1"
          onClick={capture}
          disabled={!cameraReady || reading}
        >
          <IconCamera size={18} />
          {ocrState === "warming" && cameraReady ? "Capture (reader loading…)" : "Capture & read"}
        </button>
        <button
          className="btn"
          onClick={() => {
            stopCamera();
            onCancel();
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
