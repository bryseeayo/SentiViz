// Utility Helper Functions for VB Daily Sentiment Dashboard V2

const Utils = {
  // Format date to readable string
  formatDate(date, format = 'short') {
    if (!(date instanceof Date)) date = new Date(date);
    if (format === 'short') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (format === 'full') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (format === 'time') {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toISOString().split('T')[0];
  },

  // Format number with commas
  formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
  },

  // Format percentage
  formatPercent(num, decimals = 1) {
    return `${(num * 100).toFixed(decimals)}%`;
  },

  // Calculate percentage change
  percentChange(current, previous) {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  },

  // Format change value with +/- sign
  formatChange(change, isPercent = true) {
    if (change === null || change === undefined || isNaN(change)) return '—';
    const sign = change > 0 ? '+' : '';
    const value = isPercent ? `${change.toFixed(1)}%` : this.formatNumber(Math.round(change));
    return `${sign}${value}`;
  },

  // Get change class (positive/negative/neutral)
  getChangeClass(change) {
    if (change === null || change === undefined || isNaN(change)) return 'neutral';
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return 'neutral';
  },

  // Calculate mean
  mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  },

  // Calculate median
  median(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  },

  // Calculate standard deviation
  stdDev(arr) {
    if (!arr || arr.length === 0) return 0;
    const avg = this.mean(arr);
    const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  },

  // Calculate z-score
  zScore(value, mean, stdDev) {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  },

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Deep clone object
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  // Group array by key
  groupBy(arr, key) {
    return arr.reduce((acc, item) => {
      const group = typeof key === 'function' ? key(item) : item[key];
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {});
  },

  // Get date range
  getDateRange(data, dateField = 'date') {
    if (!data || data.length === 0) return { min: null, max: null };
    const dates = data.map(d => new Date(d[dateField]));
    return {
      min: new Date(Math.min(...dates)),
      max: new Date(Math.max(...dates))
    };
  },

  // Filter data by date range
  filterByDateRange(data, startDate, endDate, dateField = 'date') {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return data.filter(item => {
      const date = new Date(item[dateField]);
      return date >= start && date <= end;
    });
  },

  // Get last N days of data
  getLastNDays(data, days, dateField = 'date') {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return data.filter(item => new Date(item[dateField]) >= cutoff);
  },

  // Download file
  downloadFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Generate color from string (for consistent user colors)
  stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 70%, 60%)`;
  },

  // Interpolate between two colors
  interpolateColor(color1, color2, factor) {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    return `rgb(${r}, ${g}, ${b})`;
  },

  // Hex to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  // Show/hide element with animation
  show(element) {
    if (element) {
      element.style.display = 'block';
      setTimeout(() => element.style.opacity = '1', 10);
    }
  },

  hide(element) {
    if (element) {
      element.style.opacity = '0';
      setTimeout(() => element.style.display = 'none', 300);
    }
  }
};

// Export for use in other modules
window.Utils = Utils;
