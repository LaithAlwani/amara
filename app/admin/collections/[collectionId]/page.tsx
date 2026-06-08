import { AdminCollectionDetail } from "@/components/admin/admin-collection-detail";

export default async function AdminCollectionDetailPage({
  params,
}: {
  params: Promise<{ collectionId: string }>;
}) {
  const { collectionId } = await params;
  return <AdminCollectionDetail collectionId={collectionId} />;
}
