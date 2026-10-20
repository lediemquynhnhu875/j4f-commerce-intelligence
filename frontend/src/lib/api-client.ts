import type { List } from "@/types/api";
declare const window: any;
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    const fetchOptions: RequestInit = {
      ...options,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    } as RequestInit;

    response = await fetch(`/api/backend/${path}`, fetchOptions);
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(
      503,
      "BACKEND_UNAVAILABLE",
      "Không thể kết nối backend. Vui lòng thử lại.",
    );
  }

  const payload = (await response.json()) as any;

  if (!response.ok) {
    if (
      typeof window !== "undefined" &&
      response.status === 401 &&
      !path.startsWith("auth/")
    ) {
      window.dispatchEvent(new Event("sellens-session-expired"));
    }

    const detail = payload.error?.details
      ?.map(
        (item: { field: string; message: string }) =>
          `${item.field}: ${item.message}`,
      )
      .join("; ");

    throw new ApiError(
      response.status,
      payload.error?.code ?? "API_ERROR",
      response.status === 401
        ? "Phiên đăng nhập không hợp lệ hoặc email/mật khẩu không đúng."
        : payload.error?.code === "STALE_VERSION"
          ? "Dữ liệu đã được cập nhật. Tải lại trước khi lưu."
          : `${payload.error?.message ?? "Yêu cầu thất bại"}${detail ? ` — ${detail}` : ""}`,
    );
  }

  return payload as T;
}

export async function allPages<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page <= 1000; page++) {
    const result = await api<List<T>>(
      `${path}${path.includes("?") ? "&" : "?"}page=${page}&limit=20`,
      { signal },
    );
    rows.push(...result.data);
    if (rows.length >= result.pagination.total || !result.data.length)
      return rows;
  }
  throw new ApiError(
    422,
    "LIST_TOO_LARGE",
    "Danh sách vượt giới hạn tải. Vui lòng thu hẹp bộ lọc.",
  );
}
export const mlAnalysisLabels: Record<string, string> = {
  positive_feedback_low_sales: "Phản hồi tốt nhưng bán thấp",
  low_rating_low_sales: "Đánh giá thấp và bán thấp",
  performing_well: "Đang tốt",
  untapped_potential: "Tiềm năng chưa khai thác",
  difficult_to_sell: "Khó bán theo dữ liệu",
  insufficient_data: "Chưa đủ dữ liệu",
};
export const analysisLabels: Record<string, string> = {
  ...mlAnalysisLabels,
  no_analysis: "Chưa được phân tích",
  unanalyzed: "Chưa được phân tích",
  positive_feedback_below_reference:
    "Phản hồi tích cực, số bán dưới tham chiếu",
  low_rating_below_reference: "Đánh giá thấp, số bán dưới tham chiếu",
  at_or_above_reference: "Đạt hoặc vượt tham chiếu",
  zero_sales_needs_investigation: "Chưa có số bán, cần kiểm tra",
  zero_sales_no_priority_signal: "Chưa có số bán, chưa có tín hiệu ưu tiên",
  below_reference_insufficient_reviews: "Dưới tham chiếu, thiếu đánh giá",
  monitor_gap: "Theo dõi chênh lệch",
  undecided: "Chưa kết luận",
  insufficient_basis: "Chưa đủ cơ sở",
};
export const actionLabels: Record<string, string> = {
  proposed: "Chờ duyệt",
  accepted: "Đã chấp nhận",
  in_progress: "Đang thực hiện",
  completed: "Hoàn thành",
  rejected: "Đã từ chối",
  cancelled: "Đã hủy",
};
export function display(value: unknown) {
  return value === null || value === undefined ? "—" : String(value);
}
export function price(value: string | null, currency: string) {
  if (value === null) return "—";
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
    }).format(Number(value));
  } catch {
    return `${value} ${currency}`;
  }
}
