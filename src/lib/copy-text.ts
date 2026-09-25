/** Clipboard API requires HTTPS; retain a fallback for local HTTP installations. */
export async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Some browsers deny clipboard permissions even in a secure context.
  }
  const previous = document.activeElement;
  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  document.body.appendChild(input);
  try {
    input.focus();
    input.select();
    input.setSelectionRange(0, text.length);
    if (!document.execCommand?.("copy")) throw new Error("No se pudo copiar al portapapeles.");
  } finally {
    input.remove();
    if (previous instanceof HTMLElement) previous.focus();
  }
}
