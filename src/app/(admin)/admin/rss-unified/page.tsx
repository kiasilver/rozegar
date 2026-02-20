/**
 * Unified RSS Admin Page
 * Main unified interface for RSS management
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import GeneralSettings from '@/components/Admin/undefined-rss/GeneralSettings';
import TelegramSettings from '@/components/Admin/undefined-rss/TelegramSettings';
import WebsiteSettings from '@/components/Admin/undefined-rss/WebsiteSettings';
import RSSFeeds from '@/components/Admin/undefined-rss/RSSFeeds';
import PromptsEditor from '@/components/Admin/undefined-rss/PromptsEditor';
import LogsTable from '@/components/Admin/undefined-rss/LogsTable';
import ManualSend from '@/components/Admin/undefined-rss/ManualSend';

function UnifiedRSSContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'general');

  // Update tab when URL changes
  useEffect(() => {
    if (tabFromUrl && ['general', 'telegram', 'website', 'rss', 'prompts', 'manual', 'prices'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">تولید محتوا با هوش مصنوعی</h1>
        <p className="text-gray-600 mt-2">
          مدیریت کامل تولید محتوا برای تلگرام و وبسایت
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid grid-cols-6 gap-2 mb-6">
          <TabsTrigger value="general">تنظیمات عمومی</TabsTrigger>
          <TabsTrigger value="telegram">تلگرام</TabsTrigger>
          <TabsTrigger value="website">وبسایت</TabsTrigger>
          <TabsTrigger value="rss">فیدهای RSS</TabsTrigger>
          <TabsTrigger value="prompts">پرامپت‌ها</TabsTrigger>
          <TabsTrigger value="manual">ارسال دستی</TabsTrigger>
          <TabsTrigger value="logs">لاگ‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="p-6">
            <GeneralSettings />
          </Card>
        </TabsContent>

        <TabsContent value="telegram">
          <Card className="p-6">
            <TelegramSettings />
          </Card>
        </TabsContent>

        <TabsContent value="website">
          <Card className="p-6">
            <WebsiteSettings />
          </Card>
        </TabsContent>

        <TabsContent value="rss">
          <Card className="p-6">
            <RSSFeeds />
          </Card>
        </TabsContent>

        <TabsContent value="prompts">
          <Card className="p-6">
            <PromptsEditor />
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card className="p-6">
            <ManualSend />
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="p-6">
            <LogsTable />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function UnifiedRSSPage() {
  return (
    <Suspense fallback={<div>در حال بارگذاری...</div>}>
      <UnifiedRSSContent />
    </Suspense>
  );
}
