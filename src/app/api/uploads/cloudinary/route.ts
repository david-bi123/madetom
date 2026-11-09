import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { findActiveWorkspace, getSession } from "@/lib/auth/session";
import { effectivePermissions } from "@/lib/permissions";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Signed Cloudinary upload. The browser never sees the API secret; the server
 * signs the request and streams the file to Cloudinary over REST.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You need to sign in to upload images." }, { status: 401 });
  }

  const workspace = await findActiveWorkspace(session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: "No workspace is linked to this account." }, { status: 403 });
  }

  const permissions = effectivePermissions(
    workspace.membership.roleKey,
    workspace.membership.permissionsOverride,
  );
  if (!permissions.has("products.manage")) {
    return NextResponse.json({ error: "Your role cannot upload product images." }, { status: 403 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          "Image upload is not configured yet. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on the server, or paste an image URL.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files can be uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Images must be 5 MB or smaller." }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `madetom/${workspace.tenant.id}`;
  const signature = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const upload = new FormData();
  upload.append("file", file);
  upload.append("api_key", apiKey);
  upload.append("timestamp", String(timestamp));
  upload.append("folder", folder);
  upload.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: upload,
  });
  const payload = (await response.json().catch(() => null)) as
    | { secure_url?: string; public_id?: string; error?: { message?: string } }
    | null;

  if (!response.ok || !payload?.secure_url) {
    return NextResponse.json(
      { error: payload?.error?.message ?? "Cloudinary rejected the upload. Try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: payload.secure_url, publicId: payload.public_id ?? null });
}
