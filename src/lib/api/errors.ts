// lib/errors.ts
import { z } from "zod";

export function getErrorMessage(err: unknown): string {
  if (err instanceof z.ZodError) {
    // پیام‌های اعتبارسنجی Zod
    return err.issues.map(i => i.message).join(", ");
  }
  if (err instanceof Error) {
    return err.message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
