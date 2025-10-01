// Heatmap Chart Renderer
// Canvas-based calendar heatmap for time series data

const HeatmapChart = {
  /**
   * Draw calendar heatmap
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} data - Chart data { dates: [], values: [] }
   * @param {Object} options - Chart options
   */
  draw(canvas, data, options = {}) {
    const {
      title = '',
      type = 'calendar', // 'calendar' or 'grid'
      cellSize = 12,
      cellGap = 2,
      showValues = false,
      showLabels = true,
      colorScale = 'default', // 'default', 'sentiment', 'intensity'
      minColor = '#1e293b',
      maxColor = '#34d399',
      neutralColor = '#fbbf24',
      formatValue = (v) => v.toFixed(2),
      formatDate = (d) => d
    } = options;

    const { dates, values } = data;

    if (!dates || !values || dates.length === 0) {
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

    if (type === 'calendar') {
      this.drawCalendar(ctx, {
        dates,
        values,
        width,
        height,
        title,
        cellSize,
        cellGap,
        showValues,
        showLabels,
        colorScale,
        minColor,
        maxColor,
        neutralColor,
        formatValue,
        formatDate
      });
    } else {
      this.drawGrid(ctx, {
        dates,
        values,
        width,
        height,
        title,
        cellSize,
        cellGap,
        showValues,
        showLabels,
        colorScale,
        minColor,
        maxColor,
        neutralColor,
        formatValue,
        formatDate
      });
    }
  },

  /**
   * Draw calendar-style heatmap (like GitHub contributions)
   */
  drawCalendar(ctx, params) {
    const {
      dates,
      values,
      width,
      height,
      title,
      cellSize,
      cellGap,
      showLabels,
      colorScale,
      minColor,
      maxColor,
      neutralColor,
      formatValue
    } = params;

    const margin = { top: title ? 40 : 20, right: 20, bottom: 20, left: 60 };

    // Draw title
    if (title) {
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.fillText(title, width / 2, 20);
    }

    // Parse dates and create map
    const dateValueMap = new Map();
    const parsedDates = [];

    dates.forEach((date, index) => {
      const d = typeof date === 'string' ? new Date(date + 'T00:00:00Z') : new Date(date);
      const key = this.getDateKey(d);
      dateValueMap.set(key, values[index]);
      parsedDates.push(d);
    });

    // Find date range
    const minDate = new Date(Math.min(...parsedDates));
    const maxDate = new Date(Math.max(...parsedDates));

    // Start from Sunday of the first week
    const startDate = new Date(minDate);
    startDate.setUTCDate(minDate.getUTCDate() - minDate.getUTCDay());

    // Calculate weeks needed
    const daysDiff = Math.ceil((maxDate - startDate) / (1000 * 60 * 60 * 24));
    const weeksCount = Math.ceil(daysDiff / 7);

    // Calculate value range for color scale
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Draw month labels
    if (showLabels) {
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';

      let currentMonth = -1;
      for (let week = 0; week < weeksCount; week++) {
        const weekDate = new Date(startDate);
        weekDate.setUTCDate(startDate.getUTCDate() + week * 7);
        const month = weekDate.getUTCMonth();

        if (month !== currentMonth) {
          currentMonth = month;
          const x = margin.left + week * (cellSize + cellGap);
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          ctx.fillText(monthNames[month], x, margin.top - 8);
        }
      }

      // Draw day labels
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      ctx.textAlign = 'right';
      dayLabels.forEach((label, index) => {
        if (index % 2 === 1) { // Show every other day to save space
          const y = margin.top + index * (cellSize + cellGap) + cellSize / 2;
          ctx.fillText(label, margin.left - 8, y + 4);
        }
      });
    }

    // Draw cells
    for (let week = 0; week < weeksCount; week++) {
      for (let day = 0; day < 7; day++) {
        const cellDate = new Date(startDate);
        cellDate.setUTCDate(startDate.getUTCDate() + week * 7 + day);

        // Only draw if within range
        if (cellDate > maxDate) continue;

        const x = margin.left + week * (cellSize + cellGap);
        const y = margin.top + day * (cellSize + cellGap);

        const key = this.getDateKey(cellDate);
        const value = dateValueMap.get(key);

        // Determine color
        let color;
        if (value === undefined) {
          color = '#0f172a'; // No data color
        } else {
          color = this.getColorForValue(value, minValue, maxValue, colorScale, minColor, maxColor, neutralColor);
        }

        // Draw cell
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw border
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }

    // Draw legend
    this.drawLegend(ctx, width, height, minValue, maxValue, colorScale, minColor, maxColor, neutralColor, formatValue);
  },

  /**
   * Draw grid heatmap (day of week x hour)
   */
  drawGrid(ctx, params) {
    const {
      dates,
      values,
      width,
      height,
      title,
      cellSize,
      cellGap,
      showValues,
      showLabels,
      colorScale,
      minColor,
      maxColor,
      neutralColor,
      formatValue
    } = params;

    const margin = { top: title ? 50 : 30, right: 20, bottom: 30, left: 80 };

    // Draw title
    if (title) {
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.fillText(title, width / 2, 20);
    }

    // Create grid data (example: 7 days x 24 hours)
    const rows = 7; // Days of week
    const cols = Math.min(dates.length, 31); // Up to 31 days/columns

    const cellWidth = Math.min(cellSize, (width - margin.left - margin.right) / cols - cellGap);
    const cellHeight = Math.min(cellSize, (height - margin.top - margin.bottom) / rows - cellGap);

    // Calculate value range
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Draw cells
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < Math.min(cols, dates.length); col++) {
        const x = margin.left + col * (cellWidth + cellGap);
        const y = margin.top + row * (cellHeight + cellGap);

        const index = row * cols + col;
        const value = index < values.length ? values[index] : undefined;

        // Determine color
        let color;
        if (value === undefined) {
          color = '#0f172a';
        } else {
          color = this.getColorForValue(value, minValue, maxValue, colorScale, minColor, maxColor, neutralColor);
        }

        // Draw cell
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellWidth, cellHeight);

        // Draw border
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellWidth, cellHeight);

        // Draw value if enabled and cell is large enough
        if (showValues && cellWidth > 30 && cellHeight > 20 && value !== undefined) {
          ctx.font = '9px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#f1f5f9';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(formatValue(value), x + cellWidth / 2, y + cellHeight / 2);
        }
      }
    }

    // Draw labels
    if (showLabels) {
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';

      // Row labels
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let row = 0; row < rows; row++) {
        const y = margin.top + row * (cellHeight + cellGap) + cellHeight / 2;
        ctx.fillText(dayLabels[row], margin.left - 8, y);
      }

      // Column labels (show subset)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelStep = Math.max(1, Math.floor(cols / 10));
      for (let col = 0; col < cols; col += labelStep) {
        if (col < dates.length) {
          const x = margin.left + col * (cellWidth + cellGap) + cellWidth / 2;
          const y = margin.top + rows * (cellHeight + cellGap) + 4;
          const label = typeof dates[col] === 'string' ? dates[col].slice(5) : dates[col];
          ctx.fillText(label, x, y);
        }
      }
    }
  },

  /**
   * Get color for value based on scale
   */
  getColorForValue(value, minValue, maxValue, scale, minColor, maxColor, neutralColor) {
    if (scale === 'sentiment') {
      // Sentiment scale: negative (red) -> neutral (yellow) -> positive (green)
      if (value < 0) {
        const t = Math.abs(value) / Math.abs(minValue || 1);
        return this.interpolateColor(neutralColor, minColor, t);
      } else {
        const t = value / (maxValue || 1);
        return this.interpolateColor(neutralColor, maxColor, t);
      }
    } else {
      // Linear scale from min to max
      const range = maxValue - minValue || 1;
      const normalized = (value - minValue) / range;
      return this.interpolateColor(minColor, maxColor, normalized);
    }
  },

  /**
   * Draw legend
   */
  drawLegend(ctx, width, height, minValue, maxValue, scale, minColor, maxColor, neutralColor, formatValue) {
    const legendWidth = 200;
    const legendHeight = 12;
    const legendX = width - legendWidth - 40;
    const legendY = height - 30;

    // Draw gradient
    const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);

    if (scale === 'sentiment') {
      gradient.addColorStop(0, minColor);
      gradient.addColorStop(0.5, neutralColor);
      gradient.addColorStop(1, maxColor);
    } else {
      gradient.addColorStop(0, minColor);
      gradient.addColorStop(1, maxColor);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

    // Draw labels
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.fillText(formatValue(minValue), legendX, legendY + legendHeight + 4);
    ctx.fillText(formatValue(maxValue), legendX + legendWidth, legendY + legendHeight + 4);

    if (scale === 'sentiment') {
      ctx.fillText('0', legendX + legendWidth / 2, legendY + legendHeight + 4);
    }
  },

  /**
   * Get date key (YYYY-MM-DD)
   */
  getDateKey(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Interpolate between two colors
   */
  interpolateColor(color1, color2, factor) {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));

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
    } : { r: 0, g: 0, b: 0 };
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
window.HeatmapChart = HeatmapChart;
