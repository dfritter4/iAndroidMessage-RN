import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

function ChatHeader({ onShowSettings, serverUrl, error }) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>
          {new URL(serverUrl).host}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={onShowSettings}
      >
        <Text style={styles.settingsText}>⚙️</Text>
      </TouchableOpacity>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  settingsButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
    borderRadius: 4,
  },
  settingsText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 4,
  },
  errorText: {
    color: '#721c24',
    textAlign: 'center',
  },
});

export default ChatHeader;