import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  TextInput, Modal, Alert, useWindowDimensions, ScrollView,
} from 'react-native';
import { DatePickerField } from '../../src/components/DatePickerField';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/components/Colors';
import { LoadingView } from '../../src/components/LoadingView';
import { EmptyState } from '../../src/components/EmptyState';
import { todosApi } from '../../src/api/client';
import { Todo } from '../../src/types';

export default function TodoScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await todosApi.list();
      setTodos(data);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openAdd = () => {
    setEditingTodo(null);
    setTitle('');
    setDueDate('');
    setModalVisible(true);
  };

  const openEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setTitle(todo.title);
    setDueDate(todo.due_date || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('エラー', 'タイトルを入力してください'); return; }
    setSaving(true);
    try {
      const payload = { title: title.trim(), due_date: dueDate.trim() || undefined };
      if (editingTodo) {
        const updated = await todosApi.update(editingTodo.id, payload);
        setTodos(prev => prev.map(t => t.id === updated.id ? updated : t));
      } else {
        const created = await todosApi.create(payload);
        setTodos(prev => [created, ...prev]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (todo: Todo) => {
    try {
      const updated = await todosApi.toggle(todo.id);
      setTodos(prev => prev.map(t => t.id === updated.id ? updated : t).sort((a, b) => {
        if (a.done !== b.done) return a.done - b.done;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }));
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    }
  };

  const handleDelete = (todo: Todo) => {
    Alert.alert('削除確認', `「${todo.title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: async () => {
          try {
            await todosApi.delete(todo.id);
            setTodos(prev => prev.filter(t => t.id !== todo.id));
          } catch (e: any) {
            Alert.alert('エラー', e.message);
          }
        },
      },
    ]);
  };

  const pending = todos.filter(t => !t.done);
  const done = todos.filter(t => t.done);

  const renderItem = ({ item }: { item: Todo }) => (
    <View style={[styles.item, !!item.done && styles.itemDone]}>
      <TouchableOpacity style={styles.checkbox} onPress={() => handleToggle(item)}>
        <View style={[styles.checkboxInner, !!item.done && styles.checkboxChecked]}>
          {!!item.done && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.itemBody} onPress={() => openEdit(item)}>
        <Text style={[styles.itemTitle, !!item.done && styles.itemTitleDone]}>{item.title}</Text>
        {item.due_date && (
          <Text style={[styles.itemDue, isOverdue(item) && styles.itemDueOverdue]}>
            期限: {item.due_date}
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Text style={styles.deleteText}>削除</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.page, isDesktop && styles.pageDesktop]}>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <Text style={styles.headerCount}>{pending.length}件のタスク</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ 追加</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <LoadingView />
        ) : todos.length === 0 ? (
          <EmptyState title="タスクがありません" subtitle="「+ 追加」ボタンからタスクを登録しましょう" />
        ) : (
          <FlatList
            data={pending}
            keyExtractor={t => t.id}
            contentContainerStyle={styles.list}
            renderItem={renderItem}
            ListHeaderComponent={pending.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>未完了 ({pending.length})</Text>
              </View>
            ) : null}
            ListFooterComponent={done.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>完了済み ({done.length})</Text>
                </View>
                {done.map(item => (
                  <View key={item.id}>{renderItem({ item })}</View>
                ))}
              </>
            ) : null}
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingTodo ? 'タスクを編集' : 'タスクを追加'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalDone, saving && styles.disabled]}>
                {saving ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>タスク名 *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="例: 買い物に行く"
              placeholderTextColor={Colors.textSecondary}
              autoFocus
            />
            <Text style={styles.label}>期限 (任意)</Text>
            <DatePickerField value={dueDate} onChange={setDueDate} placeholder="期限なし" />
            {dueDate ? (
              <TouchableOpacity onPress={() => setDueDate('')}>
                <Text style={styles.clearDate}>期限をクリア</Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function isOverdue(todo: Todo): boolean {
  if (!todo.due_date || todo.done) return false;
  return todo.due_date < new Date().toISOString().split('T')[0];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  page: { flex: 1 },
  pageDesktop: { maxWidth: 800, alignSelf: 'center', width: '100%', paddingHorizontal: 24, paddingTop: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, padding: 12,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
  },
  headerDesktop: { padding: 16 },
  headerCount: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, borderRadius: 8, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  list: { paddingVertical: 8 },
  sectionHeader: { paddingVertical: 8, paddingHorizontal: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    padding: 12, marginBottom: 8, gap: 12,
  },
  itemDone: { opacity: 0.6 },
  checkbox: { padding: 2 },
  checkboxInner: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  itemTitleDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  itemDue: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  itemDueOverdue: { color: '#e53e3e', fontWeight: '600' },
  deleteText: { fontSize: 14, color: Colors.primaryDark, fontWeight: '700' },
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
  modalBody: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, padding: 12, minHeight: 44, fontSize: 16, color: Colors.text,
  },
  clearDate: { fontSize: 13, color: Colors.error, marginTop: 6, textAlign: 'center' },
});
