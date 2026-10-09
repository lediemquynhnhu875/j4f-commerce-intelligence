"use client";
import Image from "next/image";
import {
  statusLabels,
  type Product,
  type ProductStatus,
} from "@/lib/preview-fixtures";
import { Badge } from "../ui";

export function ProductCell({ product }: { product: Product }) {
  return (
    <div className="product-cell">
      <Image src={product.image} alt={product.name} width={52} height={52} />
      <div>
        <strong>{product.name}</strong>
        <small>{product.detail}</small>
      </div>
    </div>
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
