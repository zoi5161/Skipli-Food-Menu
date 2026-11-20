import type { ReactNode } from "react";
import type { ContactLink } from "@/lib/menu/contact";
import type { PublicCategory, PublicItem, PublicMenu } from "@/lib/menu/public";

// Mỗi kiểu menu (template) là một bộ "StyleKit": các mảnh giao diện riêng của kiểu đó.
// Phần còn lại (thanh danh mục, tìm món, bộ lọc, bảng chi tiết món, giờ mở cửa, bản đồ,
// liên hệ) dùng chung cho mọi kiểu và đổi màu/kiểu chữ theo `theme`.

export type HeaderProps = {
  restaurant: PublicMenu["restaurant"];
  buttons: ContactLink[];
  /** Đường dẫn trang (để nút Chia sẻ dùng). */
  shareUrl: string;
};

export type CategoryHeadingProps = {
  category: PublicCategory;
  /** Giờ phục vụ đã định dạng, ví dụ "Mon–Fri · 7:00 AM–11:00 AM". */
  serving: string | null;
  /** Số món đang hiện (sau khi lọc). */
  count: number;
};

export type ItemRowProps = {
  item: PublicItem;
  currency: string;
  onOpen: () => void;
};

export type StyleKit = {
  /** Lớp CSS cho từng vùng của trang. */
  theme: {
    page: string;
    /** Màu đường kẻ (viền nút phụ, ô lọc, đường chia). */
    line: string;
    /** Màu nền của thanh danh mục dính trên đầu (phải đặc để chữ bên dưới không lộ ra). */
    bar: string;
    tab: string;
    chip: string;
    input: string;
    /** Lưới món, gồm cả số cột, ví dụ "grid-cols-1 md:grid-cols-2". */
    itemGrid: string;
    /** Khung ô thông tin (giờ mở cửa, địa chỉ, bảng dị ứng). */
    panel: string;
    sectionTitle: string;
    muted: string;
    /** Nút phụ dạng nền nhạt (Copy address, Share…). */
    softButton: string;
  };
  buttonShape: "pill" | "square";
  /** Có hiện dải "Chef's picks" có ảnh ở đầu menu không. */
  showFeatured: boolean;
  /** Cột bên phải (giờ mở cửa, địa chỉ) trên màn hình rộng. */
  sidebar: boolean;
  /** Mô tả quán đã hiện ở đầu trang (thì mục About không lặp lại). */
  descriptionInHeader: boolean;
  /** Đường kẻ giữa các món (tắt với kiểu lưới ảnh). Mặc định có. */
  itemDivider?: boolean;
  /** Bỏ màu nhấn của quán, dùng đen trắng (kiểu Simple). */
  monochrome?: boolean;
  Header: (props: HeaderProps) => ReactNode;
  CategoryHeading: (props: CategoryHeadingProps) => ReactNode;
  ItemRow: (props: ItemRowProps) => ReactNode;
};
