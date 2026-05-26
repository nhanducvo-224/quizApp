import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleProp,
  ViewStyle,
  TextStyle,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { QuestionHelpers, UserProgressHelpers, saveQuizScore } from '../database/db';
import { QuestionModel } from '../models';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryDetail'>;

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function CategoryDetailScreen({ route, navigation }: Props) {
  const { categoryId, categoryName, level } = route.params;

  // Game States
  const [questions, setQuestions] = useState<QuestionModel[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [quizState, setQuizState] = useState<'loading' | 'idle' | 'answered' | 'timeout' | 'summary' | 'error'>('loading');
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [username, setUsername] = useState<string>('');
  const [scoreSaved, setScoreSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Animation Refs
  const timerAnim = useRef(new Animated.Value(1)).current;
  const questionFadeAnim = useRef(new Animated.Value(0)).current;
  const successFadeAnim = useRef(new Animated.Value(0)).current;
  const activeAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressSavedRef = useRef<boolean>(false);

  // Hide default react navigation header
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Load questions from SQLite DB (5 câu shuffle theo đúng level)
  const loadQuestions = async () => {
    try {
      setQuizState('loading');
      setSelectedOptionIndex(null);
      setCurrentQuestionIndex(0);
      setScore(0);
      setTimeLeft(30);
      setUsername('');
      setScoreSaved(false);
      setIsSaving(false);

      const fetched = await QuestionHelpers.getQuestionsByCategoryAndLevelShuffled(categoryId, level, 5);
      if (fetched.length === 0) {
        setQuizState('error');
        return;
      }

      setQuestions(fetched);
      setQuizState('idle');
    } catch (err) {
      console.error('Lỗi khi tải câu hỏi:', err);
      setQuizState('error');
    }
  };

  useEffect(() => {
    loadQuestions();
    progressSavedRef.current = false;
  }, [categoryId, level]);

  // Handle progress saving when game reaches summary state
  useEffect(() => {
    if (quizState !== 'summary') return;
    if (progressSavedRef.current) return;
    progressSavedRef.current = true;

    const totalQuestions = questions.length;
    const passed = score >= 3; // >= 60% (3/5)

    const saveProgress = async () => {
      try {
        console.log('Saving progress for category:', categoryId, 'level:', level, 'score:', score);
        await UserProgressHelpers.updateHighScore(categoryId, level, score);
        console.log('High score updated');
        
        if (passed) {
          const nextLevel = level + 1;
          console.log('Unlocking level:', nextLevel);
          await UserProgressHelpers.unlockLevel(categoryId, nextLevel);
          console.log('Level unlocked successfully');
          
          const percentage = Math.round((score / totalQuestions) * 100);
          Alert.alert(
            '🎉 Chúc mừng!',
            `Xuất sắc! Bạn đã vượt qua Cấp ${level} với ${score}/${totalQuestions} câu đúng (${percentage}%)!\n\nCấp ${nextLevel} đã được mở khóa!`,
            [{ text: 'Tuyệt vời!', style: 'default' }]
          );
        }
      } catch (err) {
        console.error('Lỗi khi lưu tiến độ:', err);
      }
    };
    saveProgress();
  }, [quizState, categoryId, level, score, questions.length]);

  // Handle countdown timer
  const startTimer = () => {
    // Clear any previous interval and animation
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (activeAnimationRef.current) {
      activeAnimationRef.current.stop();
    }

    setTimeLeft(30);
    timerAnim.setValue(1);

    // Animate progress bar from 100% (1) to 0% (0) over 30 seconds
    const anim = Animated.timing(timerAnim, {
      toValue: 0,
      duration: 30000,
      useNativeDriver: false,
    });
    activeAnimationRef.current = anim;
    anim.start();

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          timerIntervalRef.current = null;
          setQuizState('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Manage timer and question transition fade-in
  useEffect(() => {
    if (quizState === 'idle' && questions.length > 0) {
      // Fade in current question card
      questionFadeAnim.setValue(0);
      Animated.timing(questionFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      startTimer();
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (activeAnimationRef.current) {
        activeAnimationRef.current.stop();
      }
    };
  }, [currentQuestionIndex, quizState === 'idle', questions]);

  // Handle Option Tap
  const handleSelectOption = (optionIndex: number) => {
    if (quizState !== 'idle') return;

    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (activeAnimationRef.current) {
      activeAnimationRef.current.stop();
    }

    setSelectedOptionIndex(optionIndex);
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = optionIndex === currentQuestion.correctIndex;

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setQuizState('answered');

      // Trigger brief success animation
      successFadeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(successFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.timing(successFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Automatically advance to next question after 1.5 seconds
      setTimeout(() => {
        handleNextQuestion();
      }, 1500);
    } else {
      setQuizState('answered');
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setSelectedOptionIndex(null);
      setCurrentQuestionIndex((prev) => prev + 1);
      setQuizState('idle');
    } else {
      setQuizState('summary');
    }
  };

  const handleSaveScore = async () => {
    try {
      setIsSaving(true);
      const displayName = username.trim() || 'Người chơi ẩn danh';
      const totalQuestions = questions.length;
      
      await saveQuizScore(displayName, categoryId, score, totalQuestions);
      
      setScoreSaved(true);
      setUsername('');
      Alert.alert(
        'Thành công! 🎉',
        `Điểm số của bạn đã được lưu với tên "${displayName}".`,
        [{ text: 'OK', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Lỗi khi lưu điểm số:', error);
      Alert.alert('Lỗi', 'Không thể lưu điểm số. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  // UI Render Helpers
  if (quizState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFCD00" />
        <Text style={styles.loadingText}>Đang tải câu hỏi...</Text>
      </View>
    );
  }

  if (quizState === 'error' || questions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Không tìm thấy câu hỏi cho chủ đề này.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Quay lại trang chủ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (quizState === 'summary') {
    const totalQuestions = questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = score >= 3; // >= 60% (3/5)

    // Performance badge message (dựa trên 5 câu)
    let performanceBadge = 'Cố gắng hơn nhé! 💪';
    let performanceSub = 'Hãy thử luyện tập thêm để nâng cao kiến thức.';
    if (score === totalQuestions) {
      performanceBadge = 'Tuyệt đỉnh vô song! 🏆';
      performanceSub = 'Bạn đã trả lời đúng tất cả các câu hỏi!';
    } else if (score >= 4) {
      performanceBadge = 'Xuất sắc! 🌟';
      performanceSub = 'Kiến thức của bạn thực sự đáng nể!';
    } else if (score >= 3) {
      performanceBadge = 'Khá lắm! 👍';
      performanceSub = `Bạn đã vượt qua Cấp ${level}! Cố lên nhé!`;
    }

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.summaryScroll}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Kết Quả Quiz</Text>
            <Text style={styles.summaryCategory}>{categoryName}</Text>
            
            {/* Beautiful Circular Score View */}
            <View style={styles.circleScoreOuter}>
              <View style={[styles.circleScoreInner, { borderColor: passed ? '#2ECC71' : '#DA251D' }]}>
                <Text style={styles.scoreText}>{score}/{totalQuestions}</Text>
                <Text style={styles.scorePercentText}>{percentage}% Đúng</Text>
              </View>
            </View>

            <Text style={styles.performanceBadgeText}>{performanceBadge}</Text>
            <Text style={styles.performanceSubText}>{performanceSub}</Text>
          </View>

          {/* Save Score Section */}
          {!scoreSaved && (
            <View style={styles.saveScoreContainer}>
              <Text style={styles.saveScoreTitle}>💾 Lưu kỷ lục của bạn</Text>
              
              <TextInput
                style={styles.usernameInput}
                placeholder="Nhập tên của bạn (không bắt buộc)"
                placeholderTextColor="#7A7A90"
                value={username}
                onChangeText={setUsername}
                maxLength={30}
                editable={!isSaving}
              />
              
              <TouchableOpacity
                style={[styles.saveScoreButton, isSaving && styles.saveScoreButtonDisabled]}
                onPress={handleSaveScore}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveScoreButtonText}>Lưu điểm số</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {scoreSaved && (
            <View style={styles.scoreSavedContainer}>
              <Text style={styles.scoreSavedText}>✓ Đã lưu kỷ lục</Text>
            </View>
          )}

          <View style={styles.summaryActionContainer}>
            <TouchableOpacity 
              style={styles.replayButton} 
              onPress={loadQuestions}
              activeOpacity={0.8}
            >
              <Text style={styles.replayButtonText}>Làm lại</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.homeButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.homeButtonText}>Về trang chủ</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const timerWidthInterpolated = timerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
          <Text style={styles.headerLevelBadge}>Cấp {level}</Text>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Câu {currentQuestionIndex + 1} / {questions.length}</Text>
        </View>
      </View>

      {/* Timer Bar */}
      <View style={styles.timerContainer}>
        <View style={styles.timerBarBg}>
          <Animated.View 
            style={[
              styles.timerBarInner, 
              { 
                width: timerWidthInterpolated,
                backgroundColor: timeLeft <= 10 ? '#E74C3C' : '#FFCD00' 
              }
            ]} 
          />
        </View>
        <View style={styles.timerLabels}>
          <Text style={[styles.timerText, { color: timeLeft <= 10 ? '#E74C3C' : '#A0A0B0' }]}>
            Thời gian còn lại:
          </Text>
          <Text style={[styles.timerCountdown, { color: timeLeft <= 10 ? '#E74C3C' : '#FFCD00' }]}>
            {timeLeft}s
          </Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.gameplayScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Question Card */}
        <Animated.View style={[styles.questionCard, { opacity: questionFadeAnim }]}>
          <Text style={styles.difficultyBadge}>
            Độ khó: {currentQuestion.difficulty === 'easy' ? 'Dễ' : currentQuestion.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
          </Text>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </Animated.View>

        {/* Success animation overlay/text */}
        {quizState === 'answered' && selectedOptionIndex === currentQuestion.correctIndex && (
          <Animated.View style={[styles.successBanner, { opacity: successFadeAnim }]}>
            <Text style={styles.successBannerText}>Chính xác! 🎉</Text>
          </Animated.View>
        )}

        {/* Options List */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOptionIndex === index;
            const isCorrect = currentQuestion.correctIndex === index;
            
            let buttonStyle: StyleProp<ViewStyle> = styles.optionButton;
            let textStyle: StyleProp<TextStyle> = styles.optionText;
            let labelBgStyle: StyleProp<ViewStyle> = styles.optionLabelBg;

            if (quizState === 'answered' || quizState === 'timeout') {
              if (isCorrect) {
                // Correct option gets Green color
                buttonStyle = [styles.optionButton, styles.optionCorrect];
                textStyle = [styles.optionText, styles.textWhite];
                labelBgStyle = [styles.optionLabelBg, styles.labelCorrect];
              } else if (isSelected) {
                // Selected incorrect option gets Red color
                buttonStyle = [styles.optionButton, styles.optionIncorrect];
                textStyle = [styles.optionText, styles.textWhite];
                labelBgStyle = [styles.optionLabelBg, styles.labelIncorrect];
              } else {
                // Faded options
                buttonStyle = [styles.optionButton, styles.optionFaded];
                textStyle = [styles.optionText, styles.textFaded];
              }
            } else if (isSelected) {
              buttonStyle = [styles.optionButton, styles.optionSelected];
            }

            // A, B, C, D letter prefix
            const letterLabel = String.fromCharCode(65 + index); // A, B, C, D

            return (
              <TouchableOpacity
                key={index}
                style={buttonStyle}
                disabled={quizState !== 'idle'}
                onPress={() => handleSelectOption(index)}
                activeOpacity={0.8}
              >
                <View style={styles.optionContent}>
                  <View style={labelBgStyle}>
                    <Text style={styles.optionLabel}>{letterLabel}</Text>
                  </View>
                  <Text style={textStyle}>{option}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Explanation & Manual Next Button */}
        {(quizState === 'timeout' || (quizState === 'answered' && selectedOptionIndex !== currentQuestion.correctIndex)) && (
          <View style={styles.explanationContainer}>
            <View style={styles.explanationHeader}>
              <Text style={styles.explanationStatus}>
                {quizState === 'timeout' ? 'Hết giờ! ⏰' : 'Sai rồi! 😢'}
              </Text>
            </View>
            <View style={styles.explanationBox}>
              <Text style={styles.explanationTitle}>Giải thích:</Text>
              <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
            </View>

            <TouchableOpacity 
              style={styles.nextButton} 
              onPress={handleNextQuestion}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Tiếp theo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#FFCD00',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#DA251D',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A5E',
  },
  headerBackText: {
    fontSize: 22,
    color: '#FFCD00',
    fontWeight: 'bold',
    lineHeight: 22,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  headerLevelBadge: {
    fontSize: 11,
    color: '#FFCD00',
    fontWeight: '600',
    marginTop: 2,
  },
  progressContainer: {
    backgroundColor: '#1A1A2E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A5E',
  },
  progressText: {
    fontSize: 13,
    color: '#FFCD00',
    fontWeight: 'bold',
  },
  timerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  timerBarBg: {
    height: 6,
    backgroundColor: '#1A1A2E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerBarInner: {
    height: '100%',
    borderRadius: 3,
  },
  timerLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timerCountdown: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  gameplayScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  questionCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3A3A5E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 20,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0A0A1A',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#3A3A5E',
    color: '#FFCD00',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  successBanner: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2ECC71',
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  successBannerText: {
    color: '#2ECC71',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionsContainer: {
    marginBottom: 12,
  },
  optionButton: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#3A3A5E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  optionSelected: {
    borderColor: '#FFCD00',
    borderWidth: 1.5,
  },
  optionCorrect: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  optionIncorrect: {
    backgroundColor: '#E74C3C',
    borderColor: '#E74C3C',
  },
  optionFaded: {
    opacity: 0.4,
    borderColor: '#2A2A4E',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabelBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0A0A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#3A3A5E',
  },
  labelCorrect: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: '#FFFFFF',
  },
  labelIncorrect: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: '#FFFFFF',
  },
  optionLabel: {
    color: '#FFCD00',
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textFaded: {
    color: '#A0A0B0',
  },
  explanationContainer: {
    marginTop: 8,
  },
  explanationHeader: {
    marginBottom: 8,
    alignItems: 'center',
  },
  explanationStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  explanationBox: {
    backgroundColor: 'rgba(255, 205, 0, 0.05)',
    borderColor: '#FFCD00',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFCD00',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  nextButton: {
    backgroundColor: '#DA251D',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#DA251D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Summary Screen Styles
  summaryScroll: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: '#3A3A5E',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFCD00',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  summaryCategory: {
    fontSize: 15,
    color: '#A0A0B0',
    fontWeight: '500',
    marginBottom: 24,
  },
  circleScoreOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#0A0A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A5E',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  circleScoreInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scorePercentText: {
    fontSize: 12,
    color: '#A0A0B0',
    fontWeight: '600',
    marginTop: 4,
  },
  performanceBadgeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFCD00',
    textAlign: 'center',
    marginBottom: 8,
  },
  performanceSubText: {
    fontSize: 14,
    color: '#A0A0B0',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  summaryActionContainer: {
    width: '100%',
  },
  replayButton: {
    backgroundColor: '#DA251D',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#DA251D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  replayButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  homeButton: {
    backgroundColor: '#1A1A2E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A5E',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#DA251D',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Save Score Styles
  saveScoreContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3A3A5E',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  saveScoreTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFCD00',
    marginBottom: 16,
    textAlign: 'center',
  },
  usernameInput: {
    backgroundColor: '#0A0A1A',
    borderWidth: 1,
    borderColor: '#3A3A5E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  saveScoreButton: {
    backgroundColor: '#DA251D',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#DA251D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  saveScoreButtonDisabled: {
    opacity: 0.6,
  },
  saveScoreButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  scoreSavedContainer: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2ECC71',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreSavedText: {
    color: '#2ECC71',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
