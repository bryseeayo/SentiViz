// Line Chart Renderer
// Canvas-based line chart for time series data

const LineChart = {
  /**
   * Draw line chart
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   */
  draw(canvas, data, options = {}) {
    const {
      title = '',
      xLabel = '',
      yLabel = '',
      showGrid = true,
      showPoints = false,
      lineColor = '#7dd3fc',
      lineWidth = 2,
      pointColor = '#0ea5e9',
      pointRadius = 3,
      fillArea = false,
      fillOpacity = 0.2,
      showLegend = false,
      yMin = null,
      yMax = null,
      formatYLabel = (v) => v.toFixed(2),
      formatXLabel = (v) => v,
      bands = null, // Optional: { upper: [], lower: [], mean: [] }
      forecast = null, // Optional: { predictions: [], upper: [], lower: [] }
      markers = null // Optional: [{ index, color, label }]
    } = options;

    const { labels, values } = data;

    if (!labels || !values || labels.length === 0) {
      this.drawEmptyState(canvas, 'No data available');
      return;
    }

    // Setup canvas
    const ctx = this.setupCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate margins
    const margin = {
      top: title ? 40 : 20,
      right: 20,
      bottom: xLabel ? 60 : 40,
      left: yLabel ? 70 : 50
    };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Calculate scales
    const dataMin = yMin !== null ? yMin : Math.min(...values);
    const dataMax = yMax !== null ? yMax : Math.max(...values);
    const yRange = dataMax - dataMin || 1;

    const xScale = chartWidth / Math.max(1, labels.length - 1);
    const yScale = chartHeight / yRange;

    // Helper functions
    const getX = (index) => margin.left + index * xScale;
    const getY = (value) => margin.top + chartHeight - (value - dataMin) * yScale;

    // Draw title
    if (title) {
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.fillText(title, width / 2, 20);
    }

    // Draw grid
    if (showGrid) {
      this.drawGrid(ctx, margin, chartWidth, chartHeight, dataMin, dataMax, formatYLabel);
    }

    // Draw axes
    this.drawAxes(ctx, margin, chartWidth, chartHeight);

    // Draw control bands if provided
    if (bands) {
      this.drawBands(ctx, bands, labels, getX, getY, margin, chartHeight);
    }

    // Draw forecast if provided
    if (forecast) {
      this.drawForecast(ctx, forecast, labels, getX, getY, margin, chartHeight, dataMin, yScale);
    }

    // Draw filled area under line
    if (fillArea) {
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(values[0]));

      for (let i = 1; i < values.length; i++) {
        ctx.lineTo(getX(i), getY(values[i]));
      }

      ctx.lineTo(getX(values.length - 1), margin.top + chartHeight);
      ctx.lineTo(getX(0), margin.top + chartHeight);
      ctx.closePath();

      ctx.fillStyle = this.hexToRgba(lineColor, fillOpacity);
      ctx.fill();
    }

    // Draw line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(values[0]));

    for (let i = 1; i < values.length; i++) {
      ctx.lineTo(getX(i), getY(values[i]));
    }

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Draw points
    if (showPoints) {
      values.forEach((value, index) => {
        ctx.beginPath();
        ctx.arc(getX(index), getY(value), pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = pointColor;
        ctx.fill();
      });
    }

    // Draw markers (anomalies, events, etc.)
    if (markers && markers.length > 0) {
      markers.forEach(marker => {
        if (marker.index >= 0 && marker.index < values.length) {
          const x = getX(marker.index);
          const y = getY(values[marker.index]);

          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = marker.color || '#fbbf24';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    // Draw X-axis labels
    this.drawXLabels(ctx, labels, getX, margin, chartHeight, formatXLabel);

    // Draw Y-axis labels
    this.drawYLabels(ctx, dataMin, dataMax, margin, chartHeight, formatYLabel);

    // Draw axis labels
    if (xLabel) {
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(xLabel, width / 2, height - 10);
    }

    if (yLabel) {
      ctx.save();
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();
    }
  },

  /**
   * Draw grid lines
   */
  drawGrid(ctx, margin, chartWidth, chartHeight, dataMin, dataMax, formatYLabel) {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const y = margin.top + (chartHeight / yTicks) * i;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }

    // Zero line if in range
    if (dataMin < 0 && dataMax > 0) {
      const zeroY = margin.top + chartHeight - (-dataMin / (dataMax - dataMin)) * chartHeight;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(margin.left, zeroY);
      ctx.lineTo(margin.left + chartWidth, zeroY);
      ctx.stroke();
    }
  },

  /**
   * Draw axes
   */
  drawAxes(ctx, margin, chartWidth, chartHeight) {
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
    ctx.stroke();
  },

  /**
   * Draw control bands
   */
  drawBands(ctx, bands, labels, getX, getY, margin, chartHeight) {
    const { upper, lower, mean } = bands;

    // Draw confidence band area
    if (upper && lower) {
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(upper[0]));

      for (let i = 1; i < upper.length; i++) {
        ctx.lineTo(getX(i), getY(upper[i]));
      }

      for (let i = lower.length - 1; i >= 0; i--) {
        ctx.lineTo(getX(i), getY(lower[i]));
      }

      ctx.closePath();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.fill();

      // Draw upper line
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(upper[0]));
      for (let i = 1; i < upper.length; i++) {
        ctx.lineTo(getX(i), getY(upper[i]));
      }
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      // Draw lower line
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(lower[0]));
      for (let i = 1; i < lower.length; i++) {
        ctx.lineTo(getX(i), getY(lower[i]));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw mean line
    if (mean) {
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(mean[0]));
      for (let i = 1; i < mean.length; i++) {
        ctx.lineTo(getX(i), getY(mean[i]));
      }
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },

  /**
   * Draw forecast
   */
  drawForecast(ctx, forecast, labels, getX, getY, margin, chartHeight, dataMin, yScale) {
    const { predictions, upper, lower } = forecast;
    const startIndex = labels.length;

    // Draw confidence band
    if (upper && lower) {
      ctx.beginPath();
      ctx.moveTo(getX(startIndex - 1), getY(upper[0]));

      for (let i = 0; i < predictions.length; i++) {
        ctx.lineTo(getX(startIndex + i), getY(upper[i]));
      }

      for (let i = predictions.length - 1; i >= 0; i--) {
        ctx.lineTo(getX(startIndex + i), getY(lower[i]));
      }

      ctx.closePath();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
      ctx.fill();
    }

    // Draw forecast line
    ctx.beginPath();
    ctx.moveTo(getX(startIndex - 1), getY(predictions[0]));

    for (let i = 0; i < predictions.length; i++) {
      ctx.lineTo(getX(startIndex + i), getY(predictions[i]));
    }

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  /**
   * Draw X-axis labels
   */
  drawXLabels(ctx, labels, getX, margin, chartHeight, formatXLabel) {
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Show subset of labels to avoid crowding
    const maxLabels = 8;
    const step = Math.ceil(labels.length / maxLabels);

    for (let i = 0; i < labels.length; i += step) {
      const x = getX(i);
      const y = margin.top + chartHeight + 8;
      const label = formatXLabel(labels[i]);
      ctx.fillText(label, x, y);
    }

    // Always show last label
    if (labels.length > 1) {
      const lastIndex = labels.length - 1;
      const x = getX(lastIndex);
      const y = margin.top + chartHeight + 8;
      ctx.fillText(formatXLabel(labels[lastIndex]), x, y);
    }
  },

  /**
   * Draw Y-axis labels
   */
  drawYLabels(ctx, dataMin, dataMax, margin, chartHeight, formatYLabel) {
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const value = dataMax - (i / yTicks) * (dataMax - dataMin);
      const y = margin.top + (chartHeight / yTicks) * i;
      ctx.fillText(formatYLabel(value), margin.left - 10, y);
    }
  },

  /**
   * Draw empty state
   */
  drawEmptyState(canvas, message) {
    const ctx = this.setupCanvas(canvas);
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, rect.width / 2, rect.height / 2);
  },

  /**
   * Convert hex to rgba
   */
  hexToRgba(hex, alpha) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0, 0, 0, ${alpha})`;

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  /**
   * Setup canvas with proper DPI scaling
   */
  setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    return ctx;
  }
};

// Export for use in other modules
window.LineChart = LineChart;
