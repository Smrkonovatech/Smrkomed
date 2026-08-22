import { execSync } from "node:child_process";
import fs from "node:fs";

let css = execSync("git show HEAD:apps/web/src/styles.css", { encoding: "utf8" });

css = css.replace(
  '--font-sans: var(--font-inter), "Inter", ui-sans-serif, system-ui, sans-serif;',
  '--font-sans: var(--font-poppins), "Poppins", ui-sans-serif, system-ui, sans-serif;',
);
css = css.replace(
  '--font-display: var(--font-inter), "Inter", ui-sans-serif, system-ui, sans-serif;',
  '--font-display: var(--font-poppins), "Poppins", ui-sans-serif, system-ui, sans-serif;',
);

if (!css.includes("--color-brand:")) {
  css = css.replace(
    "--color-primary-soft: var(--primary-soft);",
    `--color-primary-soft: var(--primary-soft);
  --color-brand: var(--brand);
  --color-brand-dark: var(--brand-dark);
  --color-brand-soft: var(--brand-soft);
  --color-lavender: var(--lavender);
  --color-lavender-soft: var(--lavender-soft);
  --color-peach: var(--peach);
  --color-peach-soft: var(--peach-soft);
  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-blue-accent: var(--blue-accent);
  --color-blue-soft: var(--blue-soft);`,
  );
}

css = css.replace(
  `--shadow-soft: 0 1px 2px rgb(91 42 104 / 0.05);
  --shadow-lift: 0 3px 10px -6px rgb(91 42 104 / 0.2);
  --shadow-loop: 0 8px 24px -16px rgb(91 42 104 / 0.35);`,
  `--shadow-soft: 0 18px 45px -22px rgb(123 79 224 / 0.35);
  --shadow-lift: 0 30px 70px -30px rgb(123 79 224 / 0.45);
  --shadow-loop: 0 8px 24px -16px rgb(123 79 224 / 0.35);`,
);

if (!css.includes("@keyframes float-slow")) {
  css = css.replace(
    ":root {",
    `@keyframes float-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}
@keyframes rise-in {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes dash-flow { to { stroke-dashoffset: -60; } }

:root {`,
  );
}

css = css.replace("--radius: 0.625rem;", "--radius: 0.875rem;");

const rootReplacements = [
  ["/* Brand — fertility / IVF */", "/* Brand — SMRKOMED purple / lavender */"],
  [
    "--plum: #5b2a68;",
    `--plum: #7b4fe0;
  --brand: #7b4fe0;
  --brand-dark: #5b35b8;
  --brand-soft: #c4b0f5;
  --blue-accent: #6b8fd6;
  --blue-soft: #e8eefb;
  --ink: #1f1830;
  --ink-soft: #6d6680;
  --peach: #e8b8a0;
  --peach-soft: #f7ebe4;`,
  ],
  ["--plum-deep: #45204f;", "--plum-deep: #5b35b8;"],
  ["--rose: #d94b83;", "--rose: #c47ad4;"],
  ["--pink-soft: #f7dce8;", "--pink-soft: #f3e6f8;"],
  ["--lavender: #8b6aae;", "--lavender: #f0ebfa;"],
  ["--lavender-soft: #eee7f4;", "--lavender-soft: #f8f5fc;"],
  ["--cream: #fff9f7;", "--cream: #fbf9fe;"],
  ["--background: #fffbfa;", "--background: #f8f5fc;"],
  ["--foreground: #29232d;", "--foreground: #1f1830;"],
  ["--card-foreground: #29232d;", "--card-foreground: #1f1830;"],
  ["--popover-foreground: #29232d;", "--popover-foreground: #1f1830;"],
  ["--primary: #5b2a68;", "--primary: #7b4fe0;"],
  ["--primary-foreground: #fff9f7;", "--primary-foreground: #ffffff;"],
  ["--primary-soft: #f2e9f5;", "--primary-soft: #efe8fb;"],
  ["--secondary: #f6f1f5;", "--secondary: #f0ebfa;"],
  ["--secondary-foreground: #3b3242;", "--secondary-foreground: #5b35b8;"],
  ["--muted: #f6f1f5;", "--muted: #f0ebfa;"],
  ["--muted-foreground: #746c78;", "--muted-foreground: #6d6680;"],
  ["--accent: #f2e9f5;", "--accent: #e8eefb;"],
  ["--accent-foreground: #5b2a68;", "--accent-foreground: #3d4f8a;"],
  ["--border: #e9e1e7;", "--border: rgb(123 79 224 / 0.14);"],
  ["--input: #e9e1e7;", "--input: rgb(123 79 224 / 0.18);"],
  ["--ring: #8b6aae;", "--ring: rgb(123 79 224 / 0.4);"],
  ["--rose-color: #d94b83;", "--rose-color: #c47ad4;"],
  ["--rose-foreground: #fff9f7;", "--rose-foreground: #ffffff;"],
  ["--rose-soft: #fbe7ef;", "--rose-soft: #f5e8f9;"],
  ["--info: #8b6aae;", "--info: #7b4fe0;"],
  ["--info-foreground: #fff9f7;", "--info-foreground: #ffffff;"],
  ["--info-soft: #eee7f4;", "--info-soft: #efe8fb;"],
  ["--purple: #7a4e96;", "--purple: #8b63e8;"],
  ["--purple-foreground: #fff9f7;", "--purple-foreground: #ffffff;"],
  ["--purple-soft: #efe6f6;", "--purple-soft: #efe8fb;"],
  ["--teal: #3e8b93;", "--teal: #5a8f9e;"],
  ["--loop: #5b2a68;", "--loop: #7b4fe0;"],
  ["--loop-foreground: #fff9f7;", "--loop-foreground: #ffffff;"],
  ["--chart-1: #5b2a68;", "--chart-1: #7b4fe0;"],
  ["--chart-2: #d94b83;", "--chart-2: #9b6ef0;"],
  ["--chart-3: #8b6aae;", "--chart-3: #6b8fd6;"],
  ["--sidebar-foreground: #29232d;", "--sidebar-foreground: #1f1830;"],
  ["--sidebar-primary: #5b2a68;", "--sidebar-primary: #7b4fe0;"],
  ["--sidebar-primary-foreground: #fff9f7;", "--sidebar-primary-foreground: #ffffff;"],
  ["--sidebar-accent: #f2e9f5;", "--sidebar-accent: #f0ebfa;"],
  ["--sidebar-accent-foreground: #5b2a68;", "--sidebar-accent-foreground: #5b35b8;"],
  ["--sidebar-border: #eee6ec;", "--sidebar-border: rgb(123 79 224 / 0.12);"],
  ["--sidebar-ring: #8b6aae;", "--sidebar-ring: rgb(123 79 224 / 0.4);"],
  [
    "--gradient-loop: linear-gradient(115deg, #5b2a68 0%, #8b4c83 52%, #d94b83 100%);",
    `--gradient-loop: linear-gradient(115deg, #7b4fe0 0%, #9166ea 52%, #c47ad4 100%);
  --gradient-brand: linear-gradient(135deg, #7b4fe0, #9166ea 45%, #c4b0f5);
  --gradient-blue: linear-gradient(135deg, #6b8fd6, #7b4fe0);
  --gradient-deep: linear-gradient(150deg, #3d2480, #5b35b8 60%, #7b4fe0);
  --gradient-veil: linear-gradient(180deg, #f8f5fc, #f0ebfa);`,
  ],
  [
    "--gradient-loop-soft: linear-gradient(115deg, #f2e9f5 0%, #f7dce8 100%);",
    "--gradient-loop-soft: linear-gradient(115deg, #efe8fb 0%, #f3e6f8 100%);",
  ],
  [
    "--gradient-surface: linear-gradient(180deg, #ffffff 0%, #fffaf8 100%);",
    "--gradient-surface: linear-gradient(180deg, #ffffff 0%, #f8f5fc 100%);",
  ],
];

for (const [a, b] of rootReplacements) {
  if (!css.includes(a)) {
    console.warn("missing", a.slice(0, 50));
    continue;
  }
  css = css.replace(a, b);
}

if (!css.includes("@utility gradient-brand")) {
  css += `
@utility gradient-brand {
  background-image: var(--gradient-brand);
}

@utility gradient-blue {
  background-image: var(--gradient-blue);
}

@utility gradient-deep {
  background-image: var(--gradient-deep);
}

@utility gradient-veil {
  background-image: var(--gradient-veil);
}

@utility text-gradient-brand {
  background-image: var(--gradient-brand);
  background-clip: text;
  color: transparent;
}

@utility glow-orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
  opacity: 0.55;
  pointer-events: none;
}

@utility lift-on-hover {
  transition:
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.35s ease;
  &:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-lift);
  }
}

@utility animate-float-slow {
  animation: float-slow 7s ease-in-out infinite;
}

@utility animate-rise-in {
  animation: rise-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@utility flow-line {
  stroke-dasharray: 6 8;
  animation: dash-flow 2.4s linear infinite;
}

@utility photo-frame {
  position: relative;
  overflow: hidden;
  border-radius: 32px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lift);
}

@utility chip-glass {
  border-radius: 16px;
  background: color-mix(in oklab, white 94%, transparent);
  border: 1px solid color-mix(in oklab, white 85%, transparent);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(14px) saturate(140%);
}
`;
}

css = css.replace(
  `@utility surface-card {
  background-color: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: none;
}`,
  `@utility surface-card {
  background-color: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 1.5rem;
  box-shadow: var(--shadow-soft);
}`,
);

fs.writeFileSync("apps/web/src/styles.css", css, { encoding: "utf8" });
const buf = fs.readFileSync("apps/web/src/styles.css");
console.log("BOM?", buf[0] === 0xef && buf[1] === 0xbb, "len", buf.length);
console.log("primary", css.match(/--primary: #[^;]+/)?.[0]);
console.log("has gradient-brand util", css.includes("@utility gradient-brand"));
