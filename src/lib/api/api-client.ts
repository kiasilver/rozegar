/**
 * API Client - کلاینت مرکزی برای درخواست‌های API
 */

import { handleApiError, formatErrorMessage } from "./error-handler";

interface RequestOptions extends RequestInit {
  timeout?: number;
}

/**
 * درخواست API با مدیریت خطا
 */
export async function apiRequest<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || formatErrorMessage(errorData));
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("زمان درخواست به پایان رسید");
      }
      throw error;
    }
    
    throw new Error("خطای نامشخص در ارتباط با سرور");
  }
}

/**
 * GET request
 */
export async function apiGet<T>(url: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(url, { ...options, method: "GET" });
}

/**
 * POST request
 */
export async function apiPost<T>(
  url: string,
  data?: any,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
export async function apiPut<T>(
  url: string,
  data?: any,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T>(url: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(url, { ...options, method: "DELETE" });
}

