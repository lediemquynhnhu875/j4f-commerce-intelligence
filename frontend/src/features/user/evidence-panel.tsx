"use client";
import Image from "next/image";
import Link from "next/link";
import { money, products, type Product } from "@/lib/preview-fixtures";
import { Badge, Icon, Panel, Stat, downloadFixture } from "@/components/ui";
import { ProductBadge } from "@/components/products/product-cell";

export function EvidencePanel({
  product,
  onSelect,
  notify,
}: {
  product: Product;
  onSelect: (id: string) => void;
  notify: (text: string) => void;
}) {
  const reference = product.reference;
  const gap = reference === null ? null : reference - product.sold;
  return (
    <>
      <div className="analysis-product panel">
        <Image
          src={product.image}
          width={132}
          height={132}
          alt={product.name}
        />
        <div className="analysis-product-info">
          <Badge>{product.category}</Badge>
          <h2>{product.name}</h2>
          <strong className="product-price">{money(product.price)}</strong>
          <p>
            SKU: {product.id} ·{" "}
            {product.rating === null
              ? "Chưa có đánh giá"
              : `${product.rating} ★ · ${product.reviews} đánh giá`}
          </p>
          <ProductBadge status={product.status} />
        </div>
        <div className="analysis-product-actions">
          <select
            aria-label="Sản phẩm phân tích"
            value={product.id}
            onChange={(e) => onSelect(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} · {p.name}
              </option>
            ))}
          </select>
          <button
            className="button subtle"
            onClick={() => downloadFixture(`analysis-${product.id}`, product)}
          >
            <Icon name="download" size={16} />
            Xuất dữ liệu demo
          </button>
        </div>
      </div>
      <div className="diagnosis">
        <span className="tile-icon pink">
          <Icon name="sparkles" />
        </span>
        <div>
          <span className="eyebrow">
            KẾT LUẬN MINH HỌA · KHÔNG PHẢI KẾT QUẢ MÔ HÌNH
          </span>
          <h3>
            {reference === null
              ? "Chưa đủ cơ sở để đưa ra tham chiếu cho sản phẩm này."
              : gap! > 0
                ? "Số bán quan sát thấp hơn mức tham chiếu của nhóm tương đồng."
                : "Số bán quan sát đạt hoặc vượt mức tham chiếu minh họa."}
          </h3>
          <p>
            {reference === null
              ? "Giữ giá trị tham chiếu và chênh lệch ở trạng thái không khả dụng."
              : "Chênh lệch là tín hiệu để rà soát; cần kiểm chứng trước khi đưa ra quyết định."}
          </p>
        </div>
        <Badge tone={reference === null ? "gray" : "purple"}>
          {reference === null ? "Thiếu dữ liệu" : "Snapshot demo"}
        </Badge>
      </div>
      <div className="stats-grid four">
        <Stat
          label="Số bán quan sát"
          value={product.sold}
          suffix="đơn vị"
          note="Từ snapshot tổng hợp"
          icon="box"
        />
        <Stat
          label="Mức tham chiếu"
          value={reference ?? "—"}
          suffix={reference === null ? undefined : "đơn vị"}
          note={
            reference === null
              ? "Không có cơ sở đối chiếu"
              : "Tham chiếu minh họa, không dự báo"
          }
          tone="blue"
        />
        <Stat
          label="Khoảng cách tham chiếu − quan sát"
          value={gap ?? "—"}
          suffix={gap === null ? undefined : "đơn vị"}
          note="Không phải doanh số có thể cam kết"
          tone={gap !== null && gap > 0 ? "pink" : "green"}
        />
        <Stat
          label="Trạng thái DSS"
          value={<ProductBadge status={product.status} />}
          note="Phân loại fixture, chưa chạy ML"
          icon="info"
        />
      </div>
      <Panel
        title="Biểu đồ đối chiếu lượng bán"
        subtitle="So sánh tại snapshot, không diễn giải thành doanh thu tương lai"
      >
        <div className="comparison-bars">
          {[
            { name: "Số bán quan sát", value: product.sold },
            { name: "Mức tham chiếu minh họa", value: reference },
          ].map((row, i) => (
            <div key={row.name}>
              <div>
                <span>{row.name}</span>
                <strong>
                  {row.value === null ? "Chưa đủ cơ sở" : `${row.value} đơn vị`}
                </strong>
              </div>
              <div className="comparison-track">
                <span
                  className={i === 0 ? "observed" : "reference"}
                  style={{
                    width:
                      row.value === null
                        ? "0%"
                        : `${(row.value / Math.max(product.sold, reference ?? 0, 1)) * 100}%`,
                  }}
                >
                  {row.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        title="1. Bối cảnh & Cơ sở ghép nhóm đối chiếu"
        subtitle="Các thông tin sau là fixture giao diện"
      >
        <div className="context-grid">
          <div className="tinted">
            <small>Nhóm sản phẩm</small>
            <strong>{product.category}</strong>
          </div>
          <div className="tinted">
            <small>Số mẫu đối chiếu</small>
            <strong>
              {reference === null ? "Chưa đủ mẫu" : "42 sản phẩm minh họa"}
            </strong>
          </div>
          <div className="tinted">
            <small>Giá trung vị nhóm</small>
            <strong>
              {reference === null
                ? "—"
                : money(Math.round(product.price / 1.228))}
            </strong>
          </div>
          <div className="tinted">
            <small>Độ tin cậy mô hình</small>
            <strong>Chưa xác minh</strong>
          </div>
        </div>
      </Panel>
      <Panel
        title="2. Bằng chứng quan sát"
        subtitle="Fixture thể hiện cách trình bày, chưa phải dữ liệu thật"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>YẾU TỐ</th>
                <th>HIỆN TRẠNG</th>
                <th>CƠ SỞ ĐỐI CHIẾU</th>
                <th>HÀNH ĐỘNG RÀ SOÁT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Giá bán</td>
                <td>{money(product.price)}</td>
                <td>
                  {reference === null
                    ? "Không có"
                    : money(Math.round(product.price / 1.228))}
                </td>
                <td>
                  <Badge tone="amber">Kiểm tra định giá</Badge>
                </td>
              </tr>
              <tr>
                <td>Thông tin kích thước</td>
                <td>Nhãn S / M / L (mock)</td>
                <td>Bảng kích thước cm (mock)</td>
                <td>
                  <Badge>Bổ sung mô tả</Badge>
                </td>
              </tr>
              <tr>
                <td>Ảnh & Video</td>
                <td>3 ảnh, chưa có video (mock)</td>
                <td>Chưa xác minh</td>
                <td>
                  <Badge tone="blue">Rà soát nội dung</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel
        title="3. Giải thích kết quả phân tích"
        subtitle="Thành phần giải thích minh họa; không gán đóng góp SHAP giả cho mô hình thật"
      >
        <div className="grid-two">
          <div className="distribution">
            {[
              "Giá so với nhóm tương đồng",
              "Mức đầy đủ thông tin kích thước",
              "Nội dung ảnh và video",
            ].map((name, i) => (
              <div key={name}>
                <div className="distribution-label">
                  <span>{name}</span>
                  <Badge>Minh họa</Badge>
                </div>
                <div className="progress">
                  <span style={{ width: `${[78, 55, 35][i]}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="tinted">
            <h3>Giả thuyết cần kiểm chứng</h3>
            <p>
              Thông tin chưa đầy đủ có thể tạo trở ngại khi khách hàng đánh giá
              sản phẩm. Cần đối chiếu phản hồi và dữ liệu thực tế; chưa thể kết
              luận nguyên nhân.
            </p>
          </div>
        </div>
      </Panel>
      <Panel title="4. Phạm vi & Giới hạn phân tích">
        <div className="notice">
          <Icon name="shield" />
          <span>
            Dữ liệu tổng hợp tại một snapshot. Tham chiếu không phải dự báo;
            chênh lệch không chứng minh quan hệ nhân quả hoặc đảm bảo hiệu quả
            của một hành động. ML pipeline chưa được gọi trong bản demo.
          </span>
        </div>
      </Panel>
      <Panel title="5. Hành động tiếp theo">
        <div className="action-banner">
          <div>
            <h3>Xem đề xuất và kiểm tra bằng chứng</h3>
            <p>Quyết định chấp nhận, từ chối hoặc theo dõi công việc.</p>
          </div>
          <Link className="button primary" href="/preview/user/suggestions">
            <Icon name="sparkles" size={18} />
            Xem đề xuất
          </Link>
        </div>
        <details className="audit-details">
          <summary>Thông số kỹ thuật bản demo</summary>
          <p>
            Source: synthetic UI fixtures · Product: {product.id} · Snapshot:
            24/10/2024 · No inference performed.
          </p>
          <button
            className="button subtle"
            onClick={() =>
              notify(
                "Đã mô phỏng yêu cầu phân tích lại. Dữ liệu fixture không thay đổi; chưa gọi mô hình.",
              )
            }
          >
            Mô phỏng phân tích lại
          </button>
        </details>
      </Panel>
    </>
  );
}
