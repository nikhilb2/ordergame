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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
      className={`
        ${colorClass} text-primary-foreground
        w-16 h-16 md:w-20 md:h-20
        rounded-2xl flex items-center justify-center
        text-2xl md:text-3xl font-black
        cursor-grab active:cursor-grabbing
        shadow-lg select-none
        ${isDragging ? "opacity-70 scale-110 z-50 ring-4 ring-foreground/20" : "hover:scale-105"}
        transition-all duration-150
      `}
    >
      {value}
    </motion.div>
  );
};
