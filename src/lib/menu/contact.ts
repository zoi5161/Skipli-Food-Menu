// Nút liên hệ trên trang khách: gọi điện, WhatsApp, email, chỉ đường, link tùy chỉnh.
// Hàm thuần (không đụng database) để dùng ở cả server/client và dễ test.

export type ContactKind = "CUSTOM_LINK" | "PHONE" | "WHATSAPP" | "EMAIL" | "DIRECTIONS";
export type ContactChoice = ContactKind | "NONE";

export type ContactFields = {
  customLinkLabel: string | null;
  customLinkUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  contactEmail: string | null;
  showDirections: boolean;
  googleMapsUrl: string | null;
  addressLine: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  primaryButton: ContactChoice;
  secondaryButton: ContactChoice;
};

export type ContactLink = { kind: ContactKind; label: string; href: string; external: boolean };

export const CONTACT_ORDER: ContactKind[] = ["CUSTOM_LINK", "PHONE", "WHATSAPP", "EMAIL", "DIRECTIONS"];

export const CONTACT_LABEL: Record<ContactKind, string> = {
  CUSTOM_LINK: "Custom link",
  PHONE: "Call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  DIRECTIONS: "Directions",
};

/** "+1 (555) 010-0100" → "+15550100100" (dùng cho tel:) */
export function phoneDigits(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

/** Địa chỉ một dòng: "100 Example Street, Springfield, IL 62701" */
export function formatAddress(f: Pick<ContactFields, "addressLine" | "city" | "region" | "postalCode">): string {
  const cityLine = [f.city, [f.region, f.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [f.addressLine, cityLine].filter(Boolean).join(", ");
}

export function directionsHref(f: ContactFields): string | null {
  if (f.googleMapsUrl) return f.googleMapsUrl;
  const address = formatAddress(f);
  if (!address) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

/** Link của một loại nút, hoặc null nếu chủ quán chưa bật / chưa điền. */
export function contactLink(kind: ContactKind, f: ContactFields): ContactLink | null {
  switch (kind) {
    case "CUSTOM_LINK":
      if (!f.customLinkUrl) return null;
      return { kind, label: f.customLinkLabel || "Visit website", href: f.customLinkUrl, external: true };
    case "PHONE":
      if (!f.phone || phoneDigits(f.phone).replace("+", "").length < 3) return null;
      return { kind, label: "Call", href: `tel:${phoneDigits(f.phone)}`, external: false };
    case "WHATSAPP": {
      const digits = f.whatsapp ? phoneDigits(f.whatsapp).replace("+", "") : "";
      if (digits.length < 3) return null;
      return { kind, label: "WhatsApp", href: `https://wa.me/${digits}`, external: true };
    }
    case "EMAIL":
      if (!f.contactEmail) return null;
      return { kind, label: "Email", href: `mailto:${f.contactEmail}`, external: false };
    case "DIRECTIONS": {
      if (!f.showDirections) return null;
      const href = directionsHref(f);
      return href ? { kind, label: "Directions", href, external: true } : null;
    }
  }
}

/** Mọi nút đang bật, theo thứ tự cố định. */
export function enabledContacts(f: ContactFields): ContactLink[] {
  return CONTACT_ORDER.map((k) => contactLink(k, f)).filter((x): x is ContactLink => x !== null);
}

/**
 * Hai nút ở đầu trang. Nút chủ quán chọn mà chưa bật thì bỏ qua;
 * để "None" thì lấy nút đang bật đầu tiên (giống 1FoodMenu).
 */
export function headerButtons(f: ContactFields): ContactLink[] {
  const enabled = enabledContacts(f);
  const pick = (choice: ContactChoice, exclude?: ContactKind) =>
    choice !== "NONE" ? enabled.find((c) => c.kind === choice && c.kind !== exclude) : undefined;

  const primary = pick(f.primaryButton) ?? enabled[0];
  if (!primary) return [];
  const secondary = pick(f.secondaryButton, primary.kind) ?? enabled.find((c) => c.kind !== primary.kind);
  return secondary ? [primary, secondary] : [primary];
}
