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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    zIndex: isDragging ? 50 : 0,
    scale: isDragging ? 1.18 : 1,
    rotate: isDragging ? "4deg" : "0deg",
    boxShadow: isDragging
      ? "0 20px 40px -8px rgba(0,0,0,0.25), 0 0 0 4px hsl(210 90% 55% / 0.4)"
      : "0 4px 12px -2px rgba(0,0,0,0.12)",
    opacity: isDragging ? 0.92 : 1,
    transitionProperty: "box-shadow, scale, rotate, opacity",
    transitionDuration: "200ms",
    transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
  };

  const colorClass = BUBBLE_COLORS[index % BUBBLE_COLORS.length];

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ scale: 0 }}
      animate={{ scale: isDragging ? 1.18 : 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 20 }}
      className={`
        ${colorClass} text-primary-foreground
        w-16 h-16 md:w-20 md:h-20
        rounded-2xl flex items-center justify-center
        text-2xl md:text-3xl font-black
        cursor-grab active:cursor-grabbing
        select-none relative
        ${isDragging ? "ring-4 ring-primary/40" : "hover:scale-105 hover:shadow-xl hover:-translate-y-1"}
        transition-all duration-200
      `}
    >
      {value}
      {isDragging && (
        <div className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse pointer-events-none" />
      )}
    </motion.div>
  );
};
