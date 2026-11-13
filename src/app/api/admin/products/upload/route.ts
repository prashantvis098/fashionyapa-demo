import { NextResponse } from "next/server";
import ImageKit from "imagekit";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/firebase/admin-auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

function extensionFromMime(type: string) {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    default:
      return "jpg";
  }
}

function getImageKit() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!privateKey || !publicKey || !urlEndpoint) {
    throw new Error(
      "ImageKit is not configured. Check IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY and IMAGEKIT_URL_ENDPOINT."
    );
  }

  return new ImageKit({
    privateKey,
    publicKey,
    urlEndpoint,
  });
}

export async function POST(request: Request) {
  try {
    // Keep existing admin protection
    const access = await requireAdmin(request);

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Choose an image first." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Only JPG, PNG, WebP and AVIF images are allowed.",
        },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "The selected image is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "Image must be 8 MB or smaller.",
        },
        { status: 400 }
      );
    }

    const imagekit = getImageKit();

    const extension = extensionFromMime(file.type);

    const fileName = `product-${Date.now()}-${randomUUID()}.${extension}`;

    const bytes = Buffer.from(await file.arrayBuffer());

    const result = await imagekit.upload({
      file: bytes,
      fileName,
      folder: "/fashionyapa/products",
      useUniqueFileName: true,
      tags: ["fashionyapa", "product"],
    });

    if (!result.url) {
      throw new Error("ImageKit did not return an image URL.");
    }

    return NextResponse.json(
      {
        success: true,

        // Frontend already expects this
        url: result.url,

        // ImageKit file ID is useful for deletion later
        fileId: result.fileId,

        // Keep a path-like value for compatibility
        path: result.filePath,

        name: result.name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Product image upload failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Image upload failed.",
      },
      { status: 500 }
    );
  }
}