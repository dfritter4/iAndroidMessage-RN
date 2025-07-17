import React from 'react';
import { Text, Linking, Alert } from 'react-native';
import { makeTextClickable } from '../utils/linkUtils';

const ClickableText = ({ text, style, isOutgoing = false }) => {
  const handleLinkPress = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (err) {
      console.error('Error opening link:', err);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  if (!text) {
    return null;
  }

  const parts = makeTextClickable(text);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.isUrl) {
          return (
            <Text
              key={index}
              style={[
                style,
                {
                  color: isOutgoing ? 'rgba(255, 255, 255, 0.9)' : '#007AFF',
                  textDecorationLine: 'underline'
                }
              ]}
              onPress={() => handleLinkPress(part.url)}
            >
              {part.text}
            </Text>
          );
        }
        return <Text key={index} style={style}>{part.text}</Text>;
      })}
    </Text>
  );
};

export default ClickableText;