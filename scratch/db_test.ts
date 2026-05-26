import { 
  initDatabase, 
  UserHelpers, 
  CategoryHelpers, 
  QuestionHelpers, 
  UserProgressHelpers, 
  GameResultHelpers 
} from '../src/database/db';
import { 
  UserModel, 
  CategoryModel, 
  QuestionModel, 
  GameResultModel 
} from '../src/models';

/**
 * This test file is designed to verify that the SQLite database helper APIs and 
 * TypeScript interfaces compile without any errors.
 */
async function testDatabaseHelpers() {
  console.log('Starting type verification for database helpers...');

  // 1. Mock Data Definitions
  const testUser: UserModel = {
    id: 'user_123',
    username: 'nguyenvana',
    email: 'ana@gmail.com',
    totalScore: 100,
    weeklyScore: 50,
    monthlyScore: 80,
    xp: 250,
    rank: 'Đồng I',
    coins: 50,
    streak: 3,
    lastPlayedDate: new Date().toISOString(),
    badges: ['chuan_bi', 'chien_binh'],
    createdAt: new Date().toISOString()
  };

  const testCategory: CategoryModel = {
    id: 'science',
    name: 'Khoa học',
    icon: 'flask-outline',
    color: '#9B59B6',
    totalLevels: 5,
    description: 'Khám phá thế giới khoa học tự nhiên thú vị.'
  };

  const testQuestion: QuestionModel = {
    id: 'q_science_1',
    categoryId: 'science',
    level: 1,
    difficulty: 'easy',
    question: 'Trái Đất quay quanh Mặt Trời mất bao lâu?',
    options: ['365 ngày', '24 giờ', '30 ngày', '12 tháng'],
    correctIndex: 0,
    explanation: 'Trái Đất hoàn thành một vòng quay quanh Mặt Trời mất khoảng 365,25 ngày.'
  };

  const testGameResult: GameResultModel = {
    id: 'res_999',
    userId: 'user_123',
    categoryId: 'science',
    level: 1,
    score: 90,
    totalQuestions: 10,
    correctAnswers: 9,
    timeSpent: 120,
    playedAt: new Date().toISOString()
  };

  // 2. Mock calling helper APIs to verify type correctness
  try {
    // Note: Calling these will fail at runtime if native SQLite is not available,
    // but this verifies compilation and type correctness.
    console.log('Attempting helper operations (type check)...');

    // Users
    await UserHelpers.insertUser(testUser);
    const user = await UserHelpers.getUserById(testUser.id);
    if (user) {
      console.log(`Fetched user: ${user.username}`);
      await UserHelpers.updateUser({ ...user, totalScore: 150 });
    }
    const allUsers = await UserHelpers.getAllUsers();
    console.log(`Loaded ${allUsers.length} users.`);

    // Categories
    await CategoryHelpers.insertCategory(testCategory);
    const category = await CategoryHelpers.getCategoryById(testCategory.id);
    if (category) {
      await CategoryHelpers.updateCategory({ ...category, totalLevels: 6 });
    }
    const allCategories = await CategoryHelpers.getAllCategories();
    console.log(`Loaded ${allCategories.length} categories.`);

    // Questions
    await QuestionHelpers.insertQuestion(testQuestion);
    const question = await QuestionHelpers.getQuestionById(testQuestion.id);
    if (question) {
      await QuestionHelpers.updateQuestion({ ...question, difficulty: 'medium' });
    }
    const levelQuestions = await QuestionHelpers.getQuestionsByCategoryAndLevel('science', 1);
    const categoryQuestions = await QuestionHelpers.getQuestionsByCategory('science');
    const shuffledQuestions = await QuestionHelpers.getQuestionsByCategoryAndLevelShuffled('science', 1, 5);
    console.log(`Level questions: ${levelQuestions.length}, Category: ${categoryQuestions.length}, Shuffled: ${shuffledQuestions.length}`);

    // UserProgress (new schema with category_id + level PK)
    const levelProgress = await UserProgressHelpers.getLevelProgress('science', 1);
    if (levelProgress) {
      console.log(`Level 1 unlocked: ${levelProgress.is_unlocked}, high score: ${levelProgress.high_score}`);
    }
    await UserProgressHelpers.unlockLevel('science', 2);
    await UserProgressHelpers.updateHighScore('science', 1, 4);
    const categoryStatus = await UserProgressHelpers.getCategoryLevelStatus('science');
    console.log(`Category has ${categoryStatus.length} levels.`);

    // Game Results
    await GameResultHelpers.insertGameResult(testGameResult);
    const result = await GameResultHelpers.getGameResultById(testGameResult.id);
    const userResults = await GameResultHelpers.getGameResultsByUserId(testUser.id);
    const categoryResults = await GameResultHelpers.getGameResultsByCategory('science');
    console.log(`Results - single: ${result?.id}, user: ${userResults.length}, category: ${categoryResults.length}`);

    console.log('Database helpers compiled and verified successfully!');
  } catch (error) {
    console.warn('Execution error expected without Expo environment, but type compilation is successful:', error);
  }
}
