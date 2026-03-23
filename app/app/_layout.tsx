import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="dishes/[id]" options={{ headerShown: true, title: '料理詳細' }} />
        <Stack.Screen name="dishes/new" options={{ headerShown: true, title: '料理を追加' }} />
        <Stack.Screen name="meal-plan/add" options={{ headerShown: true, title: '献立を追加' }} />
      </Stack>
    </>
  );
}
