import { describe, expect, it, vi } from "vitest";
import { runBulkAction } from "@/lib/bulk-actions";

describe("runBulkAction", () => {
  it("continues after a failed card and reports only that card", async () => {
    const action = vi.fn(async (card: string) => {
      if (card === "bad") throw new Error("unavailable");
    });

    const failures = await runBulkAction(["first", "bad", "last"], action);

    expect(action.mock.calls.map(([card]) => card)).toEqual(["first", "bad", "last"]);
    expect(failures).toHaveLength(1);
    expect(failures[0].item).toBe("bad");
  });

  it("returns no failures when every card succeeds", async () => {
    await expect(runBulkAction([1, 2], async () => undefined)).resolves.toEqual([]);
  });
});
