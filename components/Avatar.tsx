// Pleasant, dark-bg-friendly palette; pick deterministically from the name so
// each person/company keeps a stable, distinct colour.
const AVATAR_COLORS = [
  "#1e3a8a", "#155e63", "#7c2d12", "#3f2d6b", "#0f5132",
  "#854d0e", "#5b21b6", "#9f1239", "#155e75", "#b45309",
];
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ src, name, size = 48 }: { src?: string; name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), backgroundColor: colorFor(name) }}
    >
      {initials || "?"}
    </div>
  );
}
