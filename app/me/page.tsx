"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { safeSetItem } from "@/lib/storage";

interface MyCard {
  name: string;
  role: string;
  company: string;
  email: string;
  linkedin: string;
}

const KEY = "te.mycard";

const empty: MyCard = { name: "", role: "", company: "", email: "", linkedin: "" };

function toVCard(c: MyCard): string {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${c.name}`,
    c.company && `ORG:${c.company}`,
    c.role && `TITLE:${c.role}`,
    c.email && `EMAIL:${c.email}`,
    c.linkedin && `URL:${c.linkedin}`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function MyCardPage() {
  const [card, setCard] = useState<MyCard>(empty);
  const [editing, setEditing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        setCard(JSON.parse(raw));
        setEditing(false);
      } else {
        setEditing(true);
      }
    } catch {
      setEditing(true);
    }
  }, []);

  useEffect(() => {
    if (editing || !card.name || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, toVCard(card), {
      width: 240,
      margin: 1,
      color: { dark: "#0b1020", light: "#ffffff" },
    }).catch(() => {});
  }, [card, editing]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    safeSetItem(KEY, JSON.stringify(card));
    setEditing(false);
  }

  return (
    <div className="space-y-5">
      <Link href="/meet" className="muted -my-2 inline-flex min-h-[44px] items-center">← Meet</Link>
      <header>
        <h1 className="text-2xl font-bold text-fg">My card</h1>
        <p className="muted">Let others scan you back to connect fast.</p>
      </header>

      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <input className="input" placeholder="Full name" aria-label="Full name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
          <div className="flex gap-2">
            <input className="input" placeholder="Role" aria-label="Role" value={card.role} onChange={(e) => setCard({ ...card, role: e.target.value })} />
            <input className="input" placeholder="Company" aria-label="Company" value={card.company} onChange={(e) => setCard({ ...card, company: e.target.value })} />
          </div>
          <input className="input" type="email" placeholder="Email" aria-label="Email" value={card.email} onChange={(e) => setCard({ ...card, email: e.target.value })} />
          <input className="input" placeholder="LinkedIn URL" aria-label="LinkedIn URL" value={card.linkedin} onChange={(e) => setCard({ ...card, linkedin: e.target.value })} />
          <button className="btn btn-brand w-full" type="submit">Save &amp; show QR</button>
        </form>
      ) : (
        <div className="card flex flex-col items-center gap-3 text-center">
          <canvas ref={canvasRef} className="rounded-xl bg-white p-2" />
          <div>
            <p className="text-lg font-semibold text-fg">{card.name}</p>
            <p className="muted">{[card.role, card.company].filter(Boolean).join(" · ")}</p>
          </div>
          <button className="btn" onClick={() => setEditing(true)}>Edit my card</button>
        </div>
      )}
    </div>
  );
}
