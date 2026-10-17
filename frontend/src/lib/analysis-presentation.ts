import type { Product } from "@/types/api";

export function productCode(product: Pick<Product, "id" | "source_product_id">) {
  const code = product.source_product_id?.trim() || product.id;
  return /^SP-/i.test(code) ? code : `SP-${code}`;
}

export const actionTypeLabels: Record<string,string> = {
  review_price:"Rà soát giá", review_images:"Rà soát ảnh", review_video:"Rà soát video", complete_description:"Bổ sung mô tả",
  inspect_reviews:"Phản hồi khách hàng",verify_listing_and_stock:"Hiển thị / tồn kho",verify_exposure:"Khả năng hiển thị",
  review_images_or_video:"Ảnh / video",other:"Công việc khác",
};
export function quantity(value:unknown) {
  if(value===null || value===undefined || value==="" || !["number","string"].includes(typeof value))return "—";
  const number=Number(value);
  return Number.isFinite(number)?new Intl.NumberFormat("vi-VN",{maximumFractionDigits:2}).format(number):"—";
}
export function exportSaved(name:string,value:unknown) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download=`${name}.json`;link.click();URL.revokeObjectURL(url);
}
