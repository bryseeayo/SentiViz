// Bar Chart Renderer
// Canvas-based bar chart for categorical data

const BarChart = {
  /**
   * Draw bar chart
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} data - Chart data { labels: [], values: [] }
   * @param {Object} options - Chart options
   */
  draw(canvas, data, options = {}) {
    const {
      title = '',
      xLabel = '',
      yLabel = '',
      orientation = 'vertical', // 'vertical' or 'horizontal'
      barColor = '#6ca0ff',
      barColors = null, // Array of colors per bar
      showValues = true,
      showGrid = true,
      formatValue = (v) => v.toLocaleString(),
      formatLabel = (v) => v,
      maxBars = 20 // Limit number of bars shown
    } = options;

    const { labels, values } = data;

    if (!labels || !values || labels.length === 0) {
      this.drawEmptyState(canvas, 'No data available');
      return;
    }

    // Limit bars if too many
    const limitedLabels = labels.slice(0, maxBars);
    const limitedValues = values.slice(0, maxBars);

    // Setup canvas
    const ctx = this.setupCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (orientation === 'horizontal') {
      this.drawHorizontal(ctx, {
        labels: limitedLabels,
        values: limitedValues,
        width,
        height,
        title,
        xLabel,
        yLabel,
        barColor,
        barColors,
        showValues,
        showGrid,
        formatValue,
        formatLabel
      });
    } else {
      this.drawVertical(ctx, {
        labels: limitedLabels,
        values: limitedValues,
        width,
        height,
        title,
        xLabel,
        yLabel,
        barColor,
        barColors,
        showValues,
        showGrid,
        formatValue,
        formatLabel
      });
    }
  },

  /**
   * Draw vertical bar chart
   */
  drawVertical(ctx, params) {
    const {
      labels,
      values,
      width,
      height,
      title,
      xLabel,
      yLabel,
      barColor,
      barColors,
      showValues,
      showGrid,
      formatValue,
      formatLabel
    } = params;

    // Calculate margins
    const margin = {
      top: title ? 40 : 20,
      right: 20,
      bottom: xLabel ? 80 : 60,
      left: yLabel ? 70 : 60
    };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Calculate scales
    const maxValue = Math.max(...values, 0);
    const yScale = chartHeight / (maxValue || 1);
    const barWidth = chartWidth / labels.length * 0.8;
    const barGap = chartWidth / labels.length * 0.2;

    // Helper functions
    const getX = (index) => margin.left + index * (barWidth + barGap) + barGap / 2;
    const getY = (value) => margin.top + chartHeight - value * yScale;

    // Draw title
    if (title) {
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.fillText(title, width / 2, 20);
    }

    // Draw grid
    if (showGrid) {
      this.drawVerticalGrid(ctx, margin, chartWidth, chartHeight, maxValue, formatValue);
    }

    // Draw axes
    this.drawAxes(ctx, margin, chartWidth, chartHeight);

    // Draw bars
    values.forEach((value, index) => {
      const x = getX(index);
      const y = getY(value);
      const h = chartHeight - (y - margin.top);

      // Bar color
      const color = barColors && barColors[index] ? barColors[index] : barColor;

      // Draw bar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, h);

      // Draw bar outline
      ctx.strokeStyle = this.darkenColor(color, 0.2);
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, h);

      // Draw value on top of bar
      if (showValues) {
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#f1f5f9';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(formatValue(value), x + barWidth / 2, y - 4);
      }
    });

    // Draw X-axis labels
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    labels.forEach((label, index) => {
      const x = getX(index) + barWidth / 2;
      const y = margin.top + chartHeight + 8;

      // Rotate label if long
      const formattedLabel = formatLabel(label);
      if (formattedLabel.length > 10) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 4);
        ctx.textAlign = 'right';
        ctx.fillText(formattedLabel, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(formattedLabel, x, y);
      }
    });

    // Draw Y-axis labels
    this.drawYAxisLabels(ctx, margin, chartHeight, maxValue, formatValue);

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
   * Draw horizontal bar chart
   */
  drawHorizontal(ctx, params) {
    const {
      labels,
      values,
      width,
      height,
      title,
      xLabel,
      yLabel,
      barColor,
      barColors,
      showValues,
      showGrid,
      formatValue,
      formatLabel
    } = params;

    // Calculate margins
    const margin = {
      top: title ? 40 : 20,
      right: 60,
      bottom: xLabel ? 40 : 20,
      left: 150 // More space for labels
    };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Calculate scales
    const maxValue = Math.max(...values, 0);
    const xScale = chartWidth / (maxValue || 1);
    const barHeight = Math.min(chartHeight / labels.length * 0.8, 40);
    const barGap = chartHeight / labels.length * 0.2;

    // Helper functions
    const getX = (value) => margin.left + value * xScale;
    const getY = (index) => margin.top + index * (barHeight + barGap) + barGap / 2;

    // Draw title
    if (title) {
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.fillText(title, width / 2, 20);
    }

    // Draw grid
    if (showGrid) {
      this.drawHorizontalGrid(ctx, margin, chartWidth, chartHeight, maxValue, formatValue);
    }

    // Draw axes
    this.drawAxes(ctx, margin, chartWidth, chartHeight);

    // Draw bars
    values.forEach((value, index) => {
      const x = margin.left;
      const y = getY(index);
      const w = value * xScale;

      // Bar color
      const color = barColors && barColors[index] ? barColors[index] : barColor;

      // Draw bar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, barHeight);

      // Draw bar outline
      ctx.strokeStyle = this.darkenColor(color, 0.2);
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, barHeight);

      // Draw value at end of bar
      if (showValues) {
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#f1f5f9';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatValue(value), x + w + 6, y + barHeight / 2);
      }
    });

    // Draw Y-axis labels (category labels)
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    labels.forEach((label, index) => {
      const x = margin.left - 10;
      const y = getY(index) + barHeight / 2;
      ctx.fillText(formatLabel(label), x, y);
    });

    // Draw X-axis labels
    this.drawXAxisLabels(ctx, margin, chartWidth, chartHeight, maxValue, formatValue);
  },

  /**
   * Draw grid for vertical chart
   */
  drawVerticalGrid(ctx, margin, chartWidth, chartHeight, maxValue, formatValue) {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;

    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const y = margin.top + (chartHeight / yTicks) * i;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }
  },

  /**
   * Draw grid for horizontal chart
   */
  drawHorizontalGrid(ctx, margin, chartWidth, chartHeight, maxValue, formatValue) {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;

    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const x = margin.left + (chartWidth / xTicks) * i;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + chartHeight);
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
   * Draw Y-axis labels
   */
  drawYAxisLabels(ctx, margin, chartHeight, maxValue, formatValue) {
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const value = maxValue - (i / yTicks) * maxValue;
      const y = margin.top + (chartHeight / yTicks) * i;
      ctx.fillText(formatValue(value), margin.left - 10, y);
    }
  },

  /**
   * Draw X-axis labels
   */
  drawXAxisLabels(ctx, margin, chartWidth, chartHeight, maxValue, formatValue) {
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const value = (i / xTicks) * maxValue;
      const x = margin.left + (chartWidth / xTicks) * i;
      const y = margin.top + chartHeight + 8;
      ctx.fillText(formatValue(value), x, y);
    }
  },

  /**
   * Darken a color
   */
  darkenColor(color, amount) {
    // Simple darkening by reducing RGB values
    const rgb = this.hexToRgb(color);
    const r = Math.max(0, Math.floor(rgb.r * (1 - amount)));
    const g = Math.max(0, Math.floor(rgb.g * (1 - amount)));
    const b = Math.max(0, Math.floor(rgb.b * (1 - amount)));
    return `rgb(${r}, ${g}, ${b})`;
  },

  /**
   * Convert hex to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 108, g: 160, b: 255 };
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
window.BarChart = BarChart;
