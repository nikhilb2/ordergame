import { motion } from "framer-motion";
import { ArrowLeft, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GameHeaderProps {
  title: string;
  emoji: string;
  score: number;
  total: number;
}

export const GameHeader = ({ title, emoji, score, total }: GameHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate("/")}
        className="flex items-center gap-2 bg-card rounded-full px-4 py-2 shadow-md font-bold text-foreground"
      >
        <ArrowLeft size={20} />
        Back
      </motion.button>

      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-black text-foreground">
          {emoji} {title}
        </h1>
      </div>

      <div className="flex items-center gap-1 bg-card rounded-full px-4 py-2 shadow-md">
        <Star className="text-kid-yellow fill-kid-yellow" size={20} />
        <span className="font-bold text-foreground">
          {score}/{total}
        </span>
      </div>
    </div>
  );
};
