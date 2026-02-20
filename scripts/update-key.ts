import { config } from 'dotenv';
config();

// Force IPv4 if localhost is problematic
if (process.env.APP_DATABASE_URL) {
    process.env.APP_DATABASE_URL = process.env.APP_DATABASE_URL.replace('localhost', '127.0.0.1');
}

console.log('Using DB URL:', process.env.APP_DATABASE_URL?.replace(/:[^:]*@/, ':***@'));
import { PrismaClient } from '@prisma/client';

import { prisma } from '../src/lib/core/prisma';

async function main() {
    const BACKBOARD_KEY = "espr_S75Dkze4cib_IYIZVovmpdLfwO8FQs6l7nYorufY7p0";

    console.log('--- Updating Backboard API Key ---');

    const existing = await prisma.siteSetting.findUnique({
        where: { key: 'ai_settings' },
    });

    let settings: any = {};
    if (existing?.value) {
        try {
            settings = JSON.parse(existing.value);
        } catch (e) {
            console.error('Failed to parse existing settings, starting fresh.');
            settings = { providers: {} };
        }
    } else {
        settings = { providers: {} };
    }

    // Ensure structure
    if (!settings.providers) settings.providers = {};

    // Update Backboard
    settings.providers.backboard = {
        ...settings.providers.backboard,
        apiKey: BACKBOARD_KEY,
        enabled: true,
        endpoint: "https://app.backboard.io/api",
        model: "gpt-3.5-turbo"
    };

    // Also ensure default provider is backboard if user wants it? 
    // User said "backboard selected".
    // But let's just enable it.

    console.log('Writing to DB...', JSON.stringify(settings.providers.backboard, null, 2));

    await prisma.siteSetting.upsert({
        where: { key: 'ai_settings' },
        update: {
            value: JSON.stringify(settings),
            updated_at: new Date()
        },
        create: {
            key: 'ai_settings',
            value: JSON.stringify(settings),
            group_name: 'ai'
        }
    });

    console.log('✅ Successfully updated AI Settings with Backboard Key.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
