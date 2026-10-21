import "server-only";

// Nombres de T-042, conservados para no tocar sus consumidores; la implementacion vive en uploads.ts.
export {
  UPLOADS_BUCKET as AVATAR_BUCKET,
  SIGNED_URL_TTL_SECONDS as AVATAR_URL_TTL_SECONDS,
  signUploadUrl as signAvatarUrl,
} from "@/lib/server/uploads";
