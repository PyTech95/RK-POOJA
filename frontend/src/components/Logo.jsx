/**
 * RK POOJA brand logo.
 *
 * `mark="image"` (default) renders the official PNG logo.
 * `mark="badge"` renders the compact text-based pin badge (used in tight UI like header).
 */
export function Logo({ size = 36, theme = "dark", mark = "badge", showWord = true, className = "" }) {
  if (mark === "image") {
    return (
      <img
        src="/logo.png"
        alt="RK POOJA — One App. All Rides."
        width={size}
        height={size}
        className={`object-contain ${className}`}
        data-testid="rk-logo-image"
        style={{ width: size, height: "auto" }}
      />
    );
  }

  // Compact badge logo for header (text-based, scalable, fast)
  const navy = "#0A2E6D";
  const orange = "#FF7A00";
  const wordColor = theme === "light" ? "white" : navy;

  return (
    <div className={`flex items-center gap-2 select-none ${className}`} data-testid="rk-logo">
      <div
        className="relative flex items-center justify-center font-heading font-black"
        style={{
          width: size, height: size,
          background: navy,
          borderRadius: 10,
          color: "white",
          letterSpacing: "-0.04em",
          fontSize: size * 0.46,
          lineHeight: 1,
        }}
      >
        RK
        <span
          className="absolute -top-1.5 -right-1.5 grid place-items-center"
          style={{
            width: size * 0.42, height: size * 0.42,
            background: orange, borderRadius: 999,
            border: "2px solid white",
          }}
        >
          <Pin size={size * 0.22} />
        </span>
      </div>
      {showWord && (
        <div className="flex flex-col leading-none">
          <span className="font-heading font-extrabold text-lg" style={{ color: wordColor }}>
            pooja
          </span>
          <span
            className="text-[9px] font-bold tracking-[0.15em] mt-0.5"
            style={{ color: orange }}
          >
            ONE APP. ALL RIDES.
          </span>
        </div>
      )}
    </div>
  );
}

function Pin({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="0">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}
