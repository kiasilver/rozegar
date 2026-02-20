import { prisma } from "@/lib/core/prisma";

/**
 * Short Link Generator
 * Base62 encoding for blog IDs
 */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = ALPHABET.length;

/**
 * تولید shortlink از blog ID
 */
export function generateShortLink(id: number): string {
  if (id === 0) {
    // Return a random short string for initial/temp use
    return Math.random().toString(36).substring(2, 7);
  }

  let result = '';
  let num = id;

  while (num > 0) {
    result = ALPHABET[num % BASE] + result;
    num = Math.floor(num / BASE);
  }

  return result;
}

/**
 * دیکد shortlink به blog ID
 */
export function decodeShortLink(code: string): number {
  let result = 0;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const value = ALPHABET.indexOf(char);

    if (value === -1) {
      throw new Error(`Invalid character in short code: ${char}`);
    }

    result = result * BASE + value;
  }

  return result;
}

export function generateNewsCode(id: number): string {
  if (id === 0) return Math.floor(100000 + Math.random() * 900000).toString();
  return id.toString();
}

export async function ensureUniqueNewsCode(code: string, excludeId?: number): Promise<string> {
  let unique = code;
  let exists = await prisma.blog.findFirst({
    where: { code: unique, NOT: excludeId ? { id: excludeId } : undefined }
  });
  while (exists) {
    unique = (parseInt(unique) + 1).toString(); // Simple increment or random
    if (isNaN(parseInt(unique))) unique = code + Math.floor(Math.random() * 10);

    exists = await prisma.blog.findFirst({
      where: { code: unique, NOT: excludeId ? { id: excludeId } : undefined }
    });
  }
  return unique;
}

export async function ensureUniqueShortLink(link: string, excludeId?: number): Promise<string> {
  let unique = link;
  let exists = await prisma.blog.findFirst({
    where: { short_link: unique, NOT: excludeId ? { id: excludeId } : undefined }
  });
  while (exists) {
    unique = link + Math.floor(Math.random() * 10); // Append random digit
    exists = await prisma.blog.findFirst({
      where: { short_link: unique, NOT: excludeId ? { id: excludeId } : undefined }
    });
  }
  return unique;
}
