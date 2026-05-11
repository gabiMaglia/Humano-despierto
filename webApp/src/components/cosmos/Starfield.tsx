const STARS = [
  "radial-gradient(1px 1px at 12% 18%, #c4b5fd 50%, transparent)",
  "radial-gradient(1px 1px at 38% 8%,  #ede4ff 50%, transparent)",
  "radial-gradient(1.5px 1.5px at 62% 22%, #f5d76e 50%, transparent)",
  "radial-gradient(1px 1px at 82% 14%, #c4b5fd 50%, transparent)",
  "radial-gradient(1px 1px at 92% 36%, #ede4ff 50%, transparent)",
  "radial-gradient(1px 1px at 8% 52%,  #ede4ff 50%, transparent)",
  "radial-gradient(1.5px 1.5px at 28% 68%, #c4b5fd 50%, transparent)",
  "radial-gradient(1px 1px at 52% 78%, #ede4ff 50%, transparent)",
  "radial-gradient(1px 1px at 72% 88%, #f5d76e 50%, transparent)",
  "radial-gradient(1px 1px at 18% 92%, #ede4ff 50%, transparent)",
  "radial-gradient(2px 2px at 48% 42%, #c4b5fd 50%, transparent)",
  "radial-gradient(1px 1px at 88% 72%, #ede4ff 50%, transparent)",
  "radial-gradient(1px 1px at 33% 55%, #c4b5fd 50%, transparent)",
  "radial-gradient(1.5px 1.5px at 70% 45%, #f5d76e 50%, transparent)",
  "radial-gradient(1px 1px at 5% 30%,  #ede4ff 50%, transparent)",
  "radial-gradient(1px 1px at 95% 60%, #c4b5fd 50%, transparent)",
].join(",");

export default function Starfield() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: STARS, animation: "twinkle 8s ease-in-out infinite alternate", opacity: 0.55 }}
      aria-hidden
    />
  );
}
