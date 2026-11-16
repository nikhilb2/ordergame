import { StagedTraining, type TrainingConfig } from "./training/StagedTraining";
import { SECTIONS, STAGES, backwardsStoreApi, type BackTask, type Stage } from "./rueckwaerts/backwards";
import { BackHint, BackTaskBody } from "./rueckwaerts/BackViews";

const config: TrainingConfig<BackTask, Stage> = {
  game: "rueckwaerts",
  name: "Rückwärts",
  emoji: "🚀",
  title: "Rückwärts-Training",
  intro: "Rückwärts zählen wie beim Countdown, auch über den Zehner.",
  goal: "Ich kann rückwärts zählen",
  gradient: "bg-gradient-sunny",
  stages: STAGES,
  sections: SECTIONS,
  store: backwardsStoreApi,
  Body: BackTaskBody,
  Hint: BackHint,
  retryText: "😊 Fast! Zähle noch einmal rückwärts.",
};

export default function BackwardsTraining() {
  return <StagedTraining config={config} />;
}
