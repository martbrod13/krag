import { encode } from "uqr";

/** A QR code as one SVG path: dark squares on a grid of size × size. */
export type QrCode = { size: number; path: string };

/**
 * Turns text (a link) into a QR code. It is drawn on our server, so the
 * browser never asks another site for the image. Neighbouring dark squares
 * in a row are joined into one rectangle to keep the path short.
 */
export function qrCodePath(text: string): QrCode {
  const { data } = encode(text, { ecc: "M", border: 0 });
  let path = "";
  data.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x++;
      path += `M${start} ${y}h${x - start}v1h-${x - start}z`;
    }
  });
  return { size: data.length, path };
}
