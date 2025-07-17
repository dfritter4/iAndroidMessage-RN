import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

// Map reaction types to emojis and labels (using numeric keys from backend)
const REACTION_MAP = {
  2000: { emoji: '❤️', label: 'Love' },
  2001: { emoji: '👍', label: 'Like' },
  2002: { emoji: '👎', label: 'Dislike' },
  2003: { emoji: '😂', label: 'Laugh' },
  2004: { emoji: '😮', label: 'Surprise' },
  2005: { emoji: '😢', label: 'Sad' },
  2006: { emoji: '‼️', label: 'Emphasize' },
  // Legacy string keys for backward compatibility
  'love': { emoji: '❤️', label: 'Love' },
  'like': { emoji: '👍', label: 'Like' },
  'dislike': { emoji: '👎', label: 'Dislike' },
  'laugh': { emoji: '😂', label: 'Ha Ha' },
  'emphasize': { emoji: '‼️', label: 'Emphasized' },
  'question': { emoji: '?', label: 'Questioned' },
};

function Reaction({ reaction, onPress }) {
  const reactionInfo = REACTION_MAP[reaction.type] || { emoji: '👍', label: 'Reaction' };
  
  // Use backend-provided emoji if available, otherwise use mapped emoji
  const emoji = reaction.emoji || reactionInfo.emoji;
  
  return (
    <TouchableOpacity 
      style={styles.reactionBubble}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.reactionEmoji}>{emoji}</Text>
      {reaction.count > 1 && (
        <Text style={styles.reactionCount}>{reaction.count}</Text>
      )}
    </TouchableOpacity>
  );
}

function Reactions({ reactions, isOutgoing, onReactionClick }) {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  return (
    <View style={[
      styles.reactionsContainer,
      isOutgoing ? styles.reactionsOutgoing : styles.reactionsIncoming
    ]}>
      {reactions.map((reaction, index) => (
        <Reaction
          key={`${reaction.type}-${index}`}
          reaction={reaction}
          onPress={() => onReactionClick && onReactionClick(reaction)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  reactionsContainer: {
    position: 'absolute',
    top: -4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: '80%',
    zIndex: 1000,
  },
  reactionsOutgoing: {
    left: -4,  // Outgoing messages (you sent) - reactions on top-left corner
  },
  reactionsIncoming: {
    right: -4,  // Incoming messages (others sent) - reactions on top-right corner
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d1d6',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 28,
    minHeight: 28,
  },
  reactionEmoji: {
    fontSize: 16,
    marginRight: 3,
  },
  reactionCount: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    minWidth: 12,
    textAlign: 'center',
  },
});

export default Reactions;