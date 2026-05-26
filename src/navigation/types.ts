export type RootStackParamList = {
  Home: undefined;
  LevelSelect: { categoryId: string; categoryName: string; totalLevels: number };
  CategoryDetail: { categoryId: string; categoryName: string; level: number };
  Leaderboard: undefined;
};
