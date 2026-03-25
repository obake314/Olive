import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions, Image,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/components/Colors';
import { useMealPlans } from '../../src/hooks/useMealPlans';
import { useDishes } from '../../src/hooks/useDishes';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER, Todo } from '../../src/types';
import { todosApi } from '../../src/api/client';

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
  const [todos, setTodos] = useState<Todo[]>([]);

  const reloadTodos = useCallback(async () => {
    try { setTodos(await todosApi.list()); } catch {}
  }, []);

  useFocusEffect(useCallback(() => {
    reloadMeals();
    reloadDishes();
    reloadTodos();
  }, [reloadMeals, reloadDishes, reloadTodos]));

  // 今日の献立
  const todayMeals = MEAL_TYPE_ORDER
    .map(type => ({ type, plan: mealPlans.find(p => p.date === todayStr && p.meal_type === type) }));

  // 直近に追加した料理
  const recentDishes = dishes.slice(0, 6);

  // 期限が古い順に未完了TODO 3件
  const upcomingTodos = todos
    .filter(t => !t.done && t.due_date)
    .sort((a, b) => a.due_date! < b.due_date! ? -1 : 1)
    .slice(0, 3);

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
        <View style={styles.todayStack}>
          {todayMeals.map(({ type, plan }) => (
            <TouchableOpacity
              key={type}
              style={styles.todayCard}
              onPress={() => router.push('/(tabs)/calendar')}
            >
              <Text style={styles.todayMealType}>{MEAL_TYPE_LABELS[type]}</Text>
              {plan ? (
                <Text style={styles.todayDishName} numberOfLines={1}>{plan.dish_name}</Text>
              ) : (
                <Text style={styles.todayEmpty}>未設定</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* TODO */}
      {upcomingTodos.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TODO</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/todo')}>
              <Text style={styles.sectionLink}>すべて見る →</Text>
            </TouchableOpacity>
          </View>
          {upcomingTodos.map(todo => {
            const overdue = todo.due_date! < todayStr;
            return (
              <TouchableOpacity key={todo.id} style={styles.todoRow} onPress={() => router.push('/(tabs)/todo')}>
                <Ionicons name="ellipse-outline" size={18} color={Colors.primary} />
                <View style={styles.todoBody}>
                  <Text style={styles.todoTitle} numberOfLines={1}>{todo.title}</Text>
                  <Text style={[styles.todoDue, overdue && styles.todoDueOverdue]}>期限: {todo.due_date}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 最近の料理 */}
      {recentDishes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>料理</Text>
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
  todayStack: { gap: 6 },
  todayCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, padding: 10, minHeight: 44, gap: 10,
  },
  todayMealType: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', width: 28 },
  todayDishName: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '600' },
  todayEmpty: { flex: 1, fontSize: 13, color: Colors.border, fontStyle: 'italic' },
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
  todoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  todoBody: { flex: 1 },
  todoTitle: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  todoDue: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  todoDueOverdue: { color: '#e53e3e', fontWeight: '600' },
});
