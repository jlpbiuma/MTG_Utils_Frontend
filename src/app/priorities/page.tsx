import { getPriorities } from "@/actions/priorities";
import { PrioritiesView } from "@/components/priorities-view";

export const dynamic = "force-dynamic";

export default async function PrioritiesPage() {
  const initialData = await getPriorities();
  return <PrioritiesView initialData={initialData} activeTab="table" />;
}
