"use client";

import Link from "next/link";

interface QuickAction {
  title: string;
  href: string;
  icon: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    title: "افزودن مقاله",
    href: "/admin/blog/addblog",
    icon: "✍️",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    title: "افزودن تبلیغ",
    href: "/admin/ads/add",
    icon: "📢",
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    title: "گزارش تبلیغات",
    href: "/admin/reports?tab=ads",
    icon: "📊",
    color: "bg-purple-500 hover:bg-purple-600",
  },
  {
    title: "تنظیمات AI",
    href: "/admin/setting/ai",
    icon: "🤖",
    color: "bg-orange-500 hover:bg-orange-600",
  },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {quickActions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`${action.color} text-white rounded-lg p-4 transition-colors text-center`}
        >
          <div className="text-2xl mb-2">{action.icon}</div>
          <div className="text-sm font-medium">{action.title}</div>
        </Link>
      ))}
    </div>
  );
}

