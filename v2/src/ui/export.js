// Export Module
// Handles data export in multiple formats: PDF, JSON, CSV, PNG

const ExportModule = {
  /**
   * Export data as JSON
   */
  exportJSON(data, filename = 'vb-sentiment-data.json') {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      this.downloadFile(jsonString, filename, 'application/json');
    } catch (error) {
      console.error('JSON export failed:', error);
      alert('Failed to export JSON. Check console for details.');
    }
  },

  /**
   * Export data as CSV
   */
  exportCSV(data, filename = 'vb-sentiment-data.csv') {
    try {
      let csv = '';

      // Handle different data structures
      if (data.dailyMetrics) {
        // Export daily metrics
        csv = this.generateDailyMetricsCSV(data.dailyMetrics);
      } else if (data.rawData) {
        // Export raw data
        csv = this.generateRawDataCSV(data.rawData);
      } else if (Array.isArray(data)) {
        // Export array data
        csv = this.arrayToCSV(data);
      } else {
        throw new Error('Unsupported data format for CSV export');
      }

      this.downloadFile(csv, filename, 'text/csv');
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('Failed to export CSV. Check console for details.');
    }
  },

  /**
   * Generate CSV from daily metrics
   */
  generateDailyMetricsCSV(dailyMetrics) {
    const headers = ['Date', 'Total', 'Wow', 'Curious', 'Boring', 'Sentiment Score', 'New Users', 'Returning Users', 'Returning Rate'];
    const rows = [headers.join(',')];

    dailyMetrics.forEach(day => {
      const row = [
        day.day,
        day.total,
        day.counts['🤯'] || 0,
        day.counts['🤔'] || 0,
        day.counts['😴'] || 0,
        day.sentimentScore.toFixed(3),
        day.newCount,
        day.returningCount,
        day.returningRate.toFixed(3)
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  },

  /**
   * Generate CSV from raw data
   */
  generateRawDataCSV(rawData) {
    const headers = ['Date', 'Time', 'Emoji', 'Network ID'];
    const rows = [headers.join(',')];

    rawData.forEach(item => {
      const date = new Date(item.date);
      const row = [
        date.toISOString().split('T')[0],
        date.toISOString().split('T')[1].split('.')[0],
        item.emoji,
        this.escapeCSV(item.networkId || '')
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  },

  /**
   * Convert array to CSV
   */
  arrayToCSV(data) {
    if (data.length === 0) return '';

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const rows = [headers.join(',')];

    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        return this.escapeCSV(String(value));
      });
      rows.push(row.join(','));
    });

    return rows.join('\n');
  },

  /**
   * Escape CSV values (handle commas, quotes, newlines)
   */
  escapeCSV(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  },

  /**
   * Export canvas as PNG
   */
  exportPNG(canvas, filename = 'chart.png', scale = 2) {
    try {
      // Create high-resolution version
      const tempCanvas = document.createElement('canvas');
      const rect = canvas.getBoundingClientRect();
      tempCanvas.width = rect.width * scale;
      tempCanvas.height = rect.height * scale;

      const ctx = tempCanvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(canvas, 0, 0);

      // Convert to blob and download
      tempCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        this.downloadURL(url, filename);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('PNG export failed:', error);
      alert('Failed to export PNG. Check console for details.');
    }
  },

  /**
   * Export all charts as PNG sheet
   */
  async exportAllChartsPNG(canvases, filename = 'vb-sentiment-dashboard.png') {
    try {
      if (!canvases || canvases.length === 0) {
        alert('No charts available to export');
        return;
      }

      // Configuration
      const scale = 2;
      const gap = 20;
      const columns = 2;
      const padding = 40;

      // Calculate grid dimensions
      const rows = Math.ceil(canvases.length / columns);
      const canvasRects = canvases.map(c => c.getBoundingClientRect());

      // Find max width per column
      const columnWidths = [];
      for (let col = 0; col < columns; col++) {
        let maxWidth = 0;
        for (let row = 0; row < rows; row++) {
          const index = row * columns + col;
          if (index < canvasRects.length) {
            maxWidth = Math.max(maxWidth, canvasRects[index].width);
          }
        }
        columnWidths.push(maxWidth);
      }

      // Calculate total dimensions
      const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + gap * (columns + 1);
      let totalHeight = padding;

      const rowHeights = [];
      for (let row = 0; row < rows; row++) {
        let maxHeight = 0;
        for (let col = 0; col < columns; col++) {
          const index = row * columns + col;
          if (index < canvasRects.length) {
            maxHeight = Math.max(maxHeight, canvasRects[index].height);
          }
        }
        rowHeights.push(maxHeight);
        totalHeight += maxHeight + gap;
      }

      // Create composite canvas
      const composite = document.createElement('canvas');
      composite.width = totalWidth * scale;
      composite.height = totalHeight * scale;

      const ctx = composite.getContext('2d');
      ctx.scale(scale, scale);

      // Fill background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      // Draw title
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.fillText('VB Daily Sentiment Dashboard', totalWidth / 2, 25);

      // Draw charts
      let currentY = padding;
      for (let row = 0; row < rows; row++) {
        let currentX = gap;

        for (let col = 0; col < columns; col++) {
          const index = row * columns + col;
          if (index >= canvases.length) break;

          const canvas = canvases[index];
          const rect = canvasRects[index];

          ctx.drawImage(canvas, currentX, currentY, rect.width, rect.height);

          currentX += columnWidths[col] + gap;
        }

        currentY += rowHeights[row] + gap;
      }

      // Convert to blob and download
      composite.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        this.downloadURL(url, filename);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('PNG sheet export failed:', error);
      alert('Failed to export PNG sheet. Check console for details.');
    }
  },

  /**
   * Export as PDF (simplified - requires jsPDF library in production)
   */
  exportPDF(data, filename = 'vb-sentiment-report.pdf') {
    // Check if jsPDF is available
    if (typeof window.jsPDF === 'undefined') {
      alert('PDF export requires jsPDF library. Please include it in your HTML.');
      console.error('jsPDF library not found. Include: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>');
      return;
    }

    try {
      // Create new PDF
      const { jsPDF } = window;
      const doc = new jsPDF();

      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.text('VB Daily Sentiment Report', 20, yPos);
      yPos += 10;

      // Date range
      doc.setFontSize(10);
      if (data.minDate && data.maxDate) {
        const startDate = new Date(data.minDate).toLocaleDateString();
        const endDate = new Date(data.maxDate).toLocaleDateString();
        doc.text(`Period: ${startDate} - ${endDate}`, 20, yPos);
        yPos += 7;
      }

      // Summary metrics
      doc.setFontSize(12);
      doc.text('Summary Metrics', 20, yPos);
      yPos += 7;

      doc.setFontSize(10);
      const metrics = [
        `Total Reactions: ${(data.total != null ? data.total.toLocaleString() : 'N/A')}`,
        `Unique Users: ${(data.uniqueUsers != null ? data.uniqueUsers.toLocaleString() : 'N/A')}`,
        `Repeating Users: ${(data.repeaters != null ? data.repeaters.toLocaleString() : 'N/A')}`,
        `Days in Period: ${(data.days ? data.days.length : 'N/A')}`
      ];

      metrics.forEach(metric => {
        doc.text(metric, 20, yPos);
        yPos += 6;
      });

      yPos += 5;

      // Distribution
      if (data.dailyShares && data.dailyShares.length > 0) {
        doc.setFontSize(12);
        doc.text('Emoji Distribution (Average)', 20, yPos);
        yPos += 7;

        doc.setFontSize(10);
        const avgWow = this.average(data.dailyShares.map(s => s.wow));
        const avgCurious = this.average(data.dailyShares.map(s => s.curious));
        const avgBoring = this.average(data.dailyShares.map(s => s.boring));

        doc.text(`🤯 Wow: ${(avgWow * 100).toFixed(1)}%`, 20, yPos);
        yPos += 6;
        doc.text(`🤔 Curious: ${(avgCurious * 100).toFixed(1)}%`, 20, yPos);
        yPos += 6;
        doc.text(`😴 Boring: ${(avgBoring * 100).toFixed(1)}%`, 20, yPos);
        yPos += 10;
      }

      // Sentiment trend
      if (data.sentimentSeries && data.sentimentSeries.length > 0) {
        doc.setFontSize(12);
        doc.text('Sentiment Analysis', 20, yPos);
        yPos += 7;

        doc.setFontSize(10);
        const avgSentiment = this.average(data.sentimentSeries);
        const recentSentiment = this.average(data.sentimentSeries.slice(-7));

        doc.text(`Overall Average: ${avgSentiment.toFixed(3)}`, 20, yPos);
        yPos += 6;
        doc.text(`Recent (7d) Average: ${recentSentiment.toFixed(3)}`, 20, yPos);
        yPos += 6;

        const trend = recentSentiment > avgSentiment ? 'Improving' : recentSentiment < avgSentiment ? 'Declining' : 'Stable';
        doc.text(`Trend: ${trend}`, 20, yPos);
        yPos += 10;
      }

      // Add timestamp
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);

      // Save PDF
      doc.save(filename);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Check console for details.');
    }
  },

  /**
   * Export insights as text report
   */
  exportInsightsReport(insights, filename = 'vb-sentiment-insights.txt') {
    try {
      let report = 'VB DAILY SENTIMENT INSIGHTS REPORT\n';
      report += '='.repeat(50) + '\n\n';
      report += `Generated: ${new Date().toLocaleString()}\n\n`;

      // Group by priority
      const highPriority = insights.filter(i => i.priority === 'high');
      const mediumPriority = insights.filter(i => i.priority === 'medium');
      const lowPriority = insights.filter(i => i.priority === 'low');

      if (highPriority.length > 0) {
        report += 'HIGH PRIORITY INSIGHTS\n';
        report += '-'.repeat(50) + '\n';
        highPriority.forEach(insight => {
          report += `${insight.icon} ${insight.title}\n`;
          report += `   ${insight.message}\n\n`;
        });
      }

      if (mediumPriority.length > 0) {
        report += '\nMEDIUM PRIORITY INSIGHTS\n';
        report += '-'.repeat(50) + '\n';
        mediumPriority.forEach(insight => {
          report += `${insight.icon} ${insight.title}\n`;
          report += `   ${insight.message}\n\n`;
        });
      }

      if (lowPriority.length > 0) {
        report += '\nLOW PRIORITY INSIGHTS\n';
        report += '-'.repeat(50) + '\n';
        lowPriority.forEach(insight => {
          report += `${insight.icon} ${insight.title}\n`;
          report += `   ${insight.message}\n\n`;
        });
      }

      report += '\n' + '='.repeat(50) + '\n';
      report += 'End of Report\n';

      this.downloadFile(report, filename, 'text/plain');
    } catch (error) {
      console.error('Insights export failed:', error);
      alert('Failed to export insights. Check console for details.');
    }
  },

  /**
   * Download file helper
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    this.downloadURL(url, filename);
    URL.revokeObjectURL(url);
  },

  /**
   * Download URL helper
   */
  downloadURL(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Calculate average
   */
  average(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  },

  /**
   * Copy data to clipboard
   */
  async copyToClipboard(data, format = 'json') {
    try {
      let text = '';

      if (format === 'json') {
        text = JSON.stringify(data, null, 2);
      } else if (format === 'csv') {
        text = this.arrayToCSV(Array.isArray(data) ? data : [data]);
      } else {
        text = String(data);
      }

      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      alert('Failed to copy to clipboard. Check console for details.');
    }
  }
};

// Export for use in other modules
window.ExportModule = ExportModule;
