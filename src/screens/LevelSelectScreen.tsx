import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { UserProgressHelpers } from '../database/db';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

type LevelStatus = {
  level: number;
  is_unlocked: number;
  high_score: number;
};

const LEVEL_LABELS: Record<number, { label: string; color: string; emoji: string }> = {
  1: { label: 'Cơ bản', color: '#2ECC71', emoji: '🌱' },
  2: { label: 'Trung cấp', color: '#F39C12', emoji: '⚡' },
  3: { label: 'Nâng cao', color: '#E74C3C', emoji: '🔥' },
};

export default function LevelSelectScreen({ route, navigation }: Props) {
  const { categoryId, categoryName, totalLevels } = route.params;
  const isFocused = useIsFocused();
  const [levelStatuses, setLevelStatuses] = useState<LevelStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLevelStatuses = async () => {
    try {
      setLoading(true);
      console.log(`LevelSelectScreen focused, fetching data for category: ${categoryId}`);
      
      const statuses = await UserProgressHelpers.getCategoryLevelStatus(categoryId);
      console.log('Fetched rows from DB:', statuses);

      // Tạo một mảng hoàn chỉnh chứa đầy đủ tất cả các level từ 1 đến totalLevels
      const fullStatuses: LevelStatus[] = [];
      
      for (let i = 1; i <= totalLevels; i++) {
        // Tìm xem level hiện tại đã có dữ liệu lưu trong DB chưa
        const existingStatus = statuses?.find(s => s.level === i);
        
        if (existingStatus) {
          // Nếu đã có dữ liệu trong DB, giữ nguyên dữ liệu đó
          fullStatuses.push(existingStatus);
        } else {
          // Nếu chưa có dữ liệu trong DB (Ví dụ lúc mới cài app hoặc chưa chơi level đó)
          fullStatuses.push({
            level: i,
            is_unlocked: i === 1 ? 1 : 0, // Mặc định Level 1 luôn mở, các Level khác khóa
            high_score: 0,
          });
        }
      }

      console.log('Merged complete level statuses to display:', fullStatuses);
      setLevelStatuses(fullStatuses);
    } catch (err) {
      console.error('Lỗi khi tải trạng thái cấp độ:', err);
      // Fallboard bảo vệ app không bị sập
      const fallback: LevelStatus[] = [];
      for (let i = 1; i <= totalLevels; i++) {
        fallback.push({ level: i, is_unlocked: i === 1 ? 1 : 0, high_score: 0 });
      }
      setLevelStatuses(fallback);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('LevelSelectScreen focused, fetching data...'); // Debug log
      fetchLevelStatuses();
    }, [categoryId, isFocused, totalLevels])
  );

  const getCategoryEmoji = (): string => {
    const map: Record<string, string> = {
      history: '📖',
      geography: '🗺️',
      culinary: '🍳',
    };
    return map[categoryId] || '💡';
  };

  const getStarsDisplay = (highScore: number): string => {
    // highScore là số câu đúng / 5 câu
    if (highScore >= 5) return '⭐⭐⭐';
    if (highScore >= 3) return '⭐⭐';
    if (highScore >= 1) return '⭐';
    return '';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.categoryEmoji}>{getCategoryEmoji()}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {categoryName}
          </Text>
          <Text style={styles.headerSubtitle}>Chọn cấp độ để bắt đầu</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Decorative gradient strip */}
      <View style={styles.gradientStrip}>
        <View style={[styles.gradientDot, { backgroundColor: '#2ECC71' }]} />
        <View style={[styles.gradientDot, { backgroundColor: '#F39C12' }]} />
        <View style={[styles.gradientDot, { backgroundColor: '#E74C3C' }]} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFCD00" />
          <Text style={styles.loadingText}>Đang tải cấp độ...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>🎯 Các Cấp Độ</Text>

          {levelStatuses.map((status) => {
            const isUnlocked = status.is_unlocked === 1;
            const meta = LEVEL_LABELS[status.level] || {
              label: `Cấp ${status.level}`,
              color: '#9B59B6',
              emoji: '🎮',
            };
            const stars = getStarsDisplay(status.high_score);

            return (
              <TouchableOpacity
                key={status.level}
                style={[
                  styles.levelCard,
                  isUnlocked ? styles.levelCardUnlocked : styles.levelCardLocked,
                  isUnlocked ? { borderLeftColor: meta.color } : {},
                ]}
                onPress={() => {
                  if (isUnlocked) {
                    navigation.navigate('CategoryDetail', {
                      categoryId,
                      categoryName,
                      level: status.level,
                    });
                  }
                }}
                activeOpacity={isUnlocked ? 0.8 : 1}
                disabled={!isUnlocked}
              >
                {/* Level number badge */}
                <View
                  style={[
                    styles.levelBadge,
                    { backgroundColor: isUnlocked ? meta.color : '#2A2A4E' },
                  ]}
                >
                  <Text style={styles.levelBadgeText}>{status.level}</Text>
                </View>

                {/* Level info */}
                <View style={styles.levelInfo}>
                  <View style={styles.levelNameRow}>
                    <Text style={[styles.levelEmoji]}>{isUnlocked ? meta.emoji : '🔒'}</Text>
                    <Text
                      style={[
                        styles.levelName,
                        isUnlocked ? styles.levelNameUnlocked : styles.levelNameLocked,
                      ]}
                    >
                      Cấp {status.level} – {meta.label}
                    </Text>
                  </View>

                  {isUnlocked ? (
                    <View style={styles.levelSubRow}>
                      {status.high_score > 0 ? (
                        <>
                          <Text style={styles.highScoreLabel}>Kỷ lục: </Text>
                          <Text style={[styles.highScoreValue, { color: meta.color }]}>
                            {status.high_score}/5
                          </Text>
                          {stars.length > 0 && (
                            <Text style={styles.starsText}> {stars}</Text>
                          )}
                        </>
                      ) : (
                        <Text style={styles.notPlayedText}>Chưa chơi – Hãy thử sức!</Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.lockedText}>
                      Hoàn thành cấp {status.level - 1} để mở khóa
                    </Text>
                  )}
                </View>

                {/* Right arrow or lock */}
                <View style={styles.levelRight}>
                  {isUnlocked ? (
                    <View style={[styles.playButton, { backgroundColor: meta.color }]}>
                      <Text style={styles.playButtonText}>▶</Text>
                    </View>
                  ) : (
                    <Text style={styles.lockIcon}>🔒</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Info tip */}
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>
              Trả lời đúng từ 3/5 câu (60%) để mở khóa cấp độ tiếp theo!
            </Text>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A5E',
  },
  backText: {
    fontSize: 22,
    color: '#FFCD00',
    fontWeight: 'bold',
    lineHeight: 22,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  categoryEmoji: {
    fontSize: 28,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#A0A0B0',
    marginTop: 2,
  },
  headerRight: {
    width: 42,
  },
  gradientStrip: {
    flexDirection: 'row',
    height: 3,
    marginHorizontal: 0,
  },
  gradientDot: {
    flex: 1,
    height: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#A0A0B0',
    marginTop: 12,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFCD00',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  levelCardUnlocked: {
    backgroundColor: '#1A1A2E',
    borderColor: '#3A3A5E',
    borderWidth: 1,
  },
  levelCardLocked: {
    backgroundColor: '#111128',
    borderColor: '#2A2A4E',
    borderWidth: 1,
    borderLeftColor: '#2A2A4E',
    opacity: 0.65,
  },
  levelBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  levelBadgeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  levelInfo: {
    flex: 1,
  },
  levelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  levelName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  levelNameUnlocked: {
    color: '#FFFFFF',
  },
  levelNameLocked: {
    color: '#5A5A7E',
  },
  levelSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  highScoreLabel: {
    fontSize: 13,
    color: '#A0A0B0',
  },
  highScoreValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  starsText: {
    fontSize: 13,
  },
  notPlayedText: {
    fontSize: 13,
    color: '#7A7A90',
    fontStyle: 'italic',
  },
  lockedText: {
    fontSize: 12,
    color: '#5A5A7E',
    fontStyle: 'italic',
  },
  levelRight: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  lockIcon: {
    fontSize: 22,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 205, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 0, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },
  tipIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#FFCD00',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 20,
  },
});
