import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Alert
} from 'react-native';
import { getSimpleLinkPreview, getEnhancedPreview, extractDomain, cleanUrlForDisplay } from '../utils/linkUtils';

const LinkPreview = ({ url, isOutgoing = false }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (url) {
      fetchLinkPreview(url);
    }
  }, [url]);

  const fetchLinkPreview = async (targetUrl) => {
    try {
      setLoading(true);
      setError(false);
      setImageError(false);

      // First try to get enhanced preview for popular sites
      const enhancedPreview = getEnhancedPreview(targetUrl);
      if (enhancedPreview) {
        setPreview({
          title: enhancedPreview.name,
          description: `${enhancedPreview.icon} ${enhancedPreview.name}`,
          url: targetUrl,
          domain: enhancedPreview.domain,
          favicon: null,
          isEnhanced: true,
          color: enhancedPreview.color,
          icon: enhancedPreview.icon
        });
        setLoading(false);
        return;
      }

      // For React Native, we'll use a simpler approach since we can't bypass CORS
      // Try to fetch metadata using a public API service
      const proxyUrl = `https://api.linkpreview.net/?key=demo&q=${encodeURIComponent(targetUrl)}`;
      
      try {
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          setPreview({
            title: data.title || extractDomain(targetUrl),
            description: data.description || `Link from ${extractDomain(targetUrl)}`,
            url: targetUrl,
            domain: extractDomain(targetUrl),
            image: data.image,
            favicon: data.favicon,
            isEnhanced: false
          });
        } else {
          // Fallback to simple preview
          setPreview(getSimpleLinkPreview(targetUrl));
        }
      } catch (apiError) {
        console.log('Link preview API failed, using fallback:', apiError);
        // Fallback to simple preview
        setPreview(getSimpleLinkPreview(targetUrl));
      }
    } catch (err) {
      console.error('Error fetching link preview:', err);
      setError(true);
      // Even on error, show a basic preview
      setPreview(getSimpleLinkPreview(targetUrl));
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async () => {
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

  const handleImageError = () => {
    setImageError(true);
  };

  if (loading) {
    return (
      <View style={[
        styles.container,
        isOutgoing && styles.containerOutgoing
      ]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading preview...</Text>
        </View>
      </View>
    );
  }

  if (error && !preview) {
    return null; // Don't show anything if we can't get any preview
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isOutgoing && styles.containerOutgoing
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {preview.image && !imageError && (
        <Image
          source={{ uri: preview.image }}
          style={styles.image}
          onError={handleImageError}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.content}>
        <Text 
          style={[
            styles.title,
            isOutgoing && styles.titleOutgoing
          ]}
          numberOfLines={2}
        >
          {preview.isEnhanced ? preview.icon + ' ' + preview.title : preview.title}
        </Text>
        
        {preview.description && (
          <Text 
            style={[
              styles.description,
              isOutgoing && styles.descriptionOutgoing
            ]}
            numberOfLines={2}
          >
            {preview.description}
          </Text>
        )}
        
        <Text 
          style={[
            styles.url,
            isOutgoing && styles.urlOutgoing
          ]}
          numberOfLines={1}
        >
          {cleanUrlForDisplay(preview.url)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  containerOutgoing: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  image: {
    width: '100%',
    height: 150,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  titleOutgoing: {
    color: '#ffffff',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
  descriptionOutgoing: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  url: {
    fontSize: 11,
    color: '#007AFF',
    marginTop: 4,
  },
  urlOutgoing: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

export default LinkPreview;