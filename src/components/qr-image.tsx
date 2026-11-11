import { cx } from "@/lib/cx";
import type { QrCode } from "@/lib/qr";

/** Empty border around the code, in squares; phone cameras need it. */
const QUIET_ZONE = 4;

type QrImageProps = { qr: QrCode; label: string; className?: string };

/** A QR code drawn as SVG: dark squares on white, also in dark mode. */
export function QrImage({ qr, label, className }: QrImageProps) {
  const side = qr.size + QUIET_ZONE * 2;
  return (
    <svg
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${side} ${side}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={cx("aspect-square w-64 max-w-full rounded-2xl", className)}
    >
      <rect
        x={-QUIET_ZONE}
        y={-QUIET_ZONE}
        width={side}
        height={side}
        fill="#ffffff"
      />
      <path d={qr.path} fill="#1d2a24" />
    </svg>
  );
}
