import { CollectionTabNav } from "@/components/collection-tab-nav";

export default function CollectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="container mx-auto max-w-7xl px-4 pt-8">
        <CollectionTabNav />
      </div>
      {children}
    </div>
  );
}
