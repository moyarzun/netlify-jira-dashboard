/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */


import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button, FlatList, ActivityIndicator, StyleSheet, TextInput } from 'react-native';

// Cambia esta URL por la de tu backend accesible desde el dispositivo/emulador
const JIRA_API_URL = 'http://10.0.2.2:3000/api/jira/sprints'; // 10.0.2.2 para emulador Android local

const App = () => {
  const [projectKey, setProjectKey] = useState('');
  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSprints = async () => {
    if (!projectKey) {
      setError('Debes ingresar un projectKey');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(JIRA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectKey }),
      });
      if (!response.ok) throw new Error('Error al consultar sprints');
      const data = await response.json();
      setSprints(data.sprints || []);
    } catch (e: any) {
      setError(e.message || 'Error desconocido');
      setSprints([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Consultar Sprints de Jira</Text>
      <TextInput
        style={styles.input}
        placeholder="Project Key (ej: DEMO)"
        value={projectKey}
        onChangeText={setProjectKey}
        autoCapitalize="characters"
      />
      <Button title="Consultar Sprints" onPress={fetchSprints} />
      {loading && <ActivityIndicator size="large" style={{ margin: 16 }} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={sprints}
        keyExtractor={item => item.id?.toString()}
        renderItem={({ item }) => (
          <View style={styles.sprintItem}>
            <Text style={styles.sprintName}>{item.name}</Text>
            <Text style={styles.sprintState}>{item.state}</Text>
          </View>
        )}
        ListEmptyComponent={!loading && <Text style={{ marginTop: 24 }}>No hay sprints</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginBottom: 12 },
  sprintItem: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  sprintName: { fontWeight: 'bold', fontSize: 16 },
  sprintState: { color: '#666' },
  error: { color: 'red', marginVertical: 8 },
});

export default App;
