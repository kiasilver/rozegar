'use client'

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Table, TableBody } from '@/components/admin/ui/table'
import { useState } from 'react'
import { flattenItems, buildTreeFromFlat } from '@/lib/flatten/tree-utils'
import SortableRow from './sortablerow'

type IdType = string | number

export interface TreeItem {
  id: IdType
  parentId: IdType | null
  [key: string]: unknown
}

interface SortableTreeTableProps<T extends TreeItem> {
  items: T[]
  onReorder: (items: T[]) => void
  renderRow: (item: T, depth: number) => React.ReactNode
}

export default function SortableTreeTable<T extends TreeItem>({
  items,
  onReorder,
  renderRow,
}: SortableTreeTableProps<T>) {
  const sensors = useSensors(useSensor(PointerSensor))

  const [internalItems, setInternalItems] = useState(() => flattenItems(items))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = internalItems.findIndex((item) => item.id === active.id)
    const newIndex = internalItems.findIndex((item) => item.id === over.id)

    const updated = [...internalItems]
    const [moved] = updated.splice(oldIndex, 1)
    updated.splice(newIndex, 0, moved)

    setInternalItems(updated)
    const tree = buildTreeFromFlat(updated)
    onReorder(tree as T[])
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={internalItems.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <Table>
          <TableBody>
            {internalItems.map((item) => (
              <SortableRow key={item.id} id={item.id}>
                {renderRow(item as T, item.depth || 0)}
              </SortableRow>
            ))}
          </TableBody>
        </Table>
      </SortableContext>
    </DndContext>
  )
}
