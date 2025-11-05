import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
}

function DraggableItem({ id, children }: DraggableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-2 z-10 cursor-grab active:cursor-grabbing rounded bg-muted/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        data-testid={`drag-handle-${id}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

interface DashboardSection {
  id: string;
  component: React.ReactNode;
}

interface DraggableDashboardGridProps {
  sections: DashboardSection[];
  gridClassName?: string;
  storageKey?: string;
}

export function DraggableDashboardGrid({
  sections: initialSections,
  gridClassName = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4",
  storageKey = "dashboard-layout",
}: DraggableDashboardGridProps) {
  const [sections, setSections] = useState<DashboardSection[]>(() => {
    if (typeof window === "undefined") return initialSections;
    
    const saved = localStorage.getItem(storageKey);
    if (!saved) return initialSections;

    try {
      const savedOrder = JSON.parse(saved) as string[];
      const sectionsMap = new Map(initialSections.map(s => [s.id, s]));
      const orderedSections = savedOrder
        .map(id => sectionsMap.get(id))
        .filter((s): s is DashboardSection => s !== undefined);
      
      // Add any new sections that weren't in saved order
      const savedIds = new Set(savedOrder);
      const newSections = initialSections.filter(s => !savedIds.has(s.id));
      
      return [...orderedSections, ...newSections];
    } catch {
      return initialSections;
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync with parent when initialSections changes (e.g., account state updates)
  useEffect(() => {
    const currentIds = new Set(sections.map(s => s.id));
    const newIds = new Set(initialSections.map(s => s.id));
    
    // Check if sections have changed (different IDs or different content)
    const idsChanged = sections.length !== initialSections.length ||
                      sections.some(s => !newIds.has(s.id)) ||
                      initialSections.some(s => !currentIds.has(s.id));
    
    if (idsChanged) {
      // IDs changed, use new sections with saved order if available
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const savedOrder = JSON.parse(saved) as string[];
          const sectionsMap = new Map(initialSections.map(s => [s.id, s]));
          const orderedSections = savedOrder
            .map(id => sectionsMap.get(id))
            .filter((s): s is DashboardSection => s !== undefined);
          const savedIds = new Set(savedOrder);
          const newSections = initialSections.filter(s => !savedIds.has(s.id));
          setSections([...orderedSections, ...newSections]);
          return;
        } catch {
          // Fall through to default
        }
      }
      setSections(initialSections);
    } else {
      // Same IDs, just update the components to get fresh data
      const sectionsMap = new Map(initialSections.map(s => [s.id, s]));
      setSections(prev => prev.map(s => sectionsMap.get(s.id) || s));
    }
  }, [initialSections, storageKey]);

  useEffect(() => {
    const order = sections.map(s => s.id);
    localStorage.setItem(storageKey, JSON.stringify(order));
  }, [sections, storageKey]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sections.map(s => s.id)} strategy={rectSortingStrategy}>
        <div className={gridClassName}>
          {sections.map((section) => (
            <DraggableItem key={section.id} id={section.id}>
              {section.component}
            </DraggableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
