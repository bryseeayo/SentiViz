// Data Processing and Aggregation Module
// Handles all data transformation, aggregation, and calculations

const DataProcessor = {
  // Emoji configuration
  EMOJI_WEIGHTS: {
    '🤯': 1,   // Wow = positive
    '🤔': 0,   // Curious = neutral
    '😴': -1   // Boring = negative
  },

  EMOJI_COLORS: {
    '🤯': '#34d399',  // emerald-400
    '🤔': '#fbbf24',  // amber-400
    '😴': '#f87171'   // red-400
  },

  EMOJI_LABELS: {
    '🤯': 'Wow',
    '🤔': 'Curious',
    '😴': 'Boring'
  },

  /**
   * Process raw CSV data into aggregated metrics
   * @param {Array} rawData - Array of {emoji, date, networkId}
   * @returns {Object} Processed data with all metrics
   */
  process(rawData) {
    if (!rawData || rawData.length === 0) {
      return null;
    }

    // Sort by date
    const sortedData = rawData.slice().sort((a, b) => a.date - b.date);

    // Group by day
    const byDay = this.groupByDay(sortedData);
    const days = Object.keys(byDay).sort();

    // Calculate date range
    const minDate = sortedData[0].date;
    const maxDate = sortedData[sortedData.length - 1].date;

    // Initialize accumulators
    const seenUsers = new Set();
    const userCounts = new Map();
    const userItems = new Map();

    // Daily metrics
    const dailyMetrics = [];
    const stacked = { '🤯': [], '🤔': [], '😴': [] };
    const stackedNew = { '🤯': [], '🤔': [], '😴': [] };
    const stackedReturning = { '🤯': [], '🤔': [], '😴': [] };
    const sentimentSeries = [];
    const sentimentNew = [];
    const sentimentReturning = [];
    const returningRate = [];
    const dailyTotals = [];
    const dailyShares = [];

    // Process each day
    days.forEach(day => {
      const dayData = byDay[day];
      const dayMetrics = this.processDayData(dayData, seenUsers);

      dailyMetrics.push({
        day,
        ...dayMetrics
      });

      // Stack data
      stacked['🤯'].push(dayMetrics.counts['🤯']);
      stacked['🤔'].push(dayMetrics.counts['🤔']);
      stacked['😴'].push(dayMetrics.counts['😴']);

      stackedNew['🤯'].push(dayMetrics.countsNew['🤯']);
      stackedNew['🤔'].push(dayMetrics.countsNew['🤔']);
      stackedNew['😴'].push(dayMetrics.countsNew['😴']);

      stackedReturning['🤯'].push(dayMetrics.countsReturning['🤯']);
      stackedReturning['🤔'].push(dayMetrics.countsReturning['🤔']);
      stackedReturning['😴'].push(dayMetrics.countsReturning['😴']);

      sentimentSeries.push(dayMetrics.sentimentScore);
      sentimentNew.push(dayMetrics.sentimentNew);
      sentimentReturning.push(dayMetrics.sentimentReturning);
      returningRate.push(dayMetrics.returningRate);
      dailyTotals.push(dayMetrics.total);

      const total = dayMetrics.total || 1;
      dailyShares.push({
        wow: dayMetrics.counts['🤯'] / total,
        curious: dayMetrics.counts['🤔'] / total,
        boring: dayMetrics.counts['😴'] / total
      });

      // Mark users as seen after processing day
      dayData.forEach(item => {
        if (item.networkId && item.networkId !== 'unknown') {
          seenUsers.add(item.networkId);
        }
      });
    });

    // User analytics
    sortedData.forEach(item => {
      if (item.networkId && item.networkId !== 'unknown') {
        userCounts.set(item.networkId, (userCounts.get(item.networkId) || 0) + 1);
        if (!userItems.has(item.networkId)) {
          userItems.set(item.networkId, []);
        }
        userItems.get(item.networkId).push(item);
      }
    });

    const uniqueUsers = userCounts.size;
    const repeaters = Array.from(userCounts.values()).filter(c => c > 1).length;
    const topUsers = Array.from(userCounts.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    return {
      // Basic info
      days,
      total: sortedData.length,
      minDate,
      maxDate,

      // Daily aggregations
      dailyMetrics,
      dailyTotals,
      dailyShares,

      // Stacked data for charts
      stacked,
      stackedNew,
      stackedReturning,

      // Sentiment series
      sentimentSeries,
      sentimentNew,
      sentimentReturning,
      returningRate,

      // User analytics
      uniqueUsers,
      repeaters,
      topUsers,
      userItems,
      userCounts,

      // Raw data
      rawData: sortedData
    };
  },

  /**
   * Group data by day key (YYYY-MM-DD)
   */
  groupByDay(data) {
    const byDay = {};

    data.forEach(item => {
      const dayKey = this.getDayKey(item.date);
      if (!byDay[dayKey]) {
        byDay[dayKey] = [];
      }
      byDay[dayKey].push(item);
    });

    return byDay;
  },

  /**
   * Get day key in YYYY-MM-DD format (UTC)
   */
  getDayKey(date) {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Process single day's data
   */
  processDayData(dayData, seenUsers) {
    const counts = { '🤯': 0, '🤔': 0, '😴': 0 };
    const countsNew = { '🤯': 0, '🤔': 0, '😴': 0 };
    const countsReturning = { '🤯': 0, '🤔': 0, '😴': 0 };

    let sentimentSum = 0;
    let sentimentCount = 0;
    let sentimentSumNew = 0;
    let sentimentCountNew = 0;
    let sentimentSumReturning = 0;
    let sentimentCountReturning = 0;
    let returningCount = 0;

    dayData.forEach(item => {
      const emoji = item.emoji;
      const weight = this.EMOJI_WEIGHTS[emoji];
      const isReturning = item.networkId &&
                         item.networkId !== 'unknown' &&
                         seenUsers.has(item.networkId);

      // Count by emoji
      counts[emoji] = (counts[emoji] || 0) + 1;

      if (isReturning) {
        countsReturning[emoji] = (countsReturning[emoji] || 0) + 1;
        returningCount++;
        if (weight !== undefined) {
          sentimentSumReturning += weight;
          sentimentCountReturning++;
        }
      } else {
        countsNew[emoji] = (countsNew[emoji] || 0) + 1;
        if (weight !== undefined) {
          sentimentSumNew += weight;
          sentimentCountNew++;
        }
      }

      // Overall sentiment
      if (weight !== undefined) {
        sentimentSum += weight;
        sentimentCount++;
      }
    });

    const total = dayData.length;

    return {
      total,
      counts,
      countsNew,
      countsReturning,
      returningCount,
      newCount: total - returningCount,
      returningRate: total > 0 ? returningCount / total : 0,
      sentimentScore: sentimentCount > 0 ? sentimentSum / sentimentCount : 0,
      sentimentNew: sentimentCountNew > 0 ? sentimentSumNew / sentimentCountNew : 0,
      sentimentReturning: sentimentCountReturning > 0 ? sentimentSumReturning / sentimentCountReturning : 0,
      items: dayData
    };
  },

  /**
   * Calculate transitions between emoji reactions
   * Tracks how users change their reaction from one day to the next
   */
  calculateTransitions(userItems, days) {
    const transitions = {
      '🤯->🤯': 0, '🤯->🤔': 0, '🤯->😴': 0,
      '🤔->🤯': 0, '🤔->🤔': 0, '🤔->😴': 0,
      '😴->🤯': 0, '😴->🤔': 0, '😴->😴': 0
    };

    const dayIndex = new Map(days.map((d, i) => [d, i]));

    userItems.forEach(items => {
      // Get last emoji per day for this user
      const byDay = new Map();
      items.forEach(item => {
        const dayKey = this.getDayKey(item.date);
        byDay.set(dayKey, item.emoji);
      });

      // Get sorted day indices
      const userDays = Array.from(byDay.keys())
        .map(d => dayIndex.get(d))
        .filter(i => i !== undefined)
        .sort((a, b) => a - b);

      // Count transitions
      for (let i = 0; i < userDays.length - 1; i++) {
        const fromEmoji = byDay.get(days[userDays[i]]);
        const toEmoji = byDay.get(days[userDays[i + 1]]);
        const key = `${fromEmoji}->${toEmoji}`;
        if (transitions[key] !== undefined) {
          transitions[key]++;
        }
      }
    });

    return transitions;
  },

  /**
   * Calculate retention metrics
   * Tracks how many users return within 1, 3, and 7 days
   */
  calculateRetention(userItems, days) {
    const dayIndex = new Map(days.map((d, i) => [d, i]));
    let d1 = 0, d3 = 0, d7 = 0;
    const total = userItems.size;

    userItems.forEach(items => {
      if (items.length < 2) return;

      // Get day indices for this user
      const userDayIndices = new Set();
      items.forEach(item => {
        const dayKey = this.getDayKey(item.date);
        const idx = dayIndex.get(dayKey);
        if (idx !== undefined) {
          userDayIndices.add(idx);
        }
      });

      const indices = Array.from(userDayIndices).sort((a, b) => a - b);
      const firstDay = indices[0];

      // Check if user returned within time windows
      const returned1 = indices.some(i => i > firstDay && i <= firstDay + 1);
      const returned3 = indices.some(i => i > firstDay && i <= firstDay + 3);
      const returned7 = indices.some(i => i > firstDay && i <= firstDay + 7);

      if (returned1) d1++;
      if (returned3) d3++;
      if (returned7) d7++;
    });

    return {
      d1: total > 0 ? d1 / total : 0,
      d3: total > 0 ? d3 / total : 0,
      d7: total > 0 ? d7 / total : 0,
      total
    };
  },

  /**
   * Calculate emoji distribution percentages
   */
  calculateDistribution(data) {
    const counts = { '🤯': 0, '🤔': 0, '😴': 0 };

    data.forEach(item => {
      if (counts[item.emoji] !== undefined) {
        counts[item.emoji]++;
      }
    });

    const total = data.length || 1;

    return {
      wow: counts['🤯'] / total,
      curious: counts['🤔'] / total,
      boring: counts['😴'] / total,
      counts
    };
  },

  /**
   * Filter data by date range
   */
  filterByDateRange(data, startDate, endDate) {
    return data.filter(item => {
      return item.date >= startDate && item.date <= endDate;
    });
  },

  /**
   * Filter data by emoji
   */
  filterByEmoji(data, emoji) {
    return data.filter(item => item.emoji === emoji);
  },

  /**
   * Get user journey/story
   */
  getUserStory(userId, userItems) {
    const items = userItems.get(userId);
    if (!items || items.length === 0) return null;

    const sorted = items.slice().sort((a, b) => a.date - b.date);
    const firstDate = sorted[0].date;
    const lastDate = sorted[sorted.length - 1].date;

    const distribution = this.calculateDistribution(sorted);

    let sentimentSum = 0;
    let sentimentCount = 0;
    sorted.forEach(item => {
      const weight = this.EMOJI_WEIGHTS[item.emoji];
      if (weight !== undefined) {
        sentimentSum += weight;
        sentimentCount++;
      }
    });

    return {
      userId,
      totalReactions: sorted.length,
      firstDate,
      lastDate,
      daysActive: new Set(sorted.map(item => this.getDayKey(item.date))).size,
      distribution,
      averageSentiment: sentimentCount > 0 ? sentimentSum / sentimentCount : 0,
      timeline: sorted
    };
  }
};

// Export for use in other modules
window.DataProcessor = DataProcessor;
