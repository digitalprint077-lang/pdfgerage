import type { ReactNode } from "react";
import OrbitMarker, { ORBIT_MARKERS } from "./OrbitMarker";

interface OrbitBackdropProps {
  children: ReactNode;
  /** Output format — matching orbit marker gets the active glow. */
  highlightFormat?: string;
}

export default function OrbitBackdrop({ children, highlightFormat }: OrbitBackdropProps) {
  const count = ORBIT_MARKERS.length;

  return (
    <div className="format-orbit-stage relative flex items-center justify-center">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div className="format-orbit-ring format-orbit-ring-outer absolute rounded-full border" />
        <div className="format-orbit-ring format-orbit-ring-inner absolute rounded-full border" />

        <div className="format-orbit-spin absolute">
          {ORBIT_MARKERS.map((marker, i) => {
            const angle = (360 / count) * i;
            const active =
              highlightFormat && highlightFormat !== "any" && marker.id === highlightFormat;

            return (
              <div
                key={marker.id}
                className="format-orbit-spoke absolute left-1/2 top-1/2 h-0 w-0"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <div className="format-orbit-node">
                  <div className="format-orbit-counter">
                    <OrbitMarker marker={marker} active={active} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
