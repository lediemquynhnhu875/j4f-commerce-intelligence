"use client";
import { useState } from "react";
import {
  suggestions,
  type Suggestion,
  type SuggestionState,
} from "@/lib/preview-fixtures";
import { Empty, Icon, Panel, Stat } from "@/components/ui";
import {
  SuggestionCard,
  workflowLabels,
} from "@/components/user/suggestion-card";

export function SuggestionsView({
  notify,
}: {
  notify: (text: string) => void;
}) {
  const [items, setItems] = useState<Suggestion[]>(suggestions);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [kanban, setKanban] = useState(false);
  const filtered = items.filter(
    (s) =>
      (!category || s.category === category) &&
      `${s.title} ${s.productId}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
  );
  function update(id: string, state: SuggestionState, reason?: string) {
    setItems(items.map((s) => (s.id === id ? { ...s, state, reason } : s)));
    notify(
      `Đã cập nhật demo: ${workflowLabels[state]}. Thay đổi chỉ tồn tại trên trang này.`,
    );
  }
  const card = (s: Suggestion) => (
    <SuggestionCard
      key={s.id}
      suggestion={s}
      onUpdate={(state, reason) => update(s.id, state, reason)}
    />
  );
  return (
    <>
      <div className="stats-grid five">
        <Stat
          label="Tổng đề xuất"
          value={items.length}
          note="Fixture minh họa"
          icon="sparkles"
        />
        <Stat
          label="Mới phát hiện"
          value={items.filter((s) => s.state === "pending").length}
          note="Chờ duyệt hành động"
          tone="pink"
        />
        <Stat
          label="Đang theo dõi"
          value={
            items.filter(
              (s) => s.state === "accepted" || s.state === "in_progress",
            ).length
          }
          note="Chấp nhận / Đang làm"
          tone="blue"
          icon="clock"
        />
        <Stat
          label="Đã hoàn thành"
          value={items.filter((s) => s.state === "completed").length}
          note="Hoàn thành việc, chưa đo hiệu quả"
          tone="green"
          icon="check"
        />
        <Stat
          label="Đã từ chối"
          value={items.filter((s) => s.state === "rejected").length}
          note="Giữ nguyên bằng chứng"
          tone="gray"
        />
      </div>
      <Panel className="filters">
        <div className="filter-row">
          <div className="filter-chips">
            <button
              className={!category ? "selected" : ""}
              onClick={() => setCategory("")}
            >
              Tất cả <span>{items.length}</span>
            </button>
            {[...new Set(items.map((s) => s.category))].map((c) => (
              <button
                className={category === c ? "selected" : ""}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="search-field">
            <Icon name="search" size={17} />
            <input
              aria-label="Tìm đề xuất"
              placeholder="Tìm tên, mã SP…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="segmented">
            <button
              aria-pressed={!kanban}
              className={!kanban ? "selected" : ""}
              onClick={() => setKanban(false)}
            >
              <Icon name="grid" size={16} />
              Danh sách
            </button>
            <button
              aria-pressed={kanban}
              className={kanban ? "selected" : ""}
              onClick={() => setKanban(true)}
            >
              <Icon name="chart" size={16} />
              Kanban
            </button>
          </div>
        </div>
      </Panel>
      {filtered.length === 0 ? (
        <Panel>
          <Empty />
        </Panel>
      ) : kanban ? (
        <div className="kanban">
          {(
            [
              "pending",
              "accepted",
              "in_progress",
              "completed",
              "rejected",
            ] as SuggestionState[]
          ).map((state) => (
            <section key={state} className="kanban-column">
              <h3>
                {workflowLabels[state]}
                <span>{filtered.filter((s) => s.state === state).length}</span>
              </h3>
              {filtered.filter((s) => s.state === state).map(card)}
            </section>
          ))}
        </div>
      ) : (
        <div className="grid-two">{filtered.map(card)}</div>
      )}
      <div className="opportunity-banner">
        <span className="brand-mark">
          <Icon name="sparkles" size={26} />
        </span>
        <div>
          <h2>Biến bằng chứng thành hành động phù hợp</h2>
          <p>
            Rà soát thông tin, kiểm chứng giả thuyết và theo dõi công việc. Hoàn
            thành đề xuất không đồng nghĩa với tăng doanh số.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setCategory("");
            setSearch("");
            notify(
              "Đang hiển thị tất cả đề xuất. Các mục ưu tiên cao được đặt trước.",
            );
          }}
        >
          Xem đề xuất ưu tiên
          <Icon name="arrow" size={16} />
        </button>
      </div>
    </>
  );
}
