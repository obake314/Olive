import { Tabs, router } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/components/Colors';
import { useAuth } from '../../src/context/AuthContext';

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
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.background,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
            <Text style={{ color: Colors.background, fontSize: 14 }}>{user?.name} ログアウト</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'カレンダー',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
          headerTitle: 'Olive 献立カレンダー',
        }}
      />
      <Tabs.Screen
        name="dishes"
        options={{
          title: '料理',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
          headerTitle: 'Olive 料理',
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: '買い物',
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
          headerTitle: 'Olive 買い物',
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{
          title: 'TODO',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle-outline" size={size} color={color} />,
          headerTitle: 'Olive TODO',
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: '家族',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
          headerTitle: 'Olive 家族',
        }}
      />
    </Tabs>
  );
}
