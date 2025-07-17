import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatList from './components/ChatList';
import MessageView from './components/MessageView';
import Settings from './components/Settings';
import apiClient from './services/apiClient';
import { mockThreads, mockMessages } from './mockData';
import { storage } from './utils/storage';

function AppContent() {
  const insets = useSafeAreaInsets();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://192.168.1.203:5001');
  const [lastMessageCheck, setLastMessageCheck] = useState(null);
  const [deletedThreads, setDeletedThreads] = useState([]);
  const [showMessageView, setShowMessageView] = useState(false);

  // Load saved data on startup
  useEffect(() => {
    const loadSavedData = async () => {
      const savedUrl = await storage.getItem('winiMessage_serverUrl');
      const savedDeletedThreads = await storage.getItem('winiMessage_deletedThreads');
      
      if (savedUrl) {
        setServerUrl(savedUrl);
      }
      
      if (savedDeletedThreads) {
        setDeletedThreads(savedDeletedThreads);
      }
    };
    
    loadSavedData();
  }, []);

  const fetchThreads = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient.getThreads();
      const filteredThreads = (data.threads || [])
        .filter(thread => !deletedThreads.includes(thread.thread_guid))
        .sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated));
      setThreads(filteredThreads);
      setIsOnline(true);
    } catch (err) {
      console.error('Failed to fetch threads:', err);
      if (threads.length === 0) {
        setError('Failed to connect to server. Using offline mode.');
        setIsOnline(false);
        const filteredMockThreads = mockThreads
          .filter(thread => !deletedThreads.includes(thread.thread_guid))
          .sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated));
        setThreads(filteredMockThreads);
      } else {
        setError('Connection error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [deletedThreads, threads.length]);

  const fetchMessages = useCallback(async (threadGuid) => {
    console.log('fetchMessages called with threadGuid:', threadGuid);
    setMessagesLoading(true);
    try {
      setError(null);
      console.log('Making API call to get messages...');
      const data = await apiClient.getMessages(threadGuid);
      console.log('API response received:', data);
      setMessages(data.messages || []);
      setIsOnline(true);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load messages');
      const fallbackMessages = mockMessages[threadGuid] || [];
      console.log('Using fallback messages:', fallbackMessages);
      setMessages(fallbackMessages);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const checkForNewMessages = useCallback(async () => {
    if (!isOnline) return;
    
    try {
      const now = new Date().toISOString();
      const since = lastMessageCheck || new Date(Date.now() - 30000).toISOString();
      
      const data = await apiClient.getRecentMessages(20, since);
      
      if (data.messages && data.messages.length > 0) {
        await fetchThreads();
        
        if (selectedThread) {
          await fetchMessages(selectedThread.thread_guid);
        }
      }
      
      setLastMessageCheck(now);
      setIsOnline(true);
    } catch (err) {
      console.error('Failed to check for new messages:', err);
      setIsOnline(false);
    }
  }, [isOnline, lastMessageCheck, fetchThreads, fetchMessages, selectedThread]);

  useEffect(() => {
    console.log('Initializing with server URL:', serverUrl);
    apiClient.baseURL = serverUrl;
    apiClient.client.defaults.baseURL = serverUrl;
    fetchThreads();
  }, [serverUrl, fetchThreads]);

  useEffect(() => {
    const pollInterval = setInterval(checkForNewMessages, 5000);
    return () => clearInterval(pollInterval);
  }, [checkForNewMessages]);

  const handleThreadSelect = async (thread) => {
    console.log('Thread selected:', thread);
    
    const updatedThread = { ...thread, unread_count: 0 };
    setSelectedThread(updatedThread);
    setShowMessageView(true);
    
    setThreads(prevThreads => 
      prevThreads.map(t => 
        t.thread_guid === thread.thread_guid 
          ? { ...t, unread_count: 0 }
          : t
      )
    );
    
    setMessages([]);
    
    if (isOnline) {
      console.log('Fetching messages for thread:', thread.thread_guid);
      await fetchMessages(thread.thread_guid);
    } else {
      console.log('Offline mode - using mock messages');
      const threadMessages = mockMessages[thread.thread_guid] || [];
      setMessages(threadMessages);
    }
  };

  const handleBackToThreads = () => {
    setShowMessageView(false);
    setSelectedThread(null);
    setMessages([]);
  };

  const handleSendMessage = async (messageData) => {
    if (!selectedThread) return;

    console.log('Sending message:', messageData);
    console.log('Selected thread:', selectedThread);

    try {
      setError(null);
      await apiClient.sendMessage(selectedThread.thread_guid, messageData);
      
      console.log('Message sent successfully, refreshing...');
      await fetchMessages(selectedThread.thread_guid);
      await fetchThreads();
      
      setIsOnline(true);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(`Failed to send message: ${err.message}`);
    }
  };

  const handleServerUrlChange = async (newUrl) => {
    console.log('Changing server URL to:', newUrl);
    setServerUrl(newUrl);
    await storage.setItem('winiMessage_serverUrl', newUrl);
    
    apiClient.baseURL = newUrl;
    apiClient.client.defaults.baseURL = newUrl;
  };

  const handleDeleteThread = async (threadGuid) => {
    console.log('Deleting thread:', threadGuid);
    
    const updatedDeletedThreads = [...deletedThreads, threadGuid];
    setDeletedThreads(updatedDeletedThreads);
    
    await storage.setItem('winiMessage_deletedThreads', updatedDeletedThreads);
    
    if (selectedThread?.thread_guid === threadGuid) {
      setSelectedThread(null);
      setMessages([]);
    }
    
    setThreads(threads.filter(thread => thread.thread_guid !== threadGuid));
  };

  const handleRestoreAllChats = async () => {
    console.log('Restoring all deleted chats');
    setDeletedThreads([]);
    await storage.setItem('winiMessage_deletedThreads', []);
    fetchThreads();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>
            Offline mode - Using cached data. Check your connection.
          </Text>
        </View>
      )}
      
      <View style={styles.mainContainer}>
        {!showMessageView ? (
          <ChatList 
            threads={threads} 
            selectedThread={selectedThread}
            onThreadSelect={handleThreadSelect}
            onDeleteThread={handleDeleteThread}
            onShowSettings={() => setShowSettings(true)}
            serverUrl={serverUrl}
            error={error && !isOnline ? error : null}
          />
        ) : (
          <MessageView 
            selectedThread={selectedThread}
            messages={messages}
            onSendMessage={handleSendMessage}
            onBackPress={handleBackToThreads}
            error={error && isOnline ? error : null}
            loading={messagesLoading}
          />
        )}
      </View>
      
      <Settings
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        serverUrl={serverUrl}
        onServerUrlChange={handleServerUrlChange}
        deletedThreadsCount={deletedThreads.length}
        onRestoreAllChats={handleRestoreAllChats}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  offlineIndicator: {
    backgroundColor: '#f8d7da',
    borderBottomWidth: 1,
    borderBottomColor: '#f5c6cb',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineText: {
    color: '#721c24',
    fontSize: 14,
    textAlign: 'center',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});