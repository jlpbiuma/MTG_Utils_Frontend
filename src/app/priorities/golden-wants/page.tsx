import { getPriorities } from "@/actions/priorities";
import { PrioritiesView } from "@/components/priorities-view";

export const dynamic = "force-dynamic";

export default async function GoldenWantsPage({ searchParams }: {
  searchParams: Promise<{ period?: string }>;
}) {
  const requestedPeriod = Number((await searchParams).period || 30);
  const priceWindowDays = [7, 30, 90, 180, 365].includes(requestedPeriod) ? requestedPeriod : 30;
  const initialData = await getPriorities({ limit: 200, includePriceSignals: true, priceWindowDays });
  while (initialData.hasMore) {
    const next = await getPriorities({
      page: (initialData.page || 1) + 1,
      limit: 200,
      includePriceSignals: true,
      priceWindowDays,
    });
    initialData.items.push(...next.items);
    initialData.page = next.page;
    initialData.hasMore = next.hasMore;
  }
  return <PrioritiesView initialData={initialData} activeTab="golden-wants" />;
}
