// Chuyển bản chạy trên máy giữa 2 chế độ (ghi lại file .env, không in khóa ra màn hình):
//
//   npm run env:shared   dùng chung database Neon + kho ảnh Supabase với bản trên mạng (Vercel).
//                        Sửa menu trên máy thì link trên mạng cập nhật ngay.
//   npm run env:local    quay về database Docker + ảnh trong thư mục storage/ trên máy
//                        (dùng khi chạy bộ kiểm tra tự động hoặc muốn thử thoải mái).
//
// .env.docker: bản cài đặt trên máy (tạo tự động từ .env lần đầu chạy).
// .env.deploy: các giá trị của bản trên mạng (DATABASE_URL, DIRECT_URL, S3_*, REVALIDATE_SECRET, REMOTE_APP_URL).
// Sau khi chuyển, tắt và chạy lại `npm run dev`.

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const mode = process.argv[2];
if (mode !== "shared" && mode !== "local") {
  console.error("Usage: node scripts/use-env.mjs shared|local");
  process.exit(1);
}

const keyOf = (line) => /^\s*([A-Z0-9_]+)\s*=/.exec(line)?.[1];
const valueOf = (text, key) =>
  (text.split("\n").find((l) => keyOf(l) === key)?.split("=").slice(1).join("=").trim() ?? "").replace(/^(["'])(.*)\1$/, "$2");
const isLocalHost = (url) => {
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

// Lần đầu: lưu bản cài đặt trên máy hiện tại vào .env.docker (chỉ khi .env đang trỏ database trên máy)
if (!existsSync(".env.docker")) {
  const current = existsSync(".env") ? readFileSync(".env", "utf8") : "";
  if (!isLocalHost(valueOf(current, "DATABASE_URL"))) {
    console.error("No .env.docker yet and .env is not pointing to the database on this computer. Restore .env first.");
    process.exit(1);
  }
  copyFileSync(".env", ".env.docker");
  console.log("Saved the on-this-computer settings to .env.docker");
}

const docker = readFileSync(".env.docker", "utf8");

if (mode === "local") {
  copyFileSync(".env.docker", ".env");
  console.log("Using the database on this computer (Docker). Restart `npm run dev`.");
  process.exit(0);
}

if (!existsSync(".env.deploy")) {
  console.error("Missing .env.deploy (the live values). See docs/trien-khai.md.");
  process.exit(1);
}
const deploy = readFileSync(".env.deploy", "utf8");
const required = ["DATABASE_URL", "DIRECT_URL", "S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PUBLIC_URL", "REVALIDATE_SECRET", "REMOTE_APP_URL"];
const missing = required.filter((k) => !valueOf(deploy, k));
if (missing.length) {
  console.error(`Fill these in .env.deploy first: ${missing.join(", ")}`);
  process.exit(1);
}

const fromDeploy = new Set(deploy.split("\n").map(keyOf).filter(Boolean));
const kept = docker.split("\n").filter((l) => !fromDeploy.has(keyOf(l)));
writeFileSync(".env", `${kept.join("\n").trimEnd()}\n\n# ── Dùng chung với bản trên mạng (từ .env.deploy, npm run env:shared) ──\n${deploy.trim()}\n`);
console.log(`Using the live database and photo storage, shared with ${valueOf(deploy, "REMOTE_APP_URL")}.`);
console.log("Taken from .env.deploy: " + [...fromDeploy].join(", "));
console.log("Restart `npm run dev`. Before running tests: npm run env:local");
