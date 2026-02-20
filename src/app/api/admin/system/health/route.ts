/**
 * Health Check API - Real System Status (OS-Level)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import os from 'os';

export const dynamic = 'force-dynamic';

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Calculate real CPU usage by sampling over 500ms
 */
function getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
        const cpus1 = os.cpus();

        setTimeout(() => {
            const cpus2 = os.cpus();
            let idleDiff = 0;
            let totalDiff = 0;

            for (let i = 0; i < cpus2.length; i++) {
                const c1 = cpus1[i].times;
                const c2 = cpus2[i].times;

                const idle = c2.idle - c1.idle;
                const total = (c2.user - c1.user) + (c2.nice - c1.nice) +
                    (c2.sys - c1.sys) + (c2.irq - c1.irq) + idle;

                idleDiff += idle;
                totalDiff += total;
            }

            const cpuPercent = totalDiff > 0 ? Math.round(((totalDiff - idleDiff) / totalDiff) * 100) : 0;
            resolve(Math.min(cpuPercent, 100));
        }, 500);
    });
}

export async function GET(req: NextRequest) {
    try {
        // 1. Check Agent Status (DB)
        const settings = await prisma.unifiedRSSSettings.findFirst();

        // 2. Check Telegram Bot Status (Ping API)
        let telegramStatus = 'inactive';
        let telegramError = null;

        if (settings?.telegram_bot_token) {
            try {
                const botRes = await fetch(`https://api.telegram.org/bot${settings.telegram_bot_token}/getMe`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });
                if (botRes.ok) {
                    const botData = await botRes.json();
                    if (botData.ok) {
                        telegramStatus = 'healthy';
                    } else {
                        telegramStatus = 'error';
                        telegramError = botData.description;
                    }
                } else {
                    telegramStatus = 'error';
                    telegramError = `HTTP ${botRes.status}`;
                }
            } catch (e: any) {
                telegramStatus = 'error';
                telegramError = e.message;
            }
        }

        // 3. Real OS-Level RAM
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const ramPercent = Math.round((usedMem / totalMem) * 100);
        const ramUsedGB = (usedMem / 1024 / 1024 / 1024).toFixed(1);
        const ramTotalGB = (totalMem / 1024 / 1024 / 1024).toFixed(1);

        // 4. Real CPU Usage (sampled over 500ms)
        const cpuPercent = await getCpuUsage();
        const cpuCores = os.cpus().length;
        const cpuModel = os.cpus()[0]?.model || 'Unknown';

        // 5. Real Disk Info
        let diskInfo = { total: 0, free: 0, used: 0, percent: 0, totalLabel: '0 GB', freeLabel: '0 GB', usedLabel: '0 GB' };

        try {
            if (process.platform === 'win32') {
                // Windows: wmic
                const diskResult = await execPromise('wmic logicaldisk where Caption="C:" get Size,FreeSpace');
                const diskLines = diskResult.stdout.trim().split('\n');
                if (diskLines.length > 1) {
                    const parts = diskLines[1].trim().split(/\s+/);
                    if (parts.length >= 2) {
                        const free = parseInt(parts[0]);
                        const size = parseInt(parts[1]);
                        if (size > 0) {
                            const usedDisk = size - free;
                            diskInfo.total = Math.round(size / 1024 / 1024 / 1024);
                            diskInfo.free = Math.round(free / 1024 / 1024 / 1024);
                            diskInfo.used = Math.round(usedDisk / 1024 / 1024 / 1024);
                            diskInfo.percent = Math.round((usedDisk / size) * 100);
                            diskInfo.totalLabel = `${diskInfo.total} GB`;
                            diskInfo.freeLabel = `${diskInfo.free} GB`;
                            diskInfo.usedLabel = `${diskInfo.used} GB`;
                        }
                    }
                }
            } else {
                // Linux/Mac: df
                const diskResult = await execPromise("df -B1 / | tail -1 | awk '{print $2, $3, $4}'");
                const parts = diskResult.stdout.trim().split(/\s+/);
                if (parts.length >= 3) {
                    const size = parseInt(parts[0]);
                    const used = parseInt(parts[1]);
                    const free = parseInt(parts[2]);
                    if (size > 0) {
                        diskInfo.total = Math.round(size / 1024 / 1024 / 1024);
                        diskInfo.used = Math.round(used / 1024 / 1024 / 1024);
                        diskInfo.free = Math.round(free / 1024 / 1024 / 1024);
                        diskInfo.percent = Math.round((used / size) * 100);
                        diskInfo.totalLabel = `${diskInfo.total} GB`;
                        diskInfo.freeLabel = `${diskInfo.free} GB`;
                        diskInfo.usedLabel = `${diskInfo.used} GB`;
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching disk stats:', e);
        }

        // 6. System Uptime
        const uptimeSeconds = os.uptime();
        const uptimeHours = Math.floor(uptimeSeconds / 3600);
        const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
        const uptimeLabel = `${uptimeHours} ساعت و ${uptimeMinutes} دقیقه`;

        const healthData = {
            api: { status: 'healthy', timestamp: new Date().toISOString() },
            agent: {
                isRunning: settings?.is_active || false,
                telegram: {
                    enabled: settings?.telegram_enabled || false,
                    status: telegramStatus,
                    error: telegramError
                },
                website: {
                    enabled: settings?.website_enabled || false,
                }
            },
            system: {
                cpu: {
                    percent: cpuPercent,
                    cores: cpuCores,
                    model: cpuModel
                },
                ram: {
                    usedGB: ramUsedGB,
                    totalGB: ramTotalGB,
                    percent: ramPercent
                },
                disk: {
                    ...diskInfo
                },
                uptime: uptimeLabel,
                platform: process.platform,
                hostname: os.hostname()
            }
        };

        return NextResponse.json(healthData);
    } catch (error: any) {
        console.error('[Health API] Error:', error);
        return NextResponse.json({
            api: { status: 'error' },
            error: error.message
        }, { status: 500 });
    }
}
