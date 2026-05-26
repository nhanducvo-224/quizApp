export interface GameResultModel {
  id: string;
  userId: string;
  categoryId: string;
  level: number;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  playedAt: string; // ISO string format
}
