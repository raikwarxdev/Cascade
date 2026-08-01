// The real Cascade logo mark from the landing page: a terracotta tile
// with three descending slots cut out as negative space.
export default function LogoMark({ size = 22, color = "#d97757" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <mask id="cascade-mark-cutout">
          <rect width="24" height="24" rx="6.5" fill="#fff" />
          <g fill="#000">
            <rect x="4" y="5.6" width="10" height="3.2" rx="1.6" />
            <rect x="7" y="10.4" width="10" height="3.2" rx="1.6" />
            <rect x="10" y="15.2" width="10" height="3.2" rx="1.6" />
          </g>
        </mask>
      </defs>
      <rect width="24" height="24" rx="6.5" fill={color} mask="url(#cascade-mark-cutout)" />
    </svg>
  );
}
