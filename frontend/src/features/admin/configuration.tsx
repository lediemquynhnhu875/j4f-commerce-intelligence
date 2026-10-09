"use client";
import { useState, type FormEvent } from "react";
import { Badge, Icon, Panel } from "@/components/ui";
const defaults = {
  cohort: 15,
  priceWindow: 25,
  threshold: 15,
  zeroDays: 30,
  confidence: 75,
  penalty: 35,
  outliers: true,
  missing: "unavailable",
};
export function ConfigurationView({
  notify,
}: {
  notify: (text: string) => void;
}) {
  const [config, setConfig] = useState(defaults);
  const [history, setHistory] = useState([
    { version: "Demo v2.4.1", changes: "Tham số mặc định UI preview" },
  ]);
  const [saved, setSaved] = useState(defaults);
  const dirty = JSON.stringify(config) !== JSON.stringify(saved);
  function save(e: FormEvent) {
    e.preventDefault();
    setHistory([
      {
        version: `Demo v2.4.${history.length + 1}`,
        changes: `Min cohort: ${config.cohort}; price window: ±${config.priceWindow}%; threshold: ${config.threshold}%`,
      },
      ...history,
    ]);
    setSaved({ ...config });
    notify("Đã lưu cấu hình demo trên trang. Không thay đổi ML pipeline.");
  }
  return (
    <>
      <div className="model-banner">
        <div className="model-info">
          <span className="tile-icon">
            <Icon name="sliders" />
          </span>
          <div>
            <small>MÔ HÌNH MINH HỌA</small>
            <strong>LightGBM Baseline · UI Preview</strong>
          </div>
          <Badge>RuleSet Demo · 2024.10</Badge>
        </div>
        <div className="notice">
          <Icon name="shield" />
          <span>
            Tham số chỉ phục vụ thử giao diện. Không triển khai mô hình, không
            điều chỉnh taxonomy hoặc holdout. Cấu hình thật cần được nhóm
            review.
          </span>
        </div>
      </div>
      <form onSubmit={save}>
        <div className="grid-two config-grid">
          <Panel
            title="Ghép nhóm đối chiếu"
            subtitle="KHỐI 01 · COHORT MATCHING"
            action={
              <span className="tile-icon">
                <Icon name="users" />
              </span>
            }
          >
            <div className="tinted">
              <small>Thuật toán minh họa</small>
              <strong>K-Means + Cosine Similarity</strong>
            </div>
            <label htmlFor="cohort">Số lượng sản phẩm tối thiểu</label>
            <input
              id="cohort"
              type="number"
              min={5}
              max={100}
              required
              value={config.cohort}
              onChange={(e) =>
                setConfig({ ...config, cohort: Number(e.target.value) })
              }
            />
            <p className="field-help">
              Thiếu mẫu: giữ tham chiếu ở trạng thái chưa đủ cơ sở.
            </p>
            <label htmlFor="price-window">
              Biên độ khoảng giá <strong>±{config.priceWindow}%</strong>
            </label>
            <input
              id="price-window"
              type="range"
              min={10}
              max={60}
              value={config.priceWindow}
              onChange={(e) =>
                setConfig({ ...config, priceWindow: Number(e.target.value) })
              }
            />
            <div className="range-labels">
              <span>±10% (Chặt chẽ)</span>
              <span>±60% (Rộng)</span>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.outliers}
                onChange={(e) =>
                  setConfig({ ...config, outliers: e.target.checked })
                }
              />
              Bộ lọc nhiễu ngoại lai
            </label>
            <p className="field-help">
              Trình bày cấu hình loại trừ Flash-sale bất thường.
            </p>
          </Panel>
          <Panel
            title="Ngưỡng chênh lệch đáng chú ý"
            subtitle="KHỐI 02 · DISCREPANCY"
            action={
              <span className="tile-icon blue">
                <Icon name="chart" />
              </span>
            }
          >
            <label htmlFor="threshold">Ngưỡng gắn cờ cần rà soát (%)</label>
            <input
              id="threshold"
              type="number"
              min={1}
              max={100}
              required
              value={config.threshold}
              onChange={(e) =>
                setConfig({ ...config, threshold: Number(e.target.value) })
              }
            />
            <p className="field-help">
              Tham số mock; chưa phải quy tắc ML đã duyệt.
            </p>
            <label htmlFor="zero-days">
              Số ngày kiểm tra sản phẩm không phát sinh đơn
            </label>
            <input
              id="zero-days"
              type="number"
              min={1}
              max={365}
              required
              value={config.zeroDays}
              onChange={(e) =>
                setConfig({ ...config, zeroDays: Number(e.target.value) })
              }
            />
            <label htmlFor="confidence">
              Mức tin cậy minh họa <strong>{config.confidence}%</strong>
            </label>
            <input
              id="confidence"
              type="range"
              min={50}
              max={95}
              value={config.confidence}
              onChange={(e) =>
                setConfig({ ...config, confidence: Number(e.target.value) })
              }
            />
            <div className="range-labels">
              <span>50% (Rộng)</span>
              <span>95% (Khắt khe)</span>
            </div>
          </Panel>
          <Panel
            title="Quy tắc xử lý dữ liệu thiếu"
            subtitle="KHỐI 03 · DATA HYGIENE"
            action={
              <span className="tile-icon">
                <Icon name="info" />
              </span>
            }
          >
            <label htmlFor="missing-data">Khi thiếu lịch sử số bán</label>
            <select
              id="missing-data"
              value={config.missing}
              onChange={(e) =>
                setConfig({ ...config, missing: e.target.value })
              }
            >
              <option value="unavailable">
                Chưa đủ cơ sở · không suy đoán
              </option>
              <option value="review">Yêu cầu rà soát thủ công</option>
            </select>
            <label htmlFor="penalty">
              Hệ số thuộc tính thiếu (demo){" "}
              <strong>{(config.penalty / 100).toFixed(2)}</strong>
            </label>
            <input
              id="penalty"
              type="range"
              min={10}
              max={80}
              value={config.penalty}
              onChange={(e) =>
                setConfig({ ...config, penalty: Number(e.target.value) })
              }
            />
            <div className="notice">
              <Icon name="shield" />
              <span>
                Không tự điền nhãn human review hoặc dùng holdout để tinh chỉnh
                quy tắc.
              </span>
            </div>
          </Panel>
          <Panel
            title="Quy tắc sinh đề xuất hành động"
            subtitle="KHỐI 04 · RECOMMENDATIONS"
            action={
              <span className="tile-icon pink">
                <Icon name="sparkles" />
              </span>
            }
          >
            {[
              [
                "Rà soát định giá",
                "So sánh giá với nhóm tương đồng; kiểm tra biên lợi nhuận trước khi thử nghiệm.",
              ],
              [
                "Bổ sung bảng kích thước",
                "Rà soát khi thông tin kích thước chưa đầy đủ.",
              ],
              [
                "Rà soát ảnh và video",
                "Đối chiếu thuộc tính quan sát, không cam kết mức tăng chuyển đổi.",
              ],
            ].map(([title, text]) => (
              <div className="rule-card tinted" key={title}>
                <h3>
                  {title}
                  <Badge>Demo</Badge>
                </h3>
                <p>{text}</p>
              </div>
            ))}
          </Panel>
        </div>
        <div className="config-save-bar">
          <span>
            {dirty
              ? "Có thay đổi chưa lưu trong demo"
              : "Cấu hình demo đã đồng bộ"}
          </span>
          <div>
            <button
              type="button"
              className="button subtle"
              onClick={() => {
                setConfig({ ...defaults });
                notify("Đã khôi phục mặc định của giao diện demo.");
              }}
            >
              <Icon name="refresh" size={16} />
              Khôi phục mặc định
            </button>
            <button className="button primary" disabled={!dirty}>
              <Icon name="check" size={16} />
              Lưu phiên bản demo
            </button>
          </div>
        </div>
      </form>
      <Panel
        title="Lịch sử thay đổi cấu hình"
        subtitle="Bộ nhớ trang; không phải audit log bất biến"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PHIÊN BẢN</th>
                <th>NGƯỜI THỰC HIỆN</th>
                <th>NỘI DUNG THAY ĐỔI</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h.version}>
                  <td>
                    <strong>{h.version}</strong>
                  </td>
                  <td>Lê Hoàng Long · Demo</td>
                  <td>{h.changes}</td>
                  <td>
                    <Badge tone={i === 0 ? "purple" : "gray"}>
                      {i === 0 ? "Bản demo hiện tại" : "Đã lưu trên trang"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
