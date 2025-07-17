import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  BackHandler,
  Image,
  Dimensions,
  Modal,
  StatusBar
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../services/apiClient';
import Reactions from './Reactions';

const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isReactionMessage = (message) => {
  if (!message.text) return false;
  
  const reactionPatterns = [
    /^Reacted .+ to ".+"/,
    /^(Reacted|Loved|Liked|Disliked|Laughed at|Emphasized|Questioned) .+ to ["""].+["""]/,
    /^.+ reacted .+ to ["""].+["""]/i,
    /^.+ loved ["""].+["""]/i,
    /^.+ liked ["""].+["""]/i,
    /^.+ laughed at ["""].+["""]/i,
    /^.+ emphasized ["""].+["""]/i,
    /^.+ questioned ["""].+["""]/i,
    /^.+ disliked ["""].+["""]/i,
    /^Loved ["""].+["""]/i,
    /^Liked ["""].+["""]/i,
    /^Disliked ["""].+["""]/i,
    /^Laughed at ["""].+["""]/i,
    /^Emphasized ["""].+["""]/i,
    /^Questioned ["""].+["""]/i
  ];
  
  return reactionPatterns.some(pattern => pattern.test(message.text));
};

function MessageView({ selectedThread, messages, onSendMessage, onBackPress, error, loading }) {
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onBackPress) {
        onBackPress();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [onBackPress]);


  const handleSend = async () => {
    if ((!inputValue.trim() && !selectedImage) || !selectedThread) return;
    
    try {
      setUploading(true);
      
      let attachment = null;
      
      // Upload image if selected
      if (selectedImage) {
        attachment = await uploadImage(selectedImage);
      }
      
      // Send message
      onSendMessage({
        text: inputValue.trim() || undefined,
        thread_guid: selectedThread.thread_guid,
        attachment: attachment
      });
      
      // Clear inputs
      setInputValue('');
      setSelectedImage(null);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async (imageUri) => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    });
    
    const response = await fetch(`${apiClient.baseURL}/attachments/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result.filename;
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need camera roll permissions to select images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const handleImageError = (imageUrl, attachIndex) => {
    console.error('Image failed to load:', imageUrl);
    setFailedImages(prev => new Set([...prev, `${attachIndex}-${imageUrl}`]));
  };

  const renderImageOrFallback = (imageUrl, attachIndex) => {
    const imageKey = `${attachIndex}-${imageUrl}`;
    const hasFailed = failedImages.has(imageKey);
    
    if (hasFailed) {
      return (
        <View style={styles.imageFailedContainer}>
          <Text style={styles.imageFailedText}>📷</Text>
          <Text style={styles.imageFailedLabel}>Image unavailable</Text>
        </View>
      );
    }
    
    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.attachmentImage}
        resizeMode="contain"
        onError={() => handleImageError(imageUrl, attachIndex)}
        onLoad={() => {
          console.log('Successfully loaded image:', imageUrl);
        }}
      />
    );
  };

  const renderMessage = ({ item: message, index }) => {
    const isOutgoing = message.direction === 'outgoing';
    const showSender = !isOutgoing && selectedThread.participants.length > 2;
    const hasReactions = message.reactions && message.reactions.length > 0;
    
    // Check if this is an image-only message
    const hasAttachments = message.attachments && message.attachments.length > 0;
    const hasImageAttachments = hasAttachments && message.attachments.some(att => att.mime_type?.startsWith('image/'));
    const hasText = message.text && 
                   message.text !== null && 
                   message.text !== undefined && 
                   typeof message.text === 'string' && 
                   message.text.trim().length > 0;
    const isImageOnly = hasImageAttachments && !hasText;
    
    // Debug logging
    console.log('Message debug:', {
      guid: message.guid,
      hasAttachments,
      hasImageAttachments,
      hasText,
      textValue: JSON.stringify(message.text),
      textType: typeof message.text,
      textLength: message.text?.length,
      isImageOnly,
      attachmentCount: message.attachments?.length
    });
    
    return (
      <View style={styles.messageContainer}>
        {showSender && (
          <Text style={[
            styles.senderName,
            isOutgoing && styles.senderNameOutgoing,
            hasReactions && styles.senderNameWithReactions
          ]}>
            {message.sender_name}
          </Text>
        )}
        <View style={[
          styles.messageGroup,
          isOutgoing && styles.messageGroupOutgoing
        ]}>
          <View style={styles.messageBubbleContainer}>
            {isImageOnly ? (
              // Render image-only messages without bubble
              <View style={[
                styles.imageOnlyContainer,
                hasReactions && styles.imageOnlyWithReactions
              ]}>
                {message.attachments.map((attachment, attachIndex) => {
                  if (attachment.mime_type?.startsWith('image/')) {
                    // Construct proper attachment URL with better handling
                    let imageUrl = attachment.attachment_url;
                    
                    try {
                      // Handle different URL formats
                      if (imageUrl.startsWith('http')) {
                        // Already a full URL, but might need IP/port adjustment
                        const urlObj = new URL(imageUrl);
                        const baseUrlObj = new URL(apiClient.baseURL);
                        
                        // Replace hostname and port with current server
                        urlObj.hostname = baseUrlObj.hostname;
                        urlObj.port = baseUrlObj.port;
                        urlObj.protocol = baseUrlObj.protocol;
                        
                        imageUrl = urlObj.toString();
                      } else {
                        // Handle relative URLs
                        if (imageUrl.startsWith('/attachments/')) {
                          imageUrl = `${apiClient.baseURL}${imageUrl}`;
                        } else if (!imageUrl.startsWith('/')) {
                          imageUrl = `${apiClient.baseURL}/attachments/${imageUrl}`;
                        } else {
                          imageUrl = `${apiClient.baseURL}${imageUrl}`;
                        }
                      }
                      
                      console.log('Loading image from URL:', imageUrl);
                      
                      return (
                        <TouchableOpacity
                          key={`${message.guid}-attachment-${attachIndex}`}
                          style={styles.imageOnlyTouchable}
                          onPress={() => {
                            setFullscreenImage(imageUrl);
                          }}
                        >
                          {renderImageOrFallback(imageUrl, attachIndex)}
                          <Text style={[
                            styles.imageOnlyTime,
                            isOutgoing && styles.imageOnlyTimeOutgoing
                          ]}>
                            {formatMessageTime(message.timestamp)}
                          </Text>
                        </TouchableOpacity>
                      );
                    } catch (urlError) {
                      console.error('Error constructing image URL:', urlError);
                      // Fallback to direct URL construction
                      const fallbackUrl = `${apiClient.baseURL}/attachments/${encodeURIComponent(attachment.attachment_url)}`;
                      console.log('Using fallback URL:', fallbackUrl);
                      
                      return (
                        <TouchableOpacity
                          key={`${message.guid}-fallback-${attachIndex}`}
                          style={styles.imageOnlyTouchable}
                          onPress={() => {
                            setFullscreenImage(fallbackUrl);
                          }}
                        >
                          {renderImageOrFallback(fallbackUrl, `fallback-${attachIndex}`)}
                          <Text style={[
                            styles.imageOnlyTime,
                            isOutgoing && styles.imageOnlyTimeOutgoing
                          ]}>
                            {formatMessageTime(message.timestamp)}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  }
                  return null;
                })}
              </View>
            ) : (
              // Render regular messages with bubble
              <View style={[
                styles.messageBubble,
                isOutgoing ? styles.messageBubbleOutgoing : styles.messageBubbleIncoming,
                hasReactions && styles.messageBubbleWithReactions
              ]}>
                {message.text && (
                  <Text style={[
                    styles.messageText,
                    isOutgoing && styles.messageTextOutgoing
                  ]}>
                    {message.text}
                  </Text>
                )}
                {message.attachments && message.attachments.length > 0 && (
                  <View style={styles.attachmentContainer}>
                    {message.attachments.map((attachment, attachIndex) => {
                      if (attachment.mime_type?.startsWith('image/')) {
                        // Construct proper attachment URL with better handling
                        let imageUrl = attachment.attachment_url;
                        
                        try {
                          // Handle different URL formats
                          if (imageUrl.startsWith('http')) {
                            // Already a full URL, but might need IP/port adjustment
                            const urlObj = new URL(imageUrl);
                            const baseUrlObj = new URL(apiClient.baseURL);
                            
                            // Replace hostname and port with current server
                            urlObj.hostname = baseUrlObj.hostname;
                            urlObj.port = baseUrlObj.port;
                            urlObj.protocol = baseUrlObj.protocol;
                            
                            imageUrl = urlObj.toString();
                          } else {
                            // Handle relative URLs
                            if (imageUrl.startsWith('/attachments/')) {
                              imageUrl = `${apiClient.baseURL}${imageUrl}`;
                            } else if (!imageUrl.startsWith('/')) {
                              imageUrl = `${apiClient.baseURL}/attachments/${imageUrl}`;
                            } else {
                              imageUrl = `${apiClient.baseURL}${imageUrl}`;
                            }
                          }
                          
                          console.log('Loading image from URL:', imageUrl);
                          
                          return (
                            <TouchableOpacity
                              key={`${message.guid}-attachment-${attachIndex}`}
                              style={styles.imageContainer}
                              onPress={() => {
                                setFullscreenImage(imageUrl);
                              }}
                            >
                              {renderImageOrFallback(imageUrl, attachIndex)}
                            </TouchableOpacity>
                          );
                        } catch (urlError) {
                          console.error('Error constructing image URL:', urlError);
                          // Fallback to direct URL construction
                          const fallbackUrl = `${apiClient.baseURL}/attachments/${encodeURIComponent(attachment.attachment_url)}`;
                          console.log('Using fallback URL:', fallbackUrl);
                          
                          return (
                            <TouchableOpacity
                              key={`${message.guid}-fallback-${attachIndex}`}
                              style={styles.imageContainer}
                              onPress={() => {
                                setFullscreenImage(fallbackUrl);
                              }}
                            >
                              {renderImageOrFallback(fallbackUrl, `fallback-${attachIndex}`)}
                            </TouchableOpacity>
                          );
                        }
                      }
                      return null;
                    })}
                  </View>
                )}
                <Text style={[
                  styles.messageTime,
                  isOutgoing && styles.messageTimeOutgoing
                ]}>
                  {formatMessageTime(message.timestamp)}
                </Text>
              </View>
            )}
            
            {hasReactions && (
              <Reactions 
                reactions={message.reactions}
                isOutgoing={isOutgoing}
                onReactionClick={(reaction) => {
                  console.log('Reaction clicked:', reaction);
                }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderFullscreenImageModal = () => {
    if (!fullscreenImage) return null;

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
      >
        <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
        <View style={styles.fullscreenModalContainer}>
          <TouchableOpacity
            style={styles.fullscreenModalOverlay}
            activeOpacity={1}
            onPress={() => setFullscreenImage(null)}
          >
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
              onError={() => {
                console.error('Failed to load fullscreen image:', fullscreenImage);
                setFullscreenImage(null);
              }}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.fullscreenCloseButton}
            onPress={() => setFullscreenImage(null)}
          >
            <Text style={styles.fullscreenCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  };

  if (!selectedThread) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Select a conversation to start messaging
          </Text>
        </View>
      </View>
    );
  }

  const filteredMessages = messages.filter(message => !isReactionMessage(message));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBackPress}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.contactName}>{selectedThread.thread_name}</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
        enableAutomaticScroll={true}
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        )}
        
        {!loading && filteredMessages.length === 0 && (
          <View style={styles.noMessagesContainer}>
            <Text style={styles.noMessagesText}>
              No messages in this conversation
            </Text>
          </View>
        )}
        
        {!loading && filteredMessages.length > 0 && (
          filteredMessages.map((message, index) => (
            <View key={message.guid || `message-${index}`}>
              {renderMessage({ item: message, index })}
            </View>
          ))
        )}
      </KeyboardAwareScrollView>
      
      <View style={styles.inputContainer}>
        {selectedImage && (
          <View style={styles.imagePreview}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={removeSelectedImage}
            >
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.imageButton}
            onPress={pickImage}
            disabled={uploading}
          >
            <Text style={styles.imageButtonText}>📷</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            value={inputValue}
            onChangeText={setInputValue}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!inputValue.trim() && !selectedImage) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={(!inputValue.trim() && !selectedImage) || uploading}
          >
            <Text style={styles.sendButtonText}>{uploading ? '⏳' : '▲'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {renderFullscreenImageModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  errorBanner: {
    padding: 12,
    backgroundColor: '#f8d7da',
    borderBottomWidth: 1,
    borderBottomColor: '#f5c6cb',
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  noMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMessagesText: {
    fontSize: 16,
    color: '#666',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
    paddingTop: 2,
  },
  senderName: {
    fontSize: 11,
    color: '#666',
    marginLeft: 0,
    marginBottom: 4,
  },
  senderNameOutgoing: {
    textAlign: 'right',
    marginLeft: 'auto',
    marginRight: 0,
  },
  senderNameWithReactions: {
    marginBottom: 8, // Compensate for reaction space above bubble
  },
  messageGroup: {
    alignSelf: 'flex-start',
    maxWidth: '70%',
  },
  messageGroupOutgoing: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    position: 'relative',
  },
  messageBubbleIncoming: {
    backgroundColor: '#E5E5EA',
  },
  messageBubbleOutgoing: {
    backgroundColor: '#007AFF',
  },
  messageBubbleContainer: {
    position: 'relative',
    marginTop: 4,
  },
  messageBubbleWithReactions: {
    marginTop: 12, // Reduced from 16 to keep closer to sender name
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#000',
  },
  messageTextOutgoing: {
    color: 'white',
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'left',
  },
  messageTimeOutgoing: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: 'white',
    maxHeight: 100,
  },
  imageButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButtonText: {
    fontSize: 18,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Image-related styles
  attachmentContainer: {
    marginTop: 8,
  },
  imageContainer: {
    marginVertical: 4,
  },
  attachmentImage: {
    maxWidth: 250,
    maxHeight: 200,
    minWidth: 150,
    minHeight: 100,
    borderRadius: 8,
  },
  imageFailedContainer: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  imageFailedText: {
    fontSize: 30,
    marginBottom: 4,
  },
  imageFailedLabel: {
    fontSize: 12,
    color: '#666',
  },
  // Image-only message styles
  imageOnlyContainer: {
    position: 'relative',
    marginTop: 4,
  },
  imageOnlyWithReactions: {
    marginTop: 12, // Reduced from 16 to keep closer to sender name
  },
  imageOnlyTouchable: {
    position: 'relative',
  },
  imageOnlyTime: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imageOnlyTimeOutgoing: {
    left: 8,
    right: 'auto',
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 8,
    alignSelf: 'flex-start',
    borderRadius: 8,
    overflow: 'hidden',
    maxWidth: 200,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  uploadingText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  // Fullscreen image modal styles
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenModalOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
});

export default MessageView;