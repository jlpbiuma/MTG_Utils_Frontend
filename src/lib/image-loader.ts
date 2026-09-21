"use client";

export default function imageLoader({
  src,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  try {
    const url = new URL(src);
    if (
      url.pathname.startsWith("/images/") &&
      (url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "::1" ||
        url.hostname === "nginx" ||
        url.hostname.startsWith("192.168."))
    ) {
      return url.pathname;
    }
  } catch {
    // Relative URLs fall through
  }
  return src;
}