import * as SQLite from 'expo-sqlite';
import { UserModel, CategoryModel, QuestionModel, UserProgressModel, GameResultModel, ScoreModel } from '../models';

const DATABASE_NAME = 'vietquiz.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the open SQLite database connection instance.
 * If the connection doesn't exist, it opens a new one.
 */
export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbInstance;
}

/**
 * Initializes the database tables if they do not exist and
 * seeds initial category and mock question data.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await getDB();

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Handle migration: drop old user_progress table if it has wrong schema
  try {
    await db.execAsync('DROP TABLE IF EXISTS user_progress;');
  } catch (err) {
    console.log('Migration: Could not drop old user_progress table:', err);
  }

  // Create tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      totalScore INTEGER NOT NULL DEFAULT 0,
      weeklyScore INTEGER NOT NULL DEFAULT 0,
      monthlyScore INTEGER NOT NULL DEFAULT 0,
      xp INTEGER NOT NULL DEFAULT 0,
      rank TEXT NOT NULL,
      coins INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      lastPlayedDate TEXT,
      badges TEXT NOT NULL, -- Stored as JSON string
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      totalLevels INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      categoryId TEXT NOT NULL,
      level INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL, -- Stored as JSON string
      correctIndex INTEGER NOT NULL,
      explanation TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      category_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      is_unlocked INTEGER NOT NULL DEFAULT 0,
      high_score INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (category_id, level),
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS game_results (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      level INTEGER NOT NULL,
      score INTEGER NOT NULL,
      totalQuestions INTEGER NOT NULL,
      correctAnswers INTEGER NOT NULL,
      timeSpent INTEGER NOT NULL,
      playedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (categoryId) REFERENCES categories (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      score INTEGER NOT NULL,
      totalQuestions INTEGER NOT NULL,
      playedAt TEXT NOT NULL
    );
  `);

  // Seed Categories
  const categoryCountRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories;');
  if (categoryCountRow && categoryCountRow.count === 0) {
    const initialCategories: CategoryModel[] = [
      {
        id: 'history',
        name: 'Lịch sử',
        icon: 'book-outline',
        color: '#E74C3C',
        totalLevels: 3,
        description: 'Tìm hiểu về lịch sử hào hùng dựng nước và giữ nước của Việt Nam.',
      },
      {
        id: 'geography',
        name: 'Địa lý',
        icon: 'map-outline',
        color: '#2ECC71',
        totalLevels: 3,
        description: 'Khám phá các vùng miền, địa danh và danh lam thắng cảnh của Việt Nam.',
      },
      {
        id: 'culinary',
        name: 'Ẩm thực',
        icon: 'restaurant-outline',
        color: '#F1C40F',
        totalLevels: 3,
        description: 'Tìm hiểu về nét độc đáo trong văn hóa ẩm thực các vùng miền Việt Nam.',
      },
    ];

    for (const cat of initialCategories) {
      await db.runAsync(
        `INSERT INTO categories (id, name, icon, color, totalLevels, description) VALUES (?, ?, ?, ?, ?, ?);`,
        [cat.id, cat.name, cat.icon, cat.color, cat.totalLevels, cat.description]
      );
    }

    // Initialize user_progress for all categories and levels
    for (const cat of initialCategories) {
      for (let level = 1; level <= cat.totalLevels; level++) {
        const isUnlocked = level === 1 ? 1 : 0; // Only level 1 is unlocked by default
        await db.runAsync(
          `INSERT INTO user_progress (category_id, level, is_unlocked, high_score) VALUES (?, ?, ?, ?);`,
          [cat.id, level, isUnlocked, 0]
        );
      }
    }
  }

  // Seed Mock Questions
  // Clear existing questions to ensure updated mock questions are seeded fresh
  await db.execAsync('DELETE FROM questions;');

  const mockQuestions: QuestionModel[] = [
    // --- LỊCH SỬ - LEVEL 1 (EASY) ---
    {
      id: 'h1',
      categoryId: 'history',
      level: 1,
      difficulty: 'easy',
      question: 'Ai là vị vua đầu tiên của triều đại nhà Lý?',
      options: ['Lý Thái Tổ', 'Lý Thái Tông', 'Lý Thánh Tông', 'Lý Nhân Tông'],
      correctIndex: 0,
      explanation: 'Lý Thái Tổ (Lý Công Uẩn) là vị vua sáng lập ra vương triều nhà Lý vào năm 1009.',
    },
    {
      id: 'h2',
      categoryId: 'history',
      level: 1,
      difficulty: 'easy',
      question: 'Chiến thắng Điện Biên Phủ lẫy lừng năm châu diễn ra vào năm nào?',
      options: ['1945', '1954', '1968', '1975'],
      correctIndex: 1,
      explanation: 'Chiến thắng Điện Biên Phủ kết thúc thắng lợi vào ngày 7/5/1954.',
    },
    {
      id: 'h3',
      categoryId: 'history',
      level: 1,
      difficulty: 'easy',
      question: 'Chiến thắng Bạch Đằng năm 938 do ai lãnh đạo chống lại quân Nam Hán?',
      options: ['Ngô Quyền', 'Trần Hưng Đạo', 'Lê Hoàn', 'Đinh Bộ Lĩnh'],
      correctIndex: 0,
      explanation: 'Ngô Quyền đã lãnh đạo quân dân ta đánh bại quân Nam Hán trên sông Bạch Đằng năm 938.',
    },
    {
      id: 'h4',
      categoryId: 'history',
      level: 1,
      difficulty: 'easy',
      question: 'Vị anh hùng dân tộc nào gắn liền với chiến dịch đại phá quân Thanh vào dịp Tết Kỷ Dậu 1789?',
      options: ['Quang Trung - Nguyễn Huệ', 'Nguyễn Nhạc', 'Nguyễn Lữ', 'Gia Long'],
      correctIndex: 0,
      explanation: 'Hoàng đế Quang Trung (Nguyễn Huệ) lãnh đạo quân Tây Sơn hành quân thần tốc đại phá 29 vạn quân Thanh.',
    },
    {
      id: 'h5',
      categoryId: 'history',
      level: 1,
      difficulty: 'easy',
      question: 'Địa danh nào từng là kinh đô của Việt Nam dưới triều đại nhà Nguyễn?',
      options: ['Hà Nội', 'Huế', 'Hoa Lư', 'Cổ Loa'],
      correctIndex: 1,
      explanation: 'Huế là kinh đô của Việt Nam thống nhất dưới triều đại nhà Nguyễn từ năm 1802 đến năm 1945.',
    },
    {
      id: 'h6',
      categoryId: 'history',
      level: 1,
      difficulty: 'easy',
      question: 'Bành Hiệp định Geneve về đình chỉ chiến sự ở Việt Nam được ký kết vào năm nào?',
      options: ['1945', '1954', '1973', '1975'],
      correctIndex: 1,
      explanation: 'Hiệp định Geneve được ký kết vào ngày 21 tháng 7 năm 1954 sau chiến thắng Điện Biên Phủ lịch sử.',
    },
    {
      id: 'h7',
      categoryId: 'history',
      level: 1,
      difficulty: 'easy',
      question: 'Vị nữ tướng nào lãnh đạo cuộc khởi nghĩa chống quân Hán vào thế kỷ I?',
      options: ['Hai Bà Trưng', 'Bà Triệu', 'Lý Chiêu Hoàng', 'Nguyên phi Ỷ Lan'],
      correctIndex: 0,
      explanation: 'Hai Bà Trưng - Trưng Trắc và Trưng Nhị lãnh đạo cuộc khởi nghĩa chống quân Hán vào năm 40 TCN.',
    },
    {
      id: 'h8',
      categoryId: 'history',
      level: 1,
      difficulty: 'easy',
      question: 'Công viên nào được coi là "bức tường giữa ba dòng sông" trong lịch sử Việt Nam?',
      options: ['Cổ Loa', 'Thăng Long', 'Huế', 'Hoa Lư'],
      correctIndex: 0,
      explanation: 'Cổ Loa là pháo đài cổ của nước Âu Lạc được xây dựng dưới triều vua Thục Phán.',
    },

    // --- LỊCH SỬ - LEVEL 2 (MEDIUM) ---
    {
      id: 'h9',
      categoryId: 'history',
      level: 2,
      difficulty: 'medium',
      question: 'Ai là người lãnh đạo cuộc khởi nghĩa Lam Sơn chống quân Minh?',
      options: ['Lê Lợi', 'Nguyễn Trãi', 'Trần Hưng Đạo', 'Lê Hoàn'],
      correctIndex: 0,
      explanation: 'Lê Lợi là người khởi xướng và lãnh đạo cuộc khởi nghĩa Lam Sơn (1418 - 1427).',
    },
    {
      id: 'h10',
      categoryId: 'history',
      level: 2,
      difficulty: 'medium',
      question: 'Triều đại phong kiến nào trong lịch sử Việt Nam kéo dài lâu nhất?',
      options: ['Nhà Lý', 'Nhà Hậu Lê', 'Nhà Trần', 'Nhà Nguyễn'],
      correctIndex: 1,
      explanation: 'Nhà Hậu Lê (bao gồm Hậu Lê sơ và Lê trung hưng) kéo dài lâu nhất (355 năm).',
    },
    {
      id: 'h11',
      categoryId: 'history',
      level: 2,
      difficulty: 'medium',
      question: 'Nữ hoàng đầu tiên và duy nhất trong lịch sử phong kiến Việt Nam là ai?',
      options: ['Hai Bà Trưng', 'Bà Triệu', 'Lý Chiêu Hoàng', 'Nguyên phi Ỷ Lan'],
      correctIndex: 2,
      explanation: 'Lý Chiêu Hoàng là vị hoàng đế thứ 9 và cuối cùng của nhà Lý, cũng là nữ hoàng duy nhất.',
    },
    {
      id: 'h12',
      categoryId: 'history',
      level: 2,
      difficulty: 'medium',
      question: 'Bản tuyên ngôn độc lập đầu tiên của Việt Nam được cho là tác phẩm nào?',
      options: ['Nam quốc sơn hà', 'Bình Ngô đại cáo', 'Tuyên ngôn Độc lập', 'Hịch tướng sĩ'],
      correctIndex: 0,
      explanation: 'Bài thơ "Nam quốc sơn hà" của Lý Thường Kiệt được coi là bản tuyên ngôn độc lập đầu tiên.',
    },
    {
      id: 'h13',
      categoryId: 'history',
      level: 2,
      difficulty: 'medium',
      question: 'Vị vua nào đã quyết định dời đô từ Hoa Lư về Đại La vào năm 1010?',
      options: ['Lý Thái Tổ', 'Lý Thái Tông', 'Đinh Tiên Hoàng', 'Lê Đại Hành'],
      correctIndex: 0,
      explanation: 'Năm 1010, vua Lý Thái Tổ dời đô về Đại La và đổi tên thành Thăng Long.',
    },
    {
      id: 'h14',
      categoryId: 'history',
      level: 2,
      difficulty: 'medium',
      question: 'Trận đánh nào được coi là điểm ngoặt quyết định trong kháng chiến chống Pháp?',
      options: ['Đông Kinh', 'Tây Nguyên', 'Điện Biên Phủ', 'Quảng Trị'],
      correctIndex: 2,
      explanation: 'Chiến thắng Điện Biên Phủ năm 1954 là điểm ngoặt quyết định trong kháng chiến chống Pháp.',
    },

    // --- LỊCH SỬ - LEVEL 3 (HARD) ---
    {
      id: 'h15',
      categoryId: 'history',
      level: 3,
      difficulty: 'hard',
      question: 'Trưởng Cung là vị vua của triều đại nào?',
      options: ['Nhà Trần', 'Nhà Hậu Lê', 'Nhà Tây Sơn', 'Nhà Nguyễn'],
      correctIndex: 0,
      explanation: 'Trưởng Cung là một vị vua của triều đại nhà Trần.',
    },
    {
      id: 'h16',
      categoryId: 'history',
      level: 3,
      difficulty: 'hard',
      question: 'Nguyên lý "Thiên hạ không thể không có chủ" xuất phát từ lý thuyết của ai?',
      options: ['Lê Thễ', 'Nguyễn Trãi', 'Tô Nữ Thận Vân', 'Hoàng Tôn'],
      correctIndex: 1,
      explanation: 'Nguyễn Trãi là nhà tư tưởng gia nổi tiếng đã nêu ra nhiều nguyên lý chính trị quan trọng.',
    },
    {
      id: 'h17',
      categoryId: 'history',
      level: 3,
      difficulty: 'hard',
      question: 'Sự kiện lịch sử nào xảy ra năm 1407?',
      options: ['Mở rộng về phương Nam', 'Chiến thắng Điện Biên Phủ', 'Quân Minh chiếm lĩnh', 'Khởi nghĩa Lam Sơn'],
      correctIndex: 2,
      explanation: 'Năm 1407, quân Minh chiếm lĩnh Đại Việt sau cuộc xâm lược, kéo dài 20 năm.',
    },

    // --- ĐỊA LÝ - LEVEL 1 (EASY) ---
    {
      id: 'g1',
      categoryId: 'geography',
      level: 1,
      difficulty: 'easy',
      question: 'Đỉnh núi nào được mệnh danh là nóc nhà của Đông Dương?',
      options: ['Phan Xi Păng', 'Bạch Mã', 'Tây Côn Lĩnh', 'Yên Tử'],
      correctIndex: 0,
      explanation: 'Đỉnh Phan Xi Păng cao 3.143 mét là đỉnh núi cao nhất Việt Nam.',
    },
    {
      id: 'g2',
      categoryId: 'geography',
      level: 1,
      difficulty: 'easy',
      question: 'Hồ nước ngọt tự nhiên lớn nhất Việt Nam nằm ở tỉnh nào?',
      options: ['Lâm Đồng', 'Bắc Kạn', 'Đắk Lắk', 'Hà Nội'],
      correctIndex: 1,
      explanation: 'Hồ Ba Bể nằm ở tỉnh Bắc Kạn là hồ nước ngọt tự nhiên lớn nhất Việt Nam.',
    },
    {
      id: 'g3',
      categoryId: 'geography',
      level: 1,
      difficulty: 'easy',
      question: 'Đảo nào là hòn đảo lớn nhất Việt Nam?',
      options: ['Đảo Phú Quý', 'Đảo Phú Quốc', 'Đảo Cát Bà', 'Đảo Côn Sơn'],
      correctIndex: 1,
      explanation: 'Đảo Phú Quốc thuộc tỉnh Kiên Giang là hòn đảo có diện tích lớn nhất Việt Nam.',
    },
    {
      id: 'g4',
      categoryId: 'geography',
      level: 1,
      difficulty: 'easy',
      question: 'Thành phố nào trực thuộc trung ương lớn nhất nước ta về mặt dân số?',
      options: ['Hà Nội', 'Thành phố Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng'],
      correctIndex: 1,
      explanation: 'Thành phố Hồ Chí Minh là thành phố đông dân nhất Việt Nam.',
    },
    {
      id: 'g5',
      categoryId: 'geography',
      level: 1,
      difficulty: 'easy',
      question: 'Vịnh biển nào của Việt Nam được UNESCO công nhận là Di sản thiên nhiên thế giới?',
      options: ['Vịnh Nha Trang', 'Vịnh Hạ Long', 'Vịnh Lăng Cô', 'Vịnh Xuân Đài'],
      correctIndex: 1,
      explanation: 'Vịnh Hạ Long đã được UNESCO vinh danh là Di sản thiên nhiên thế giới.',
    },
    {
      id: 'g6',
      categoryId: 'geography',
      level: 1,
      difficulty: 'easy',
      question: 'Đèo nào nối liền giữa tỉnh Thừa Thiên Huế và thành phố Đà Nẵng?',
      options: ['Đèo Hải Vân', 'Đèo Cả', 'Đèo Ngang', 'Đèo Ngoạn Mục'],
      correctIndex: 0,
      explanation: 'Đèo Hải Vân nối liền Thừa Thiên Huế và Đà Nẵng, nổi tiếng với phong cảnh kỳ vĩ.',
    },
    {
      id: 'g7',
      categoryId: 'geography',
      level: 1,
      difficulty: 'easy',
      question: 'Tuyến đường bộ nào chạy xuyên Việt từ Bắc tới Nam?',
      options: ['Đường bộ 1A', 'Đường bộ 1', 'Đường bộ 1B', 'Đường bộ 5'],
      correctIndex: 1,
      explanation: 'Quốc lộ 1 là tuyến đường bộ chạy xuyên Việt từ Hà Nội đến Cà Mau.',
    },
    {
      id: 'g8',
      categoryId: 'geography',
      level: 1,
      difficulty: 'easy',
      question: 'Dải đất hẹp nối Hà Tĩnh với Quảng Bình được gọi là gì?',
      options: ['Dải Đất Thiếp', 'Dải Đất Hẹp Giao Ranh', 'Dải Đất Quân Sự', 'Đèo Cửa Lò'],
      correctIndex: 0,
      explanation: 'Dải Đất Thiếp là dải đất hẹp nằm giữa Hà Tĩnh và Quảng Bình.',
    },

    // --- ĐỊA LÝ - LEVEL 2 (MEDIUM) ---
    {
      id: 'g9',
      categoryId: 'geography',
      level: 2,
      difficulty: 'medium',
      question: 'Tỉnh nào có diện tích lớn nhất nước ta?',
      options: ['Thanh Hóa', 'Nghệ An', 'Gia Lai', 'Sơn La'],
      correctIndex: 1,
      explanation: 'Nghệ An là tỉnh có diện tích lớn nhất Việt Nam với diện tích khoảng 16.490 km².',
    },
    {
      id: 'g10',
      categoryId: 'geography',
      level: 2,
      difficulty: 'medium',
      question: 'Con sông nào dài nhất chảy hoàn toàn trên lãnh thổ Việt Nam?',
      options: ['Sông Hồng', 'Sông Đà', 'Sông Đồng Nai', 'Sông Mê Kông'],
      correctIndex: 2,
      explanation: 'Sông Đồng Nai là con sông nội địa dài nhất Việt Nam với chiều dài khoảng 586 km.',
    },
    {
      id: 'g11',
      categoryId: 'geography',
      level: 2,
      difficulty: 'medium',
      question: 'Điểm cực Bắc phần đất liền của nước ta thuộc tỉnh nào?',
      options: ['Hà Giang', 'Cao Bằng', 'Lào Cai', 'Lai Châu'],
      correctIndex: 0,
      explanation: 'Cột cờ Lũng Cú thuộc tỉnh Hà Giang là điểm cực Bắc phần đất liền.',
    },
    {
      id: 'g12',
      categoryId: 'geography',
      level: 2,
      difficulty: 'medium',
      question: 'Thác nước nào ở Việt Nam là thác nước lớn thứ tư thế giới?',
      options: ['Thác Cam Ly', 'Thác Bản Giốc', 'Thác Pongour', 'Thác Dray Nur'],
      correctIndex: 1,
      explanation: 'Thác Bản Giốc nằm giữa biên giới Việt Nam và Trung Quốc là thác nước lớn thứ tư thế giới.',
    },
    {
      id: 'g13',
      categoryId: 'geography',
      level: 2,
      difficulty: 'medium',
      question: 'Tỉnh nào có đường bờ biển dài nhất Việt Nam?',
      options: ['Khánh Hòa', 'Quảng Ninh', 'Bình Thuận', 'Cà Mau'],
      correctIndex: 0,
      explanation: 'Khánh Hòa là tỉnh có bờ biển dài nhất Việt Nam với chiều dài khoảng 385 km.',
    },
    {
      id: 'g14',
      categoryId: 'geography',
      level: 2,
      difficulty: 'medium',
      question: 'Khu vực Đông Nam Bộ có mặt bằng cao bao nhiêu mét?',
      options: ['Dưới 100m', 'Từ 100-500m', 'Từ 500-1000m', 'Trên 1000m'],
      correctIndex: 0,
      explanation: 'Mặt bằng Đông Nam Bộ khá bằng phẳng với độ cao dưới 100m.',
    },

    // --- ĐỊA LÝ - LEVEL 3 (HARD) ---
    {
      id: 'g15',
      categoryId: 'geography',
      level: 3,
      difficulty: 'hard',
      question: 'Dòng nước lạnh nào ảnh hưởng lớn đến khí hậu của Việt Nam?',
      options: ['Dòng nước Hoàn Lưu Xích Đạo', 'Dòng nước lạnh từ Trung Quốc', 'Dòng nước Kuroshio', 'Dòng nước từ Ấn Độ Dương'],
      correctIndex: 2,
      explanation: 'Dòng nước Kuroshio ảnh hưởng lớn đến khí hậu và mực nước biển Việt Nam.',
    },
    {
      id: 'g16',
      categoryId: 'geography',
      level: 3,
      difficulty: 'hard',
      question: 'Lưu vực sông Hồng chiếm bao nhiêu phần trăm diện tích lãnh thổ Việt Nam?',
      options: ['25%', '35%', '45%', '55%'],
      correctIndex: 1,
      explanation: 'Lưu vực sông Hồng chiếm khoảng 35% diện tích lãnh thổ Việt Nam.',
    },
    {
      id: 'g17',
      categoryId: 'geography',
      level: 3,
      difficulty: 'hard',
      question: 'Bao nhiêu tỉnh/thành phố trực thuộc trung ương hiện nay ở Việt Nam?',
      options: ['60', '63', '68', '75'],
      correctIndex: 1,
      explanation: 'Hiện nay Việt Nam có 63 tỉnh/thành phố trực thuộc trung ương.',
    },

    // --- ẨM THỰC - LEVEL 1 (EASY) ---
    {
      id: 'c1',
      categoryId: 'culinary',
      level: 1,
      difficulty: 'easy',
      question: 'Món ăn nào sau đây là đặc sản nổi tiếng của Hà Nội thường ăn kèm chả và bún?',
      options: ['Bún đậu mắm tôm', 'Bún chả', 'Phở bò', 'Bánh cuốn'],
      correctIndex: 1,
      explanation: 'Bún chả là món đặc sản nổi tiếng của Hà Nội với những miếng chả nướng thơm ngon.',
    },
    {
      id: 'c2',
      categoryId: 'culinary',
      level: 1,
      difficulty: 'easy',
      question: 'Món bánh truyền thống nào được coi là quốc hồn quốc túy của Việt Nam vào dịp Tết Nguyên Đán?',
      options: ['Bánh chưng', 'Bánh giầy', 'Bánh tét', 'Bánh trôi'],
      correctIndex: 0,
      explanation: 'Bánh chưng là món bánh truyền thống từ thời vua Hùng, tượng trưng cho Đất.',
    },
    {
      id: 'c3',
      categoryId: 'culinary',
      level: 1,
      difficulty: 'easy',
      question: 'Bún chả cá là đặc sản nổi tiếng của thành phố ven biển nào miền Trung?',
      options: ['Nha Trang', 'Hạ Long', 'Vũng Tàu', 'Rạch Giá'],
      correctIndex: 0,
      explanation: 'Nha Trang nổi tiếng với món bún chả cá thơm ngọt được làm từ các loại cá biển tươi ngon.',
    },
    {
      id: 'c4',
      categoryId: 'culinary',
      level: 1,
      difficulty: 'easy',
      question: 'Tỉnh nào được mệnh danh là xứ sở dừa của Việt Nam?',
      options: ['Bến Tre', 'Trà Vinh', 'Bình Định', 'Bình Dương'],
      correctIndex: 0,
      explanation: 'Bến Tre nổi tiếng là xứ dừa với diện tích trồng dừa lớn nhất cả nước.',
    },
    {
      id: 'c5',
      categoryId: 'culinary',
      level: 1,
      difficulty: 'easy',
      question: 'Hạt tiêu nổi tiếng của Việt Nam thường được trồng và sản xuất nhiều nhất ở đảo nào?',
      options: ['Đảo Phú Quốc', 'Đảo Phú Quý', 'Đảo Cô Tô', 'Đảo Lý Sơn'],
      correctIndex: 0,
      explanation: 'Hạt tiêu Phú Quốc nổi tiếng bởi vị thơm và cay nồng đậm đà.',
    },
    {
      id: 'c6',
      categoryId: 'culinary',
      level: 1,
      difficulty: 'easy',
      question: 'Món ăn nào được cuốn bằng bánh tráng, bên trong có rau sống, bún, tôm, thịt luộc?',
      options: ['Gỏi cuốn', 'Nem rán', 'Phở cuốn', 'Bánh xèo'],
      correctIndex: 0,
      explanation: 'Gỏi cuốn là món ăn truyền thống được quốc tế yêu thích nhờ độ thanh mát.',
    },
    {
      id: 'c7',
      categoryId: 'culinary',
      level: 1,
      difficulty: 'easy',
      question: 'Phở được coi là món ăn quốc hồn quốc túy của Việt Nam đến từ vùng nào?',
      options: ['Hà Nội', 'Sài Gòn', 'Huế', 'Đà Nẵng'],
      correctIndex: 0,
      explanation: 'Phở có nguồn gốc từ Hà Nội, được tạo thành từ kết hợp ẩm thực Pháp và Việt.',
    },
    {
      id: 'c8',
      categoryId: 'culinary',
      level: 1,
      difficulty: 'easy',
      question: 'Canh chua cá lóc là món ăn mang đậm hương vị ẩm thực vùng miền nào?',
      options: ['Miền Bắc', 'Miền Trung', 'Miền Nam', 'Tây Bắc'],
      correctIndex: 2,
      explanation: 'Canh chua cá lóc với vị chua ngọt đặc trưng của me là món ăn quen thuộc của ẩm thực Nam Bộ.',
    },

    // --- ẨM THỰC - LEVEL 2 (MEDIUM) ---
    {
      id: 'c9',
      categoryId: 'culinary',
      level: 2,
      difficulty: 'medium',
      question: 'Loại quả nào nổi tiếng của Lục Ngạn, Bắc Giang có vị ngọt đậm đà?',
      options: ['Nhãn lồng', 'Vải thiều', 'Bưởi diễn', 'Mận hậu'],
      correctIndex: 1,
      explanation: 'Vải thiều Lục Ngạn nổi tiếng nhờ quả to, cùi dày, mọng nước và ngọt đậm đà.',
    },
    {
      id: 'c10',
      categoryId: 'culinary',
      level: 2,
      difficulty: 'medium',
      question: 'Chả cá Lã Vọng là món ăn nổi tiếng có nguồn gốc từ địa phương nào?',
      options: ['Hải Phòng', 'Hà Nội', 'Đà Nẵng', 'Huế'],
      correctIndex: 1,
      explanation: 'Chả cá Lã Vọng là món ăn tinh túy lâu đời của người Hà Nội.',
    },
    {
      id: 'c11',
      categoryId: 'culinary',
      level: 2,
      difficulty: 'medium',
      question: 'Món ăn nào của Hội An có sợi mì màu vàng nhạt, ăn kèm thịt xá xíu, tôm?',
      options: ['Mì Quảng', 'Cao lầu', 'Hủ tiếu', 'Bún bò'],
      correctIndex: 1,
      explanation: 'Cao lầu là món ăn đặc sắc của phố cổ Hội An với sợi mì được làm từ nước tro giếng cổ.',
    },
    {
      id: 'c12',
      categoryId: 'culinary',
      level: 2,
      difficulty: 'medium',
      question: 'Mì Quảng là đặc sản nổi tiếng của vùng nào ở Việt Nam?',
      options: ['Bắc Giang', 'Quảng Nam', 'Thái Nguyên', 'Bắc Ninh'],
      correctIndex: 1,
      explanation: 'Mì Quảng là đặc sản nổi tiếng của tỉnh Quảng Nam, miền Trung Việt Nam.',
    },
    {
      id: 'c13',
      categoryId: 'culinary',
      level: 2,
      difficulty: 'medium',
      question: 'Hủ tiếu Mỹ Tho là đặc sản nổi tiếng của vùng nào?',
      options: ['Tiền Giang', 'Long An', 'Đồng Tháp', 'Vĩnh Long'],
      correctIndex: 0,
      explanation: 'Hủ tiếu Mỹ Tho có nguồn gốc từ thành phố Mỹ Tho, tỉnh Tiền Giang.',
    },
    {
      id: 'c14',
      categoryId: 'culinary',
      level: 2,
      difficulty: 'medium',
      question: 'Mắm tôm là nước chấm đặc trưng của vùng ẩm thực nào?',
      options: ['Miền Bắc', 'Miền Trung', 'Miền Nam', 'Tây Nguyên'],
      correctIndex: 0,
      explanation: 'Mắm tôm là nước chấm đặc trưng của ẩm thực Hà Nội, miền Bắc Việt Nam.',
    },

    // --- ẨM THỰC - LEVEL 3 (HARD) ---
    {
      id: 'c15',
      categoryId: 'culinary',
      level: 3,
      difficulty: 'hard',
      question: 'Món cơm nào là đặc sản trứ danh của vùng Tây Nguyên, nấu chín trong ống tre?',
      options: ['Cơm lam', 'Cơm hến', 'Cơm tấm', 'Cơm cháy'],
      correctIndex: 0,
      explanation: 'Cơm lam là đặc sản vùng cao, gạo nếp được cho vào ống tre rồi nướng chín.',
    },
    {
      id: 'c16',
      categoryId: 'culinary',
      level: 3,
      difficulty: 'hard',
      question: 'Xôi gấc là món ăn truyền thống được chế biến từ nguyên liệu nào chính?',
      options: ['Gạo nếp + gấc', 'Gạo tẻ + gấc', 'Gạo lứt + gấc', 'Gạo mạch + gấc'],
      correctIndex: 0,
      explanation: 'Xôi gấc được chế biến từ gạo nếp được nhuộm màu đỏ từ quả gấc.',
    },
    {
      id: 'c17',
      categoryId: 'culinary',
      level: 3,
      difficulty: 'hard',
      question: 'Cua Huế được coi là nổi tiếng vì đặc điểm nào?',
      options: ['Thịt sệt, dậu vị', 'Vỏ cứng', 'Kích thước nhỏ', 'Màu sắc đặc biệt'],
      correctIndex: 0,
      explanation: 'Cua Huế nổi tiếng vì thịt sệt, dậu vị ngon, là nguyên liệu để làm nhiều món ăn.',
    },
  ];

  for (const q of mockQuestions) {
    await db.runAsync(
      `INSERT INTO questions (id, categoryId, level, difficulty, question, options, correctIndex, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        q.id,
        q.categoryId,
        q.level,
        q.difficulty,
        q.question,
        JSON.stringify(q.options),
        q.correctIndex,
        q.explanation,
      ]
    );
  }

  return db;
}

/**
 * CRUD helper functions for the Users table.
 */
export const UserHelpers = {
  async insertUser(user: UserModel): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO users (id, username, email, totalScore, weeklyScore, monthlyScore, xp, rank, coins, streak, lastPlayedDate, badges, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        user.id,
        user.username,
        user.email,
        user.totalScore,
        user.weeklyScore,
        user.monthlyScore,
        user.xp,
        user.rank,
        user.coins,
        user.streak,
        user.lastPlayedDate,
        JSON.stringify(user.badges),
        user.createdAt,
      ]
    );
  },

  async updateUser(user: UserModel): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `UPDATE users SET username = ?, email = ?, totalScore = ?, weeklyScore = ?, monthlyScore = ?, xp = ?, rank = ?, coins = ?, streak = ?, lastPlayedDate = ?, badges = ?, createdAt = ?
       WHERE id = ?;`,
      [
        user.username,
        user.email,
        user.totalScore,
        user.weeklyScore,
        user.monthlyScore,
        user.xp,
        user.rank,
        user.coins,
        user.streak,
        user.lastPlayedDate,
        JSON.stringify(user.badges),
        user.createdAt,
        user.id,
      ]
    );
  },

  async getUserById(id: string): Promise<UserModel | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<any>(`SELECT * FROM users WHERE id = ?;`, [id]);
    if (!row) return null;
    return {
      ...row,
      badges: JSON.parse(row.badges),
    };
  },

  async getAllUsers(): Promise<UserModel[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<any>(`SELECT * FROM users;`);
    return rows.map((row) => ({
      ...row,
      badges: JSON.parse(row.badges),
    }));
  },
};

/**
 * CRUD helper functions for the Categories table.
 */
export const CategoryHelpers = {
  async insertCategory(category: CategoryModel): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO categories (id, name, icon, color, totalLevels, description) VALUES (?, ?, ?, ?, ?, ?);`,
      [category.id, category.name, category.icon, category.color, category.totalLevels, category.description]
    );
  },

  async updateCategory(category: CategoryModel): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `UPDATE categories SET name = ?, icon = ?, color = ?, totalLevels = ?, description = ? WHERE id = ?;`,
      [category.name, category.icon, category.color, category.totalLevels, category.description, category.id]
    );
  },

  async getCategoryById(id: string): Promise<CategoryModel | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<CategoryModel>(`SELECT * FROM categories WHERE id = ?;`, [id]);
    return row || null;
  },

  async getAllCategories(): Promise<CategoryModel[]> {
    const db = await getDB();
    return await db.getAllAsync<CategoryModel>(`SELECT * FROM categories;`);
  },
};

/**
 * CRUD helper functions for the Questions table.
 */
export const QuestionHelpers = {
  async insertQuestion(question: QuestionModel): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO questions (id, categoryId, level, difficulty, question, options, correctIndex, explanation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        question.id,
        question.categoryId,
        question.level,
        question.difficulty,
        question.question,
        JSON.stringify(question.options),
        question.correctIndex,
        question.explanation,
      ]
    );
  },

  async updateQuestion(question: QuestionModel): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `UPDATE questions SET categoryId = ?, level = ?, difficulty = ?, question = ?, options = ?, correctIndex = ?, explanation = ?
       WHERE id = ?;`,
      [
        question.categoryId,
        question.level,
        question.difficulty,
        question.question,
        JSON.stringify(question.options),
        question.correctIndex,
        question.explanation,
        question.id,
      ]
    );
  },

  async getQuestionById(id: string): Promise<QuestionModel | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<any>(`SELECT * FROM questions WHERE id = ?;`, [id]);
    if (!row) return null;
    return {
      ...row,
      options: JSON.parse(row.options),
    };
  },

  async getQuestionsByCategory(categoryId: string): Promise<QuestionModel[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<any>(`SELECT * FROM questions WHERE categoryId = ?;`, [categoryId]);
    return rows.map((row) => ({
      ...row,
      options: JSON.parse(row.options),
    }));
  },

  async getQuestionsByCategoryAndLevel(categoryId: string, level: number): Promise<QuestionModel[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<any>(`SELECT * FROM questions WHERE categoryId = ? AND level = ?;`, [categoryId, level]);
    return rows.map((row) => ({
      ...row,
      options: JSON.parse(row.options),
    }));
  },

  async getQuestionsByCategoryAndLevelShuffled(categoryId: string, level: number, limit: number = 5): Promise<QuestionModel[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<any>(`SELECT * FROM questions WHERE categoryId = ? AND level = ?;`, [categoryId, level]);
    const questions = rows.map((row) => ({
      ...row,
      options: JSON.parse(row.options),
    }));

    // Shuffle array
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Return limited questions
    return shuffled.slice(0, Math.min(limit, shuffled.length));
  },
};

/**
 * CRUD helper functions for the UserProgress table (new schema).
 */
export const UserProgressHelpers = {
  async getLevelProgress(categoryId: string, level: number): Promise<{ is_unlocked: number; high_score: number } | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<any>(`SELECT is_unlocked, high_score FROM user_progress WHERE category_id = ? AND level = ?;`, [categoryId, level]);
    return row || null;
  },

  async unlockLevel(categoryId: string, level: number): Promise<void> {
    const db = await getDB();
    console.log(`Database: Unlocking level ${level} for category ${categoryId}`);
    try {
      // Sử dụng INSERT OR REPLACE: Nếu chưa có dòng (category_id, level) thì tạo mới, nếu có rồi thì ghi đè trạng thái is_unlocked = 1
      await db.runAsync(
        `INSERT OR REPLACE INTO user_progress (category_id, level, is_unlocked, high_score) 
         VALUES (?, ?, 1, COALESCE((SELECT high_score FROM user_progress WHERE category_id = ? AND level = ?), 0));`,
        [categoryId, level, categoryId, level]
      );
      console.log(`Database: Level ${level} unlocked successfully in disk`);
    } catch (err) {
      console.error('Database: Error unlocking level:', err);
      throw err;
    }
  },

  async updateHighScore(categoryId: string, level: number, score: number): Promise<void> {
    const db = await getDB();
    const current = await db.getFirstAsync<any>(`SELECT high_score FROM user_progress WHERE category_id = ? AND level = ?;`, [categoryId, level]);
    const newHighScore = current && current.high_score > score ? current.high_score : score;
    await db.runAsync(
      `UPDATE user_progress SET high_score = ? WHERE category_id = ? AND level = ?;`,
      [newHighScore, categoryId, level]
    );
  },

  async getCategoryLevelStatus(categoryId: string): Promise<Array<{ level: number; is_unlocked: number; high_score: number }>> {
    const db = await getDB();
    console.log(`Database: Fetching level status for category ${categoryId}`);
    const rows = await db.getAllAsync<any>(`SELECT level, is_unlocked, high_score FROM user_progress WHERE category_id = ? ORDER BY level ASC;`, [categoryId]);
    console.log(`Database: Fetched rows:`, rows);
    return rows;
  },
};

/**
 * CRUD helper functions for the GameResults table.
 */
export const GameResultHelpers = {
  async insertGameResult(result: GameResultModel): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO game_results (id, userId, categoryId, level, score, totalQuestions, correctAnswers, timeSpent, playedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        result.id,
        result.userId,
        result.categoryId,
        result.level,
        result.score,
        result.totalQuestions,
        result.correctAnswers,
        result.timeSpent,
        result.playedAt,
      ]
    );
  },

  async getGameResultById(id: string): Promise<GameResultModel | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<GameResultModel>(`SELECT * FROM game_results WHERE id = ?;`, [id]);
    return row || null;
  },

  async getGameResultsByUserId(userId: string): Promise<GameResultModel[]> {
    const db = await getDB();
    return await db.getAllAsync<GameResultModel>(`SELECT * FROM game_results WHERE userId = ?;`, [userId]);
  },

  async getGameResultsByCategory(categoryId: string): Promise<GameResultModel[]> {
    const db = await getDB();
    return await db.getAllAsync<GameResultModel>(`SELECT * FROM game_results WHERE categoryId = ?;`, [categoryId]);
  },
};

/**
 * Helper functions for Local Leaderboard and Score Tracking.
 */
export async function saveQuizScore(
  username: string,
  categoryId: string,
  score: number,
  totalQuestions: number
): Promise<void> {
  const db = await getDB();
  const playedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO scores (username, categoryId, score, totalQuestions, playedAt) VALUES (?, ?, ?, ?, ?);`,
    [username, categoryId, score, totalQuestions, playedAt]
  );
}

export async function getTopScores(limit: number): Promise<ScoreModel[]> {
  const db = await getDB();
  return await db.getAllAsync<ScoreModel>(
    `SELECT * FROM scores ORDER BY score DESC, playedAt DESC LIMIT ?;`,
    [limit]
  );
}
