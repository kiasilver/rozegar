import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export async function GET() {
    try {
        // Create timeout wrapper - 5 seconds max for each query
        const createTimeoutPromise = (ms: number) =>
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Query timeout')), ms)
            );

        // Fetch footer settings with timeout
        const settingsPromise = prisma.siteSetting.findMany({
            where: {
                group_name: "footer"
            },
            select: {
                key: true,
                value: true,
            }
        });

        const footerSettings = await Promise.race([
            settingsPromise,
            createTimeoutPromise(5000)
        ]).catch((err) => {
            console.error("⚠️ [Footer API] Settings query failed:", err);
            return [];
        });

        // Transform settings array into an object
        const settings: Record<string, string> = {};
        if (Array.isArray(footerSettings)) {
            footerSettings.forEach((setting) => {
                if (setting.key) {
                    settings[setting.key] = setting.value || "";
                }
            });
        }

        // Fetch footer menus with timeout
        const menusPromise = prisma.footerMenu.findMany({
            where: {
                is_active: true
            },
            orderBy: {
                order: 'asc'
            }
        });

        const footerMenus = await Promise.race([
            menusPromise,
            createTimeoutPromise(5000)
        ]).catch((err) => {
            console.error("⚠️ [Footer API] Menus query failed:", err);
            return [];
        });

        // Return footer data in the format expected by Footer component
        return NextResponse.json({
            settings: {
                bio: settings.footer_bio || "",
                copyright: settings.footer_copyright || `© ${new Date().getFullYear()} All rights reserved`
            },
            menus: Array.isArray(footerMenus) ? footerMenus : []
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
            }
        });
    } catch (error) {
        console.error("❌ [Footer API] Fatal error:", error);
        // Return minimal footer data instead of error
        return NextResponse.json({
            settings: {
                bio: "",
                copyright: `© ${new Date().getFullYear()} All rights reserved`
            },
            menus: []
        }, {
            status: 200,
            headers: {
                'Cache-Control': 'public, s-maxage=30',
            }
        });
    }
}
