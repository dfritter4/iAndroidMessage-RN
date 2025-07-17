import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

function SwipeableChatItem({ thread, selectedThread, onPress, onDelete }) {
  const isSelected = selectedThread?.thread_guid === thread.thread_guid;

  const handleLongPress = () => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete the conversation with "${thread.thread_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(thread) }
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.chatItem,
        isSelected && styles.chatItemSelected
      ]}
      onPress={() => onPress(thread)}
      onLongPress={handleLongPress}
    >
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={[
            styles.chatName,
            isSelected && styles.chatNameSelected
          ]}>
            {thread.thread_name}
          </Text>
          <Text style={[
            styles.chatTime,
            isSelected && styles.chatTimeSelected
          ]}>
            {formatTime(thread.last_updated)}
          </Text>
        </View>
        <View style={styles.chatPreview}>
          <Text 
            style={[
              styles.previewText,
              isSelected && styles.previewTextSelected
            ]}
            numberOfLines={1}
          >
            {thread.last_message?.text || 'No messages'}
          </Text>
          {thread.unread_count > 0 && (
            <View style={[
              styles.unreadBadge,
              isSelected && styles.unreadBadgeSelected
            ]}>
              <Text style={[
                styles.unreadText,
                isSelected && styles.unreadTextSelected
              ]}>
                {thread.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chatItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  chatItemSelected: {
    backgroundColor: '#007AFF',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  chatNameSelected: {
    color: 'white',
  },
  chatTime: {
    fontSize: 12,
    color: '#666',
  },
  chatTimeSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  chatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  previewTextSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 18,
    alignItems: 'center',
  },
  unreadBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  unreadText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  unreadTextSelected: {
    color: 'white',
  },
});

export default SwipeableChatItem;