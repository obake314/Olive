import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Alert, Modal, TextInput, ScrollView, Linking, useWindowDimensions, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/components/Colors';
import { LoadingView } from '../../src/components/LoadingView';
import { EmptyState } from '../../src/components/EmptyState';
import { useDishes } from '../../src/hooks/useDishes';
import { recipeApi } from '../../src/api/client';
import { Dish } from '../../src/types';

interface IngredientInput {
  name: string;
  quantity: string;
  unit: string;
}

const EMPTY_INGREDIENT: IngredientInput = { name: '', quantity: '', unit: '' };

const PRESET_TAGS = ['和食', '洋食', '中華', '麺類', '汁物', '揚げ物', '焼き物', '煮物', '丼', 'サラダ', 'デザート', '簡単', 'ヘルシー'];

async function pickAndCompressImage(): Promise<string | undefined> {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラロールへのアクセス権限が必要です');
      return undefined;
    }
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return undefined;
  const asset = result.assets[0];
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 800 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return manipulated.base64 ? `data:image/jpeg;base64,${manipulated.base64}` : undefined;
}

export default function DishesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const isWideDesktop = width >= 1200;
  const { dishes, loading, reload, createDish, updateDish, deleteDish } = useDishes();

  // 確認モーダル
  const [detailDish, setDetailDish] = useState<Dish | null>(null);

  // 編集モーダル
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [recipeText, setRecipeText] = useState('');
  const [recipeMemo, setRecipeMemo] = useState('');
  const [imageData, setImageData] = useState<string | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [ingredients, setIngredients] = useState<IngredientInput[]>([{ ...EMPTY_INGREDIENT }]);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const allTags = [...new Set(dishes.flatMap(d => d.tags || []))].sort();

  const filtered = dishes.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
      || (d.description || '').toLowerCase().includes(search.toLowerCase());
    const matchTag = !selectedTag || (d.tags || []).includes(selectedTag);
    return matchSearch && matchTag;
  });

  const openAdd = () => {
    setEditingDish(null);
    setName(''); setDescription(''); setRecipeUrl(''); setRecipeText(''); setRecipeMemo('');
    setImageData(undefined); setTags([]); setCustomTag('');
    setIngredients([{ ...EMPTY_INGREDIENT }]);
    setEditModalVisible(true);
  };

  const openEdit = (dish: Dish) => {
    setDetailDish(null);
    setEditingDish(dish);
    setName(dish.name);
    setDescription(dish.description || '');
    setRecipeUrl(dish.recipe_url || '');
    setRecipeText(dish.recipe_text || '');
    setRecipeMemo(dish.recipe_memo || '');
    setImageData(dish.image_data || undefined);
    setTags(dish.tags || []);
    setCustomTag('');
    setIngredients(
      dish.ingredients.length > 0
        ? dish.ingredients.map(i => ({ name: i.name, quantity: String(i.quantity || ''), unit: i.unit }))
        : [{ ...EMPTY_INGREDIENT }]
    );
    setEditModalVisible(true);
  };

  const handlePickImage = async () => {
    const data = await pickAndCompressImage();
    if (data) setImageData(data);
  };

  const handleExtract = async () => {
    if (!recipeUrl.trim()) { Alert.alert('エラー', 'レシピURLを入力してください'); return; }
    setExtracting(true);
    try {
      const result = await recipeApi.extract(recipeUrl.trim());
      if (result.name && !name.trim()) setName(result.name);
      if (result.description && !description.trim()) setDescription(result.description);
      if (result.ingredients.length > 0) {
        setIngredients(result.ingredients.map(i => ({
          name: i.name, quantity: i.quantity > 0 ? String(i.quantity) : '', unit: i.unit,
        })));
      }
      if (result.recipe_text && !recipeText.trim()) setRecipeText(result.recipe_text);
    } catch (e: any) {
      Alert.alert('抽出失敗', e.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('エラー', '料理名を入力してください'); return; }
    setSaving(true);
    try {
      const ingredientData = ingredients
        .filter(i => i.name.trim())
        .map(i => ({ name: i.name.trim(), quantity: parseFloat(i.quantity) || 0, unit: i.unit.trim() }));
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        recipe_url: recipeUrl.trim() || undefined,
        recipe_text: recipeText.trim() || undefined,
        recipe_memo: recipeMemo.trim() || undefined,
        image_data: imageData,
        tags,
        ingredients: ingredientData,
      };
      if (editingDish) {
        await updateDish(editingDish.id, payload);
      } else {
        await createDish(payload);
      }
      setEditModalVisible(false);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (dish: Dish) => {
    const id = dish.id;
    const dishName = dish.name;
    setDetailDish(null);
    setTimeout(() => {
      Alert.alert('削除確認', `「${dishName}」を削除しますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: async () => {
          try { await deleteDish(id); }
          catch (e: any) { Alert.alert('エラー', e.message); }
        }},
      ]);
    }, 300);
  };

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setCustomTag('');
  };

  const updateIngredient = (idx: number, field: keyof IngredientInput, value: string) => {
    setIngredients(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const addIngredientRow = () => setIngredients(prev => [...prev, { ...EMPTY_INGREDIENT }]);
  const removeIngredientRow = (idx: number) => setIngredients(prev => prev.filter((_, i) => i !== idx));

  return (
    <View style={styles.container}>
      <View style={[styles.page, isDesktop && styles.pageDesktop]}>
        {/* 検索バー */}
        <View style={[styles.searchBar, isDesktop && styles.searchBarDesktop]}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="料理名・概要を検索..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={Colors.textSecondary}
            />
            <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
              <Ionicons name="add" size={20} color={Colors.background} />
              <Text style={styles.addBtnText}>追加</Text>
            </TouchableOpacity>
          </View>
          {allTags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagFilterBar} contentContainerStyle={styles.tagFilterContent}>
              <TouchableOpacity
                style={[styles.tagFilterChip, !selectedTag && styles.tagFilterChipActive]}
                onPress={() => setSelectedTag('')}
              >
                <Text style={[styles.tagFilterText, !selectedTag && styles.tagFilterTextActive]}>すべて</Text>
              </TouchableOpacity>
              {allTags.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagFilterChip, selectedTag === tag && styles.tagFilterChipActive]}
                  onPress={() => setSelectedTag(prev => prev === tag ? '' : tag)}
                >
                  <Text style={[styles.tagFilterText, selectedTag === tag && styles.tagFilterTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.listPanel}>
          {loading ? <LoadingView /> : filtered.length === 0 ? (
            <EmptyState title="料理がありません" subtitle="「追加」ボタンから料理を登録しましょう" />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={d => d.id}
              contentContainerStyle={styles.list}
              numColumns={isWideDesktop ? 3 : isDesktop ? 2 : 1}
              key={isWideDesktop ? '3-col' : isDesktop ? '2-col' : '1-col'}
              columnWrapperStyle={isDesktop ? styles.columnWrap : undefined}
              renderItem={({ item }) => (
                <View style={[styles.cardWrap, isDesktop && styles.cardWrapDesktop, isWideDesktop && styles.cardWrapWide]}>
                  <View style={styles.card}>
                    <TouchableOpacity style={styles.cardMain} onPress={() => setDetailDish(item)}>
                      {item.image_data ? (
                        <Image source={{ uri: item.image_data }} style={styles.cardImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.cardImagePlaceholder}>
                          <Ionicons name="restaurant-outline" size={28} color={Colors.border} />
                        </View>
                      )}
                      <View style={styles.cardBody}>
                        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                        {item.description ? (
                          <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
                        ) : null}
                        {item.tags.length > 0 && (
                          <View style={styles.tagList}>
                            {item.tags.slice(0, 3).map(tag => (
                              <View key={tag} style={styles.tagChip}>
                                <Text style={styles.tagText}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.cardActionBtn} onPress={() => openEdit(item)}>
                        <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                      </TouchableOpacity>
                      <View style={styles.cardActionDivider} />
                      <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>

      {/* 確認モーダル */}
      <Modal visible={!!detailDish} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={{ width: 90 }} />
            <Text style={styles.modalTitle} numberOfLines={1}>{detailDish?.name ?? ''}</Text>
            <TouchableOpacity onPress={() => setDetailDish(null)} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
              <Text style={styles.closeBtnText}>閉じる</Text>
            </TouchableOpacity>
          </View>
          {detailDish && (
            <ScrollView style={styles.modalBody}>
              {detailDish.image_data ? (
                <Image source={{ uri: detailDish.image_data }} style={styles.detailImage} resizeMode="cover" />
              ) : null}
              <Text style={styles.detailName}>{detailDish.name}</Text>
              {detailDish.description ? (
                <Text style={styles.detailDescription}>{detailDish.description}</Text>
              ) : null}
              {detailDish.tags.length > 0 && (
                <View style={[styles.tagList, { marginVertical: 8 }]}>
                  {detailDish.tags.map(tag => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
              {detailDish.recipe_url ? (
                <TouchableOpacity style={styles.detailUrlRow} onPress={() => Linking.openURL(detailDish.recipe_url!)}>
                  <Ionicons name="link-outline" size={14} color={Colors.primary} />
                  <Text style={styles.detailUrl} numberOfLines={1}>{detailDish.recipe_url}</Text>
                </TouchableOpacity>
              ) : null}
              {detailDish.ingredients.length > 0 && (
                <>
                  <Text style={styles.detailSectionTitle}>材料</Text>
                  {detailDish.ingredients.map((ing, i) => (
                    <View key={i} style={styles.detailIngredientRow}>
                      <Text style={styles.detailIngredientName}>{ing.name}</Text>
                      <Text style={styles.detailIngredientQty}>
                        {ing.quantity > 0 ? `${ing.quantity} ${ing.unit}` : ing.unit || '適量'}
                      </Text>
                    </View>
                  ))}
                </>
              )}
              {detailDish.recipe_text ? (
                <>
                  <Text style={styles.detailSectionTitle}>作り方</Text>
                  <Text style={styles.detailRecipe}>{detailDish.recipe_text}</Text>
                </>
              ) : null}
              {detailDish.recipe_memo ? (
                <>
                  <Text style={styles.detailSectionTitle}>メモ</Text>
                  <Text style={styles.detailRecipe}>{detailDish.recipe_memo}</Text>
                </>
              ) : null}
              <View style={styles.detailActions}>
                <TouchableOpacity style={styles.detailEditBtn} onPress={() => openEdit(detailDish)}>
                  <Ionicons name="pencil-outline" size={16} color="#fff" />
                  <Text style={styles.detailEditBtnText}>編集</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.detailDeleteBtn} onPress={() => handleDelete(detailDish)}>
                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  <Text style={styles.detailDeleteBtnText}>削除</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* 編集モーダル */}
      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
              <Text style={styles.closeBtnText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingDish ? '料理を編集' : '料理を追加'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
              <Text style={[styles.saveBtnText, saving && styles.disabled]}>
                {saving ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* 画像 */}
            <Text style={styles.label}>料理の画像</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
              {imageData ? (
                <Image source={{ uri: imageData }} style={styles.imagePreview} resizeMode="cover" />
              ) : (
                <View style={styles.imagePickerEmpty}>
                  <Ionicons name="camera-outline" size={32} color={Colors.border} />
                  <Text style={styles.imagePickerText}>タップして画像を選択</Text>
                </View>
              )}
            </TouchableOpacity>
            {imageData && (
              <TouchableOpacity onPress={() => setImageData(undefined)} style={styles.removeImageBtn}>
                <Ionicons name="trash-outline" size={14} color={Colors.error} />
                <Text style={styles.removeImageText}>画像を削除</Text>
              </TouchableOpacity>
            )}

            {/* 料理名 */}
            <Text style={styles.label}>料理名 *</Text>
            <TextInput
              style={styles.input} value={name} onChangeText={setName}
              placeholder="例: 肉じゃが" placeholderTextColor={Colors.textSecondary}
            />

            {/* タグ */}
            <Text style={styles.label}>タグ</Text>
            <View style={styles.presetTagList}>
              {PRESET_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.presetTagChip, tags.includes(tag) && styles.presetTagChipActive]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.presetTagText, tags.includes(tag) && styles.presetTagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customTagRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={customTag} onChangeText={setCustomTag}
                placeholder="カスタムタグ"
                placeholderTextColor={Colors.textSecondary}
                onSubmitEditing={addCustomTag}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addTagBtn} onPress={addCustomTag}>
                <Text style={styles.addTagBtnText}>追加</Text>
              </TouchableOpacity>
            </View>
            {tags.length > 0 && (
              <View style={[styles.tagList, { marginBottom: 4 }]}>
                {tags.map(tag => (
                  <TouchableOpacity key={tag} style={styles.tagChipRemovable} onPress={() => toggleTag(tag)}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <Ionicons name="close" size={11} color={Colors.primaryDark} style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* レシピURL */}
            <Text style={styles.label}>レシピURL</Text>
            <TextInput
              style={styles.input} value={recipeUrl} onChangeText={setRecipeUrl}
              placeholder="https://..." keyboardType="url" autoCapitalize="none"
              placeholderTextColor={Colors.textSecondary}
            />
            <TouchableOpacity
              style={[styles.extractBtn, extracting && styles.disabled]}
              onPress={handleExtract} disabled={extracting}
            >
              <Ionicons name="download-outline" size={16} color={Colors.primary} />
              <Text style={styles.extractBtnText}>
                {extracting ? '抽出中...' : 'URLから料理名・材料・手順を抽出'}
              </Text>
            </TouchableOpacity>

            {/* 概要 */}
            <Text style={styles.label}>概要</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              value={description} onChangeText={setDescription}
              placeholder="料理の簡単な説明（カードに表示されます）"
              multiline numberOfLines={2}
              textAlignVertical="top"
              placeholderTextColor={Colors.textSecondary}
            />

            {/* 材料 */}
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>材料</Text>
              <TouchableOpacity onPress={addIngredientRow} style={styles.addIngredientBtn}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.addIngredientBtnText}>追加</Text>
              </TouchableOpacity>
            </View>
            {ingredients.map((ing, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <TextInput
                  style={[styles.input, styles.ingredientName]}
                  value={ing.name} onChangeText={v => updateIngredient(idx, 'name', v)}
                  placeholder="材料名" placeholderTextColor={Colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, styles.ingredientQty]}
                  value={ing.quantity} onChangeText={v => updateIngredient(idx, 'quantity', v)}
                  placeholder="数量" keyboardType="decimal-pad"
                  placeholderTextColor={Colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, styles.ingredientUnit]}
                  value={ing.unit} onChangeText={v => updateIngredient(idx, 'unit', v)}
                  placeholder="単位" placeholderTextColor={Colors.textSecondary}
                />
                {ingredients.length > 1 && (
                  <TouchableOpacity onPress={() => removeIngredientRow(idx)} style={styles.removeBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Ionicons name="close-circle" size={20} color={Colors.border} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* 作り方 */}
            <Text style={styles.label}>作り方</Text>
            <TextInput
              style={[styles.input, styles.recipeTextInput]}
              value={recipeText} onChangeText={setRecipeText}
              placeholder="手順を入力..."
              multiline numberOfLines={6}
              textAlignVertical="top" placeholderTextColor={Colors.textSecondary}
            />

            {/* メモ */}
            <Text style={styles.label}>メモ</Text>
            <TextInput
              style={[styles.input, styles.recipeTextInput]}
              value={recipeMemo} onChangeText={setRecipeMemo}
              placeholder="コツやポイントなど..."
              multiline numberOfLines={4}
              textAlignVertical="top" placeholderTextColor={Colors.textSecondary}
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  page: { flex: 1, width: '100%', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  pageDesktop: { maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  searchBar: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    padding: 10, gap: 8, marginBottom: 10,
  },
  searchBarDesktop: { padding: 14 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44,
    borderRadius: 8, justifyContent: 'center',
  },
  addBtnText: { color: Colors.background, fontWeight: '700', fontSize: 15 },
  tagFilterBar: { maxHeight: 40 },
  tagFilterContent: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  tagFilterChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  tagFilterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  tagFilterText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  tagFilterTextActive: { color: Colors.primaryDark },
  listPanel: { flex: 1, minHeight: 0 },
  list: { paddingVertical: 4 },
  columnWrap: { gap: 10, marginBottom: 10 },
  cardWrap: { width: '100%', marginBottom: 10 },
  cardWrapDesktop: { flex: 1 },
  cardWrapWide: { flex: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
    elevation: 2, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'stretch',
  },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  cardImage: { width: 86, height: 86 },
  cardImagePlaceholder: {
    width: 86, height: 86, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, padding: 10, justifyContent: 'center', gap: 4 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardDescription: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  cardActions: {
    width: 36, flexDirection: 'column', borderLeftWidth: 1, borderLeftColor: Colors.border,
  },
  cardActionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardActionDivider: { height: 1, backgroundColor: Colors.border },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tagChip: {
    backgroundColor: Colors.primaryLight, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.primary,
  },
  tagChipRemovable: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primaryLight, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.primary,
  },
  tagText: { fontSize: 11, color: Colors.primaryDark, fontWeight: '600' },
  // 確認モーダル
  detailImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12 },
  detailName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  detailDescription: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 4 },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailIngredientRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailIngredientName: { fontSize: 15, color: Colors.text },
  detailIngredientQty: { fontSize: 15, color: Colors.textSecondary },
  detailUrlRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: 6 },
  detailUrl: { flex: 1, fontSize: 13, color: Colors.primary },
  detailRecipe: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  detailEditBtn: {
    flex: 1, backgroundColor: Colors.primary, paddingVertical: 11,
    borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  detailEditBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  detailDeleteBtn: {
    flex: 1, borderWidth: 1, borderColor: Colors.error, paddingVertical: 11,
    borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  detailDeleteBtnText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
  // モーダル共通
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, flex: 1, textAlign: 'center' },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 90 },
  closeBtnText: { fontSize: 14, color: Colors.textSecondary },
  saveBtn: { minWidth: 90, alignItems: 'flex-end' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  disabled: { opacity: 0.4 },
  modalBody: { paddingHorizontal: 16, paddingTop: 4 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 },
  imagePicker: {
    height: 150, borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, overflow: 'hidden',
  },
  imagePickerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: { fontSize: 14, color: Colors.textSecondary },
  removeImageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'center' },
  removeImageText: { fontSize: 13, color: Colors.error },
  input: {
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10,
    minHeight: 44, fontSize: 15, color: Colors.text,
  },
  presetTagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  presetTagChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  presetTagChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  presetTagText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  presetTagTextActive: { color: Colors.primaryDark },
  customTagRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 },
  addTagBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 8, justifyContent: 'center',
  },
  addTagBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  extractBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 8, paddingVertical: 10, paddingHorizontal: 14,
    minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary,
  },
  extractBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 6 },
  addIngredientBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  addIngredientBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  ingredientRow: { flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' },
  ingredientName: { flex: 2, minWidth: 0 },
  ingredientQty: { flex: 1, minWidth: 0 },
  ingredientUnit: { flex: 1, minWidth: 0 },
  removeBtn: { padding: 2 },
  recipeTextInput: { minHeight: 110, lineHeight: 22 },
});
