import type { Metadata } from "next";
import { SearchExperience } from "@/components/shop/search-experience";

export const metadata: Metadata = {
  title: "Search",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
        Search
      </h1>
      <div className="mt-8">
        <SearchExperience initialQuery={q ?? ""} />
      </div>
    </div>
  );
}
