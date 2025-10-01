// Donut Chart Renderer
// Canvas-based donut/pie chart for distribution data

const DonutChart = {
  /**
   * Draw donut chart
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} data - Chart data { labels: [], values: [] }
   * @param {Object} options - Chart options
   */
  draw(canvas, data, options = {}) {
    const {
      title = '',
      colors = ['#34d399', '#fbbf24', '#f87171', '#7dd3fc', '#a78bfa', '#fb923c'],
      showLabels = true,
      showValues = true,
      showPercentages = true,
      showLegend = true,
      innerRadius = 0.6, // 0 = pie chart, >0 = donut chart
      formatValue = (v) => v.toLocaleString(),
      legendPosition = 'right' // 'right', 'bottom'
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

    // Calculate total
    const total = values.reduce((sum, val) => sum + val, 0);

    if (total === 0) {
      this.drawEmptyState(canvas, 'No data to display');
      return;
    }

    // Draw title
    let titleHeight = 0;
    if (title) {
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.fillText(title, width / 2, 20);
      titleHeight = 40;
    }

    // Calculate dimensions based on legend position
    let chartArea, legendArea;
    if (showLegend && legendPosition === 'right') {
      const legendWidth = 150;
      chartArea = {
        x: 0,
        y: titleHeight,
        width: width - legendWidth,
        height: height - titleHeight
      };
      legendArea = {
        x: width - legendWidth + 10,
        y: titleHeight + 20,
        width: legendWidth - 20,
        height: height - titleHeight - 40
      };
    } else if (showLegend && legendPosition === 'bottom') {
      const legendHeight = Math.min(120, labels.length * 25 + 20);
      chartArea = {
        x: 0,
        y: titleHeight,
        width: width,
        height: height - titleHeight - legendHeight
      };
      legendArea = {
        x: 20,
        y: height - legendHeight + 10,
        width: width - 40,
        height: legendHeight - 20
      };
    } else {
      chartArea = {
        x: 0,
        y: titleHeight,
        width: width,
        height: height - titleHeight
      };
    }

    // Calculate center and radius
    const centerX = chartArea.x + chartArea.width / 2;
    const centerY = chartArea.y + chartArea.height / 2;
    const radius = Math.min(chartArea.width, chartArea.height) / 2 - 10;
    const innerRadiusValue = radius * innerRadius;

    // Draw segments
    let currentAngle = -Math.PI / 2; // Start at top

    const segments = labels.map((label, index) => {
      const value = values[index];
      const percentage = value / total;
      const sweepAngle = percentage * 2 * Math.PI;
      const color = colors[index % colors.length];

      const segment = {
        label,
        value,
        percentage,
        color,
        startAngle: currentAngle,
        endAngle: currentAngle + sweepAngle,
        centerAngle: currentAngle + sweepAngle / 2
      };

      // Draw segment
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sweepAngle);
      if (innerRadiusValue > 0) {
        ctx.arc(centerX, centerY, innerRadiusValue, currentAngle + sweepAngle, currentAngle, true);
      } else {
        ctx.lineTo(centerX, centerY);
      }
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();

      // Draw border
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      currentAngle += sweepAngle;

      return segment;
    });

    // Draw center circle for donut
    if (innerRadiusValue > 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadiusValue, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw total in center
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatValue(total), centerX, centerY - 10);

      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Total', centerX, centerY + 10);
    }

    // Draw labels on segments
    if (showLabels || showPercentages) {
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      segments.forEach(segment => {
        // Only show label if segment is large enough
        if (segment.percentage < 0.05) return;

        const labelRadius = (radius + innerRadiusValue) / 2;
        const labelX = centerX + Math.cos(segment.centerAngle) * labelRadius;
        const labelY = centerY + Math.sin(segment.centerAngle) * labelRadius;

        // Draw background for better readability
        const labelText = showPercentages
          ? `${(segment.percentage * 100).toFixed(1)}%`
          : segment.label;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const metrics = ctx.measureText(labelText);
        const padding = 6;
        ctx.fillRect(
          labelX - metrics.width / 2 - padding,
          labelY - 10,
          metrics.width + padding * 2,
          20
        );

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, labelX, labelY);
      });
    }

    // Draw legend
    if (showLegend) {
      this.drawLegend(ctx, segments, legendArea, formatValue, showValues, showPercentages);
    }
  },

  /**
   * Draw legend
   */
  drawLegend(ctx, segments, area, formatValue, showValues, showPercentages) {
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const itemHeight = 22;
    const boxSize = 14;

    segments.forEach((segment, index) => {
      const y = area.y + index * itemHeight;

      // Draw color box
      ctx.fillStyle = segment.color;
      ctx.fillRect(area.x, y, boxSize, boxSize);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(area.x, y, boxSize, boxSize);

      // Draw label
      ctx.fillStyle = '#f1f5f9';
      let labelText = segment.label;

      if (showPercentages) {
        labelText += ` (${(segment.percentage * 100).toFixed(1)}%)`;
      }

      if (showValues) {
        labelText += ` - ${formatValue(segment.value)}`;
      }

      // Truncate if too long
      const maxWidth = area.width - boxSize - 10;
      labelText = this.truncateText(ctx, labelText, maxWidth);

      ctx.fillText(labelText, area.x + boxSize + 8, y + boxSize / 2);
    });
  },

  /**
   * Truncate text to fit width
   */
  truncateText(ctx, text, maxWidth) {
    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) {
      return text;
    }

    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }

    return truncated + '...';
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
window.DonutChart = DonutChart;
