"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconNow, IconSearch, IconAgenda, IconSpeakers, IconFirms, IconMeet } from "./Icons";

const items = [
  { href: "/", label: "Now", Icon: IconNow },
  { href: "/search", label: "Search", Icon: IconSearch },
  { href: "/agenda", label: "Agenda", Icon: IconAgenda },
  { href: "/speakers", label: "Speakers", Icon: IconSpeakers },
  { href: "/companies", label: "Firms", Icon: IconFirms },
  { href: "/meet", label: "Meet", Icon: IconMeet },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl">
        {items.map((it) => {
          const active =
            it.href === "/"
              ? path === "/"
              : path.startsWith(it.href) || (it.href === "/meet" && path === "/me");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${
                active ? "text-brand" : "text-muted"
              }`}
            >
              <it.Icon />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
