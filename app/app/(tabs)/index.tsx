import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Modal,
  FlatList, TextInput, useWindowDimensions, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/components/Colors';
import { CalendarWeekView } from '../../src/components/CalendarWeekView';
import { CalendarMonthView } from '../../src/components/CalendarMonthView';
import { LoadingView } from '../../src/components/LoadingView';
import { useMealPlans } from '../../src/hooks/useMealPlans';
import { useDishes } from '../../src/hooks/useDishes';
import { MealPlan, MealType, Todo, MEAL_TYPE_LABELS } from '../../src/types';
import { MealTypeTag } from '../../src/components/MealTypeTag';
import { todosApi } from '../../src/api/client';

type ViewMode = 'week' | 'month';
type ContentMode = 'meal' | 'todo';

function TodoItem({ item, today, onToggle, onEdit, onDelete }: {
  item: Todo; today: string;
  onToggle: (t: Todo) => void;
  onEdit: (t: Todo) => void;
  onDelete: (t: Todo) => void;
}) {
  const overdue = !item.done && !!item.due_date && item.due_date < today;
  return (
    <View style={[styles.todoItemRow, !!item.done && styles.todoItemDone]}>
      <TouchableOpacity style={styles.todoCheckbox} onPress={() => onToggle(item)}>
        <View style={[styles.todoCheckboxInner, !!item.done && styles.todoCheckboxChecked]}>
          {!!item.done && <Text style={styles.todoCheckmark}>✓</Text>}
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.todoItemBody} onPress={() => onEdit(item)}>
        <Text style={[styles.todoItemTitle, !!item.done && styles.todoItemTitleDone]}>{item.title}</Text>
        {item.due_date && (
          <Text style={[styles.todoItemDue, overdue && styles.todoItemDueOverdue]}>
            期限: {item.due_date}{overdue ? ' 期限超過' : ''}
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(item)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Text style={styles.todoDeleteText}>削除</Text>
      </TouchableOpacity>
    </View>
  );
}

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
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [contentMode, setContentMode] = useState<ContentMode>('meal');

  // TODO state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todosLoading, setTodosLoading] = useState(false);
  const [todoModal, setTodoModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [todoTitle, setTodoTitle] = useState('');
  const [todoDueDate, setTodoDueDate] = useState('');
  const [todoSaving, setTodoSaving] = useState(false);

  // 週次
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const weekEnd = addDays(weekStart, 6);

  // 月次
  const today = new Date();
  const [monthYear, setMonthYear] = useState(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getMonth());

  // 月次の from/to
  const monthFrom = `${monthYear}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const lastDayOfMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
  const monthTo = `${monthYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const from = viewMode === 'week' ? formatDate(weekStart) : monthFrom;
  const to = viewMode === 'week' ? formatDate(weekEnd) : monthTo;

  const { mealPlans, loading, reload, addMealPlan, removeMealPlan } = useMealPlans(from, to);
  const { dishes } = useDishes();

  const [addModal, setAddModal] = useState<{ date: string; mealType: MealType } | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string>('');
  const [dishSearch, setDishSearch] = useState('');
  const [detailModal, setDetailModal] = useState<MealPlan | null>(null);

  const reloadTodos = useCallback(async () => {
    setTodosLoading(true);
    try { setTodos(await todosApi.list()); } catch {}
    finally { setTodosLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    reload();
    reloadTodos();
  }, [reload, reloadTodos]));

  const openAddTodo = () => {
    setEditingTodo(null); setTodoTitle(''); setTodoDueDate(''); setTodoModal(true);
  };
  const openEditTodo = (t: Todo) => {
    setEditingTodo(t); setTodoTitle(t.title); setTodoDueDate(t.due_date || ''); setTodoModal(true);
  };
  const handleSaveTodo = async () => {
    if (!todoTitle.trim()) return;
    setTodoSaving(true);
    try {
      const payload = { title: todoTitle.trim(), due_date: todoDueDate.trim() || undefined };
      if (editingTodo) {
        const updated = await todosApi.update(editingTodo.id, payload);
        setTodos(prev => prev.map(t => t.id === updated.id ? updated : t));
      } else {
        const created = await todosApi.create(payload);
        setTodos(prev => [created, ...prev]);
      }
      setTodoModal(false);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setTodoSaving(false);
    }
  };
  const handleToggleTodo = async (todo: Todo) => {
    try {
      const updated = await todosApi.toggle(todo.id);
      setTodos(prev => prev.map(t => t.id === updated.id ? updated : t)
        .sort((a, b) => a.done !== b.done ? a.done - b.done : 0));
    } catch {}
  };
  const handleDeleteTodo = (todo: Todo) => {
    Alert.alert('削除', `「${todo.title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        await todosApi.delete(todo.id);
        setTodos(prev => prev.filter(t => t.id !== todo.id));
      }},
    ]);
  };

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

  const handleMealPress = (plan: MealPlan) => setDetailModal(plan);

  const handleDeleteMeal = async () => {
    if (!detailModal) return;
    Alert.alert('削除確認', `「${detailModal.dish_name}」を献立から削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
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

  const weekLabel = weekStart.getFullYear() === weekEnd.getFullYear()
    ? `${weekStart.getFullYear()}年 ${weekStart.getMonth() + 1}/${weekStart.getDate()} 〜 ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`
    : `${weekStart.getFullYear()}/${weekStart.getMonth() + 1}/${weekStart.getDate()} 〜 ${weekEnd.getFullYear()}/${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
  const monthLabel = `${monthYear}年${monthIndex + 1}月`;

  const prevPeriod = () => {
    if (viewMode === 'week') {
      setWeekStart(prev => addDays(prev, -7));
    } else {
      if (monthIndex === 0) { setMonthIndex(11); setMonthYear(y => y - 1); }
      else setMonthIndex(m => m - 1);
    }
  };
  const nextPeriod = () => {
    if (viewMode === 'week') {
      setWeekStart(prev => addDays(prev, 7));
    } else {
      if (monthIndex === 11) { setMonthIndex(0); setMonthYear(y => y + 1); }
      else setMonthIndex(m => m + 1);
    }
  };
  const goToToday = () => {
    setWeekStart(getMondayOfWeek(new Date()));
    setMonthYear(today.getFullYear());
    setMonthIndex(today.getMonth());
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTodos = todos.filter(t => !t.done);
  const doneTodos = todos.filter(t => t.done);

  return (
    <View style={styles.container}>
      <View style={[styles.page, isDesktop && styles.pageDesktop]}>

        {/* Content mode tabs */}
        <View style={styles.contentTabs}>
          <TouchableOpacity
            style={[styles.contentTab, contentMode === 'meal' && styles.contentTabActive]}
            onPress={() => setContentMode('meal')}
          >
            <Text style={[styles.contentTabText, contentMode === 'meal' && styles.contentTabTextActive]}>献立</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contentTab, contentMode === 'todo' && styles.contentTabActive]}
            onPress={() => setContentMode('todo')}
          >
            <Text style={[styles.contentTabText, contentMode === 'todo' && styles.contentTabTextActive]}>
              TODO {pendingTodos.length > 0 ? `(${pendingTodos.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {contentMode === 'meal' ? (
          <>
            {/* Calendar view mode toggle */}
            <View style={styles.toolbar}>
              <View style={styles.modeTabs}>
                <TouchableOpacity
                  style={[styles.modeTab, viewMode === 'week' && styles.modeTabActive]}
                  onPress={() => setViewMode('week')}
                >
                  <Text style={[styles.modeTabText, viewMode === 'week' && styles.modeTabTextActive]}>週</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeTab, viewMode === 'month' && styles.modeTabActive]}
                  onPress={() => setViewMode('month')}
                >
                  <Text style={[styles.modeTabText, viewMode === 'month' && styles.modeTabTextActive]}>月</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.navBtn} onPress={prevPeriod}>
                <Text style={styles.navBtnText}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goToToday}>
                <Text style={styles.periodLabel}>{viewMode === 'week' ? weekLabel : monthLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={nextPeriod}>
                <Text style={styles.navBtnText}>▶</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calendarPanel}>
              {loading ? (
                <LoadingView />
              ) : viewMode === 'week' ? (
                <CalendarWeekView
                  weekStart={weekStart}
                  mealPlans={mealPlans}
                  onDayPress={() => {}}
                  onMealPress={handleMealPress}
                  onAddMeal={handleAddMeal}
                />
              ) : (
                <CalendarMonthView
                  year={monthYear}
                  month={monthIndex}
                  mealPlans={mealPlans}
                  onDayPress={(date) => handleAddMeal(date, 'dinner')}
                  onAddMeal={handleAddMeal}
                />
              )}
            </View>
          </>
        ) : (
          /* TODO view */
          <View style={styles.todoPanel}>
            <View style={styles.todoHeader}>
              <Text style={styles.todoCount}>{pendingTodos.length}件のタスク</Text>
              <TouchableOpacity style={styles.addBtn} onPress={openAddTodo}>
                <Text style={styles.addBtnText}>+ 追加</Text>
              </TouchableOpacity>
            </View>
            {todosLoading ? <LoadingView /> : (
              <ScrollView contentContainerStyle={styles.todoList}>
                {pendingTodos.length > 0 && (
                  <Text style={styles.todoSectionLabel}>未完了</Text>
                )}
                {pendingTodos.map(item => (
                  <TodoItem key={item.id} item={item} today={todayStr}
                    onToggle={handleToggleTodo} onEdit={openEditTodo} onDelete={handleDeleteTodo} />
                ))}
                {doneTodos.length > 0 && (
                  <Text style={[styles.todoSectionLabel, { marginTop: 12 }]}>完了済み</Text>
                )}
                {doneTodos.map(item => (
                  <TodoItem key={item.id} item={item} today={todayStr}
                    onToggle={handleToggleTodo} onEdit={openEditTodo} onDelete={handleDeleteTodo} />
                ))}
                {todos.length === 0 && (
                  <Text style={styles.emptyTodo}>タスクはありません</Text>
                )}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* TODO Modal */}
      <Modal visible={todoModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setTodoModal(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingTodo ? 'タスクを編集' : 'タスクを追加'}</Text>
            <TouchableOpacity onPress={handleSaveTodo} disabled={todoSaving}>
              <Text style={[styles.modalDone, todoSaving && styles.disabled]}>
                {todoSaving ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>タスク名 *</Text>
            <TextInput
              style={styles.searchInput}
              value={todoTitle}
              onChangeText={setTodoTitle}
              placeholder="例: 買い物に行く"
              placeholderTextColor={Colors.textSecondary}
              autoFocus
            />
            <Text style={styles.modalLabel}>期限 (任意)</Text>
            <TextInput
              style={styles.searchInput}
              value={todoDueDate}
              onChangeText={setTodoDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
      </Modal>

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
                {dishes.length === 0 ? '料理を先に登録してください' : '該当なし'}
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
  page: { flex: 1, width: '100%', alignSelf: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  pageDesktop: { maxWidth: 1280, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  contentTabs: {
    flexDirection: 'row', marginBottom: 8,
    borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  contentTab: { flex: 1, paddingVertical: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  contentTabActive: { backgroundColor: Colors.primary },
  contentTabText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  contentTabTextActive: { color: '#fff' },
  todoPanel: { flex: 1 },
  todoHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, padding: 12,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginBottom: 8,
  },
  todoCount: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, borderRadius: 8, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  todoList: { paddingBottom: 24 },
  todoSectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5, marginBottom: 6, paddingHorizontal: 2 },
  todoItemRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    padding: 12, marginBottom: 6, gap: 10,
  },
  todoItemDone: { opacity: 0.55 },
  todoCheckbox: { padding: 2 },
  todoCheckboxInner: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  todoCheckboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  todoCheckmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  todoItemBody: { flex: 1 },
  todoItemTitle: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  todoItemTitleDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  todoItemDue: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  todoItemDueOverdue: { color: '#e53e3e', fontWeight: '600' },
  todoDeleteText: { fontSize: 14, color: Colors.primaryDark, fontWeight: '700' },
  emptyTodo: { textAlign: 'center', color: Colors.textSecondary, paddingVertical: 40, fontSize: 16 },
  modalBody: { padding: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 16 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    gap: 8,
  },
  modeTabs: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 4,
  },
  modeTab: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.background },
  modeTabActive: { backgroundColor: Colors.primary },
  modeTabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  modeTabTextActive: { color: '#fff' },
  navBtn: { padding: 8 },
  navBtnText: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  periodLabel: { fontSize: 16, fontWeight: '600', color: Colors.text, flex: 1, textAlign: 'center' },
  calendarPanel: { flex: 1, minHeight: 0, marginTop: 8 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  modalCancel: { fontSize: 16, color: Colors.textSecondary },
  modalDone: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  disabled: { opacity: 0.4 },
  searchInput: {
    margin: 12, padding: 12, minHeight: 44, backgroundColor: Colors.surface,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    fontSize: 16, color: Colors.text,
  },
  dishItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    marginHorizontal: 12, marginBottom: 6, padding: 14,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  dishItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  dishItemName: { flex: 1, fontSize: 16, color: Colors.text, fontWeight: '500' },
  dishItemUrl: { fontSize: 13, color: Colors.textSecondary, marginRight: 8 },
  checkmark: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, padding: 32, fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  detailCard: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 24, width: '80%', maxWidth: 360,
  },
  detailTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 8 },
  detailDate: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  detailUrl: { fontSize: 13, color: Colors.primary, marginTop: 8 },
  deleteBtn: { marginTop: 20, backgroundColor: Colors.accent, padding: 12, borderRadius: 8, alignItems: 'center' },
  deleteBtnText: { color: Colors.primaryDark, fontWeight: '600', fontSize: 16 },
});
