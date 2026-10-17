"use client";
import { useState, type FormEvent } from "react";
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
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function toggle(account: Account) {
    if (
      !confirm(
        `${account.is_active ? "Tạm khóa" : "Kích hoạt"} tài khoản ${account.full_name}?`,
      )
    )
      return;
    setPending(true);
    setError("");
    try {
      await api(`admin/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !account.is_active }),
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <Panel
        title="Tài khoản trong catalog chung"
        subtitle="Không có cửa hàng hoặc quyền sở hữu từ seller metadata"
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
        {error && !adding && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
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
              {data.accounts.map((account) => (
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
                      disabled={pending || account.id === actor.id}
                      onClick={() => toggle(account)}
                    >
                      {account.is_active ? "Tạm khóa" : "Kích hoạt"}
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
              Mật khẩu tối thiểu 12 ký tự. Tài khoản thường được lưu với role
              reviewer.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={pending}>
              Tạo tài khoản
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function LiveCategories({
  data,
  refresh,
}: {
  data: Dataset;
  refresh: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await api("categories", {
        method: "POST",
        body: JSON.stringify({
          code: form.get("code"),
          name: form.get("name"),
          description: form.get("description"),
        }),
      });
      setAdding(false);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("Xóa danh mục? Danh mục đang có sản phẩm sẽ không thể xóa."))
      return;
    setPending(true);
    setError("");
    try {
      await api(`categories/${id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <Panel
      title="Danh mục sản phẩm"
      action={
        <button
          className="button primary"
          onClick={() => {
            setAdding(true);
            setError("");
          }}
        >
          Thêm danh mục
        </button>
      }
    >
      {error && !adding && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>MÃ</th>
              <th>TÊN</th>
              <th>SẢN PHẨM</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {data.categories.map((row) => (
              <tr key={row.id}>
                <td>{row.code}</td>
                <td>{row.name}</td>
                <td>
                  {
                    data.products.filter(
                      (product) => product.category_id === row.id,
                    ).length
                  }
                </td>
                <td>
                  <button
                    className="button subtle small"
                    disabled={pending}
                    onClick={() => remove(row.id)}
                  >
                    Xóa danh mục
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adding && (
        <Modal
          title="Thêm danh mục"
          onClose={() => !pending && setAdding(false)}
        >
          <form className="connected-form" onSubmit={create}>
            <label>
              Mã danh mục
              <input name="code" required maxLength={80} pattern="[a-z0-9_]+" />
            </label>
            <label>
              Tên danh mục
              <input name="name" required maxLength={150} />
            </label>
            <label>
              Mô tả
              <textarea name="description" />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={pending}>
              Lưu danh mục
            </button>
          </form>
        </Modal>
      )}
    </Panel>
  );
}
