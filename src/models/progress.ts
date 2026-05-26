export interface UserProgressModel {
  categoryId: string;
  unlockedLevels: number;
  completedLevels: number[]; // Array of completed level numbers, serialized as JSON string in DB
  bestScores: Record<number, number>; // Map of Level -> Best Score, serialized as JSON string in DB
}
