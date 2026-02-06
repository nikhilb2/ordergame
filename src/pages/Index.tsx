import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Scale, Plus, Hash } from "lucide-react";

const games = [
  {
    title: "Number Order",
    description: "Drag & drop numbers in order!",
    emoji: "🔢",
    icon: ArrowUpDown,
    path: "/ordering",
    gradient: "bg-gradient-ocean",
  },
  {
    title: "Compare Numbers",
    description: "Is it < > or = ?",
    emoji: "⚖️",
    icon: Scale,
    path: "/compare",
    gradient: "bg-gradient-forest",
  },
  {
    title: "Make the Number",
    description: "Find the addition pair!",
    emoji: "➕",
    icon: Plus,
    path: "/make-number",
    gradient: "bg-gradient-fun",
  },
  {
    title: "Count & Match",
    description: "Count the objects!",
    emoji: "🎯",
    icon: Hash,
    path: "/count",
    gradient: "bg-gradient-sunny",
  },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-10 md:mb-14"
        >
          <h1 className="text-4xl md:text-6xl font-black text-foreground mb-3 text-shadow-playful">
            🧮 Math Adventure
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-semibold">
            Pick a game and start learning! 🚀
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          {games.map((game, i) => (
            <motion.button
              key={game.path}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(game.path)}
              className={`${game.gradient} rounded-3xl p-6 md:p-8 text-left shadow-lg group cursor-pointer`}
            >
              <span className="text-5xl md:text-6xl mb-4 block">{game.emoji}</span>
              <h2 className="text-2xl md:text-3xl font-black text-primary-foreground mb-1">
                {game.title}
              </h2>
              <p className="text-primary-foreground/80 font-semibold text-base md:text-lg">
                {game.description}
              </p>
            </motion.button>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-muted-foreground mt-10 font-semibold"
        >
          Numbers 1-20 · Perfect for Grade 1 🌟
        </motion.p>
      </div>
    </div>
  );
}
