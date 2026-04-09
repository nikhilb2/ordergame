import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Scale, Plus, Hash, Puzzle, Dices, Minus, BookOpen } from "lucide-react";

const games = [
  {
    title: "Zahlen ordnen",
    description: "Ziehe die Zahlen in die richtige Reihenfolge!",
    emoji: "🔢",
    icon: ArrowUpDown,
    path: "/ordering",
    gradient: "bg-gradient-ocean",
  },
  {
    title: "Zahlen vergleichen",
    description: "Ist es < > oder = ?",
    emoji: "⚖️",
    icon: Scale,
    path: "/compare",
    gradient: "bg-gradient-forest",
  },
  {
    title: "Zahl bilden",
    description: "Finde das richtige Additionspaar!",
    emoji: "➕",
    icon: Plus,
    path: "/make-number",
    gradient: "bg-gradient-fun",
  },
  {
    title: "Zählen & Zuordnen",
    description: "Zähle die Objekte!",
    emoji: "🎯",
    icon: Hash,
    path: "/count",
    gradient: "bg-gradient-sunny",
  },
  {
    title: "Zahlen einsetzen",
    description: "Setze die Zahlen richtig zu den Zeichen!",
    emoji: "🧩",
    icon: Puzzle,
    path: "/placement",
    gradient: "bg-gradient-candy",
  },
  {
    title: "Würfeln & Addieren",
    description: "Würfle und rechne die Summe aus!",
    emoji: "🎲",
    icon: Dices,
    path: "/dice",
    gradient: "bg-gradient-dice",
  },
  {
    title: "Abziehen mit Punkten",
    description: "Streiche Punkte durch und zähle den Rest!",
    emoji: "➖",
    icon: Minus,
    path: "/subtract",
    gradient: "bg-gradient-subtract",
  },
  {
    title: "Addieren lernen",
    description: "Lerne Schritt für Schritt, wie du Zahlen addierst!",
    emoji: "✏️",
    icon: BookOpen,
    path: "/add-learn",
    gradient: "bg-gradient-ocean",
  },
  {
    title: "Subtrahieren lernen",
    description: "Lerne Schritt für Schritt, wie du Zahlen subtrahierst!",
    emoji: "📝",
    icon: BookOpen,
    path: "/sub-learn",
    gradient: "bg-gradient-candy",
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
            🧮 Mathe-Abenteuer
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-semibold">
            Wähle ein Spiel und fang an zu lernen! 🚀
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
          Zahlen 1–20 · Perfekt für die 1. Klasse 🌟
        </motion.p>
      </div>
    </div>
  );
}
