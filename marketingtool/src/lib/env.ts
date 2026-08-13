import { z } from "zod";

/**
 * Server-side environment variables, validated once at module load.
 * Import only from server code — never from Client Components.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  SSO_SECRET: z.string().min(32, "SSO_SECRET must be at least 32 characters"),
  EXTERNAL_API_SECRET: z
    .string()
    .min(32, "EXTERNAL_API_SECRET must be at least 32 characters"),
  DEEPSEEK_API_KEY: z.string().min(1, "DEEPSEEK_API_KEY is required"),
  DEEPSEEK_BASE_URL: z
    .string()
    .url()
    .default("https://api.deepseek.com")
    .transform((value) => value.replace(/\/+$/, "")),
  ALLOW_CUSTOM_AI_ENDPOINTS: z
    .enum(["true", "false"])
    .default("false"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required").transform((s) => s.trim()),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required").transform((s) => s.trim()),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required").transform((s) => s.trim()),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
}).superRefine((value, context) => {
  if (value.SSO_SECRET === value.AUTH_SECRET) {
    context.addIssue({
      code: "custom",
      path: ["SSO_SECRET"],
      message: "SSO_SECRET must be distinct from AUTH_SECRET",
    });
  }
  if (value.NODE_ENV === "production") {
    for (const key of ["DEEPSEEK_BASE_URL", "NEXT_PUBLIC_APP_URL"] as const) {
      if (!value[key].startsWith("https://")) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} must use HTTPS in production`,
        });
      }
    }
  }
  const providerUrl = new URL(value.DEEPSEEK_BASE_URL);
  if (
    providerUrl.protocol !== "https:" ||
    providerUrl.username ||
    providerUrl.password ||
    providerUrl.search ||
    providerUrl.hash ||
    (providerUrl.hostname !== "api.deepseek.com" &&
      value.ALLOW_CUSTOM_AI_ENDPOINTS !== "true")
  ) {
    context.addIssue({
      code: "custom",
      path: ["DEEPSEEK_BASE_URL"],
      message:
        "DEEPSEEK_BASE_URL must be the secure DeepSeek endpoint unless custom endpoints are explicitly enabled",
    });
  }
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
