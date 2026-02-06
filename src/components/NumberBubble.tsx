import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

const BUBBLE_COLORS = [
  "bg-kid-blue",
  "bg-kid-pink",
  "bg-kid-green",
  "bg-kid-orange",
  "bg-kid-purple",
  "bg-kid-yellow",
];

interface NumberBubbleProps {
  id: string;
  value: number;
  index: number;
}

export const NumberBubble = ({ id, value, index }: NumberBubbleProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    zIndex: isDragging ? 50 : 0,
  };

  const colorClass = BUBBLE_COLORS[index % BUBBLE_COLORS.length];

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 20 }}
      className={`
        w-16 h-16 md:w-20 md:h-20
        rounded-2xl flex items-center justify-center
        text-2xl md:text-3xl font-black
        cursor-grab active:cursor-grabbing
        select-none relative
        transition-all duration-200
        ${
          isDragging
            ? "opacity-30 border-4 border-dashed border-primary/50 bg-primary/10 text-transparent shadow-none"
            : `${colorClass} text-primary-foreground shadow-lg hover:scale-105 hover:shadow-xl hover:-translate-y-1`
        }
        ${isOver && !isDragging ? "scale-90 ring-4 ring-kid-yellow/60 rounded-3xl" : ""}
      `}
    >
      {isDragging ? "" : value}
      {isOver && !isDragging && (
        <div className="absolute inset-0 rounded-2xl bg-kid-yellow/20 animate-pulse pointer-events-none" />
      )}
    </motion.div>
  );
};

/** Standalone overlay bubble rendered in the DragOverlay portal */
export const DragOverlayBubble = ({ value, index }: { value: number; index: number }) => {
  const colorClass = BUBBLE_COLORS[index % BUBBLE_COLORS.length];

  return (
    <div
      className={`
        ${colorClass} text-primary-foreground
        w-16 h-16 md:w-20 md:h-20
        rounded-2xl flex items-center justify-center
        text-2xl md:text-3xl font-black
        shadow-2xl select-none
        ring-4 ring-primary/40
        rotate-3
      `}
      style={{
        boxShadow: "0 24px 48px -12px rgba(0,0,0,0.3), 0 0 0 4px hsl(210 90% 55% / 0.4)",
      }}
    >
      {value}
      <div className="absolute inset-0 rounded-2xl bg-white/15 animate-pulse pointer-events-none" />
    </div>
  );
};
