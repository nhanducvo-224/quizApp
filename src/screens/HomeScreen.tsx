import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { CategoryHelpers } from '../database/db';
import { CategoryModel } from '../models';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CategoryHelpers.getAllCategories();
      setCategories(data);
    } catch (err) {
      console.error('Lỗi khi tải danh mục:', err);
      setError('Không thể tải danh sách chủ đề. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const getEmojiIcon = (iconName: string): string => {
    // Map database icon string to visual emojis
    switch (iconName) {
      case 'book-outline':
        return '📖';
      case 'map-outline':
        return '🗺️';
      case 'restaurant-outline':
        return '🍳';
      default:
        return '💡';
    }
  };

  const renderCategoryItem = ({ item }: { item: CategoryModel }) => {
    return (
      <TouchableOpacity 
        style={[styles.card, { borderLeftColor: item.color }]}
        onPress={() => navigation.navigate('LevelSelect', { 
          categoryId: item.id, 
          categoryName: item.name,
          totalLevels: item.totalLevels,
        })}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.cardEmoji}>{getEmojiIcon(item.icon)}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Số cấp độ: {item.totalLevels}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>VietQuiz <Text style={styles.flagEmoji}>🇻🇳</Text></Text>
        <Text style={styles.subtitleText}>Khám phá Việt Nam qua từng câu hỏi</Text>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFCD00" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCategories}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.mainContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Leaderboard Banner */}
          <TouchableOpacity
            style={styles.leaderboardBanner}
            onPress={() => navigation.navigate('Leaderboard')}
            activeOpacity={0.85}
          >
            <View style={styles.leaderboardBannerLeft}>
              <Text style={styles.leaderboardBannerTrophy}>🏆</Text>
              <View>
                <Text style={styles.leaderboardBannerTitle}>Bảng Xếp Hạng Cá Nhân</Text>
                <Text style={styles.leaderboardBannerSub}>Xem Top 10 điểm cao nhất</Text>
              </View>
            </View>
            <Text style={styles.leaderboardBannerArrow}>›</Text>
          </TouchableOpacity>

          {/* Categories List */}
          <View style={styles.categoriesSection}>
            {categories.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Chưa có chủ đề nào.</Text>
              </View>
            ) : (
              categories.map((item) => (
                <View key={item.id}>
                  {renderCategoryItem({ item })}
                </View>
              ))
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* Bottom Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsIcon}>📊</Text>
        <Text style={styles.statsText}>
          Hôm nay đã trả lời: <Text style={styles.statsHighlight}>0</Text> câu hỏi
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFCD00',
    letterSpacing: 0.5,
  },
  flagEmoji: {
    fontSize: 24,
  },
  subtitleText: {
    fontSize: 14,
    color: '#A0A0B0',
    marginTop: 6,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Make sure list doesn't get covered by stats bar
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0A0A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardEmoji: {
    fontSize: 26,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#A0A0B0',
    lineHeight: 18,
    marginBottom: 8,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0A0A1A',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#3A3A5E',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFCD00',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#A0A0B0',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#DA251D',
    textAlign: 'center',
    fontSize: 15,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#DA251D',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    color: '#A0A0B0',
    fontSize: 14,
  },
  statsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1A2E',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#DA251D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 10,
  },
  statsIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  statsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statsHighlight: {
    color: '#FFCD00',
    fontWeight: 'bold',
  },

  // Main Content Styles
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  categoriesSection: {
    padding: 16,
  },
  // Leaderboard Banner Styles
  leaderboardBanner: {
    marginHorizontal: 16,
    marginBottom: 4,
    marginTop: 4,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFCD00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#FFCD00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  leaderboardBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardBannerTrophy: {
    fontSize: 30,
    marginRight: 14,
  },
  leaderboardBannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFCD00',
    marginBottom: 3,
  },
  leaderboardBannerSub: {
    fontSize: 12,
    color: '#A0A0B0',
  },
  leaderboardBannerArrow: {
    fontSize: 26,
    color: '#FFCD00',
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 20,
  },
});
