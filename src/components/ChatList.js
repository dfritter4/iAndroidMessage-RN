import React from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet 
} from 'react-native';
import ChatHeader from './ChatHeader';
import SwipeableChatItem from './SwipeableChatItem';

function ChatList({ 
  threads, 
  selectedThread, 
  onThreadSelect, 
  onDeleteThread, 
  onShowSettings,
  serverUrl,
  error 
}) {

  const handleDeleteClick = (thread) => {
    onDeleteThread(thread.thread_guid);
  };

  const renderChatItem = ({ item: thread }) => {
    return (
      <SwipeableChatItem
        thread={thread}
        selectedThread={selectedThread}
        onPress={onThreadSelect}
        onDelete={handleDeleteClick}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ChatHeader 
        onShowSettings={onShowSettings}
        serverUrl={serverUrl}
        error={error}
      />
      
      <FlatList
        data={threads}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.thread_guid}
        style={styles.chatList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatList: {
    flex: 1,
  },
});

export default ChatList;