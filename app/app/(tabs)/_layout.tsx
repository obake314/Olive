import React, { useState } from 'react';
import { Tabs, router } from 'expo-router';
import { TouchableOpacity, View, Text, Modal, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/components/Colors';
import { useAuth } from '../../src/context/AuthContext';
import FamilyScreen from './family';

function SettingsModal({ visible, onClose, userName, onLogout }: {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  onLogout: () => void;
}) {
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
        <ScrollView>
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>アカウント</Text>
            <View style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>ユーザー名</Text>
              <Text style={styles.settingsValue}>{userName}</Text>
            </View>
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
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>家族設定</Text>
            <FamilyScreen />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function TabLayout() {
  const { user, logout } = useAuth();
  const [settingsVisible, setSettingsVisible] = useState(false);

  const handleLogout = () => {
    logout();
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
        userName={user?.name}
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
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  settingsLabel: { fontSize: 15, color: Colors.text },
  settingsValue: { fontSize: 15, color: Colors.textSecondary },
  logoutBtn: {
    margin: 16, marginTop: 8, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.error, alignItems: 'center',
  },
  logoutBtnText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
});
