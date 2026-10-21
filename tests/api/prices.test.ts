import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/prices/route";
import { getCardsPriceSummary, getCollectionPriceSummary, getDeckPriceSummary } from "@/actions/pricing";
vi.mock("@/actions/pricing", () => ({
  getCardsPriceSummary:vi.fn().mockResolvedValue({provider:"cardmarket",totalNetValue:12}),
  getCollectionPriceSummary:vi.fn().mockResolvedValue({provider:"cardmarket",totalNetValue:12}),
  getDeckPriceSummary:vi.fn().mockResolvedValue({provider:"cardmarket",totalNetValue:12}),
}));
beforeEach(() => vi.clearAllMocks());
it.each([{deckId:"deck"}, {type:"collection"}, {cards:[{name:"Sol Ring",quantity:1}]}])("reads available prices and ignores legacy manual refresh flags for %j", async (payload) => {
  const response=await POST(new Request("http://localhost/api/prices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,provider:"mtggoldfish",bypassCache:true,forceRefresh:true})}));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({success:true,summary:{provider:"cardmarket",totalNetValue:12}});
  if ("deckId" in payload) expect(getDeckPriceSummary).toHaveBeenCalledWith("deck","cardmarket");
  if ("type" in payload) expect(getCollectionPriceSummary).toHaveBeenCalledWith("cardmarket");
  if ("cards" in payload) expect(getCardsPriceSummary).toHaveBeenCalledWith(payload.cards,"cardmarket");
});
