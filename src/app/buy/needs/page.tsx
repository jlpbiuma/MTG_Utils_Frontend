import { getPriorities } from "@/actions/priorities";
import { PrioritiesView } from "@/components/priorities-view";
import { PRIORITIES_PAGE_SIZE } from "@/lib/page-sizes";

export const dynamic = "force-dynamic";

const SORTS = ["demand", "impact", "completion", "price_opportunity"] as const;

export default async function PrioritiesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The first page uses the same filters and defaults as the table's URL
  // state; otherwise page 1 and page 2 described different result sets.
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const flag = (key: string, fallback: boolean) => {
    const raw = value(key);
    return raw === "true" ? true : raw === "false" ? false : fallback;
  };
  const sort = SORTS.find((option) => option === value("sort")) ?? "demand";
  const cardType = value("type");
  const priceProvider = "cardmarket";
  const initialData = await getPriorities({
    provider: priceProvider,
    sort,
    reassignableOnly: flag("reassignable", false),
    hideOwned: flag("hideOwned", true),
    cardType: cardType && cardType !== "all" ? cardType : undefined,
    page: 1,
    limit: PRIORITIES_PAGE_SIZE,
  });
  return <PrioritiesView key={`${initialData.provider}:${initialData.priceWindowDays ?? 30}`} initialData={initialData} activeTab="table" />;
}
