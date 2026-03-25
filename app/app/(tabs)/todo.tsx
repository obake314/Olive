import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  TextInput, Modal, Alert, useWindowDimensions, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatePickerField } from '../../src/components/DatePickerField';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/components/Colors';
import { LoadingView } from '../../src/components/LoadingView';
import { EmptyState } from '../../src/components/EmptyState';
import { todosApi, familyApi, wishlistsApi } from '../../src/api/client';
import { Todo, FamilyMember, WishlistItem } from '../../src/types';

export default function TodoScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // Wishlist state
  const [wishlists, setWishlists] = useState<WishlistItem[]>([]);

  // Todo modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Wishlist modal
  const [wishModalVisible, setWishModalVisible] = useState(false);
  const [editingWish, setEditingWish] = useState<WishlistItem | null>(null);
  const [wishName, setWishName] = useState('');
  const [wishMemo, setWishMemo] = useState('');
  const [wishUrl, setWishUrl] = useState('');
  const [wishSaving, setWishSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [data, familyData, wishData] = await Promise.all([
        todosApi.list(),
        familyApi.get(),
        wishlistsApi.list(),
      ]);
      setTodos(data);
      setFamilyMembers(familyData.members);
      setWishlists(wishData);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  // --- Todo handlers ---
  const openAdd = () => {
    setEditingTodo(null);
    setTitle('');
    setNote('');
    setDueDate('');
    setAssigneeId('');
    setModalVisible(true);
  };

  const openEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setTitle(todo.title);
    setNote(todo.note || '');
    setDueDate(todo.due_date || '');
    setAssigneeId(todo.assignee_id || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('エラー', 'タイトルを入力してください'); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        note: note.trim() || undefined,
        due_date: dueDate.trim() || undefined,
        assignee_id: assigneeId || undefined,
      };
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
    const doDelete = async () => {
      try {
        await todosApi.delete(todo.id);
        setTodos(prev => prev.filter(t => t.id !== todo.id));
      } catch (e: any) {
        Alert.alert('エラー', e.message);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`「${todo.title}」を削除しますか？`)) doDelete();
    } else {
      Alert.alert('削除確認', `「${todo.title}」を削除しますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // --- Wishlist handlers ---
  const openAddWish = () => {
    setEditingWish(null);
    setWishName('');
    setWishMemo('');
    setWishUrl('');
    setWishModalVisible(true);
  };

  const openEditWish = (item: WishlistItem) => {
    setEditingWish(item);
    setWishName(item.name);
    setWishMemo(item.memo || '');
    setWishUrl(item.url || '');
    setWishModalVisible(true);
  };

  const handleSaveWish = async () => {
    if (!wishName.trim()) { Alert.alert('エラー', '名前を入力してください'); return; }
    setWishSaving(true);
    try {
      const payload = {
        name: wishName.trim(),
        memo: wishMemo.trim() || undefined,
        url: wishUrl.trim() || undefined,
      };
      if (editingWish) {
        const updated = await wishlistsApi.update(editingWish.id, payload);
        setWishlists(prev => prev.map(w => w.id === updated.id ? updated : w));
      } else {
        const created = await wishlistsApi.create(payload);
        setWishlists(prev => [created, ...prev]);
      }
      setWishModalVisible(false);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setWishSaving(false);
    }
  };

  const handleDeleteWish = (item: WishlistItem) => {
    const doDelete = async () => {
      try {
        await wishlistsApi.delete(item.id);
        setWishlists(prev => prev.filter(w => w.id !== item.id));
      } catch (e: any) {
        Alert.alert('エラー', e.message);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`「${item.name}」を削除しますか？`)) doDelete();
    } else {
      Alert.alert('削除確認', `「${item.name}」を削除しますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const hasFamily = familyMembers.length > 1;
  const pending = todos.filter(t => !t.done);
  const done = todos.filter(t => t.done);

  const renderTodoItem = ({ item }: { item: Todo }) => (
    <View style={[styles.item, !!item.done && styles.itemDone]}>
      <TouchableOpacity style={styles.checkboxWrap} onPress={() => handleToggle(item)}>
        <View style={[styles.checkboxInner, !!item.done && styles.checkboxChecked]}>
          {!!item.done && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
      <View style={styles.itemBody}>
        <Text style={[styles.itemTitle, !!item.done && styles.itemTitleDone]}>{item.title}</Text>
        {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
        {item.due_date && (
          <Text style={[styles.itemDue, isOverdue(item) && styles.itemDueOverdue]}>
            期限: {item.due_date}
          </Text>
        )}
        {hasFamily && item.assignee_name && (
          <Text style={styles.itemAssignee}>担当: {item.assignee_name}</Text>
        )}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => openEdit(item)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} style={styles.actionBtn}>
          <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWishItem = (item: WishlistItem) => (
    <View key={item.id} style={styles.wishItem}>
      <View style={styles.wishBody}>
        <Text style={styles.wishName}>{item.name}</Text>
        {item.memo ? <Text style={styles.wishMemo}>{item.memo}</Text> : null}
        {item.url ? <Text style={styles.wishUrl} numberOfLines={1}>{item.url}</Text> : null}
        {item.created_by_name ? (
          <Text style={styles.wishCreatedBy}>起票者: {item.created_by_name}</Text>
        ) : null}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => openEditWish(item)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} style={styles.actionBtn}>
          <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteWish(item)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListFooter = () => (
    <>
      {done.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>完了済み ({done.length})</Text>
          </View>
          {done.map(item => (
            <View key={item.id}>{renderTodoItem({ item })}</View>
          ))}
        </>
      )}

      {/* Wishlist section */}
      <View style={styles.wishlistSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>ウィッシュリスト ({wishlists.length})</Text>
          </View>
          <TouchableOpacity style={styles.sectionAddBtn} onPress={openAddWish}>
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.sectionAddBtnText}>追加</Text>
          </TouchableOpacity>
        </View>
        {wishlists.length === 0 ? (
          <Text style={styles.wishEmpty}>欲しいものを登録しましょう</Text>
        ) : (
          wishlists.map(renderWishItem)
        )}
      </View>
      <View style={{ height: 40 }} />
    </>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.page, isDesktop && styles.pageDesktop]}>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <Text style={styles.headerCount}>{pending.length}件のタスク</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>追加</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <LoadingView />
        ) : (
          <FlatList
            data={pending}
            keyExtractor={t => t.id}
            contentContainerStyle={styles.list}
            renderItem={renderTodoItem}
            ListEmptyComponent={
              todos.length === 0 ? (
                <EmptyState title="タスクがありません" subtitle="「追加」ボタンからタスクを登録しましょう" />
              ) : null
            }
            ListHeaderComponent={pending.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>未完了 ({pending.length})</Text>
              </View>
            ) : null}
            ListFooterComponent={<ListFooter />}
          />
        )}
      </View>

      {/* Todo modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
              <Text style={styles.closeBtnText}>キャンセル</Text>
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
            <Text style={styles.label}>メモ (任意)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={note}
              onChangeText={setNote}
              placeholder="詳細・補足など"
              placeholderTextColor={Colors.textSecondary}
              multiline
            />
            <Text style={styles.label}>期限 (任意)</Text>
            <DatePickerField value={dueDate} onChange={setDueDate} placeholder="期限なし" />
            {dueDate ? (
              <TouchableOpacity onPress={() => setDueDate('')}>
                <Text style={styles.clearDate}>期限をクリア</Text>
              </TouchableOpacity>
            ) : null}
            {hasFamily && (
              <>
                <Text style={styles.label}>担当者 (任意)</Text>
                <View style={styles.assigneeList}>
                  <TouchableOpacity
                    style={[styles.assigneeChip, !assigneeId && styles.assigneeChipActive]}
                    onPress={() => setAssigneeId('')}
                  >
                    <Text style={[styles.assigneeChipText, !assigneeId && styles.assigneeChipTextActive]}>
                      未割り当て
                    </Text>
                  </TouchableOpacity>
                  {familyMembers.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.assigneeChip, assigneeId === m.id && styles.assigneeChipActive]}
                      onPress={() => setAssigneeId(m.id)}
                    >
                      <Text style={[styles.assigneeChipText, assigneeId === m.id && styles.assigneeChipTextActive]}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Wishlist modal */}
      <Modal visible={wishModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setWishModalVisible(false)}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
              <Text style={styles.closeBtnText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingWish ? 'ウィッシュを編集' : 'ウィッシュを追加'}</Text>
            <TouchableOpacity onPress={handleSaveWish} disabled={wishSaving}>
              <Text style={[styles.modalDone, wishSaving && styles.disabled]}>
                {wishSaving ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>名前 *</Text>
            <TextInput
              style={styles.input}
              value={wishName}
              onChangeText={setWishName}
              placeholder="例: ワイヤレスイヤホン"
              placeholderTextColor={Colors.textSecondary}
              autoFocus
            />
            <Text style={styles.label}>メモ (任意)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={wishMemo}
              onChangeText={setWishMemo}
              placeholder="色・サイズなど"
              placeholderTextColor={Colors.textSecondary}
              multiline
            />
            <Text style={styles.label}>URL (任意)</Text>
            <TextInput
              style={styles.input}
              value={wishUrl}
              onChangeText={setWishUrl}
              placeholder="https://..."
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
            />
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
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 10,
    minHeight: 44, borderRadius: 8, justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  list: { paddingVertical: 8 },
  sectionHeader: { paddingVertical: 8, paddingHorizontal: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 4 },
  sectionAddBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    padding: 12, marginBottom: 8, gap: 12,
  },
  itemDone: { opacity: 0.6 },
  checkboxWrap: { padding: 2 },
  checkboxInner: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  itemTitleDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  itemNote: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  itemDue: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  itemDueOverdue: { color: '#e53e3e', fontWeight: '600' },
  itemAssignee: { fontSize: 12, color: Colors.primary, marginTop: 2, fontWeight: '600' },
  itemActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  // Wishlist
  wishlistSection: { marginTop: 16 },
  wishItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    padding: 12, marginBottom: 8,
  },
  wishBody: { flex: 1 },
  wishName: { fontSize: 15, color: Colors.text, fontWeight: '600' },
  wishMemo: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  wishUrl: { fontSize: 12, color: Colors.primary, marginTop: 2 },
  wishCreatedBy: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  wishEmpty: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 16 },
  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 80 },
  closeBtnText: { fontSize: 14, color: Colors.textSecondary },
  modalDone: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  disabled: { opacity: 0.4 },
  modalBody: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, padding: 12, minHeight: 44, fontSize: 16, color: Colors.text,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  clearDate: { fontSize: 13, color: Colors.error, marginTop: 6, textAlign: 'center' },
  assigneeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  assigneeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  assigneeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  assigneeChipText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  assigneeChipTextActive: { color: Colors.primaryDark },
});
