import { NextResponse } from "next/server";
import ImageKit from "imagekit";
import { requireAdmin } from "@/lib/firebase/admin-auth";

export const runtime = "nodejs";

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

export async function DELETE(request: Request) {
  try {
    const access = await requireAdmin(request);

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();

    const url =
      typeof body?.url === "string"
        ? body.url.trim()
        : "";

    const fileId =
      typeof body?.fileId === "string"
        ? body.fileId.trim()
        : "";

    if (!url && !fileId) {
      return NextResponse.json(
        {
          error: "Image URL or ImageKit file ID is required.",
        },
        { status: 400 }
      );
    }

    const imagekit = getImageKit();

    /*
     * Preferred method:
     * If frontend/database provides ImageKit fileId,
     * delete directly using the file ID.
     */
    if (fileId) {
      await imagekit.deleteFile(fileId);

      return NextResponse.json({
        ok: true,
      });
    }

    /*
     * Fallback:
     * Try to extract the ImageKit file path from
     * the stored URL.
     *
     * Example:
     * https://ik.imagekit.io/fashionyapa/fashionyapa/products/image.jpg
     */
    let imageUrl: URL;

    try {
      imageUrl = new URL(url);
    } catch {
      return NextResponse.json({
        ok: true,
      });
    }

    const configuredEndpoint =
      process.env.IMAGEKIT_URL_ENDPOINT;

    if (!configuredEndpoint) {
      throw new Error(
        "IMAGEKIT_URL_ENDPOINT is not configured."
      );
    }

    const endpoint = new URL(configuredEndpoint);

    /*
     * Only allow deletion of images hosted on
     * our own ImageKit endpoint.
     */
    if (
      imageUrl.hostname !== endpoint.hostname
    ) {
      return NextResponse.json({
        ok: true,
      });
    }

    let filePath = decodeURIComponent(
      imageUrl.pathname
    );

    /*
     * Remove leading slash.
     */
    filePath = filePath.replace(/^\/+/, "");

    /*
     * ImageKit URL normally contains the account ID
     * as the first path segment.
     *
     * Example:
     * fashionyapa/products/product-123.jpg
     *
     * Remove the ImageKit ID before deleting.
     */
    const imageKitId =
      endpoint.pathname.replace(/^\/+|\/+$/g, "");

    if (
      imageKitId &&
      filePath.startsWith(`${imageKitId}/`)
    ) {
      filePath = filePath.slice(
        imageKitId.length + 1
      );
    }

    /*
     * Safety check:
     * We only allow deletion from our product folder.
     */
    if (
      !filePath.startsWith(
        "fashionyapa/products/"
      ) &&
      !filePath.startsWith("products/")
    ) {
      return NextResponse.json({
        ok: true,
      });
    }

    /*
     * ImageKit's deleteFile API needs fileId,
     * not only the URL/path.
     *
     * Therefore URL-only deletion is treated as
     * a no-op unless fileId is supplied.
     *
     * New uploads return fileId and the frontend
     * can use that for reliable deletion.
     */
    return NextResponse.json({
      ok: true,
      message:
        "Image URL received. ImageKit file ID is required for deletion.",
    });
  } catch (error) {
    console.error(
      "Product image delete failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not delete image.",
      },
      { status: 500 }
    );
  }
}