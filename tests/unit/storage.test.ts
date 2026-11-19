import { afterEach, describe, expect, it, vi } from "vitest";
import { parseImageUrl, storageMode } from "@/lib/storage";

const ID = "cmwn4t21m0000xglrc31hyoux";
const FILE = "56ed8ebe32c590fde598302b.jpg";

function useS3() {
  vi.stubEnv("S3_ENDPOINT", "https://acc.r2.cloudflarestorage.com");
  vi.stubEnv("S3_BUCKET", "skipli");
  vi.stubEnv("S3_ACCESS_KEY_ID", "k");
  vi.stubEnv("S3_SECRET_ACCESS_KEY", "s");
  vi.stubEnv("S3_PUBLIC_URL", "https://images.example.com/");
}

afterEach(() => vi.unstubAllEnvs());

describe("kho ảnh", () => {
  it("chọn chế độ theo .env", () => {
    vi.stubEnv("S3_ENDPOINT", "");
    expect(storageMode()).toBe("local");
    useS3();
    expect(storageMode()).toBe("s3");
  });

  it("nhận địa chỉ ảnh app đã lưu, trên máy và trên S3", () => {
    expect(parseImageUrl(`/media/${ID}/${FILE}`)).toEqual([ID, FILE]);
    useS3();
    expect(parseImageUrl(`https://images.example.com/media/${ID}/${FILE}`)).toEqual([ID, FILE]);
  });

  it("từ chối địa chỉ lạ (không xóa nhầm ảnh không phải của app)", () => {
    useS3();
    for (const bad of [
      null,
      "",
      `https://evil.example.com/media/${ID}/${FILE}`,
      `/media/../${ID}/${FILE}`,
      `/media/${ID}/../../.env`,
      `/media/${ID}/${FILE}/extra`,
      `/media/${ID}/notours.jpg`,
      `/media/${ID}/${FILE.replace(".jpg", ".svg")}`,
    ]) {
      expect(parseImageUrl(bad)).toBeNull();
    }
  });
});
