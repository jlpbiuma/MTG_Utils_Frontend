import { getPriorities } from "@/actions/priorities";
import { PrioritiesView } from "@/components/priorities-view";

export const dynamic = "force-dynamic";

export default async function PrioritiesPage() {
  const priceProvider = "cardmarket";
  const initialData = await getPriorities({ provider: priceProvider });
  return <PrioritiesView key={`${initialData.provider}:${initialData.priceWindowDays ?? 30}`} initialData={initialData} activeTab="table" />;
}
