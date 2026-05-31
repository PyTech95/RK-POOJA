import { MapPin } from "lucide-react";

export function Logo({ size = 36, theme = "dark" }) {
  const navy = "#0A2E6D";
  const orange = "#FF7A00";
  const wordColor = theme === "light" ? "white" : navy;
  return (
    <div className="flex items-center gap-2 select-none" data-testid="rk-logo">
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
          <MapPin size={size * 0.22} color="white" strokeWidth={3} />
        </span>
      </div>
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
    </div>
  );
}
