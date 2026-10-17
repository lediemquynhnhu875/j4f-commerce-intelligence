"use client";
import { ProductIdentity } from "./product-identity";
import {
  statusLabels,
  type Product,
  type ProductStatus,
} from "@/lib/preview-fixtures";
import { Badge } from "../ui";

export function ProductCell({ product }: { product: Product }) {
  return (
    <ProductIdentity
      name={product.name}
      image={product.image}
      detail={product.detail}
    />
  );
}
export function ProductBadge({ status }: { status: ProductStatus }) {
  return (
    <Badge
      tone={
        {
          review: "amber",
          good: "green",
          zero: "red",
          insufficient: "gray",
          watch: "blue",
        }[status]
      }
    >
      {statusLabels[status]}
    </Badge>
  );
}
