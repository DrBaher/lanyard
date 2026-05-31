"use client";

import { IconSearch, IconX } from "./Icons";

export function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        <IconSearch size={17} />
      </span>
      <input
        className="input pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
      />
      {value && (
        <button
          className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center text-muted"
          onClick={() => onChange("")}
          aria-label="Clear"
        >
          <IconX size={16} />
        </button>
      )}
    </div>
  );
}
