import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { appendApiActivity } from "@/lib/api-activity-repository";

const ROUTE = "/api/admin/upload-logo";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

function logUpload(
  status: number,
  level: "success" | "error" | "info",
  message: string,
  detail?: Record<string, unknown> | null,
) {
  try {
    appendApiActivity({ route: ROUTE, method: "POST", status, level, message, detail });
  } catch {
    // best-effort
  }
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    logUpload(400, "error", "Logo upload failed: could not parse form data");
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    logUpload(400, "error", "Logo upload failed: no file provided");
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    logUpload(400, "error", "Logo upload rejected: file too large", {
      fileName: file.name,
      fileSize: file.size,
    });
    return NextResponse.json({ error: "File too large. Max size is 5 MB." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    logUpload(400, "error", "Logo upload rejected: unsupported file type", {
      fileName: file.name,
      mimeType: file.type,
    });
    return NextResponse.json(
      { error: "Use a PNG, JPG, WEBP, or SVG image." },
      { status: 400 },
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const publicDir = path.join(process.cwd(), "public");
    const destination = path.join(publicDir, "kiosk-screensaver.png");

    await mkdir(publicDir, { recursive: true });
    await writeFile(destination, bytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "write failed";
    logUpload(500, "error", "Logo upload failed: could not save image", {
      fileName: file.name,
      message,
    });
    return NextResponse.json({ error: "Could not save image" }, { status: 500 });
  }

  logUpload(200, "success", "Kiosk logo uploaded", {
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  });

  return NextResponse.json({
    success: true,
    fileName: file.name,
    assetPath: "/kiosk-screensaver.png",
    uploadedAt: Date.now(),
  });
}
