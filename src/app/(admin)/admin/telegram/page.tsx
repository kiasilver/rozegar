/**
 * Telegram Admin Page - Redirects to Unified RSS
 */
import { redirect } from 'next/navigation';

export default function TelegramPage() {
    redirect('/admin/rss-unified?tab=telegram');
}
