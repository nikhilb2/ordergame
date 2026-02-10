import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import NumberOrdering from "./games/NumberOrdering";
import CompareNumbers from "./games/CompareNumbers";
import MakeTheNumber from "./games/MakeTheNumber";
import CountAndMatch from "./games/CountAndMatch";
import NumberPlacement from "./games/NumberPlacement";
import DiceAddition from "./games/DiceAddition";
import SubtractionDots from "./games/SubtractionDots";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/ordering" element={<NumberOrdering />} />
          <Route path="/compare" element={<CompareNumbers />} />
          <Route path="/make-number" element={<MakeTheNumber />} />
          <Route path="/count" element={<CountAndMatch />} />
          <Route path="/placement" element={<NumberPlacement />} />
          <Route path="/dice" element={<DiceAddition />} />
          <Route path="/subtract" element={<SubtractionDots />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
