import React, { useState } from 'react';
import { Tabs, router } from 'expo-router';
import {
  TouchableOpacity, View, Text, Modal, StyleSheet, ScrollView, Alert,
  TextInput, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/components/Colors';
import { useAuth } from '../../src/context/AuthContext';
import { familyApi } from '../../src/api/client';
import { Family, FamilyMember } from '../../src/types';

async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    // Web: fetch で blob → FileReader で base64 に変換
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 200 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return manipulated.base64 ? `data:image/jpeg;base64,${manipulated.base64}` : uri;
}

async function pickAvatar(): Promise<string | undefined> {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return undefined;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return undefined;
  try {
    return await uriToBase64(result.assets[0].uri);
  } catch {
    return undefined;
  }
}

function SettingsModal({ visible, onClose, onLogout }: {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const { user, updateProfile, requestEmailChange } = useAuth();
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | undefined>(undefined);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [emailSection, setEmailSection] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Family state
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [familyName, setFamilyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [inviting, setInviting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      familyApi.get().then(d => { setFamily(d.family); setMembers(d.members); }).catch(() => {});
    }
  }, [visible]);

  const handleCreateFamily = async () => {
    if (!familyName.trim()) return;
    setCreatingFamily(true);
    try {
      await familyApi.create(familyName.trim());
      setFamilyName('');
      const d = await familyApi.get();
      setFamily(d.family); setMembers(d.members);
    } catch (e: any) { Alert.alert('エラー', e.message); }
    finally { setCreatingFamily(false); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await familyApi.invite(inviteEmail.trim());
      Alert.alert('送信完了', res.message);
      setInviteEmail('');
    } catch (e: any) { Alert.alert('エラー', e.message); }
    finally { setInviting(false); }
  };

  const handleLeaveFamily = () => {
    Alert.alert('グループから離脱', '家族グループから離脱しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '離脱する', style: 'destructive', onPress: async () => {
        try {
          await familyApi.leave();
          const d = await familyApi.get();
          setFamily(d.family); setMembers(d.members);
        } catch (e: any) { Alert.alert('エラー', e.message); }
      }},
    ]);
  };

  const openProfileEdit = () => {
    setEditName(user?.name ?? '');
    setEditAvatar(user?.avatar_data);
    setEditingProfile(true);
  };

  const handlePickAvatar = async () => {
    const data = await pickAvatar();
    if (data) setEditAvatar(data);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setSavingProfile(true);
    try {
      await updateProfile({ name: editName.trim(), avatar_data: editAvatar });
      setEditingProfile(false);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail.trim() || !emailPassword) return;
    setSendingEmail(true);
    try {
      const res = await requestEmailChange(newEmail.trim(), emailPassword);
      Alert.alert('送信完了', res.message);
      setEmailSection(false);
      setNewEmail('');
      setEmailPassword('');
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const avatarUri = editingProfile ? editAvatar : user?.avatar_data;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <View style={{ width: 60 }} />
          <Text style={styles.modalTitle}>設定</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 60, alignItems: 'flex-end' }}>
            <Text style={styles.modalClose}>閉じる</Text>
          </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">
          {/* アカウント */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>アカウント</Text>

            {/* アバター */}
            <View style={styles.avatarRow}>
              <TouchableOpacity onPress={editingProfile ? handlePickAvatar : undefined}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={32} color={Colors.textSecondary} />
                  </View>
                )}
                {editingProfile && (
                  <View style={styles.avatarEditBadge}>
                    <Ionicons name="camera" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.avatarInfo}>
                {editingProfile ? (
                  <TextInput
                    style={styles.nameInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="名前"
                    placeholderTextColor={Colors.textSecondary}
                  />
                ) : (
                  <Text style={styles.avatarName}>{user?.name}</Text>
                )}
                <Text style={styles.avatarEmail}>{user?.email}</Text>
              </View>
            </View>

            {editingProfile ? (
              <View style={styles.profileBtns}>
                <TouchableOpacity style={styles.profileCancelBtn} onPress={() => setEditingProfile(false)}>
                  <Text style={styles.profileCancelBtnText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.profileSaveBtn, savingProfile && styles.disabled]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  <Text style={styles.profileSaveBtnText}>{savingProfile ? '保存中...' : '保存'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.editProfileBtn} onPress={openProfileEdit}>
                <Text style={styles.editProfileBtnText}>プロフィールを編集</Text>
              </TouchableOpacity>
            )}

            {/* メールアドレス変更 */}
            {!editingProfile && (
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setEmailSection(v => !v)}
              >
                <Text style={styles.settingsLabel}>メールアドレス変更</Text>
                <Ionicons name={emailSection ? 'chevron-up' : 'chevron-forward'} size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
            {emailSection && !editingProfile && (
              <View style={styles.emailSection}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="新しいメールアドレス"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={Colors.textSecondary}
                />
                <TextInput
                  style={styles.emailInput}
                  placeholder="現在のパスワード"
                  value={emailPassword}
                  onChangeText={setEmailPassword}
                  secureTextEntry
                  placeholderTextColor={Colors.textSecondary}
                />
                <TouchableOpacity
                  style={[styles.emailSendBtn, (!newEmail.trim() || !emailPassword || sendingEmail) && styles.disabled]}
                  onPress={handleRequestEmailChange}
                  disabled={!newEmail.trim() || !emailPassword || sendingEmail}
                >
                  <Text style={styles.emailSendBtnText}>{sendingEmail ? '送信中...' : '確認メールを送信'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                Alert.alert('ログアウト', 'ログアウトしますか？', [
                  { text: 'キャンセル', style: 'cancel' },
                  { text: 'ログアウト', style: 'destructive', onPress: onLogout },
                ]);
              }}
            >
              <Text style={styles.logoutBtnText}>ログアウト</Text>
            </TouchableOpacity>
          </View>

          {/* 家族設定 */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>家族設定</Text>
            {!family ? (
              <View style={styles.familyBlock}>
                <Text style={styles.familyDesc}>グループを作成して家族を招待すると、献立・TODO・料理を共有できます。</Text>
                <TextInput
                  style={styles.settingsInput}
                  value={familyName}
                  onChangeText={setFamilyName}
                  placeholder="グループ名 (例: 岡崎家)"
                  placeholderTextColor={Colors.textSecondary}
                />
                <TouchableOpacity
                  style={[styles.familyBtn, creatingFamily && styles.disabled]}
                  onPress={handleCreateFamily} disabled={creatingFamily}
                >
                  <Text style={styles.familyBtnText}>{creatingFamily ? '作成中...' : 'グループを作成'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.familyBlock}>
                  <View style={styles.familyHeaderRow}>
                    <Text style={styles.familyName}>{family.name}</Text>
                    <TouchableOpacity onPress={handleLeaveFamily}>
                      <Text style={styles.leaveText}>離脱</Text>
                    </TouchableOpacity>
                  </View>
                  {members.map(m => (
                    <View key={m.id} style={styles.memberRow}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>{m.name.charAt(0)}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{m.name}{m.id === user?.id ? ' (あなた)' : ''}</Text>
                        <Text style={styles.memberEmail}>{m.email}</Text>
                      </View>
                      {m.status === 'pending' && (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingText}>招待中</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
                <View style={[styles.familyBlock, styles.familyBlockBorder]}>
                  <Text style={styles.familyDesc}>メールアドレスに招待リンクを送信します。</Text>
                  <TextInput
                    style={styles.settingsInput}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    placeholder="family@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  <TouchableOpacity
                    style={[styles.familyBtn, inviting && styles.disabled]}
                    onPress={handleInvite} disabled={inviting}
                  >
                    <Text style={styles.familyBtnText}>{inviting ? '送信中...' : '招待メールを送る'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function TabLayout() {
  const { logout } = useAuth();
  const [settingsVisible, setSettingsVisible] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const headerRight = () => (
    <TouchableOpacity onPress={() => setSettingsVisible(true)} style={{ marginRight: 16, padding: 4 }}>
      <Ionicons name="settings-outline" size={22} color={Colors.background} />
    </TouchableOpacity>
  );

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            paddingBottom: 4,
            height: 60,
          },
          tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.background,
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          headerRight,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'ホーム',
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
            headerTitle: 'Olive',
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'カレンダー',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
            headerTitle: 'カレンダー',
          }}
        />
        <Tabs.Screen
          name="dishes"
          options={{
            title: '料理',
            tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
            headerTitle: '料理',
          }}
        />
        <Tabs.Screen
          name="shopping"
          options={{
            title: '買い物',
            tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
            headerTitle: '買い物',
          }}
        />
        <Tabs.Screen
          name="todo"
          options={{
            title: 'TODO',
            tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle-outline" size={size} color={color} />,
            headerTitle: 'TODO',
          }}
        />
        <Tabs.Screen
          name="family"
          options={{ href: null }}
        />
      </Tabs>

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onLogout={() => { setSettingsVisible(false); handleLogout(); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.background },
  modalClose: { fontSize: 15, color: Colors.background, fontWeight: '600' },
  settingsSection: {
    margin: 16, marginBottom: 0, backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  settingsSectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textSecondary,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, letterSpacing: 0.5,
  },
  avatarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.primary, borderRadius: 8,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  avatarInfo: { flex: 1 },
  avatarName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  avatarEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  nameInput: {
    backgroundColor: Colors.background, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, color: Colors.text,
  },
  profileBtns: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 12 },
  profileCancelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  profileCancelBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  profileSaveBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center' },
  profileSaveBtnText: { color: '#fff', fontWeight: '700' },
  editProfileBtn: { marginHorizontal: 16, marginBottom: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center' },
  editProfileBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 15 },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  settingsLabel: { fontSize: 15, color: Colors.text },
  emailSection: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  emailInput: {
    backgroundColor: Colors.background, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.text,
  },
  emailSendBtn: {
    backgroundColor: Colors.primary, paddingVertical: 12,
    borderRadius: 8, alignItems: 'center',
  },
  emailSendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    margin: 16, marginTop: 8, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.error, alignItems: 'center',
  },
  logoutBtnText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.4 },
  familyBlock: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 },
  familyBlockBorder: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 14 },
  familyHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  familyName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  familyDesc: { fontSize: 14, color: Colors.textSecondary, marginBottom: 10, lineHeight: 20 },
  familyBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  familyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  settingsInput: {
    backgroundColor: Colors.background, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.text, marginBottom: 10,
  },
  leaveText: { fontSize: 14, color: Colors.error, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  memberEmail: { fontSize: 12, color: Colors.textSecondary },
  pendingBadge: { backgroundColor: Colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  pendingText: { fontSize: 12, color: Colors.primaryDark, fontWeight: '600' },
});
