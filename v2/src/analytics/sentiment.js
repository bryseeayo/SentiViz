// Sentiment Analysis Module
// Analyzes sentiment trends, detects anomalies, calculates velocity

const SentimentAnalytics = {
  /**
   * Calculate moving average for smoothing
   */
  movingAverage(data, windowSize = 7) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = data.slice(start, i + 1);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(avg);
    }
    return result;
  },

  /**
   * Calculate sentiment velocity (rate of change)
   */
  calculateVelocity(sentimentSeries, windowSize = 3) {
    const velocity = [];

    for (let i = 0; i < sentimentSeries.length; i++) {
      if (i < windowSize) {
        velocity.push(0);
        continue;
      }

      const current = sentimentSeries[i];
      const previous = sentimentSeries[i - windowSize];
      const change = current - previous;
      velocity.push(change / windowSize);
    }

    return velocity;
  },

  /**
   * Detect anomalies using Z-score method
   */
  detectAnomaliesZScore(data, threshold = 2.0) {
    if (!data || data.length < 3) return [];

    const mean = this.mean(data);
    const stdDev = this.standardDeviation(data);

    if (stdDev === 0) return [];

    const anomalies = [];

    data.forEach((value, index) => {
      const zScore = (value - mean) / stdDev;

      if (Math.abs(zScore) >= threshold) {
        anomalies.push({
          index,
          value,
          zScore,
          type: zScore > 0 ? 'spike' : 'dip',
          severity: Math.abs(zScore) >= 3 ? 'high' : 'medium'
        });
      }
    });

    return anomalies;
  },

  /**
   * Detect anomalies using MAD (Median Absolute Deviation) - more robust
   */
  detectAnomaliesMAD(data, threshold = 3.5) {
    if (!data || data.length < 3) return [];

    const median = this.median(data);
    const deviations = data.map(v => Math.abs(v - median));
    const mad = this.median(deviations);

    if (mad === 0) return [];

    // Modified Z-score using MAD
    const scale = 0.6745; // Constant for normal distribution
    const anomalies = [];

    data.forEach((value, index) => {
      const modifiedZ = (Math.abs(value - median) * scale) / mad;

      if (modifiedZ >= threshold) {
        anomalies.push({
          index,
          value,
          modifiedZScore: modifiedZ,
          type: value > median ? 'spike' : 'dip',
          severity: modifiedZ >= 5 ? 'high' : 'medium'
        });
      }
    });

    return anomalies;
  },

  /**
   * Identify trend direction and strength
   */
  analyzeTrend(data, recentWindow = 7) {
    if (!data || data.length < 2) {
      return { direction: 'stable', strength: 0, description: 'Insufficient data' };
    }

    // Compare recent average to overall average
    const overallAvg = this.mean(data);
    const recentData = data.slice(-Math.min(recentWindow, data.length));
    const recentAvg = this.mean(recentData);

    const change = recentAvg - overallAvg;
    const changePercent = Math.abs(change / (overallAvg || 1)) * 100;

    let direction = 'stable';
    let strength = 0;
    let description = '';

    if (changePercent < 5) {
      direction = 'stable';
      strength = 0;
      description = 'Sentiment is stable';
    } else if (change > 0) {
      direction = 'increasing';
      strength = Math.min(changePercent / 20, 1); // Normalize to 0-1
      description = `Sentiment trending ${changePercent >= 15 ? 'strongly' : 'moderately'} positive`;
    } else {
      direction = 'decreasing';
      strength = Math.min(changePercent / 20, 1);
      description = `Sentiment trending ${changePercent >= 15 ? 'strongly' : 'moderately'} negative`;
    }

    return {
      direction,
      strength,
      changePercent,
      recentAvg,
      overallAvg,
      description
    };
  },

  /**
   * Detect patterns (cyclical, seasonal)
   */
  detectPatterns(data, days) {
    if (!data || data.length < 7) {
      return { patterns: [], description: 'Insufficient data for pattern detection' };
    }

    const patterns = [];

    // Check for day-of-week patterns
    const dayOfWeekPattern = this.analyzeDayOfWeekPattern(data, days);
    if (dayOfWeekPattern.hasPattern) {
      patterns.push(dayOfWeekPattern);
    }

    // Check for weekend vs weekday
    const weekdayPattern = this.analyzeWeekdayPattern(data, days);
    if (weekdayPattern.hasPattern) {
      patterns.push(weekdayPattern);
    }

    return {
      patterns,
      description: patterns.length > 0
        ? `Found ${patterns.length} pattern(s)`
        : 'No significant patterns detected'
    };
  },

  /**
   * Analyze day-of-week patterns
   */
  analyzeDayOfWeekPattern(data, days) {
    const byDayOfWeek = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    days.forEach((day, index) => {
      const date = new Date(day);
      const dayOfWeek = date.getUTCDay();
      byDayOfWeek[dayOfWeek].push(data[index]);
    });

    const averages = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let minAvg = Infinity;
    let maxAvg = -Infinity;
    let minDay = '';
    let maxDay = '';

    dayNames.forEach((name, index) => {
      if (byDayOfWeek[index].length > 0) {
        const avg = this.mean(byDayOfWeek[index]);
        averages[name] = avg;
        if (avg < minAvg) {
          minAvg = avg;
          minDay = name;
        }
        if (avg > maxAvg) {
          maxAvg = avg;
          maxDay = name;
        }
      }
    });

    const range = maxAvg - minAvg;
    const hasPattern = range > 0.2; // Significant if range > 0.2

    return {
      type: 'day-of-week',
      hasPattern,
      averages,
      peak: { day: maxDay, value: maxAvg },
      low: { day: minDay, value: minAvg },
      description: hasPattern
        ? `${maxDay}s tend to have higher sentiment, ${minDay}s lower`
        : 'No clear day-of-week pattern'
    };
  },

  /**
   * Analyze weekday vs weekend patterns
   */
  analyzeWeekdayPattern(data, days) {
    const weekday = [];
    const weekend = [];

    days.forEach((day, index) => {
      const date = new Date(day);
      const dayOfWeek = date.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekend.push(data[index]);
      } else {
        weekday.push(data[index]);
      }
    });

    const weekdayAvg = weekday.length > 0 ? this.mean(weekday) : 0;
    const weekendAvg = weekend.length > 0 ? this.mean(weekend) : 0;
    const difference = Math.abs(weekendAvg - weekdayAvg);
    const hasPattern = difference > 0.15;

    return {
      type: 'weekday-weekend',
      hasPattern,
      weekdayAvg,
      weekendAvg,
      difference,
      description: hasPattern
        ? `${weekendAvg > weekdayAvg ? 'Weekends' : 'Weekdays'} show higher sentiment`
        : 'No significant weekday/weekend difference'
    };
  },

  /**
   * Calculate sentiment momentum (combination of trend and velocity)
   */
  calculateMomentum(sentimentSeries) {
    if (sentimentSeries.length < 7) {
      return { score: 0, direction: 'neutral', description: 'Insufficient data' };
    }

    const trend = this.analyzeTrend(sentimentSeries);
    const velocity = this.calculateVelocity(sentimentSeries);
    const recentVelocity = velocity.slice(-7);
    const avgVelocity = this.mean(recentVelocity);

    // Momentum combines trend strength and velocity
    const momentumScore = (trend.strength * 0.6) + (Math.abs(avgVelocity) * 0.4);

    let direction = 'neutral';
    let description = 'Neutral momentum';

    if (momentumScore > 0.3) {
      if (trend.direction === 'increasing') {
        direction = 'positive';
        description = 'Strong positive momentum';
      } else if (trend.direction === 'decreasing') {
        direction = 'negative';
        description = 'Strong negative momentum';
      }
    } else if (momentumScore > 0.1) {
      direction = trend.direction === 'increasing' ? 'positive' : 'negative';
      description = `Moderate ${direction} momentum`;
    }

    return {
      score: momentumScore,
      direction,
      velocity: avgVelocity,
      trend: trend.direction,
      description
    };
  },

  // Statistical helper methods
  mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  },

  median(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  },

  standardDeviation(arr) {
    if (!arr || arr.length <= 1) return 0;
    const avg = this.mean(arr);
    const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
    const avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  },

  /**
   * Calculate control bands (rolling mean ± K * rolling MAD)
   */
  calculateControlBands(data, windowSize = 7, kValue = 3) {
    const mean = [];
    const upper = [];
    const lower = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = data.slice(start, i + 1);

      const windowMean = this.mean(window);
      const windowMedian = this.median(window);
      const deviations = window.map(v => Math.abs(v - windowMedian));
      const mad = this.median(deviations);
      const madScaled = mad * 1.4826; // Scale factor for consistency with std dev

      mean.push(windowMean);
      upper.push(windowMean + kValue * madScaled);
      lower.push(windowMean - kValue * madScaled);
    }

    return { mean, upper, lower };
  },

  /**
   * Comprehensive sentiment analysis
   */
  analyze(processedData) {
    const { sentimentSeries, days, dailyShares } = processedData;

    if (!sentimentSeries || sentimentSeries.length === 0) {
      return null;
    }

    // Calculate smoothed sentiment
    const smoothed = this.movingAverage(sentimentSeries, 7);

    // Detect anomalies using both methods
    const anomaliesZ = this.detectAnomaliesZScore(sentimentSeries);
    const anomaliesMAD = this.detectAnomaliesMAD(sentimentSeries);

    // Analyze trends
    const trend = this.analyzeTrend(sentimentSeries);
    const momentum = this.calculateMomentum(sentimentSeries);

    // Detect patterns
    const patterns = this.detectPatterns(sentimentSeries, days);

    // Calculate velocity
    const velocity = this.calculateVelocity(sentimentSeries);

    // Calculate control bands
    const controlBands = this.calculateControlBands(sentimentSeries);

    // Analyze emoji-specific trends
    const wowShares = dailyShares.map(s => s.wow);
    const curiousShares = dailyShares.map(s => s.curious);
    const boringShares = dailyShares.map(s => s.boring);

    return {
      // Basic metrics
      overallAverage: this.mean(sentimentSeries),
      recentAverage: this.mean(sentimentSeries.slice(-7)),
      median: this.median(sentimentSeries),
      stdDev: this.standardDeviation(sentimentSeries),

      // Smoothed data
      smoothed,

      // Anomalies
      anomalies: {
        zScore: anomaliesZ,
        mad: anomaliesMAD,
        combined: this.mergeAnomalies(anomaliesZ, anomaliesMAD)
      },

      // Trends
      trend,
      momentum,
      velocity,
      patterns,

      // Control bands
      controlBands,

      // Emoji-specific analysis
      emojiTrends: {
        wow: this.analyzeTrend(wowShares),
        curious: this.analyzeTrend(curiousShares),
        boring: this.analyzeTrend(boringShares)
      }
    };
  },

  /**
   * Merge anomalies from different detection methods
   */
  mergeAnomalies(anomaliesZ, anomaliesMAD) {
    const merged = new Map();

    anomaliesZ.forEach(a => {
      merged.set(a.index, { ...a, methods: ['z-score'] });
    });

    anomaliesMAD.forEach(a => {
      if (merged.has(a.index)) {
        merged.get(a.index).methods.push('mad');
        merged.get(a.index).madScore = a.modifiedZScore;
      } else {
        merged.set(a.index, { ...a, methods: ['mad'] });
      }
    });

    return Array.from(merged.values()).sort((a, b) => b.index - a.index);
  }
};

// Export for use in other modules
window.SentimentAnalytics = SentimentAnalytics;
