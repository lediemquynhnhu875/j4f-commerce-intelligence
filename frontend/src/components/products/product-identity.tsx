"use client";
import { useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui";

export function ProductIdentity({
  name,
  image,
  detail,
  code,
}: {
  name: string;
  image?: string | null;
  detail?: string | null;
  code?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="product-cell">
      {image && !failed ? (
        <Image
          src={image}
          alt={name}
          width={52}
          height={52}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="product-image-placeholder"
          role="img"
          aria-label="Chưa có ảnh sản phẩm"
        >
          <Icon name="box" size={24} />
        </span>
      )}
      <div>
        <strong title={name}>{name}</strong>
        {detail && <small>{detail}</small>}
        {code && <code className="product-code">{code}</code>}
      </div>
    </div>
  );
}
