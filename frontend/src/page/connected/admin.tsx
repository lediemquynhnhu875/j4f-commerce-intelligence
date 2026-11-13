"use client";
import { ErrorPopup } from "@/components/popup";
import { useState, useRef, type FormEvent } from "react";
import { usePopup } from "@/components/popup";
import { api } from "@/lib/api-client";
import type { Dataset, Account } from "@/types/api";
import { Badge, Empty, Modal, Panel } from "@/components/ui";

export function LiveAccounts({
  data,
  actor,
  refresh,
}: {
  data: Dataset;
  actor: Account;
  refresh: () => Promise<void>;
}) {
  const popup = usePopup();
  const [overrides, setOverrides] = useState<Record<string, Account>>({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const inFlight = useRef(new Set<string>());
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await api("admin/accounts", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.get("full_name"),
          email: form.get("email"),
          password: form.get("password"),
          role: form.get("role"),
        }),
      });
      setAdding(false);
      popup.notify("Đã tạo tài khoản và thiết lập quyền truy cập.");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function toggle(account: Account) {
    if (inFlight.current.has(account.id)) return;
    if (
      !(await popup.confirm(
        `${account.is_active ? "Tạm khóa" : "Kích hoạt"} tài khoản ${account.full_name}?`,
      ))
    )
      return;
    if (inFlight.current.has(account.id)) return;
    inFlight.current.add(account.id);
    setPendingIds(new Set(inFlight.current));
    setOverrides((rows) => ({
      ...rows,
      [account.id]: { ...account, is_active: !account.is_active },
    }));
    try {
      const result = await api<{ data: Account }>(
        `admin/accounts/${account.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: !account.is_active }),
        },
      );
      setOverrides((rows) => ({ ...rows, [account.id]: result.data }));
      popup.notify(
        result.data.is_active
          ? "Đã kích hoạt tài khoản."
          : "Đã tạm khóa tài khoản.",
      );
    } catch (error) {
      setOverrides((rows) => ({ ...rows, [account.id]: account }));
      popup.notify((error as Error).message, "Thay đổi trạng thái thất bại");
    } finally {
      inFlight.current.delete(account.id);
      setPendingIds(new Set(inFlight.current));
    }
  }
  return (
    <>
      <Panel
        title="Quản lý tài khoản"
        subtitle="Mỗi tài khoản User được gắn với một cửa hàng riêng"
        action={
          <button
            className="button primary"
            onClick={() => {
              setAdding(true);
              setError("");
            }}
          >
            Thêm tài khoản
          </button>
        }
      >
        {error && !adding && <ErrorPopup message={error} />}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>TÊN</th>
                <th>EMAIL</th>
                <th>VAI TRÒ</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts
                .map((original) =>
                  overrides[original.id] &&
                  (overrides[original.id].updated_at ?? "") >=
                    (original.updated_at ?? "")
                    ? overrides[original.id]
                    : original,
                )
                .map((account) => (
                  <tr key={account.id}>
                    <td>{account.full_name}</td>
                    <td>{account.email}</td>
                    <td>{account.role === "admin" ? "Admin" : "User"}</td>
                    <td>
                      <Badge tone={account.is_active ? "green" : "gray"}>
                        {account.is_active ? "Hoạt động" : "Tạm khóa"}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="button subtle small"
                        disabled={
                          pendingIds.has(account.id) || account.id === actor.id
                        }
                        onClick={() => toggle(account)}
                      >
                        {pendingIds.has(account.id)
                          ? "Đang lưu…"
                          : account.is_active
                            ? "Tạm khóa"
                            : "Kích hoạt"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!data.accounts.length && <Empty />}
      </Panel>
      {adding && (
        <Modal
          title="Tạo tài khoản"
          onClose={() => !pending && setAdding(false)}
        >
          <form className="connected-form" onSubmit={create}>
            <label>
              Họ tên
              <input name="full_name" maxLength={150} required />
            </label>
            <label>
              Email
              <input name="email" type="email" required autoComplete="off" />
            </label>
            <label>
              Mật khẩu
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
            <label>
              Vai trò
              <select name="role">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <p className="muted">
              Mật khẩu tối thiểu 12 ký tự. Tài khoản User được tạo kèm cửa hàng
              riêng.
            </p>
            {error && <ErrorPopup message={error} />}
            <button className="button primary" disabled={pending}>
              Tạo tài khoản
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
