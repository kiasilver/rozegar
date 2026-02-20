export function flattenItems<T extends { id: string | number; parentId: string | number | null }>(
    items: T[],
    parentId: string | number | null = null,
    depth = 0
  ): (T & { depth: number })[] {
    return items
      .filter((item) => item.parentId === parentId)
      .flatMap((item) => [
        { ...item, depth },
        ...flattenItems(items, item.id, depth + 1),
      ])
  }
  
  export function buildTreeFromFlat<T extends { id: string | number; parentId: string | number | null }>(
    items: (T & { depth?: number })[]
  ): T[] {
    const map = new Map<string | number, T & { children?: T[] }>()
    const roots: T[] = []
  
    items.forEach((item) => {
      map.set(item.id, { ...item })
    })
  
    items.forEach((item) => {
      if (item.parentId === null) {
        roots.push(map.get(item.id)!)
      } else {
        const parent = map.get(item.parentId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(map.get(item.id)!)
        }
      }
    })
  
    return roots
  }
  