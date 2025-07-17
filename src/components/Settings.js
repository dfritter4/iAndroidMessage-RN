import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import apiClient from '../services/apiClient';

function Settings({ 
  visible, 
  onClose, 
  serverUrl, 
  onServerUrlChange, 
  deletedThreadsCount,
  onRestoreAllChats 
}) {
  const [tempUrl, setTempUrl] = useState(serverUrl);
  const [testing, setTesting] = useState(false);

  const handleTestConnection = async () => {
    if (!tempUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    setTesting(true);
    try {
      const originalUrl = apiClient.baseURL;
      apiClient.baseURL = tempUrl;
      apiClient.client.defaults.baseURL = tempUrl;
      
      await apiClient.testConnection();
      
      Alert.alert('Success', 'Connection test successful!');
    } catch (error) {
      Alert.alert('Connection Failed', error.message);
      
      // Restore original URL if test failed
      apiClient.baseURL = serverUrl;
      apiClient.client.defaults.baseURL = serverUrl;
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!tempUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    onServerUrlChange(tempUrl.trim());
    onClose();
  };

  const handleRestoreChats = () => {
    Alert.alert(
      'Restore All Chats',
      `This will restore ${deletedThreadsCount} deleted conversations. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore', 
          style: 'destructive',
          onPress: () => {
            onRestoreAllChats();
            Alert.alert('Success', 'All chats have been restored');
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Server Configuration</Text>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={tempUrl}
              onChangeText={setTempUrl}
              placeholder="http://192.168.1.203:5001"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.testButton, testing && styles.testButtonDisabled]}
              onPress={handleTestConnection}
              disabled={testing}
            >
              <Text style={styles.testButtonText}>
                {testing ? 'Testing...' : 'Test Connection'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chat Management</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Deleted Chats</Text>
                <Text style={styles.settingDescription}>
                  {deletedThreadsCount} conversations hidden
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.restoreButton,
                  deletedThreadsCount === 0 && styles.restoreButtonDisabled
                ]}
                onPress={handleRestoreChats}
                disabled={deletedThreadsCount === 0}
              >
                <Text style={[
                  styles.restoreButtonText,
                  deletedThreadsCount === 0 && styles.restoreButtonTextDisabled
                ]}>
                  Restore All
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.aboutText}>
              iAndroidMessage React Native{'\n'}
              Version 1.0.0{'\n\n'}
              A mobile client for iMessage server proxy
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  testButtonDisabled: {
    backgroundColor: '#ccc',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  restoreButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  restoreButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  restoreButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  restoreButtonTextDisabled: {
    color: '#999',
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default Settings;