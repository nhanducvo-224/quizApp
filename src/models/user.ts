export interface UserModel {
  id: string;
  username: string;
  email: string;
  totalScore: number;
  weeklyScore: number;
  monthlyScore: number;
  xp: number;
  rank: string;
  coins: number;
  streak: number;
  lastPlayedDate: string; // ISO string format
  badges: string[]; // array of badge IDs or names, serialized as JSON string in DB
  createdAt: string; // ISO string format
}
