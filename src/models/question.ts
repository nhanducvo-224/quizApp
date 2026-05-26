export interface QuestionModel {
  id: string;
  categoryId: string;
  level: number;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[]; // Options array, serialized as JSON string in DB
  correctIndex: number;
  explanation: string;
}
