// URL detection and processing utilities for React Native

/**
 * Comprehensive URL detection regex
 * Matches both http/https URLs and www. patterns
 */
const COMPREHENSIVE_URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+\.[a-zA-Z]{2,}|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,})\b[^\s]*)/g;

/**
 * Detect URLs in text and return array of URL objects
 * @param {string} text - Text to search for URLs
 * @returns {Array} Array of URL objects with url, startIndex, endIndex
 */
export function detectUrls(text) {
  if (!text || typeof text !== 'string') return [];
  
  const urls = [];
  let match;
  
  // Reset regex lastIndex to ensure fresh search
  COMPREHENSIVE_URL_REGEX.lastIndex = 0;
  
  while ((match = COMPREHENSIVE_URL_REGEX.exec(text)) !== null) {
    let url = match[0];
    
    // Remove trailing punctuation
    url = url.replace(/[.,!?;:)]$/, '');
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    urls.push({
      url: url,
      original: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  return urls;
}

/**
 * Check if text contains URLs
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains URLs
 */
export function hasUrls(text) {
  return detectUrls(text).length > 0;
}

/**
 * Extract first URL from text
 * @param {string} text - Text to extract URL from
 * @returns {string|null} First URL found or null
 */
export function extractFirstUrl(text) {
  const urls = detectUrls(text);
  return urls.length > 0 ? urls[0].url : null;
}

/**
 * Convert text to clickable parts array
 * @param {string} text - Text to process
 * @returns {Array} Array of objects with text, isUrl, and url properties
 */
export function makeTextClickable(text) {
  if (!text || typeof text !== 'string') return [{ text, isUrl: false }];
  
  const urls = detectUrls(text);
  if (urls.length === 0) return [{ text, isUrl: false }];
  
  const parts = [];
  let lastIndex = 0;
  
  urls.forEach((urlObj) => {
    // Add text before URL
    if (urlObj.startIndex > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, urlObj.startIndex),
        isUrl: false
      });
    }
    
    // Add URL
    parts.push({
      text: urlObj.original,
      isUrl: true,
      url: urlObj.url
    });
    
    lastIndex = urlObj.endIndex;
  });
  
  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isUrl: false
    });
  }
  
  return parts;
}

/**
 * Get simple fallback preview for a URL
 * @param {string} url - URL to create preview for
 * @returns {Object} Simple preview object
 */
export function getSimpleLinkPreview(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    
    return {
      title: domain,
      description: `Link from ${domain}`,
      url: url,
      domain: domain,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}`,
      isSimple: true
    };
  } catch (error) {
    return {
      title: 'Link',
      description: url,
      url: url,
      domain: 'unknown',
      isSimple: true
    };
  }
}

/**
 * Get enhanced preview data for popular sites
 * @param {string} url - URL to get enhanced preview for
 * @returns {Object|null} Enhanced preview object or null if not supported
 */
export function getEnhancedPreview(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    
    const enhancedSites = {
      'youtube.com': {
        icon: '🎥',
        name: 'YouTube',
        color: '#FF0000'
      },
      'youtu.be': {
        icon: '🎥',
        name: 'YouTube',
        color: '#FF0000'
      },
      'twitter.com': {
        icon: '🐦',
        name: 'Twitter',
        color: '#1DA1F2'
      },
      'x.com': {
        icon: '🐦',
        name: 'X',
        color: '#000000'
      },
      'github.com': {
        icon: '💻',
        name: 'GitHub',
        color: '#333333'
      },
      'reddit.com': {
        icon: '🤖',
        name: 'Reddit',
        color: '#FF4500'
      },
      'instagram.com': {
        icon: '📸',
        name: 'Instagram',
        color: '#E4405F'
      },
      'tiktok.com': {
        icon: '🎵',
        name: 'TikTok',
        color: '#000000'
      },
      'spotify.com': {
        icon: '🎵',
        name: 'Spotify',
        color: '#1DB954'
      },
      'open.spotify.com': {
        icon: '🎵',
        name: 'Spotify',
        color: '#1DB954'
      },
      'news.ycombinator.com': {
        icon: '📰',
        name: 'Hacker News',
        color: '#FF6600'
      },
      'linkedin.com': {
        icon: '💼',
        name: 'LinkedIn',
        color: '#0077B5'
      },
      'medium.com': {
        icon: '📝',
        name: 'Medium',
        color: '#000000'
      },
      'dev.to': {
        icon: '👨‍💻',
        name: 'DEV',
        color: '#0A0A0A'
      }
    };
    
    const siteConfig = enhancedSites[domain];
    if (siteConfig) {
      return {
        ...siteConfig,
        domain: domain,
        url: url,
        isEnhanced: true
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Extract domain from URL
 * @param {string} url - URL to extract domain from
 * @returns {string} Domain name
 */
export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Check if URL is a supported media type
 * @param {string} url - URL to check
 * @returns {Object} Object with isImage, isVideo, isAudio properties
 */
export function getMediaType(url) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv'];
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  
  const lowerUrl = url.toLowerCase();
  
  return {
    isImage: imageExtensions.some(ext => lowerUrl.includes(ext)),
    isVideo: videoExtensions.some(ext => lowerUrl.includes(ext)),
    isAudio: audioExtensions.some(ext => lowerUrl.includes(ext))
  };
}

/**
 * Clean URL for display purposes
 * @param {string} url - URL to clean
 * @returns {string} Cleaned URL
 */
export function cleanUrlForDisplay(url) {
  try {
    const urlObj = new URL(url);
    let cleanUrl = urlObj.hostname;
    
    // Remove www. prefix
    cleanUrl = cleanUrl.replace(/^www\./, '');
    
    // Add path if it's not just root
    if (urlObj.pathname !== '/') {
      cleanUrl += urlObj.pathname;
    }
    
    // Limit length
    if (cleanUrl.length > 50) {
      cleanUrl = cleanUrl.substring(0, 47) + '...';
    }
    
    return cleanUrl;
  } catch (error) {
    return url;
  }
}