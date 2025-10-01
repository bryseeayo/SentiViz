// Sentiment Gauge Chart
// Canvas-based circular gauge showing sentiment score from -1 to +1

const GaugeChart = {
  /**
   * Draw sentiment gauge chart
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Number} value - Sentiment value (-1 to +1)
   * @param {Object} options - Optional configuration
   */
  draw(canvas, value, options = {}) {
    const {
      title = 'Sentiment Score',
      minValue = -1,
      maxValue = 1,
      showValue = true,
      showLabels = true,
      backgroundColor = '#1e293b',
      foregroundColor = '#f1f5f9'
    } = options;

    // Setup canvas
    const ctx = this.setupCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate dimensions
    const centerX = width / 2;
    const centerY = height * 0.6; // Slightly lower for label space
    const radius = Math.min(width, height) * 0.35;
    const thickness = radius * 0.3;

    // Draw gauge background arc
    const startAngle = Math.PI * 0.75; // Start at bottom-left
    const endAngle = Math.PI * 2.25; // End at bottom-right (270 degrees total)

    // Background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = thickness;
    ctx.strokeStyle = backgroundColor;
    ctx.stroke();

    // Draw gradient arc for value
    const normalizedValue = (value - minValue) / (maxValue - minValue);
    const valueAngle = startAngle + (endAngle - startAngle) * normalizedValue;

    // Create gradient based on value
    const gradient = this.createGradient(ctx, centerX, centerY, radius, value);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, valueAngle);
    ctx.lineWidth = thickness;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw needle
    this.drawNeedle(ctx, centerX, centerY, radius - thickness / 2, valueAngle);

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = foregroundColor;
    ctx.fill();

    // Draw value text
    if (showValue) {
      ctx.font = `bold ${radius * 0.4}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = foregroundColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toFixed(2), centerX, centerY);
    }

    // Draw labels
    if (showLabels) {
      ctx.font = `${radius * 0.15}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';

      // Min label
      const minX = centerX - radius * Math.cos(Math.PI / 4);
      const minY = centerY + radius * Math.sin(Math.PI / 4);
      ctx.fillText(minValue.toString(), minX, minY + 20);

      // Max label
      const maxX = centerX + radius * Math.cos(Math.PI / 4);
      const maxY = centerY + radius * Math.sin(Math.PI / 4);
      ctx.fillText(maxValue.toString(), maxX, maxY + 20);

      // Center label (0)
      ctx.fillText('0', centerX, centerY + radius + 20);
    }

    // Draw title
    if (title) {
      ctx.font = `${radius * 0.2}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = foregroundColor;
      ctx.textAlign = 'center';
      ctx.fillText(title, centerX, 30);
    }

    // Draw sentiment label
    const sentimentLabel = this.getSentimentLabel(value);
    ctx.font = `${radius * 0.18}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = this.getColorForValue(value);
    ctx.textAlign = 'center';
    ctx.fillText(sentimentLabel, centerX, height - 20);
  },

  /**
   * Draw needle indicator
   */
  drawNeedle(ctx, centerX, centerY, radius, angle) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    // Needle path
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(0, -radius * 0.85);
    ctx.lineTo(5, 0);
    ctx.closePath();

    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  },

  /**
   * Create color gradient based on value
   */
  createGradient(ctx, x, y, radius, value) {
    // Colors: red (negative) -> yellow (neutral) -> green (positive)
    if (value <= 0) {
      // Negative: blend from red to yellow
      const t = (value + 1) / 1; // 0 to 1
      return this.interpolateColor('#f87171', '#fbbf24', t);
    } else {
      // Positive: blend from yellow to green
      const t = value / 1; // 0 to 1
      return this.interpolateColor('#fbbf24', '#34d399', t);
    }
  },

  /**
   * Get color for specific value
   */
  getColorForValue(value) {
    if (value < -0.3) return '#f87171'; // red
    if (value < 0.3) return '#fbbf24'; // yellow
    return '#34d399'; // green
  },

  /**
   * Get sentiment label for value
   */
  getSentimentLabel(value) {
    if (value < -0.5) return 'Very Negative 😴';
    if (value < -0.2) return 'Negative 😴';
    if (value < 0.2) return 'Neutral 🤔';
    if (value < 0.5) return 'Positive 🤯';
    return 'Very Positive 🤯';
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
   * Convert hex color to RGB
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
window.GaugeChart = GaugeChart;
