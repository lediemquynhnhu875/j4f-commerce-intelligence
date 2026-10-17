"use client";
import Image from "next/image";
import { useState } from "react";
import type { Product, ProductImage } from "@/types/api";
import { Icon } from "../ui";

/**
 * Real product media comes from the live Tiki API, fetched after the 2023
 * snapshot, so it is a display asset only. Products whose listing was delisted
 * have no URL and keep the existing placeholder tile.
 */

function imageUrl(image: ProductImage) {
  return (
    image.large_url ?? image.base_url ?? image.medium_url ?? image.thumbnail_url
  );
}

export function ProductThumb({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  if (!product.thumbnail_url || failed)
    return (
      <span className="tile-icon" aria-hidden="true">
        <Icon name="box" />
      </span>
    );
  return (
    <Image
      src={product.thumbnail_url}
      alt={product.name}
      width={49}
      height={49}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

export function ProductGallery({ product }: { product: Product }) {
  const images = (product.image_urls ?? [])
    .map((image) => imageUrl(image))
    .filter((url): url is string => Boolean(url));
  const [active, setActive] = useState<string | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const usable = images.filter((url) => !failed.includes(url));
  const main = active && usable.includes(active) ? active : (product.thumbnail_url ?? usable[0]);
  const fail = (url: string) => setFailed((rows) => [...rows, url]);

  if (!main && !product.video_url)
    return (
      <div className="product-media empty">
        <span className="tile-icon" aria-hidden="true">
          <Icon name="box" />
        </span>
        <p>
          Không có ảnh cho sản phẩm này. Tin đăng gốc không còn truy cập được
          {product.media_source_json?.http_status
            ? ` (HTTP ${product.media_source_json.http_status})`
            : ""}
          .
        </p>
      </div>
    );

  return (
    <div className="product-media">
      {main ? (
        <Image
          className="product-media-main"
          src={main}
          alt={product.name}
          width={420}
          height={420}
          unoptimized
          onError={() => fail(main)}
        />
      ) : null}
      {usable.length > 1 ? (
        <div className="product-media-strip">
          {usable.map((url) => (
            <button
              key={url}
              type="button"
              className={url === main ? "active" : ""}
              onClick={() => setActive(url)}
              aria-label={`Xem ảnh ${usable.indexOf(url) + 1}`}
            >
              <Image
                src={url}
                alt=""
                width={56}
                height={56}
                unoptimized
                onError={() => fail(url)}
              />
            </button>
          ))}
        </div>
      ) : null}
      {product.video_url ? (
        <video
          className="product-media-video"
          src={product.video_url}
          controls
          preload="none"
          poster={product.thumbnail_url ?? undefined}
        />
      ) : null}
      <p className="product-media-note">
        Ảnh và video lấy trực tiếp từ tin đăng Tiki
        {product.media_source_json?.fetched_at
          ? ` ngày ${new Date(product.media_source_json.fetched_at).toLocaleDateString("vi-VN")}`
          : ""}
        , sau thời điểm snapshot 2023. Đây là tư liệu hiển thị, không phải bằng
        chứng phân tích; số ảnh và cờ video dùng trong phân tích vẫn lấy từ
        snapshot gốc.
      </p>
    </div>
  );
}
