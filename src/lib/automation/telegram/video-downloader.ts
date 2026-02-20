/**
 * Video Downloader for Telegram
 * 
 * دانلود ویدیو از URL‌های مختلف (HLS/m3u8, MP4) و ذخیره به فرمت MP4
 * برای ارسال به تلگرام
 * 
 * از ffmpeg استفاده میکنه برای تبدیل HLS به MP4
 * 
 * نکته مهم: Telegram Bot API محدودیت 50MB برای ارسال فایل داره
 * (برخلاف کلاینت تلگرام که خودش فشرده‌سازی میکنه)
 * بنابراین باید قبل از ارسال، حجم فایل مدیریت بشه
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const DOWNLOAD_TIMEOUT = 600000; // 10 minutes for full video download
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB Telegram Bot API limit

export interface DownloadResult {
    success: boolean;
    localPath?: string;
    fileSize?: number;
    error?: string;
}

/**
 * Check if a URL is an HLS stream
 */
export function isHLSUrl(url: string): boolean {
    return url.includes('.m3u8') || url.includes('m3u8');
}

/**
 * Check if a URL is a direct video (MP4, etc.)
 */
export function isDirectVideoUrl(url: string): boolean {
    return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
}

/**
 * Try to get a specific quality variant URL from ArvanVOD HLS URL
 * 
 * ArvanVOD URL pattern:
 * https://xxx.arvanvod.ir/ID1/ID2/h_,144_200,240_400,360_800,480_1500,720_2500,1080_3204,k.mp4.list/master.m3u8
 * 
 * Individual variant:
 * https://xxx.arvanvod.ir/ID1/ID2/h_720_2500k.mp4
 */
function getArvanVODVariantUrl(hlsUrl: string, targetQuality: number = 720): string | null {
    // Check if this is an ArvanVOD URL
    if (!hlsUrl.includes('arvanvod.ir')) return null;

    // Extract quality variants from URL
    // Pattern: h_,144_200,240_400,360_800,480_1500,720_2500,1080_3204,k.mp4.list
    const variantMatch = hlsUrl.match(/h_,([\d_,]+),k\.mp4\.list/);
    if (!variantMatch) return null;

    const variants = variantMatch[1].split(',');
    // Parse variants: "720_2500" -> { resolution: 720, bitrate: 2500 }
    const parsed = variants.map(v => {
        const parts = v.split('_');
        return { resolution: parseInt(parts[0]), bitrate: parseInt(parts[1]), raw: v };
    }).filter(v => !isNaN(v.resolution));

    // Sort by resolution descending
    parsed.sort((a, b) => b.resolution - a.resolution);

    // Find closest quality at or below target
    let selected = parsed.find(v => v.resolution <= targetQuality);
    if (!selected) selected = parsed[parsed.length - 1]; // Use lowest if nothing found

    console.log(`[VideoDownloader] 📐 Available qualities: ${parsed.map(v => `${v.resolution}p`).join(', ')}`);
    console.log(`[VideoDownloader] 🎯 Selected: ${selected.resolution}p (${selected.bitrate}kbps)`);

    // Build direct MP4 URL
    const baseUrl = hlsUrl.replace(/\/h_,[^/]+\/master\.m3u8.*$/, '');
    return `${baseUrl}/h_${selected.raw}k.mp4`;
}

/**
 * Download video from URL (HLS or direct) and save as MP4
 * Downloads the FULL video without any time limits
 * 
 * برای ArvanVOD: مستقیم کیفیت 720p را دانلود میکنه (بدون نیاز به فشرده‌سازی)
 * برای سایر HLS: کل استریم را دانلود و در صورت نیاز فشرده‌سازی میکنه
 */
export async function downloadVideoForTelegram(videoUrl: string): Promise<DownloadResult> {
    const tempDir = path.join(os.tmpdir(), 'rozeghar-videos');
    await fs.mkdir(tempDir, { recursive: true });

    const filename = `video_${Date.now()}.mp4`;
    const outputPath = path.join(tempDir, filename);

    try {
        // Strategy 1: For ArvanVOD, download direct MP4 at optimal quality
        if (isHLSUrl(videoUrl)) {
            const directMp4 = getArvanVODVariantUrl(videoUrl, 720);

            if (directMp4) {
                console.log(`[VideoDownloader] 🎬 Downloading ArvanVOD direct MP4 (720p)...`);
                console.log(`[VideoDownloader]   URL: ${directMp4.substring(0, 100)}...`);

                const ffmpegCmd = `ffmpeg -y -i "${directMp4}" -c copy -movflags +faststart "${outputPath}"`;
                await execPromise(ffmpegCmd, DOWNLOAD_TIMEOUT);

                const stat = await fs.stat(outputPath);
                console.log(`[VideoDownloader] 📊 File size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

                // If 720p is still too large, try 480p
                if (stat.size > MAX_VIDEO_SIZE) {
                    console.log(`[VideoDownloader] ⚠️ 720p too large, trying 480p...`);
                    await fs.unlink(outputPath);

                    const directMp4_480 = getArvanVODVariantUrl(videoUrl, 480);
                    if (directMp4_480) {
                        const cmd480 = `ffmpeg -y -i "${directMp4_480}" -c copy -movflags +faststart "${outputPath}"`;
                        await execPromise(cmd480, DOWNLOAD_TIMEOUT);

                        const stat480 = await fs.stat(outputPath);
                        console.log(`[VideoDownloader] 📊 480p size: ${(stat480.size / 1024 / 1024).toFixed(2)} MB`);

                        if (stat480.size > MAX_VIDEO_SIZE) {
                            // Try 360p
                            console.log(`[VideoDownloader] ⚠️ 480p still too large, trying 360p...`);
                            await fs.unlink(outputPath);

                            const directMp4_360 = getArvanVODVariantUrl(videoUrl, 360);
                            if (directMp4_360) {
                                const cmd360 = `ffmpeg -y -i "${directMp4_360}" -c copy -movflags +faststart "${outputPath}"`;
                                await execPromise(cmd360, DOWNLOAD_TIMEOUT);

                                const stat360 = await fs.stat(outputPath);
                                console.log(`[VideoDownloader] 📊 360p size: ${(stat360.size / 1024 / 1024).toFixed(2)} MB`);

                                return { success: true, localPath: outputPath, fileSize: stat360.size };
                            }
                        }

                        return { success: true, localPath: outputPath, fileSize: stat480.size };
                    }
                }

                return { success: true, localPath: outputPath, fileSize: stat.size };
            }

            // Fallback: Generic HLS download
            console.log(`[VideoDownloader] 🎬 Downloading HLS stream → MP4...`);
            console.log(`[VideoDownloader]   Source: ${videoUrl.substring(0, 100)}...`);

            const ffmpegCmd = `ffmpeg -y -i "${videoUrl}" -c copy -bsf:a aac_adtstoasc -movflags +faststart "${outputPath}"`;
            await execPromise(ffmpegCmd, DOWNLOAD_TIMEOUT);

        } else if (isDirectVideoUrl(videoUrl)) {
            console.log(`[VideoDownloader] 📥 Downloading direct video...`);

            const ffmpegCmd = `ffmpeg -y -i "${videoUrl}" -c copy -movflags +faststart "${outputPath}"`;
            await execPromise(ffmpegCmd, DOWNLOAD_TIMEOUT);

        } else {
            console.log(`[VideoDownloader] 🔄 Trying ffmpeg for unknown format...`);
            const ffmpegCmd = `ffmpeg -y -i "${videoUrl}" -c copy -movflags +faststart "${outputPath}"`;
            await execPromise(ffmpegCmd, DOWNLOAD_TIMEOUT);
        }

        // Check file size
        const stat = await fs.stat(outputPath);
        console.log(`[VideoDownloader] 📊 File size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

        // If too large, re-encode
        if (stat.size > MAX_VIDEO_SIZE) {
            console.log(`[VideoDownloader] ⚠️ File too large (${(stat.size / 1024 / 1024).toFixed(2)}MB > 50MB), re-encoding...`);

            const reEncodedPath = path.join(tempDir, `video_small_${Date.now()}.mp4`);
            const reEncodeCmd = `ffmpeg -y -i "${outputPath}" -c:v libx264 -preset fast -crf 28 -vf "scale=-2:720" -c:a aac -b:a 128k -movflags +faststart "${reEncodedPath}"`;

            await execPromise(reEncodeCmd, DOWNLOAD_TIMEOUT);
            await fs.unlink(outputPath);

            const newStat = await fs.stat(reEncodedPath);
            console.log(`[VideoDownloader] 📊 Re-encoded size: ${(newStat.size / 1024 / 1024).toFixed(2)} MB`);

            if (newStat.size > MAX_VIDEO_SIZE) {
                // Try 480p
                console.log(`[VideoDownloader] ⚠️ Still too large, trying 480p...`);
                const smallPath = path.join(tempDir, `video_480p_${Date.now()}.mp4`);
                const smallCmd = `ffmpeg -y -i "${reEncodedPath}" -c:v libx264 -preset fast -crf 30 -vf "scale=-2:480" -c:a aac -b:a 96k -movflags +faststart "${smallPath}"`;

                await execPromise(smallCmd, DOWNLOAD_TIMEOUT);
                await fs.unlink(reEncodedPath);

                const smallStat = await fs.stat(smallPath);
                console.log(`[VideoDownloader] 📊 480p size: ${(smallStat.size / 1024 / 1024).toFixed(2)} MB`);

                return { success: true, localPath: smallPath, fileSize: smallStat.size };
            }

            return { success: true, localPath: reEncodedPath, fileSize: newStat.size };
        }

        return { success: true, localPath: outputPath, fileSize: stat.size };

    } catch (error: any) {
        console.error(`[VideoDownloader] ❌ Download failed:`, error.message);
        try { await fs.unlink(outputPath); } catch { }
        return { success: false, error: error.message };
    }
}

/**
 * Clean up downloaded video file
 */
export async function cleanupVideoFile(filePath: string): Promise<void> {
    try {
        await fs.unlink(filePath);
        console.log(`[VideoDownloader] 🧹 Cleaned up: ${path.basename(filePath)}`);
    } catch { }
}

/**
 * Execute shell command with timeout
 */
function execPromise(cmd: string, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = exec(cmd, { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`ffmpeg failed: ${error.message}\nstderr: ${stderr?.substring(Math.max(0, (stderr?.length || 0) - 500))}`));
            } else {
                resolve(stdout);
            }
        });
    });
}
