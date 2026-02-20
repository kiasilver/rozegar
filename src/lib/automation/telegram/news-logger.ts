/**
 * Logger for news processing
 * Saves logs to files in JSON Lines format (one JSON object per line)
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface NewsProcessingLog {
  timestamp: string;
  newsTitle: string;
  sourceUrl?: string;
  categoryName?: string;
  extractedContentLength: number;
  sentContentLength: number;
  extractionMethod: 'RSS' | 'HTML' | 'MANUAL' | 'UNKNOWN';
  agentUsed: string | null;
  agentProvider: 'backboard' | 'openai' | 'gemini' | 'custom' | 'cursor' | null;
  success: boolean;
  errorMessage?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost?: number;
  };
  fallbackAttempts: number;
  summaryLength?: number;
  processingTimeMs?: number;
}

const LOGS_DIR = path.join(process.cwd(), 'logs');

/**
 * Ensure logs directory exists
 */
async function ensureLogsDir(): Promise<void> {
  try {
    await fs.access(LOGS_DIR);
  } catch {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  }
}

/**
 * Get log file path for today
 */
function getLogFilePath(): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return path.join(LOGS_DIR, `news-processing-${dateStr}.log`);
}

/**
 * Save news processing log to file
 */
export async function saveNewsProcessingLog(log: NewsProcessingLog): Promise<void> {
  try {
    await ensureLogsDir();
    const logFilePath = getLogFilePath();
    const logLine = JSON.stringify(log) + '\n';
    await fs.appendFile(logFilePath, logLine, 'utf-8');
  } catch (error: any) {
    // Don't throw - logging should not break the main flow
    console.error('[News:Logger] Failed to save log:', error.message);
  }
}

/**
 * Read logs from file for a specific date
 */
export async function readNewsProcessingLogs(date?: string): Promise<NewsProcessingLog[]> {
  try {
    await ensureLogsDir();
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dateStr = targetDate.replace(/-/g, '-');
    const logFilePath = path.join(LOGS_DIR, `news-processing-${dateStr}.log`);
    
    try {
      const content = await fs.readFile(logFilePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      return lines.map(line => {
        try {
          return JSON.parse(line) as NewsProcessingLog;
        } catch {
          return null;
        }
      }).filter((log): log is NewsProcessingLog => log !== null);
    } catch {
      // File doesn't exist yet
      return [];
    }
  } catch (error: any) {
    console.error('[News:Logger] Failed to read logs:', error.message);
    return [];
  }
}

/**
 * Get logs for the last N days
 */
export async function getRecentNewsProcessingLogs(days: number = 1): Promise<NewsProcessingLog[]> {
  const allLogs: NewsProcessingLog[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const logs = await readNewsProcessingLogs(dateStr);
    allLogs.push(...logs);
  }
  
  // Sort by timestamp (newest first)
  return allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

