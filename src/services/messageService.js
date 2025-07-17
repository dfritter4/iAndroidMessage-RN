import apiClient from './apiClient';
import messageCache from './messageCache';

class MessageService {
  constructor() {
    this.pollingInterval = null;
    this.pollingIntervalMs = 10000; // Poll every 10 seconds
  }

  // Get threads with caching
  async getThreads(forceRefresh = false) {
    try {
      console.log('MessageService: getThreads called, forceRefresh:', forceRefresh);
      let cachedThreads = [];
      let lastSyncTime = null;

      if (!forceRefresh) {
        // Try to get cached threads first
        cachedThreads = await messageCache.getCachedThreads();
        const metadata = await messageCache.getCacheMetadata();
        lastSyncTime = metadata.lastGlobalSync;
        console.log('MessageService: Found cached threads:', cachedThreads.length, 'lastSyncTime:', lastSyncTime);
      }

      // If we have cached data and it's not a forced refresh, return cached data
      if (cachedThreads.length > 0 && !forceRefresh) {
        console.log('MessageService: Returning cached threads, starting background refresh');
        // Start background refresh to get updates
        this.refreshThreadsInBackground(lastSyncTime);
        return cachedThreads;
      }

      // Fetch from API
      const since = (lastSyncTime && !forceRefresh) ? lastSyncTime : null;
      console.log('MessageService: Fetching threads from API, since:', since);
      const response = await apiClient.getThreads(50, since);
      const threads = response.threads || [];
      console.log('MessageService: API returned threads:', threads.length);

      // Cache the results
      if (forceRefresh || !lastSyncTime) {
        // Full refresh - replace cache
        console.log('MessageService: Full refresh - caching threads');
        await messageCache.cacheThreads(threads);
      } else {
        // Incremental update - merge with existing cache
        console.log('MessageService: Incremental update - merging threads');
        const mergedThreads = this.mergeThreads(cachedThreads, threads);
        await messageCache.cacheThreads(mergedThreads);
      }

      return threads;
    } catch (error) {
      console.error('Error fetching threads:', error);
      // Return cached data if available
      const cachedThreads = await messageCache.getCachedThreads();
      if (cachedThreads.length > 0) {
        console.log('MessageService: API failed, returning cached threads:', cachedThreads.length);
        return cachedThreads;
      }
      throw error;
    }
  }

  // Get messages for a specific thread with caching
  async getThreadMessages(threadGuid, forceRefresh = false) {
    try {
      let cachedMessages = [];
      let lastSyncTime = null;

      if (!forceRefresh) {
        // Try to get cached messages first
        cachedMessages = await messageCache.getThreadMessages(threadGuid);
        lastSyncTime = await messageCache.getLatestMessageTimestamp(threadGuid);
      }

      // If we have cached data and it's not a forced refresh, return cached data
      if (cachedMessages.length > 0 && !forceRefresh) {
        // Start background refresh to get new messages
        this.refreshThreadMessagesInBackground(threadGuid, lastSyncTime);
        return cachedMessages;
      }

      // Fetch from API
      const response = await apiClient.getMessages(threadGuid, 50);
      const messages = response.messages || [];

      // Cache the results
      await messageCache.cacheThreadMessages(threadGuid, messages, false);

      return messages;
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      // Return cached data if available
      const cachedMessages = await messageCache.getThreadMessages(threadGuid);
      if (cachedMessages.length > 0) {
        return cachedMessages;
      }
      throw error;
    }
  }

  // Load older messages for a thread (for infinite scroll)
  async loadOlderMessages(threadGuid, limit = 50) {
    try {
      const oldestTimestamp = await messageCache.getOldestMessageTimestamp(threadGuid);
      
      if (!oldestTimestamp) {
        // No cached messages, load normally
        return await this.getThreadMessages(threadGuid, true);
      }

      const response = await apiClient.getMessages(threadGuid, limit, oldestTimestamp);
      const olderMessages = response.messages || [];

      if (olderMessages.length > 0) {
        // Prepend older messages to cache
        const existingMessages = await messageCache.getThreadMessages(threadGuid);
        const allMessages = [...olderMessages, ...existingMessages];
        await messageCache.cacheThreadMessages(threadGuid, allMessages, false);
      }

      return olderMessages;
    } catch (error) {
      console.error('Error loading older messages:', error);
      throw error;
    }
  }

  // Background refresh for threads
  async refreshThreadsInBackground(lastSyncTime) {
    try {
      if (!lastSyncTime) return;

      const response = await apiClient.getThreads(50, lastSyncTime);
      const newThreads = response.threads || [];

      if (newThreads.length > 0) {
        // Merge with existing cache
        const cachedThreads = await messageCache.getCachedThreads();
        const mergedThreads = this.mergeThreads(cachedThreads, newThreads);
        await messageCache.cacheThreads(mergedThreads);
      }
    } catch (error) {
      console.error('Background thread refresh failed:', error);
    }
  }

  // Background refresh for thread messages
  async refreshThreadMessagesInBackground(threadGuid, lastSyncTime) {
    try {
      if (!lastSyncTime) return;

      // Use the global recent messages endpoint to get updates
      const response = await apiClient.getRecentMessages(20, lastSyncTime);
      const recentMessages = response.messages || [];

      // Filter messages for this specific thread
      const threadMessages = recentMessages.filter(msg => msg.thread_guid === threadGuid);

      if (threadMessages.length > 0) {
        // Append new messages to cache
        await messageCache.cacheThreadMessages(threadGuid, threadMessages, true);
      }
    } catch (error) {
      console.error('Background message refresh failed:', error);
    }
  }

  // Start polling for new messages
  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        const metadata = await messageCache.getCacheMetadata();
        if (metadata.lastGlobalSync) {
          // Poll for new messages across all threads
          const response = await apiClient.getRecentMessages(20, metadata.lastGlobalSync);
          const recentMessages = response.messages || [];

          if (recentMessages.length > 0) {
            // Group messages by thread and update cache
            const messagesByThread = this.groupMessagesByThread(recentMessages);
            
            for (const [threadGuid, messages] of Object.entries(messagesByThread)) {
              await messageCache.cacheThreadMessages(threadGuid, messages, true);
            }

            // Update last sync time
            await messageCache.updateCacheMetadata({
              lastGlobalSync: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('Polling failed:', error);
      }
    }, this.pollingIntervalMs);
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Helper method to merge threads
  mergeThreads(existingThreads, newThreads) {
    const threadMap = new Map();
    
    // Add existing threads
    existingThreads.forEach(thread => {
      threadMap.set(thread.thread_guid, thread);
    });

    // Add/update with new threads
    newThreads.forEach(thread => {
      threadMap.set(thread.thread_guid, thread);
    });

    return Array.from(threadMap.values());
  }

  // Helper method to group messages by thread
  groupMessagesByThread(messages) {
    const grouped = {};
    messages.forEach(message => {
      const threadGuid = message.thread_guid;
      if (!grouped[threadGuid]) {
        grouped[threadGuid] = [];
      }
      grouped[threadGuid].push(message);
    });
    return grouped;
  }

  // Add a new message to cache immediately (for optimistic updates)
  async addMessageToCache(threadGuid, message) {
    try {
      await messageCache.cacheThreadMessages(threadGuid, [message], true);
    } catch (error) {
      console.error('Error adding message to cache:', error);
    }
  }

  // Get cache statistics
  async getCacheStats() {
    return await messageCache.getCacheStats();
  }

  // Clear all cache
  async clearCache() {
    await messageCache.clearAllCache();
  }
}

export default new MessageService();