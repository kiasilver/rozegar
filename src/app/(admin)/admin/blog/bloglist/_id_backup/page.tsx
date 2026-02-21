"use client";

import { useParams } from "next/navigation";

export default function BlogDetailPage() {
  const params = useParams();
  const id = params?.id;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">جزئیات بلاگ</h1>
      <p>شناسه بلاگ: {id}</p>
      <p>صفحه جزئیات بلاگ در حال توسعه است.</p>
    </div>
  );
}

