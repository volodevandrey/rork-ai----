import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/max/AuthScreen';
import { StoriesScreen } from '@/components/max/StoriesScreen';
import { useMax } from '@/providers/MaxProvider';

export default function HomeScreen() {
  const { phase } = useMax();
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {phase === 'signedIn' ? <StoriesScreen /> : <AuthScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#0B1020', flex: 1 },
});
