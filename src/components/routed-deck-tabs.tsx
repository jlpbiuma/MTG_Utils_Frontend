"use client";
import { Tabs } from "@/components/ui/tabs";
import { useQueryState } from "@/hooks/use-query-state";
export function RoutedDeckTabs({
  initialTab,
  children,
  className,
}: {
  initialTab: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [tab, setTab] = useQueryState<string>("tab", initialTab, [
    "my-decks",
    "archived",
    "edhrec",
  ]);
  return (
    <Tabs value={tab} onValueChange={setTab} className={className}>
      {children}
    </Tabs>
  );
}
