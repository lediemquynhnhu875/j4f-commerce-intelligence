// Public, synthetic UI fixtures. These credentials never authenticate a server.
export type Role = "admin" | "user";
export const DEMO_ACCOUNTS = [
  {
    role: "admin" as const,
    name: "Lê Hoàng Long",
    email: "admin@sellens.demo",
    password: "Sellens123!",
    initials: "HL",
  },
  {
    role: "user" as const,
    name: "Nguyễn Văn Minh",
    email: "user@sellens.demo",
    password: "Sellens123!",
    initials: "VM",
  },
];
export const SNAPSHOT = "24/10/2024";
export type ProductStatus =
  "review" | "good" | "zero" | "insufficient" | "watch";
export const statusLabels: Record<ProductStatus, string> = {
  review: "Cần rà soát",
  good: "Đạt tham chiếu",
  zero: "Số bán bằng 0",
  insufficient: "Chưa đủ cơ sở",
  watch: "Theo dõi thêm",
};
export type Product = {
  id: string;
  name: string;
  detail: string;
  category: string;
  price: number;
  sold: number;
  reference: number | null;
  rating: number | null;
  reviews: number;
  status: ProductStatus;
  image: string;
};
export const products: Product[] = [
  {
    id: "SP-88421",
    name: "Giày Sneaker Nữ Cổ Thấp Độn Đế Basic",
    detail: "Màu trắng · Đế 4.5 cm",
    category: "Giày thể thao",
    price: 350000,
    sold: 12,
    reference: 28,
    rating: 4.7,
    reviews: 38,
    status: "review",
    image: "/demo/product-0.png",
  },
  {
    id: "SP-72109",
    name: "Giày Cao Gót Mũi Nhọn Da Bóng 7 cm",
    detail: "Da bóng đen · Gót nhọn",
    category: "Giày cao gót",
    price: 420000,
    sold: 5,
    reference: 22,
    rating: 3.6,
    reviews: 14,
    status: "review",
    image: "/demo/product-1.png",
  },
  {
    id: "SP-43902",
    name: "Túi Đeo Chéo Canvas Minimal",
    detail: "Màu be vintage · Khóa zip",
    category: "Túi xách",
    price: 195000,
    sold: 26,
    reference: 30,
    rating: 4.8,
    reviews: 82,
    status: "watch",
    image: "/demo/product-2.png",
  },
  {
    id: "SP-90114",
    name: "Ví Cầm Tay Da Mini Unisex",
    detail: "Da bò nâu đậm",
    category: "Phụ kiện",
    price: 150000,
    sold: 0,
    reference: 18,
    rating: null,
    reviews: 0,
    status: "zero",
    image: "/demo/product-3.png",
  },
  {
    id: "SP-61984",
    name: "Dép Quai Hậu Học Sinh Sandal",
    detail: "Đế chống trượt · Xanh navy",
    category: "Giày thể thao",
    price: 210000,
    sold: 45,
    reference: 40,
    rating: 4.6,
    reviews: 120,
    status: "good",
    image: "/demo/product-4.png",
  },
  {
    id: "SP-33912",
    name: "Thắt Lưng Nữ Bản Nhỏ Khóa Kim",
    detail: "Khóa kim mạ vàng · Bản 1.8 cm",
    category: "Phụ kiện",
    price: 95000,
    sold: 2,
    reference: null,
    rating: 4,
    reviews: 3,
    status: "insufficient",
    image: "/demo/product-5.png",
  },
];
export const stores = [
  {
    id: "STORE-001",
    name: "Juno Official Store",
    category: "Giày dép & Phụ kiện nữ",
    owner: "Nguyễn Văn Minh",
    sku: 6,
    runs: 5,
    actions: 4,
    active: true,
  },
  {
    id: "STORE-002",
    name: "Vascara Fashion Store",
    category: "Túi xách, Balo & Ví",
    owner: "Trần Thị Thu Hà",
    sku: 8,
    runs: 7,
    actions: 3,
    active: true,
  },
  {
    id: "STORE-003",
    name: "Ananas Flagship Store",
    category: "Sneaker & Apparel Casual",
    owner: "Lê Hoàng Nam",
    sku: 4,
    runs: 3,
    actions: 2,
    active: true,
  },
  {
    id: "STORE-004",
    name: "Tiki Trading Official",
    category: "Tổng kho bán lẻ đa ngành",
    owner: "Tiki Ops Team",
    sku: 12,
    runs: 10,
    actions: 5,
    active: true,
  },
  {
    id: "STORE-005",
    name: "Dincox Shoes Vietnam",
    category: "Giày thời trang nam nữ",
    owner: "Phạm Quốc Cường",
    sku: 3,
    runs: 1,
    actions: 1,
    active: false,
  },
];
export type SuggestionState =
  "pending" | "accepted" | "in_progress" | "completed" | "rejected";
export type Suggestion = {
  id: string;
  productId: string;
  title: string;
  description: string;
  category: string;
  evidence: string;
  priority: "high" | "medium";
  state: SuggestionState;
  reason?: string;
};
export const suggestions: Suggestion[] = [
  {
    id: "DX-104",
    productId: "SP-88421",
    title: "Bổ sung bảng hướng dẫn đo size cm chi tiết",
    description:
      "Bổ sung chiều dài bàn chân theo từng kích thước. Kiểm tra lại độ phù hợp trước khi xuất bản.",
    category: "Bổ sung mô tả",
    evidence:
      "42/42 sản phẩm trong nhóm minh họa có bảng kích thước; sản phẩm này chỉ có nhãn S / M / L.",
    priority: "high",
    state: "pending",
  },
  {
    id: "DX-102",
    productId: "SP-72109",
    title: "Kiểm tra ghi chú form giày và phản hồi khách hàng",
    description:
      "Rà soát mô tả form giày từ phản hồi trước khi đề xuất thay đổi nội dung.",
    category: "Phản hồi khách hàng",
    evidence:
      "Điểm đánh giá minh họa 3.6/5 từ 14 lượt; cần đọc phản hồi để kiểm chứng giả thuyết.",
    priority: "high",
    state: "pending",
  },
  {
    id: "DX-098",
    productId: "SP-43902",
    title: "Bổ sung ảnh thực tế chụp cận chất vải",
    description:
      "Chụp thêm góc nghiêng, lớp lót và móc khóa để làm rõ thông tin sản phẩm.",
    category: "Rà soát ảnh/video",
    evidence:
      "Fixture có 2 ảnh; nhóm đối chiếu minh họa trung bình 8.4 ảnh. Chưa xác định quan hệ nhân quả.",
    priority: "medium",
    state: "in_progress",
  },
  {
    id: "DX-095",
    productId: "SP-88421",
    title: "Rà soát định giá và điều kiện voucher",
    description:
      "So sánh giá và chi phí thực tế; chỉ thử nghiệm sau khi kiểm tra biên lợi nhuận.",
    category: "Rà soát giá",
    evidence:
      "350.000 đ so với trung vị nhóm minh họa 285.000 đ (+22.8%). Không đảm bảo tăng doanh số.",
    priority: "medium",
    state: "accepted",
  },
];
export const jobs = products.slice(0, 5).map((product, i) => ({
  id: `JOB-${8921 - i}`,
  product,
  store: stores[i % 4].name,
  time: ["14:30:12", "14:28:45", "14:25:01", "14:20:10", "14:15:33"][i],
  duration: ["1.62", "1.45", "1.78", "1.55", "12.0"][i],
  failed: i === 4,
}));
export const money = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
export const rolePages: Record<
  Role,
  { slug: string; label: string; icon: string }[]
> = {
  user: [
    { slug: "overview", label: "Tổng quan", icon: "grid" },
    { slug: "products", label: "Sản phẩm của tôi", icon: "box" },
    { slug: "analysis", label: "Kết quả phân tích", icon: "chart" },
    { slug: "suggestions", label: "Đề xuất cải thiện", icon: "sparkles" },
  ],
  admin: [
    { slug: "overview", label: "Tổng quan hệ thống", icon: "grid" },
    { slug: "stores", label: "Quản lý cửa hàng", icon: "store" },
    { slug: "monitor", label: "Giám sát phân tích", icon: "chart" },
    {
      slug: "configuration",
      label: "Cấu hình mô hình & Quy tắc",
      icon: "sliders",
    },
  ],
};
