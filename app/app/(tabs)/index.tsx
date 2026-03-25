import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions, Image,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/components/Colors';
import { useMealPlans } from '../../src/hooks/useMealPlans';
import { useDishes } from '../../src/hooks/useDishes';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../../src/types';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const today = new Date();
  const todayStr = formatDate(today);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 6);
  const weekEndStr = formatDate(weekEnd);

  const { mealPlans, reload: reloadMeals } = useMealPlans(todayStr, weekEndStr);
  const { dishes, reload: reloadDishes } = useDishes();

  useFocusEffect(useCallback(() => {
    reloadMeals();
    reloadDishes();
  }, [reloadMeals, reloadDishes]));

  // 今日の献立
  const todayMeals = MEAL_TYPE_ORDER
    .map(type => ({ type, plan: mealPlans.find(p => p.date === todayStr && p.meal_type === type) }));

  // 今週の献立（今日含む7日）
  const weekMeals = mealPlans.slice(0, 5);

  // 直近に追加した料理
  const recentDishes = dishes.slice(0, 6);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>

      {/* 今日の献立 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>今日の献立</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
            <Text style={styles.sectionLink}>カレンダーへ →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.todayRow}>
          {todayMeals.map(({ type, plan }) => (
            <TouchableOpacity
              key={type}
              style={styles.todayCard}
              onPress={() => router.push('/(tabs)/calendar')}
            >
              <Text style={styles.todayMealType}>{MEAL_TYPE_LABELS[type]}</Text>
              {plan ? (
                <Text style={styles.todayDishName} numberOfLines={2}>{plan.dish_name}</Text>
              ) : (
                <Text style={styles.todayEmpty}>未設定</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* クイックアクセス */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>メニュー</Text>
        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(tabs)/calendar')}>
            <Ionicons name="calendar-outline" size={28} color={Colors.primary} />
            <Text style={styles.menuLabel}>献立カレンダー</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(tabs)/dishes')}>
            <Ionicons name="restaurant-outline" size={28} color={Colors.primary} />
            <Text style={styles.menuLabel}>料理マスタ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(tabs)/shopping')}>
            <Ionicons name="cart-outline" size={28} color={Colors.primary} />
            <Text style={styles.menuLabel}>買い物リスト</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(tabs)/todo')}>
            <Ionicons name="checkmark-circle-outline" size={28} color={Colors.primary} />
            <Text style={styles.menuLabel}>TODO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 最近の料理 */}
      {recentDishes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>料理マスタ</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/dishes')}>
              <Text style={styles.sectionLink}>すべて見る →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dishGrid}>
            {recentDishes.map(dish => (
              <TouchableOpacity
                key={dish.id}
                style={styles.dishCard}
                onPress={() => router.push('/(tabs)/dishes')}
              >
                {dish.image_data ? (
                  <Image source={{ uri: dish.image_data }} style={styles.dishImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.dishImage, styles.dishImagePlaceholder]}>
                    <Ionicons name="restaurant-outline" size={24} color={Colors.textSecondary} />
                  </View>
                )}
                <Text style={styles.dishName} numberOfLines={1}>{dish.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 20 },
  contentDesktop: { maxWidth: 900, alignSelf: 'center', width: '100%', paddingHorizontal: 24, paddingTop: 24 },
  section: {
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, padding: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionLink: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  todayRow: { flexDirection: 'row', gap: 8 },
  todayCard: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, padding: 10, minHeight: 64, justifyContent: 'center',
  },
  todayMealType: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  todayDishName: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  todayEmpty: { fontSize: 13, color: Colors.border, fontStyle: 'italic' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  menuCard: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: Colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, alignItems: 'center', gap: 8, minHeight: 80, justifyContent: 'center',
  },
  menuLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  dishGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dishCard: { width: '30%', flexGrow: 1, alignItems: 'center', gap: 4 },
  dishImage: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  dishImagePlaceholder: { backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  dishName: { fontSize: 12, color: Colors.text, fontWeight: '600', textAlign: 'center', width: '100%' },
});
