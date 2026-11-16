import { StagedTraining, type TrainingConfig } from "./training/StagedTraining";
import { SECTIONS, STAGES, stepsStoreApi, type StepTask, type Stage } from "./schritte/steps";
import { StepHint, StepTaskBody } from "./schritte/StepViews";

const config: TrainingConfig<StepTask, Stage> = {
  game: "schritte",
  name: "Schritte",
  emoji: "🐸",
  title: "Schritte-Training",
  intro: "Mit dem Frosch in Schritten hüpfen, vorwärts und rückwärts.",
  goal: "Ich kann in Schritten zählen",
  gradient: "bg-gradient-forest",
  stages: STAGES,
  sections: SECTIONS,
  store: stepsStoreApi,
  Body: StepTaskBody,
  Hint: StepHint,
  retryText: "😊 Fast! Schau dir die Sprünge an.",
};

export default function StepTraining() {
  return <StagedTraining config={config} />;
}
