import { NextResponse } from "next/server";
import { keepQuery, legacyTarget } from "@/lib/legacy-redirect";
import { previewPath } from "@/lib/restaurant-path";

// Đường dẫn cũ /preview?style=...: chủ một quán thì sang /preview/<id quán>?style=..., nhân viên về danh sách quán.
export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(new URL(await legacyTarget((id) => previewPath(id, keepQuery(url))), url), 307);
}
