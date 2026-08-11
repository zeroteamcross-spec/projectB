import { tw } from "../theme/tailwindClasses.js";

export function Skeleton({ lines = 1 } = {}) {
  const wrap = document.createElement("div");
  wrap.className = `${tw.skeleton.wrap} rounded-3xl border border-[var(--pb-card-border)] bg-white/90 p-4 shadow-card backdrop-blur`;

  for (let index = 0; index < lines; index += 1) {
    const line = document.createElement("div");
    line.className = tw.skeleton.line;
    line.style.width = index === lines - 1 && lines > 1 ? "72%" : "100%";
    line.style.height = index === 0 && lines > 3 ? "1.25rem" : "1rem";
    wrap.append(line);
  }

  return wrap;
}
