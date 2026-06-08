import { AdminProductDetail } from "@/components/admin/admin-product-detail";

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <AdminProductDetail productId={productId} />;
}
