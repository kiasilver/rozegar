// components/CategoryDndTree.tsx
"use client";

import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import SortableRow from "./SortableRow"; // یا اینو هم همینجا بیار اگر می‌خوای داخلی باشه

type Category = {
  id: number;
  parent_id: number | null;
  translations: { lang: string; name: string }[];
};

type CategoryDndTreeProps = {
  categories: Category[];
  onOrderChange: (newOrder: Category[]) => void;
};

export default function CategoryDndTree({ categories, onOrderChange }: CategoryDndTreeProps) {
  const [items, setItems] = useState(categories);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === Number(active.id));
    const newIndex = items.findIndex((item) => item.id === Number(over.id));
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);
    onOrderChange(newItems);
  };

  const flattenCategories = (categories: Category[]) => {
    // ساختار دسته‌بندی تخت برای نمایش لیست ساده
    return categories.sort((a, b) => a.id - b.id); // یا بر اساس parent_id و order مرتب کن
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((cat) => cat.id.toString())} strategy={verticalListSortingStrategy}>
        {flattenCategories(items).map((category) => (
          <SortableRow key={category.id} category={category} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
