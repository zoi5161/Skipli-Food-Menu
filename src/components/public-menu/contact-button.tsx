import type { ContactKind, ContactLink } from "@/lib/menu/contact";

// Nút liên hệ (Gọi, WhatsApp, Chỉ đường…) dùng chung cho mọi kiểu menu.

export function ContactButton({
  link,
  variant,
  className = "",
  shape = "pill",
}: {
  link: ContactLink;
  variant: "primary" | "secondary";
  className?: string;
  shape?: "pill" | "square";
}) {
  const styles =
    variant === "primary"
      ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" }
      : { borderColor: "var(--line, #d4d4d4)" };
  return (
    <a
      href={link.href}
      {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      style={styles}
      className={`inline-flex items-center justify-center gap-2 border px-4 py-2.5 text-sm font-semibold ${shape === "pill" ? "rounded-full" : "rounded-md"} ${className}`}
    >
      <ContactIcon kind={link.kind} />
      {link.label}
    </a>
  );
}

export function ContactIcon({ kind }: { kind: ContactKind }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (kind) {
    case "PHONE":
      return (
        <svg {...common}>
          <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z" />
        </svg>
      );
    case "WHATSAPP":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.4 8.4 0 01-12.4 7.4L3 21l2.2-5.4A8.4 8.4 0 1121 11.5z" />
        </svg>
      );
    case "EMAIL":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    case "DIRECTIONS":
      return (
        <svg {...common}>
          <path d="M12 21s-7-5.2-7-11a7 7 0 0114 0c0 5.8-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "CUSTOM_LINK":
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7" />
          <path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" />
        </svg>
      );
  }
}
