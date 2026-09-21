import React from "react";
import Image, { ImageProps } from "next/image";

function localImagePath(src: string | unknown): string | unknown {
  if (typeof src !== "string") return src;
  try {
    const url = new URL(src);
    const isLocalImageService =
      (url.port === "8080" || url.port === "8088" || url.hostname === "nginx") &&
      (url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "::1" ||
        url.hostname === "nginx" ||
        url.hostname.startsWith("192.168."));
    return isLocalImageService && url.pathname.startsWith("/images/")
      ? url.pathname
      : src;
  } catch {
    return src;
  }
}

export function CardImage({ src, ...props }: ImageProps) {
  const resolvedSrc = localImagePath(src);
  return (
    <Image
      src={resolvedSrc as ImageProps["src"]}
      unoptimized={typeof resolvedSrc === "string" && resolvedSrc.startsWith("/images/")}
      {...props}
    />
  );
}
