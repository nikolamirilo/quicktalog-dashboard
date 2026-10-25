// The fixed layer behind every page that the glass surfaces refract: soft
// amber glows that drift slowly, the design system's faint 44px grid and a
// little grain. Purely decorative. Glows stay at or under 35% amber, the
// level the glass caption contrast was checked against (app/globals.css).
const GLOWS = [
  {
    className: "animate-drift-a",
    style: {
      top: "-18vmax",
      left: "-12vmax",
      width: "62vmax",
      height: "62vmax",
      background:
        "radial-gradient(closest-side, rgb(255 176 32 / 0.35), rgb(255 176 32 / 0.12) 55%, transparent)",
    },
  },
  {
    className: "animate-drift-b",
    style: {
      top: "-10vmax",
      right: "-16vmax",
      width: "54vmax",
      height: "54vmax",
      background:
        "radial-gradient(closest-side, rgb(255 199 90 / 0.32), rgb(255 199 90 / 0.1) 55%, transparent)",
    },
  },
  {
    className: "animate-drift-c",
    style: {
      bottom: "-22vmax",
      left: "28vw",
      width: "60vmax",
      height: "60vmax",
      background:
        "radial-gradient(closest-side, rgb(245 163 0 / 0.22), rgb(245 163 0 / 0.08) 55%, transparent)",
    },
  },
]

export default function Backdrop() {
  return (
    <div className="qt-backdrop" aria-hidden="true">
      {GLOWS.map((g, i) => (
        <div
          key={i}
          className={`qt-backdrop__glow ${g.className}`}
          style={g.style}
        />
      ))}
      <div className="qt-backdrop__grid" />
      <div className="qt-backdrop__grain" />
    </div>
  )
}
