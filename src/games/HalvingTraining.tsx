import { StagedTraining, type TrainingConfig } from "./training/StagedTraining";
import { SECTIONS, STAGES, hintNumber, halvingStoreApi, type HalfTask, type Stage } from "./halbieren/halving";
import { DoublingHint, HalfTaskBody, Rechenweg } from "./halbieren/HalvingViews";

const config: TrainingConfig<HalfTask, Stage> = {
  game: "halbieren",
  name: "Halbieren",
  emoji: "✂️",
  title: "Halbieren-Training",
  intro: "Halbieren mit Rechenweg, wie in der Schule.",
  goal: "Ich kann halbieren",
  gradient: "bg-gradient-candy",
  stages: STAGES,
  sections: SECTIONS,
  store: halvingStoreApi,
  Body: HalfTaskBody,
  Hint: ({ task, given, reveal }) =>
    task.kind === "half-reverse" ? <DoublingHint half={task.half} reveal={reveal} /> : <Rechenweg n={hintNumber(task, given)} reveal={reveal} />,
  retryText: "😊 Fast! Schau dir den Rechenweg an.",
};

export default function HalvingTraining() {
  return <StagedTraining config={config} />;
}
