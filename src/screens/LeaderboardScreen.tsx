import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { getTopScores } from '../database/db';
import { ScoreModel } from '../models';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

const CATEGORY_NAMES: Record<string, string> = {
  history: '📖 Lịch sử',
  geography: '🗺️ Địa lý',
  culinary: '🍳 Ẩm thực',
};

export default function LeaderboardScreen({ navigation }: Props) {
  const [scores, setScores] = useState<ScoreModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchScores = async () => {
    try {
      setLoading(true);
      const data = await getTopScores(10);
      setScores(data || []);
    } catch (err) {
      console.error('Lỗi khi tải bảng xếp hạng:', err);
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchScores();
    }, [])
  );

  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getCardStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return styles.cardGold;
      case 2:
        return styles.cardSilver;
      case 3:
        return styles.cardBronze;
      default:
        return styles.cardDefault;
    }
  };

  const getRankTextStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return styles.rankTextGold;
      case 2:
        return styles.rankTextSilver;
      case 3:
        return styles.rankTextBronze;
      default:
        return styles.rankTextDefault;
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderScoreItem = ({ item, index }: { item: ScoreModel; index: number }) => {
    const rank = index + 1;
    const medal = getMedalEmoji(rank);
    const percentage = item.totalQuestions > 0
      ? Math.round((item.score / item.totalQuestions) * 100)
      : 0;
    const catName = CATEGORY_NAMES[item.categoryId] || item.categoryId;

    return (
      <View style={[styles.scoreCard, getCardStyle(rank)]}>
        {/* Rank */}
        <View style={styles.rankContainer}>
          {rank <= 3 ? (
            <Text style={styles.medalEmoji}>{medal}</Text>
          ) : (
            <Text style={[styles.rankNumber, getRankTextStyle(rank)]}>{medal}</Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.usernameText} numberOfLines={1}>
            {item.username}
          </Text>
          <Text style={styles.categoryText}>{catName}</Text>
          <Text style={styles.dateText}>{formatDate(item.playedAt)}</Text>
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreMain}>
            {item.score}/{item.totalQuestions}
          </Text>
          <View
            style={[
              styles.percentBadge,
              percentage >= 60 ? styles.percentBadgeGreen : styles.percentBadgeRed,
            ]}
          >
            <Text style={styles.percentText}>{percentage}%</Text>
          </View>
        </View>
      </View>
    );
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
          <Text style={styles.headerEmoji}>🏆</Text>
          <Text style={styles.headerTitle}>Bảng Xếp Hạng</Text>
          <Text style={styles.headerSubtitle}>Top 10 điểm cao nhất</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Decorative top 3 podium hint */}
      <View style={styles.podiumHint}>
        <View style={[styles.podiumPillar, { height: 22, backgroundColor: '#C0C0C0' }]}>
          <Text style={styles.podiumText}>🥈</Text>
        </View>
        <View style={[styles.podiumPillar, { height: 32, backgroundColor: '#FFD700' }]}>
          <Text style={styles.podiumText}>🥇</Text>
        </View>
        <View style={[styles.podiumPillar, { height: 14, backgroundColor: '#CD7F32' }]}>
          <Text style={styles.podiumText}>🥉</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFCD00" />
          <Text style={styles.loadingText}>Đang tải bảng xếp hạng...</Text>
        </View>
      ) : scores.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyTitle}>Chưa có kỷ lục nào!</Text>
          <Text style={styles.emptySubtitle}>
            Hãy hoàn thành một bài quiz và lưu điểm số để xuất hiện ở đây.
          </Text>
        </View>
      ) : (
        <FlatList
          data={scores}
          renderItem={renderScoreItem}
          keyExtractor={(item, index) => `score-${item.id ?? index}-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
  },
  headerEmoji: {
    fontSize: 28,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFCD00',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#A0A0B0',
    marginTop: 2,
  },
  headerRight: {
    width: 42,
  },
  podiumHint: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  podiumPillar: {
    width: 42,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  podiumText: {
    fontSize: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#A0A0B0',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  cardGold: {
    backgroundColor: '#1E1A0A',
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
  },
  cardSilver: {
    backgroundColor: '#131320',
    borderColor: '#C0C0C0',
    shadowColor: '#C0C0C0',
  },
  cardBronze: {
    backgroundColor: '#18100A',
    borderColor: '#CD7F32',
    shadowColor: '#CD7F32',
  },
  cardDefault: {
    backgroundColor: '#1A1A2E',
    borderColor: '#3A3A5E',
  },
  rankContainer: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalEmoji: {
    fontSize: 32,
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  rankTextGold: {
    color: '#FFD700',
  },
  rankTextSilver: {
    color: '#C0C0C0',
  },
  rankTextBronze: {
    color: '#CD7F32',
  },
  rankTextDefault: {
    color: '#7A7A90',
  },
  cardContent: {
    flex: 1,
    marginLeft: 8,
  },
  usernameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  categoryText: {
    fontSize: 12,
    color: '#A0A0B0',
    marginBottom: 3,
  },
  dateText: {
    fontSize: 11,
    color: '#5A5A7E',
  },
  scoreContainer: {
    alignItems: 'center',
    marginLeft: 8,
    minWidth: 60,
  },
  scoreMain: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFCD00',
    marginBottom: 4,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  percentBadgeGreen: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderWidth: 1,
    borderColor: '#2ECC71',
  },
  percentBadgeRed: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  percentText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
