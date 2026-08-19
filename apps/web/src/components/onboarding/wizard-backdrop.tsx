export function OnboardingBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgb(91_42_104/0.10),_transparent_52%),hsl(var(--background))]" />
      <div className="absolute -left-24 top-10 size-[28rem] rounded-full bg-pink-soft/70 blur-3xl" />
      <div className="absolute -right-20 bottom-0 size-[32rem] rounded-full bg-primary-soft blur-3xl" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.22]"
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M180 80c40 70 40 150 0 220s-40 150 0 220 40 150 0 220"
          stroke="#5b2a68"
          strokeWidth="2.2"
        />
        <path
          d="M220 80c-40 70-40 150 0 220s40 150 0 220-40 150 0 220"
          stroke="#d94b83"
          strokeWidth="2.2"
        />
        <circle cx="200" cy="190" r="7" fill="#5b2a68" />
        <circle cx="200" cy="300" r="7" fill="#d94b83" />
        <circle cx="200" cy="410" r="7" fill="#8b6aae" />
        <circle cx="200" cy="520" r="7" fill="#5b2a68" />
        <path
          d="M980 40c50 90 50 180 0 270s-50 180 0 270 50 180 0 270"
          stroke="#8b6aae"
          strokeWidth="2"
        />
        <path
          d="M1030 40c-50 90-50 180 0 270s50 180 0 270-50 180 0 270"
          stroke="#d94b83"
          strokeWidth="2"
        />
        <ellipse cx="600" cy="700" rx="120" ry="70" stroke="#5b2a68" strokeWidth="1.5" />
        <ellipse cx="600" cy="700" rx="70" ry="40" stroke="#d94b83" strokeWidth="1.5" />
        <circle cx="600" cy="700" r="14" fill="#f7dce8" stroke="#5b2a68" />
        <circle cx="860" cy="160" r="46" stroke="#d94b83" strokeWidth="1.4" />
        <circle cx="860" cy="160" r="18" fill="#f2e9f5" stroke="#8b6aae" />
        <circle cx="320" cy="640" r="36" stroke="#8b6aae" strokeWidth="1.3" />
        <circle cx="320" cy="640" r="12" fill="#fff9f7" stroke="#5b2a68" />
      </svg>
    </div>
  );
}
