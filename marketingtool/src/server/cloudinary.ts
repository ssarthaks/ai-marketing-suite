import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";

import { env } from "@/lib/env";

let configured = false;

function client() {
  if (!configured) {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
      env();
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
}

/** Cloudinary folder namespaced per workspace so tenants never collide. */
export function workspaceFolder(workspaceId: string): string {
  return `marketingos/${workspaceId}`;
}

/**
 * Create a short-lived signature for a direct browser → Cloudinary upload.
 * Only the signed params (timestamp, folder) may be sent by the client.
 */
export function createUploadSignature(workspaceId: string): UploadSignature {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    env();
  const timestamp = Math.round(Date.now() / 1000);
  const folder = workspaceFolder(workspaceId);
  const publicId = randomUUID();
  const signature = client().utils.api_sign_request(
    { timestamp, folder, public_id: publicId, overwrite: false },
    CLOUDINARY_API_SECRET
  );
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
    publicId,
  };
}

export interface VerifiedUpload {
  publicId: string;
  url: string;
  bytes: number;
  width?: number;
  height?: number;
  format: string;
  resourceType: "image" | "video" | "raw";
}

/** Read authoritative upload metadata from Cloudinary; never trust browser fields. */
export async function verifyUpload(publicId: string): Promise<VerifiedUpload | null> {
  for (const resourceType of ["image", "video", "raw"] as const) {
    try {
      const resource = (await client().api.resource(publicId, {
        resource_type: resourceType,
      })) as {
        public_id?: string;
        secure_url?: string;
        bytes?: number;
        width?: number;
        height?: number;
        format?: string;
      };
      if (
        resource.public_id === publicId &&
        typeof resource.secure_url === "string" &&
        typeof resource.bytes === "number" &&
        typeof resource.format === "string"
      ) {
        return {
          publicId,
          url: resource.secure_url,
          bytes: resource.bytes,
          width: resource.width,
          height: resource.height,
          format: resource.format.toLowerCase(),
          resourceType,
        };
      }
    } catch {
      // Try the next Cloudinary resource type.
    }
  }
  return null;
}

/**
 * Delete an uploaded file. Cloudinary needs the resource type; we try the
 * most likely one first and fall back so orphans are never left behind.
 */
export async function destroyUpload(
  publicId: string,
  candidates: ("image" | "video" | "raw")[]
): Promise<void> {
  for (const resourceType of candidates) {
    try {
      const result = (await client().uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      })) as { result?: string };
      if (result.result === "ok") return;
    } catch {
      console.error(`[cloudinary] destroy failed (${resourceType})`);
    }
  }
}
