"use client";

// Danh sách kéo thả để sắp xếp. Dùng được bằng chuột, ngón tay (giữ 0.2 giây rồi kéo) và bàn phím.

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId, useOptimistic, useTransition, type ReactNode } from "react";

export type DragHandleProps = ReturnType<typeof useSortable>["listeners"] & ReturnType<typeof useSortable>["attributes"];

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => Promise<unknown>;
  renderItem: (item: T, handle: ReactNode, index: number) => ReactNode;
  className?: string;
}) {
  // Đổi thứ tự ngay trên màn hình, rồi mới lưu; nếu lưu lỗi, React tự trả về thứ tự cũ.
  const [optimistic, setOptimistic] = useOptimistic(items);
  const [, startTransition] = useTransition();
  // Mã ổn định giữa máy chủ và trình duyệt (tránh lỗi "hydration mismatch" của thư viện kéo thả).
  const dndId = useId();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = optimistic.findIndex((i) => i.id === active.id);
    const to = optimistic.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(optimistic, from, to);
    startTransition(async () => {
      setOptimistic(next);
      await onReorder(next.map((i) => i.id));
    });
  }

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={optimistic.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {optimistic.map((item, index) => (
            <SortableRow key={item.id} id={item.id}>
              {(handle) => renderItem(item, handle, index)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
      className="-ml-1 flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 active:cursor-grabbing"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="8" cy="5" r="2" />
        <circle cx="16" cy="5" r="2" />
        <circle cx="8" cy="12" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="8" cy="19" r="2" />
        <circle cx="16" cy="19" r="2" />
      </svg>
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-90 shadow-lg" : undefined}
    >
      {children(handle)}
    </li>
  );
}
