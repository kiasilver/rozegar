// components/SortableRow.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type SortableRowProps = {
  category: {
    id: number;
    translations: { lang: string; name: string }[];
  };
};

export default function SortableRow({ category }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: category.id.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const name = category.translations.find((t) => t.lang === "FA")?.name ?? `ID: ${category.id}`;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center justify-between p-2 border-b dark:border-gray-700">
      <span>{name}</span>
      <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
    </div>
  );
}
