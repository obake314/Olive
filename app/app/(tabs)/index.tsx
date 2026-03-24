import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Modal,
  FlatList, TextInput, useWindowDimensions
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/components/Colors';
import { CalendarWeekView } from '../../src/components/CalendarWeekView';
import { LoadingView } from '../../src/components/LoadingView';
import { useMealPlans } from '../../src/hooks/useMealPlans';
import { useDishes } from '../../src/hooks/useDishes';
import { MealPlan, MealType, MEAL_TYPE_LABELS } from '../../src/types';
import { MealTypeTag } from '../../src/components/MealTypeTag';

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const weekEnd = addDays(weekStart, 6);
  const from = formatDate(weekStart);
  const to = formatDate(weekEnd);

  const { mealPlans, loading, reload, addMealPlan, removeMealPlan } = useMealPlans(from, to);
  const { dishes } = useDishes();

  // Modal state for adding meal
  const [addModal, setAddModal] = useState<{ date: string; mealType: MealType } | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string>('');
  const [dishSearch, setDishSearch] = useState('');

  // Modal state for meal detail
  const [detailModal, setDetailModal] = useState<MealPlan | null>(null);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const handleAddMeal = (date: string, mealType: MealType) => {
    setSelectedDishId('');
    setDishSearch('');
    setAddModal({ date, mealType });
  };

  const confirmAddMeal = async () => {
    if (!addModal || !selectedDishId) return;
    try {
      await addMealPlan(addModal.date, addModal.mealType, selectedDishId);
      setAddModal(null);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    }
  };

  const handleMealPress = (plan: MealPlan) => {
    setDetailModal(plan);
  };

  const handleDeleteMeal = async () => {
    if (!detailModal) return;
    Alert.alert('削除確認', `「${detailModal.dish_name}」を献立から削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMealPlan(detailModal.id);
            setDetailModal(null);
          } catch (e: any) {
            Alert.alert('エラー', e.message);
          }
        },
      },
    ]);
  };

  const filteredDishes = dishes.filter(d =>
    d.name.toLowerCase().includes(dishSearch.toLowerCase())
  );

  const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} 〜 ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

  return (
    <View style={styles.container}>
      <View style={[styles.page, isDesktop && styles.pageDesktop]}>
        <View style={styles.weekNav}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setWeekStart(prev => addDays(prev, -7))}
          >
            <Text style={styles.navBtnText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWeekStart(getMondayOfWeek(new Date()))}
          >
            <Text style={styles.weekLabel}>{weekLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setWeekStart(prev => addDays(prev, 7))}
          >
            <Text style={styles.navBtnText}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarPanel}>
          {loading ? (
            <LoadingView />
          ) : (
            <CalendarWeekView
              weekStart={weekStart}
              mealPlans={mealPlans}
              onDayPress={() => {}}
              onMealPress={handleMealPress}
              onAddMeal={handleAddMeal}
            />
          )}
        </View>
      </View>

      {/* Add Meal Modal */}
      <Modal visible={!!addModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddModal(null)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {addModal && `${addModal.date} ${MEAL_TYPE_LABELS[addModal.mealType]}`}
            </Text>
            <TouchableOpacity onPress={confirmAddMeal} disabled={!selectedDishId}>
              <Text style={[styles.modalDone, !selectedDishId && styles.disabled]}>追加</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="料理を検索..."
            value={dishSearch}
            onChangeText={setDishSearch}
            placeholderTextColor={Colors.textSecondary}
          />

          <FlatList
            data={filteredDishes}
            keyExtractor={d => d.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.dishItem, selectedDishId === item.id && styles.dishItemSelected]}
                onPress={() => setSelectedDishId(item.id)}
              >
                <Text style={styles.dishItemName}>{item.name}</Text>
                {item.recipe_url && <Text style={styles.dishItemUrl}>レシピあり</Text>}
                {selectedDishId === item.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {dishes.length === 0 ? '料理マスタを先に登録してください' : '該当なし'}
              </Text>
            }
          />
        </View>
      </Modal>

      {/* Meal Detail Modal */}
      <Modal visible={!!detailModal} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} onPress={() => setDetailModal(null)}>
          <View style={styles.detailCard}>
            {detailModal && (
              <>
                <MealTypeTag type={detailModal.meal_type} />
                <Text style={styles.detailTitle}>{detailModal.dish_name}</Text>
                <Text style={styles.detailDate}>{detailModal.date}</Text>
                {detailModal.recipe_url && (
                  <Text style={styles.detailUrl} numberOfLines={2}>{detailModal.recipe_url}</Text>
                )}
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteMeal}>
                  <Text style={styles.deleteBtnText}>献立から削除</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  page: { flex: 1, width: '100%', alignSelf: 'center' },
  pageDesktop: { maxWidth: 1280, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },
  navBtn: { padding: 8 },
  navBtnText: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  weekLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  calendarPanel: { flex: 1, minHeight: 0 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  modalCancel: { fontSize: 15, color: Colors.textSecondary },
  modalDone: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  disabled: { opacity: 0.4 },
  searchInput: {
    margin: 12,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 15,
    color: Colors.text,
  },
  dishItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dishItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  dishItemName: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },
  dishItemUrl: { fontSize: 12, color: Colors.textSecondary, marginRight: 8 },
  checkmark: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, padding: 32, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 24,
    width: '80%',
    maxWidth: 360,
  },
  detailTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 8 },
  detailDate: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  detailUrl: { fontSize: 12, color: Colors.primary, marginTop: 8 },
  deleteBtn: {
    marginTop: 20,
    backgroundColor: Colors.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteBtnText: { color: Colors.primaryDark, fontWeight: '600', fontSize: 14 },
});
