import AsyncStorage from '@react-native-async-storage/async-storage';

class MessageCache {
  constructor() {
    this.cachePrefix = 'messageCache_';
    this.threadCachePrefix = 'threadCache_';
    this.metadataKey = 'messageCacheMetadata';
    this.maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.maxMessagesPerThread = 500; // Limit messages per thread to prevent memory issues
  }

  // Get cache metadata (last sync times, etc.)
  async getCacheMetadata() {
    try {
      const metadata = await AsyncStorage.getItem(this.metadataKey);
      return metadata ? JSON.parse(metadata) : {
        lastGlobalSync: null,
        threadSyncTimes: {},
        threadMessageCounts: {}
      };
    } catch (error) {
      console.error('Error getting cache metadata:', error);
      return {
        lastGlobalSync: null,
        threadSyncTimes: {},
        threadMessageCounts: {}
      };
    }
  }

  // Update cache metadata
  async updateCacheMetadata(updates) {
    try {
      const metadata = await this.getCacheMetadata();
      const updatedMetadata = { ...metadata, ...updates };
      await AsyncStorage.setItem(this.metadataKey, JSON.stringify(updatedMetadata));
    } catch (error) {
      console.error('Error updating cache metadata:', error);
    }
  }

  // Get cached messages for a specific thread
  async getThreadMessages(threadGuid) {
    try {
      const cacheKey = `${this.cachePrefix}${threadGuid}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return [];
      }

      const { messages, timestamp } = JSON.parse(cachedData);
      
      // Check if cache is still valid (not too old)
      if (Date.now() - timestamp > this.maxCacheAge) {
        await this.clearThreadMessages(threadGuid);
        return [];
      }

      return messages || [];
    } catch (error) {
      console.error('Error getting cached messages:', error);
      return [];
    }
  }

  // Cache messages for a specific thread
  async cacheThreadMessages(threadGuid, messages, isAppend = false) {
    try {
      const cacheKey = `${this.cachePrefix}${threadGuid}`;
      let messagesToCache = messages;

      if (isAppend) {
        // Append new messages to existing cache
        const existingMessages = await this.getThreadMessages(threadGuid);
        messagesToCache = [...existingMessages, ...messages];
      }

      // Sort messages by timestamp (oldest first)
      messagesToCache.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Remove duplicates based on message GUID
      const uniqueMessages = messagesToCache.filter((message, index, self) =>
        index === self.findIndex(m => m.guid === message.guid)
      );

      // Limit the number of messages to prevent memory issues
      const limitedMessages = uniqueMessages.slice(-this.maxMessagesPerThread);

      const cacheData = {
        messages: limitedMessages,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

      // Update metadata
      const metadata = await this.getCacheMetadata();
      metadata.threadSyncTimes[threadGuid] = new Date().toISOString();
      metadata.threadMessageCounts[threadGuid] = limitedMessages.length;
      await this.updateCacheMetadata(metadata);

      return limitedMessages;
    } catch (error) {
      console.error('Error caching thread messages:', error);
      return messages;
    }
  }

  // Get the latest message timestamp for a thread (for 'since' parameter)
  async getLatestMessageTimestamp(threadGuid) {
    try {
      const messages = await this.getThreadMessages(threadGuid);
      if (messages.length === 0) {
        return null;
      }

      // Find the most recent message timestamp
      const latestMessage = messages.reduce((latest, message) => {
        return new Date(message.timestamp) > new Date(latest.timestamp) ? message : latest;
      });

      return latestMessage.timestamp;
    } catch (error) {
      console.error('Error getting latest message timestamp:', error);
      return null;
    }
  }

  // Get the oldest message timestamp for a thread (for 'before' parameter)
  async getOldestMessageTimestamp(threadGuid) {
    try {
      const messages = await this.getThreadMessages(threadGuid);
      if (messages.length === 0) {
        return null;
      }

      // Find the oldest message timestamp
      const oldestMessage = messages.reduce((oldest, message) => {
        return new Date(message.timestamp) < new Date(oldest.timestamp) ? message : oldest;
      });

      return oldestMessage.timestamp;
    } catch (error) {
      console.error('Error getting oldest message timestamp:', error);
      return null;
    }
  }

  // Clear messages for a specific thread
  async clearThreadMessages(threadGuid) {
    try {
      const cacheKey = `${this.cachePrefix}${threadGuid}`;
      await AsyncStorage.removeItem(cacheKey);

      // Update metadata
      const metadata = await this.getCacheMetadata();
      delete metadata.threadSyncTimes[threadGuid];
      delete metadata.threadMessageCounts[threadGuid];
      await this.updateCacheMetadata(metadata);
    } catch (error) {
      console.error('Error clearing thread messages:', error);
    }
  }

  // Get cached threads list
  async getCachedThreads() {
    try {
      const cachedData = await AsyncStorage.getItem(this.threadCachePrefix);
      
      if (!cachedData) {
        return [];
      }

      const { threads, timestamp } = JSON.parse(cachedData);
      
      // Check if cache is still valid (not too old)
      if (Date.now() - timestamp > this.maxCacheAge) {
        await this.clearThreadsCache();
        return [];
      }

      return threads || [];
    } catch (error) {
      console.error('Error getting cached threads:', error);
      return [];
    }
  }

  // Cache threads list
  async cacheThreads(threads) {
    try {
      const cacheData = {
        threads: threads,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(this.threadCachePrefix, JSON.stringify(cacheData));

      // Update global sync time
      await this.updateCacheMetadata({
        lastGlobalSync: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error caching threads:', error);
    }
  }

  // Clear threads cache
  async clearThreadsCache() {
    try {
      await AsyncStorage.removeItem(this.threadCachePrefix);
      await this.updateCacheMetadata({
        lastGlobalSync: null
      });
    } catch (error) {
      console.error('Error clearing threads cache:', error);
    }
  }

  // Clear all cache data
  async clearAllCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(this.cachePrefix) || 
        key.startsWith(this.threadCachePrefix) ||
        key === this.metadataKey
      );
      
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('All message cache cleared');
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const metadata = await this.getCacheMetadata();
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      
      return {
        threadsWithCache: cacheKeys.length,
        totalThreads: Object.keys(metadata.threadSyncTimes).length,
        lastGlobalSync: metadata.lastGlobalSync,
        threadMessageCounts: metadata.threadMessageCounts
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        threadsWithCache: 0,
        totalThreads: 0,
        lastGlobalSync: null,
        threadMessageCounts: {}
      };
    }
  }
}

export default new MessageCache();