// Auto-Insights Generation Module
// Generates natural language insights from data analysis

const InsightsGenerator = {
  /**
   * Generate comprehensive insights from processed data
   */
  generate(processedData, sentimentAnalysis, forecast) {
    const insights = [];

    // Overview insight
    insights.push(this.generateOverview(processedData));

    // Sentiment trend insights
    if (sentimentAnalysis) {
      insights.push(...this.generateSentimentInsights(sentimentAnalysis, processedData));
    }

    // Anomaly insights
    if (sentimentAnalysis && sentimentAnalysis.anomalies) {
      insights.push(...this.generateAnomalyInsights(sentimentAnalysis.anomalies, processedData));
    }

    // User engagement insights
    insights.push(...this.generateEngagementInsights(processedData));

    // Emoji distribution insights
    insights.push(...this.generateEmojiInsights(processedData));

    // Forecast insights
    if (forecast) {
      insights.push(...this.generateForecastInsights(forecast, processedData));
    }

    // Pattern insights
    if (sentimentAnalysis && sentimentAnalysis.patterns) {
      insights.push(...this.generatePatternInsights(sentimentAnalysis.patterns));
    }

    return insights.filter(i => i !== null);
  },

  /**
   * Generate overview insight
   */
  generateOverview(data) {
    const { total, uniqueUsers, days, dailyTotals } = data;
    const avgPerDay = total / days.length;
    const avgUsersPerDay = avgPerDay.toFixed(1);

    return {
      type: 'overview',
      priority: 'high',
      title: 'Dataset Overview',
      message: `Analyzed ${total.toLocaleString()} reactions from ${uniqueUsers.toLocaleString()} unique users over ${days.length} days (avg ${avgUsersPerDay} reactions/day).`,
      icon: '📊',
      data: { total, uniqueUsers, days: days.length, avgPerDay }
    };
  },

  /**
   * Generate sentiment insights
   */
  generateSentimentInsights(analysis, data) {
    const insights = [];
    const { trend, momentum, overallAverage, recentAverage } = analysis;

    // Trend insight
    if (trend && trend.direction !== 'stable') {
      const emoji = trend.direction === 'increasing' ? '📈' : '📉';
      const strength = trend.strength > 0.5 ? 'strongly' : 'moderately';
      const direction = trend.direction === 'increasing' ? 'positive' : 'negative';

      insights.push({
        type: 'trend',
        priority: trend.strength > 0.5 ? 'high' : 'medium',
        title: `Sentiment Trending ${direction === 'positive' ? 'Up' : 'Down'}`,
        message: `Sentiment is ${strength} trending ${direction}. Recent average (${recentAverage.toFixed(2)}) is ${Math.abs(trend.changePercent).toFixed(1)}% ${direction === 'positive' ? 'higher' : 'lower'} than overall average (${overallAverage.toFixed(2)}).`,
        icon: emoji,
        data: trend
      });
    } else if (trend) {
      insights.push({
        type: 'trend',
        priority: 'low',
        title: 'Stable Sentiment',
        message: `Sentiment remains stable around ${overallAverage.toFixed(2)}, with minimal variation over the period.`,
        icon: '➡️',
        data: trend
      });
    }

    // Momentum insight
    if (momentum && momentum.score > 0.3) {
      const direction = momentum.direction === 'positive' ? 'upward' : 'downward';
      const emoji = momentum.direction === 'positive' ? '🚀' : '⚠️';

      insights.push({
        type: 'momentum',
        priority: momentum.score > 0.5 ? 'high' : 'medium',
        title: `Strong ${direction} Momentum`,
        message: momentum.description + `. This suggests ${momentum.direction === 'positive' ? 'improving' : 'declining'} user satisfaction.`,
        icon: emoji,
        data: momentum
      });
    }

    return insights;
  },

  /**
   * Generate anomaly insights
   */
  generateAnomalyInsights(anomalies, data) {
    const insights = [];
    const { combined } = anomalies;

    if (!combined || combined.length === 0) {
      return insights;
    }

    // Focus on most recent and significant anomalies
    const recentAnomalies = combined.slice(0, 3);

    recentAnomalies.forEach(anomaly => {
      const day = data.days[anomaly.index];
      const dayData = data.dailyMetrics[anomaly.index];
      const type = anomaly.type === 'spike' ? 'spike' : 'dip';
      const emoji = type === 'spike' ? '⚡' : '📉';

      const topEmoji = this.getTopEmoji(dayData.counts);

      insights.push({
        type: 'anomaly',
        priority: anomaly.severity === 'high' ? 'high' : 'medium',
        title: `Sentiment ${type === 'spike' ? 'Spike' : 'Dip'} on ${day}`,
        message: `Detected ${anomaly.severity} severity ${type} with ${dayData.total} reactions. Top reaction: ${topEmoji.emoji} ${topEmoji.label} (${topEmoji.percent}%).`,
        icon: emoji,
        data: { ...anomaly, day, dayData }
      });
    });

    return insights;
  },

  /**
   * Generate engagement insights
   */
  generateEngagementInsights(data) {
    const insights = [];
    const { uniqueUsers, repeaters, dailyTotals, days } = data;

    // Returning user insight
    const returningPercent = (repeaters / uniqueUsers) * 100;

    if (returningPercent > 50) {
      insights.push({
        type: 'engagement',
        priority: 'high',
        title: 'High User Retention',
        message: `Strong engagement: ${returningPercent.toFixed(1)}% of users (${repeaters.toLocaleString()} of ${uniqueUsers.toLocaleString()}) have responded multiple times.`,
        icon: '🔄',
        data: { repeaters, uniqueUsers, returningPercent }
      });
    } else if (returningPercent > 25) {
      insights.push({
        type: 'engagement',
        priority: 'medium',
        title: 'Moderate User Retention',
        message: `${returningPercent.toFixed(1)}% of users (${repeaters.toLocaleString()}) are returning responders. Consider strategies to increase repeat engagement.`,
        icon: '🔄',
        data: { repeaters, uniqueUsers, returningPercent }
      });
    } else {
      insights.push({
        type: 'engagement',
        priority: 'medium',
        title: 'Low User Retention',
        message: `Only ${returningPercent.toFixed(1)}% of users return. Most responses are from new users each day.`,
        icon: '👥',
        data: { repeaters, uniqueUsers, returningPercent }
      });
    }

    // Volume insight
    const avgDaily = dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length;
    const recentAvg = dailyTotals.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, dailyTotals.length);
    const volumeChange = ((recentAvg - avgDaily) / avgDaily) * 100;

    if (Math.abs(volumeChange) > 20) {
      insights.push({
        type: 'volume',
        priority: 'medium',
        title: `Response Volume ${volumeChange > 0 ? 'Increasing' : 'Decreasing'}`,
        message: `Recent daily average (${recentAvg.toFixed(1)}) is ${Math.abs(volumeChange).toFixed(1)}% ${volumeChange > 0 ? 'higher' : 'lower'} than overall average (${avgDaily.toFixed(1)}).`,
        icon: volumeChange > 0 ? '📈' : '📉',
        data: { avgDaily, recentAvg, volumeChange }
      });
    }

    return insights;
  },

  /**
   * Generate emoji distribution insights
   */
  generateEmojiInsights(data) {
    const insights = [];
    const { dailyShares, sentimentSeries } = data;

    // Calculate overall distribution
    const avgWow = this.mean(dailyShares.map(s => s.wow));
    const avgCurious = this.mean(dailyShares.map(s => s.curious));
    const avgBoring = this.mean(dailyShares.map(s => s.boring));

    const distribution = [
      { emoji: '🤯', label: 'Wow', percent: avgWow * 100 },
      { emoji: '🤔', label: 'Curious', percent: avgCurious * 100 },
      { emoji: '😴', label: 'Boring', percent: avgBoring * 100 }
    ].sort((a, b) => b.percent - a.percent);

    const dominant = distribution[0];

    insights.push({
      type: 'distribution',
      priority: 'medium',
      title: `${dominant.emoji} ${dominant.label} Reactions Dominate`,
      message: `${dominant.percent.toFixed(1)}% of reactions are ${dominant.label}. Distribution: Wow ${(avgWow * 100).toFixed(1)}%, Curious ${(avgCurious * 100).toFixed(1)}%, Boring ${(avgBoring * 100).toFixed(1)}%.`,
      icon: dominant.emoji,
      data: { distribution, avgWow, avgCurious, avgBoring }
    });

    // Check for concerning boring percentage
    if (avgBoring > 0.3) {
      insights.push({
        type: 'concern',
        priority: 'high',
        title: 'High Boring Response Rate',
        message: `${(avgBoring * 100).toFixed(1)}% of reactions are 😴 Boring. Consider reviewing content strategy to increase engagement.`,
        icon: '⚠️',
        data: { boringPercent: avgBoring * 100 }
      });
    }

    return insights;
  },

  /**
   * Generate forecast insights
   */
  generateForecastInsights(forecast, data) {
    const insights = [];

    if (!forecast.ensemble) return insights;

    const { predictions } = forecast.ensemble;
    const lastActual = data.sentimentSeries[data.sentimentSeries.length - 1];
    const forecast7Day = predictions[6]; // 7 days out
    const change = forecast7Day - lastActual;

    if (Math.abs(change) > 0.1) {
      const direction = change > 0 ? 'improve' : 'decline';
      const emoji = change > 0 ? '🔮' : '⚠️';

      insights.push({
        type: 'forecast',
        priority: Math.abs(change) > 0.2 ? 'high' : 'medium',
        title: `Sentiment Expected to ${direction === 'improve' ? 'Improve' : 'Decline'}`,
        message: `7-day forecast predicts sentiment will ${direction} from ${lastActual.toFixed(2)} to ${forecast7Day.toFixed(2)} (${change > 0 ? '+' : ''}${(change * 100).toFixed(1)}%).`,
        icon: emoji,
        data: { lastActual, forecast7Day, change, predictions }
      });
    } else {
      insights.push({
        type: 'forecast',
        priority: 'low',
        title: 'Stable Forecast',
        message: `Sentiment expected to remain stable around ${forecast7Day.toFixed(2)} over the next 7 days.`,
        icon: '🔮',
        data: { forecast7Day, predictions }
      });
    }

    return insights;
  },

  /**
   * Generate pattern insights
   */
  generatePatternInsights(patterns) {
    const insights = [];

    if (!patterns.patterns || patterns.patterns.length === 0) {
      return insights;
    }

    patterns.patterns.forEach(pattern => {
      if (pattern.type === 'day-of-week' && pattern.hasPattern) {
        insights.push({
          type: 'pattern',
          priority: 'medium',
          title: 'Day-of-Week Pattern Detected',
          message: pattern.description + `. Consider timing content releases accordingly.`,
          icon: '📅',
          data: pattern
        });
      }

      if (pattern.type === 'weekday-weekend' && pattern.hasPattern) {
        insights.push({
          type: 'pattern',
          priority: 'medium',
          title: 'Weekday vs Weekend Pattern',
          message: pattern.description + `. This could inform content scheduling strategies.`,
          icon: '📆',
          data: pattern
        });
      }
    });

    return insights;
  },

  /**
   * Get summary of top insights
   */
  getTopInsights(insights, limit = 5) {
    const priorityOrder = { high: 3, medium: 2, low: 1 };

    return insights
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, limit);
  },

  /**
   * Generate executive summary
   */
  generateExecutiveSummary(insights) {
    const highPriority = insights.filter(i => i.priority === 'high');
    const keyMetrics = insights.find(i => i.type === 'overview');

    let summary = '';

    if (keyMetrics) {
      summary += keyMetrics.message + ' ';
    }

    if (highPriority.length > 0) {
      summary += `Key findings: ${highPriority.map(i => i.title).join(', ')}.`;
    } else {
      summary += 'Overall sentiment is stable with no major concerns.';
    }

    return {
      summary,
      keyPoints: highPriority.map(i => i.title),
      totalInsights: insights.length,
      highPriorityCount: highPriority.length
    };
  },

  /**
   * Format insights for display
   */
  formatInsight(insight) {
    const priorityColors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    };

    return {
      ...insight,
      color: priorityColors[insight.priority],
      timestamp: new Date().toISOString()
    };
  },

  // Helper methods
  mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  },

  getTopEmoji(counts) {
    const emojis = [
      { emoji: '🤯', label: 'Wow', count: counts['🤯'] || 0 },
      { emoji: '🤔', label: 'Curious', count: counts['🤔'] || 0 },
      { emoji: '😴', label: 'Boring', count: counts['😴'] || 0 }
    ].sort((a, b) => b.count - a.count);

    const top = emojis[0];
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return {
      ...top,
      percent: ((top.count / total) * 100).toFixed(1)
    };
  }
};

// Export for use in other modules
window.InsightsGenerator = InsightsGenerator;
