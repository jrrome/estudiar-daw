import type { Exercise } from "./types";

const NEW_EXERCISE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isNewExercise(exercise: Exercise, now = Date.now()) {
  if (!exercise.publishedAt) {
    return false;
  }

  const publishedAt = Date.parse(exercise.publishedAt);

  return (
    Number.isFinite(publishedAt) &&
    publishedAt <= now &&
    now - publishedAt < NEW_EXERCISE_WINDOW_MS
  );
}
