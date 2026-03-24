import { Tabs, router } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../src/components/Colors';
import { useAuth } from '../../src/context/AuthContext';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconFocused]}>
      <Text style={[styles.iconLabel, focused && styles.iconLabelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.background,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
            <Text style={{ color: Colors.background, fontSize: 13 }}>{user?.name} ログアウト</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'カレンダー',
          tabBarIcon: ({ focused }) => <TabIcon label="週" focused={focused} />,
          headerTitle: 'Olive 献立カレンダー',
        }}
      />
      <Tabs.Screen
        name="dishes"
        options={{
          title: '料理マスタ',
          tabBarIcon: ({ focused }) => <TabIcon label="料" focused={focused} />,
          headerTitle: 'Olive 料理マスタ',
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: '買い物リスト',
          tabBarIcon: ({ focused }) => <TabIcon label="買" focused={focused} />,
          headerTitle: 'Olive 買い物リスト',
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{
          title: 'TODO',
          tabBarIcon: ({ focused }) => <TabIcon label="TO" focused={focused} />,
          headerTitle: 'Olive TODO',
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: '家族',
          tabBarIcon: ({ focused }) => <TabIcon label="家" focused={focused} />,
          headerTitle: 'Olive 家族',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: { padding: 4, borderRadius: 4 },
  iconFocused: { backgroundColor: Colors.primaryLight },
  iconLabel: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  iconLabelFocused: { color: Colors.primaryDark },
});
