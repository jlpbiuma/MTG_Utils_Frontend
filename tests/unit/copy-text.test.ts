import { describe, it, expect, vi, afterEach } from "vitest";
import { copyText } from "@/lib/copy-text";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); delete (document as Partial<Document>).execCommand; });

describe("copyText", () => {
  it("waits for native clipboard success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await copyText("2 Card\\n1 Another");
    expect(writeText).toHaveBeenCalledWith("2 Card\\n1 Another");
  });

  it.each([false, true])("falls back without clipboard or when access is denied: %s", async (denied) => {
    vi.stubGlobal("navigator", denied ? { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } } : {});
    document.execCommand = vi.fn(() => {
      expect(document.querySelector("textarea")?.value).toBe("2 Card\n1 Another");
      return true;
    });
    await copyText("2 Card\n1 Another");
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("rejects when both mechanisms are unavailable and cleans up", async () => {
    vi.stubGlobal("navigator", {});
    await expect(copyText("1 Card")).rejects.toThrow("No se pudo copiar");
    expect(document.querySelector("textarea")).toBeNull();
  });
});
