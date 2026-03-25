import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { MealPlan, MealType, Todo, MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../types';
import { Colors } from './Colors';
import { MealTypeTag } from './MealTypeTag';

interface Props {
  weekStart: Date;
  mealPlans: MealPlan[];
  todos?: Todo[];
  onDayPress: (date: string) => void;
  onMealPress: (plan: MealPlan) => void;
  onAddMeal: (date: string, mealType: MealType) => void;
}

const MEAL_BG: Record<MealType, string> = {
  breakfast: Colors.breakfast,
  lunch: Colors.lunch,
  dinner: Colors.dinner,
};

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

export function CalendarWeekView({ weekStart, mealPlans, todos = [], onDayPress, onMealPress, onAddMeal }: Props) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const days = getWeekDays(weekStart);
  const today = formatDate(new Date());

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
      showsVerticalScrollIndicator={false}
    >
      {days.map((day, idx) => {
        const dateStr = formatDate(day);
        const isToday = dateStr === today;
        const dayPlans = mealPlans.filter(p => p.date === dateStr);

        const dayTodos = todos.filter(t => t.due_date === dateStr && !t.done);

        return (
          <TouchableOpacity key={dateStr} style={[styles.dayRow, isDesktop && styles.dayRowDesktop]} onPress={() => onDayPress(dateStr)} activeOpacity={0.85}>
            <View style={[styles.dayHeader, isToday && styles.todayHeader]}>
              <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>
                {DAY_LABELS[idx]}
              </Text>
              <Text style={[styles.dateLabel, isToday && styles.todayLabel]}>
                {day.getMonth() + 1}/{day.getDate()}
              </Text>
              {isToday && <View style={styles.todayDot} />}
            </View>

            <View style={styles.mealsContainer}>
              {MEAL_TYPE_ORDER.map(mealType => {
                const mealsForSlot = dayPlans.filter(p => p.meal_type === mealType);
                return (
                  <View key={mealType} style={styles.mealSlot}>
                    <Text style={styles.mealTypeLabel}>{MEAL_TYPE_LABELS[mealType]}</Text>
                    <View style={[styles.mealItems, isDesktop && styles.mealItemsDesktop]}>
                      {mealsForSlot.map(plan => (
                        <TouchableOpacity
                          key={plan.id}
                          style={[styles.mealChip, { backgroundColor: MEAL_BG[mealType] }]}
                          onPress={() => onMealPress(plan)}
                        >
                          <Text style={styles.mealChipText} numberOfLines={1}>
                            {plan.dish_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => onAddMeal(dateStr, mealType)}
                      >
                        <Text style={styles.addButtonText}>+ 追加</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              {dayTodos.length > 0 && (
                <View style={styles.todoSlot}>
                  {dayTodos.map(t => (
                    <Text key={t.id} style={styles.todoChip} numberOfLines={1}>📋 {t.title}</Text>
                  ))}
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 20 },
  contentDesktop: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  dayRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginTop: 8,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dayRowDesktop: { marginTop: 14, borderWidth: 1, borderColor: Colors.border },
  dayHeader: {
    width: 60,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  todayHeader: { backgroundColor: Colors.primary },
  dayLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  dateLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  todayLabel: { color: Colors.background },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 2,
    backgroundColor: Colors.background,
    marginTop: 4,
  },
  mealsContainer: { flex: 1, padding: 12 },
  mealSlot: { marginBottom: 10 },
  mealTypeLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, fontWeight: '600' },
  mealItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  mealItemsDesktop: { gap: 8 },
  mealChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    maxWidth: 220,
  },
  mealChipText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  todoSlot: { marginTop: 6, gap: 2 },
  todoChip: { fontSize: 12, color: Colors.textSecondary, paddingVertical: 2 },
  addButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addButtonText: { fontSize: 13, color: Colors.textSecondary },
});
