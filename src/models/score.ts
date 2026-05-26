export interface ScoreModel {
  id?: number;
  username: string;
  categoryId: string;
  score: number;
  totalQuestions: number;
  playedAt: string; // ISO date-time string
}
