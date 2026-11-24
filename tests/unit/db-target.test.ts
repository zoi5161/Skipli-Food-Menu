import { describe, expect, it } from "vitest";
import { databaseHost, isLocalDatabaseUrl } from "@/lib/db-target";

describe("isLocalDatabaseUrl", () => {
  it("nhận database trên máy", () => {
    expect(isLocalDatabaseUrl("postgresql://app:pw@localhost:5433/skipli")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://app:pw@127.0.0.1:5432/skipli")).toBe(true);
  });
  it("database trên mạng hoặc link hỏng thì không phải trên máy", () => {
    expect(isLocalDatabaseUrl("postgresql://u:pw@ep-cool-1234-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require")).toBe(false);
    expect(isLocalDatabaseUrl("")).toBe(false);
    expect(isLocalDatabaseUrl(undefined)).toBe(false);
    expect(isLocalDatabaseUrl("not a url")).toBe(false);
  });
  it("chỉ in tên máy chủ, không in mật khẩu", () => {
    expect(databaseHost("postgresql://u:secret@ep-x.neon.tech/db")).toBe("ep-x.neon.tech");
  });
});
