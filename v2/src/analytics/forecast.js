// Forecasting Module
// Simple time series forecasting using moving averages

const ForecastAnalytics = {
  /**
   * Generate forecast using Simple Moving Average
   * @param {Array} historicalData - Historical sentiment/metric data
   * @param {Number} forecastDays - Number of days to forecast (default 7)
   * @param {Number} windowSize - Moving average window size (default 7)
   * @returns {Object} Forecast data with predictions and confidence intervals
   */
  generateForecast(historicalData, forecastDays = 7, windowSize = 7) {
    if (!historicalData || historicalData.length < windowSize) {
      return {
        predictions: [],
        confidence: { upper: [], lower: [] },
        method: 'insufficient-data'
      };
    }

    // Use last N data points for forecast base
    const recentData = historicalData.slice(-windowSize);
    const baseValue = this.mean(recentData);

    // Calculate trend from recent data
    const trend = this.calculateTrend(recentData);

    // Calculate volatility for confidence intervals
    const volatility = this.calculateVolatility(historicalData);

    // Generate predictions
    const predictions = [];
    const upperBound = [];
    const lowerBound = [];

    for (let i = 1; i <= forecastDays; i++) {
      // Simple forecast: base value + trend * time
      const prediction = baseValue + (trend * i);

      // Confidence interval widens over time (uncertainty increases)
      const confidenceWidth = volatility * Math.sqrt(i) * 1.96; // 95% confidence

      predictions.push(prediction);
      upperBound.push(prediction + confidenceWidth);
      lowerBound.push(prediction - confidenceWidth);
    }

    return {
      predictions,
      confidence: {
        upper: upperBound,
        lower: lowerBound,
        level: 0.95 // 95% confidence interval
      },
      method: 'moving-average',
      baseValue,
      trend,
      volatility
    };
  },

  /**
   * Generate forecast using Exponential Smoothing
   * Better for data with trends
   */
  generateForecastExponential(historicalData, forecastDays = 7, alpha = 0.3) {
    if (!historicalData || historicalData.length < 3) {
      return this.generateForecast(historicalData, forecastDays);
    }

    // Calculate smoothed values
    const smoothed = this.exponentialSmoothing(historicalData, alpha);
    const lastSmoothed = smoothed[smoothed.length - 1];

    // Calculate trend
    const trend = smoothed[smoothed.length - 1] - smoothed[smoothed.length - 2];

    // Calculate volatility
    const volatility = this.calculateVolatility(historicalData);

    // Generate predictions
    const predictions = [];
    const upperBound = [];
    const lowerBound = [];

    for (let i = 1; i <= forecastDays; i++) {
      const prediction = lastSmoothed + (trend * i);
      const confidenceWidth = volatility * Math.sqrt(i) * 1.96;

      predictions.push(prediction);
      upperBound.push(prediction + confidenceWidth);
      lowerBound.push(prediction - confidenceWidth);
    }

    return {
      predictions,
      confidence: {
        upper: upperBound,
        lower: lowerBound,
        level: 0.95
      },
      method: 'exponential-smoothing',
      alpha,
      lastValue: lastSmoothed,
      trend,
      volatility
    };
  },

  /**
   * Exponential smoothing calculation
   */
  exponentialSmoothing(data, alpha = 0.3) {
    const smoothed = [data[0]];

    for (let i = 1; i < data.length; i++) {
      const value = alpha * data[i] + (1 - alpha) * smoothed[i - 1];
      smoothed.push(value);
    }

    return smoothed;
  },

  /**
   * Calculate linear trend from data
   */
  calculateTrend(data) {
    if (data.length < 2) return 0;

    // Simple linear regression
    const n = data.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * data[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return isFinite(slope) ? slope : 0;
  },

  /**
   * Calculate volatility (standard deviation of changes)
   */
  calculateVolatility(data) {
    if (data.length < 2) return 0;

    const changes = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i] - data[i - 1]);
    }

    return this.standardDeviation(changes);
  },

  /**
   * Generate multiple forecasts with different methods
   */
  generateEnsembleForecast(historicalData, forecastDays = 7) {
    const ma = this.generateForecast(historicalData, forecastDays, 7);
    const es = this.generateForecastExponential(historicalData, forecastDays, 0.3);

    // Combine predictions (simple average)
    const predictions = [];
    const upperBound = [];
    const lowerBound = [];

    for (let i = 0; i < forecastDays; i++) {
      const avgPrediction = (ma.predictions[i] + es.predictions[i]) / 2;
      const maxUpper = Math.max(ma.confidence.upper[i], es.confidence.upper[i]);
      const minLower = Math.min(ma.confidence.lower[i], es.confidence.lower[i]);

      predictions.push(avgPrediction);
      upperBound.push(maxUpper);
      lowerBound.push(minLower);
    }

    return {
      predictions,
      confidence: {
        upper: upperBound,
        lower: lowerBound,
        level: 0.95
      },
      method: 'ensemble',
      components: { ma, es }
    };
  },

  /**
   * Evaluate forecast accuracy on historical data
   */
  evaluateForecast(historicalData, actualData, forecastLength = 7) {
    if (historicalData.length < forecastLength || actualData.length < forecastLength) {
      return null;
    }

    // Generate forecast
    const forecast = this.generateForecast(
      historicalData.slice(0, -forecastLength),
      forecastLength
    );

    // Compare with actual
    const actual = actualData.slice(-forecastLength);
    const predicted = forecast.predictions;

    // Calculate metrics
    const errors = actual.map((a, i) => a - predicted[i]);
    const absoluteErrors = errors.map(e => Math.abs(e));
    const squaredErrors = errors.map(e => e * e);

    const mae = this.mean(absoluteErrors); // Mean Absolute Error
    const rmse = Math.sqrt(this.mean(squaredErrors)); // Root Mean Squared Error
    const mape = this.mean(
      actual.map((a, i) => Math.abs((a - predicted[i]) / (a || 1)) * 100)
    ); // Mean Absolute Percentage Error

    return {
      mae,
      rmse,
      mape,
      accuracy: 100 - Math.min(mape, 100),
      errors
    };
  },

  /**
   * Detect if forecast should be adjusted based on recent trends
   */
  shouldAdjustForecast(historicalData, windowSize = 7) {
    if (historicalData.length < windowSize * 2) {
      return { adjust: false, reason: 'insufficient-data' };
    }

    const recentWindow = historicalData.slice(-windowSize);
    const priorWindow = historicalData.slice(-windowSize * 2, -windowSize);

    const recentAvg = this.mean(recentWindow);
    const priorAvg = this.mean(priorWindow);

    const changePercent = Math.abs((recentAvg - priorAvg) / (priorAvg || 1)) * 100;

    if (changePercent > 20) {
      return {
        adjust: true,
        reason: 'significant-trend-change',
        changePercent,
        recommendation: 'Use shorter window or exponential smoothing'
      };
    }

    return { adjust: false, reason: 'stable-trend' };
  },

  /**
   * Generate forecast dates
   */
  generateForecastDates(lastDate, forecastDays = 7) {
    const dates = [];
    const last = new Date(lastDate);

    for (let i = 1; i <= forecastDays; i++) {
      const nextDate = new Date(last);
      nextDate.setUTCDate(last.getUTCDate() + i);
      dates.push(this.formatDate(nextDate));
    }

    return dates;
  },

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Helper statistics methods
  mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  },

  standardDeviation(arr) {
    if (!arr || arr.length <= 1) return 0;
    const avg = this.mean(arr);
    const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  },

  /**
   * Complete forecast analysis
   */
  analyze(processedData) {
    const { sentimentSeries, days, maxDate } = processedData;

    if (!sentimentSeries || sentimentSeries.length < 7) {
      return null;
    }

    // Generate 7-day forecast using multiple methods
    const simpleForecast = this.generateForecast(sentimentSeries, 7, 7);
    const expForecast = this.generateForecastExponential(sentimentSeries, 7, 0.3);
    const ensembleForecast = this.generateEnsembleForecast(sentimentSeries, 7);

    // Generate forecast dates
    const forecastDates = this.generateForecastDates(maxDate, 7);

    // Check if adjustment needed
    const adjustmentCheck = this.shouldAdjustForecast(sentimentSeries);

    return {
      simple: simpleForecast,
      exponential: expForecast,
      ensemble: ensembleForecast,
      dates: forecastDates,
      recommendation: adjustmentCheck,
      lastHistoricalValue: sentimentSeries[sentimentSeries.length - 1],
      lastHistoricalDate: days[days.length - 1]
    };
  }
};

// Export for use in other modules
window.ForecastAnalytics = ForecastAnalytics;
