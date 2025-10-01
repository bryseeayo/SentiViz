// Main Application Orchestrator
// Coordinates all modules and manages application state

const VBSentimentApp = {
  // Application state
  state: {
    rawData: null,
    processedData: null,
    sentimentAnalysis: null,
    forecast: null,
    insights: null,
    currentView: 'overview'
  },

  // DOM element references
  elements: {
    fileInput: null,
    dropZone: null,
    browseBtn: null,
    loadSampleBtn: null,
    exportJsonBtn: null,
    exportCsvBtn: null,
    exportPdfBtn: null,
    exportPngBtn: null,
    dashboardContainer: null,
    loadingOverlay: null
  },

  /**
   * Initialize the application
   */
  init() {
    console.log('Initializing VB Sentiment Dashboard V2...');

    // Get DOM elements
    this.elements.fileInput = document.getElementById('fileInput');
    this.elements.dropZone = document.getElementById('uploadZone');
    this.elements.browseBtn = document.getElementById('browseBtn');
    this.elements.loadSampleBtn = document.getElementById('loadSampleBtn');
    this.elements.exportJsonBtn = document.getElementById('exportJson');
    this.elements.exportCsvBtn = document.getElementById('exportCsv');
    this.elements.exportPdfBtn = document.getElementById('exportPdf');
    this.elements.exportPngBtn = document.getElementById('exportPng');
    this.elements.dashboardContainer = document.getElementById('dashboard');
    this.elements.loadingOverlay = document.getElementById('loadingOverlay');

    // Setup event listeners
    this.setupEventListeners();

    // Initialize UI controls (optional - may not have all elements)
    try {
      if (typeof UIControls !== 'undefined') {
        UIControls.init({
          onDateRangeChange: (range) => this.handleDateRangeChange(range),
          onEmojiFilterChange: (emoji) => this.handleEmojiFilterChange(emoji),
          onAudienceFilterChange: (audience) => this.handleAudienceFilterChange(audience),
          onTimeRangeChange: (range) => this.handleTimeRangeChange(range),
          onRefresh: () => this.refreshVisualizations()
        });
      }
    } catch (error) {
      console.warn('UIControls initialization failed:', error);
    }

    console.log('VB Sentiment Dashboard V2 initialized');
    console.log('Browse button:', this.elements.browseBtn);
    console.log('File input:', this.elements.fileInput);
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // File input
    if (this.elements.fileInput) {
      this.elements.fileInput.addEventListener('change', (e) => {
        this.handleFileUpload(e.target.files[0]);
      });
    }

    // Drop zone
    if (this.elements.dropZone) {
      this.elements.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.elements.dropZone.classList.add('drag-over');
      });

      this.elements.dropZone.addEventListener('dragleave', () => {
        this.elements.dropZone.classList.remove('drag-over');
      });

      this.elements.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.elements.dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) {
          this.handleFileUpload(file);
        }
      });

      this.elements.dropZone.addEventListener('click', () => {
        this.elements.fileInput?.click();
      });
    }

    // Browse button
    if (this.elements.browseBtn) {
      console.log('Setting up browse button click handler');
      this.elements.browseBtn.addEventListener('click', (e) => {
        console.log('Browse button clicked!');
        e.preventDefault();
        e.stopPropagation();
        if (this.elements.fileInput) {
          console.log('Triggering file input click');
          this.elements.fileInput.click();
        } else {
          console.error('File input element not found!');
        }
      });
    } else {
      console.error('Browse button element not found!');
    }

    // Load sample data button
    if (this.elements.loadSampleBtn) {
      this.elements.loadSampleBtn.addEventListener('click', () => {
        this.loadSampleData();
      });
    }

    // Export buttons
    if (this.elements.exportJsonBtn) {
      this.elements.exportJsonBtn.addEventListener('click', () => {
        this.exportData('json');
      });
    }

    if (this.elements.exportCsvBtn) {
      this.elements.exportCsvBtn.addEventListener('click', () => {
        this.exportData('csv');
      });
    }

    if (this.elements.exportPdfBtn) {
      this.elements.exportPdfBtn.addEventListener('click', () => {
        this.exportData('pdf');
      });
    }

    if (this.elements.exportPngBtn) {
      this.elements.exportPngBtn.addEventListener('click', () => {
        this.exportAllCharts();
      });
    }
  },

  /**
   * Handle file upload
   */
  async handleFileUpload(file) {
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      UIControls.showError('Please upload a CSV file');
      return;
    }

    UIControls.showLoading(true);

    try {
      // Read file
      const text = await this.readFileAsText(file);

      // Parse CSV
      const parsed = CSVParser.parse(text);
      const vbData = CSVParser.extractVBDailyData(parsed.rows);

      // Validate
      const validation = CSVParser.validate(vbData);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      if (validation.warnings) {
        console.warn(validation.warnings);
      }

      // Store raw data
      this.state.rawData = validation.validRows;

      // Process data
      await this.processData();

      UIControls.showSuccess(`Loaded ${this.state.rawData.length} reactions successfully!`);
    } catch (error) {
      console.error('File upload error:', error);
      UIControls.showError(`Failed to load file: ${error.message}`);
    } finally {
      UIControls.showLoading(false);
    }
  },

  /**
   * Read file as text
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  },

  /**
   * Load sample data for demo
   */
  async loadSampleData() {
    UIControls.showLoading(true);

    try {
      // Generate sample data
      const sampleData = this.generateSampleData(90, 50); // 90 days, ~50 reactions per day

      this.state.rawData = sampleData;

      // Process data
      await this.processData();

      UIControls.showSuccess('Sample data loaded successfully!');
    } catch (error) {
      console.error('Sample data error:', error);
      UIControls.showError(`Failed to load sample data: ${error.message}`);
    } finally {
      UIControls.showLoading(false);
    }
  },

  /**
   * Generate sample data for demo
   */
  generateSampleData(days = 90, avgPerDay = 50) {
    const data = [];
    const emojis = ['🤯', '🤔', '😴'];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - days);

    // Generate some user IDs for returning users
    const userIds = [];
    for (let i = 0; i < 100; i++) {
      userIds.push(`user_${i.toString().padStart(4, '0')}`);
    }

    for (let day = 0; day < days; day++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + day);

      // Vary reactions per day (weekend effect, trends)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const trendFactor = 1 + (day / days) * 0.3; // Increasing trend
      const weekendFactor = isWeekend ? 0.7 : 1.0;
      const count = Math.floor(avgPerDay * trendFactor * weekendFactor * (0.8 + Math.random() * 0.4));

      // Generate sentiment bias that changes over time
      const sentimentPhase = (day / days) * Math.PI * 2;
      const wowBias = 0.4 + Math.sin(sentimentPhase) * 0.15;
      const boringBias = 0.2 - Math.sin(sentimentPhase) * 0.1;
      const curiousBias = 1 - wowBias - boringBias;

      for (let i = 0; i < count; i++) {
        // Random time during the day
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        const reactionDate = new Date(date);
        reactionDate.setHours(hour, minute, 0, 0);

        // Select emoji based on bias
        const rand = Math.random();
        let emoji;
        if (rand < wowBias) {
          emoji = '🤯';
        } else if (rand < wowBias + curiousBias) {
          emoji = '🤔';
        } else {
          emoji = '😴';
        }

        // Select user (30% chance of returning user)
        const isReturning = Math.random() < 0.3 && userIds.length > 0;
        const userId = isReturning
          ? userIds[Math.floor(Math.random() * Math.min(userIds.length, 50))]
          : `user_new_${data.length}`;

        data.push({
          emoji,
          date: reactionDate,
          networkId: userId
        });
      }
    }

    return data.sort((a, b) => a.date - b.date);
  },

  /**
   * Process raw data through all analytics modules
   */
  async processData() {
    if (!this.state.rawData || this.state.rawData.length === 0) {
      throw new Error('No data to process');
    }

    // Process data
    this.state.processedData = DataProcessor.process(this.state.rawData);

    if (!this.state.processedData) {
      throw new Error('Data processing failed');
    }

    // Run sentiment analysis
    this.state.sentimentAnalysis = SentimentAnalytics.analyze(this.state.processedData);

    // Generate forecast
    this.state.forecast = ForecastAnalytics.analyze(this.state.processedData);

    // Generate insights
    this.state.insights = InsightsGenerator.generate(
      this.state.processedData,
      this.state.sentimentAnalysis,
      this.state.forecast
    );

    // Update visualizations
    await this.updateAllVisualizations();
  },

  /**
   * Update all visualizations
   */
  async updateAllVisualizations() {
    // Show dashboard
    if (this.elements.dashboardContainer) {
      this.elements.dashboardContainer.style.display = 'block';
    }

    // Update metrics
    this.updateMetrics();

    // Update insights panel
    this.updateInsights();

    // Update all charts
    this.updateCharts();
  },

  /**
   * Update metrics display
   */
  updateMetrics() {
    const { processedData, sentimentAnalysis } = this.state;

    if (!processedData) return;

    UIControls.updateMetrics({
      totalReactions: processedData.total,
      uniqueUsers: processedData.uniqueUsers,
      avgSentiment: sentimentAnalysis?.overallAverage || 0,
      startDate: processedData.minDate,
      endDate: processedData.maxDate
    });
  },

  /**
   * Update insights panel
   */
  updateInsights() {
    const insightsContainer = document.getElementById('insightsContainer');
    if (!insightsContainer || !this.state.insights) return;

    const topInsights = InsightsGenerator.getTopInsights(this.state.insights, 5);

    insightsContainer.innerHTML = '';

    topInsights.forEach(insight => {
      const card = document.createElement('div');
      card.className = `insight-card insight-${insight.priority}`;
      card.innerHTML = `
        <div class="insight-icon">${insight.icon}</div>
        <div class="insight-content">
          <h4>${insight.title}</h4>
          <p>${insight.message}</p>
        </div>
      `;
      insightsContainer.appendChild(card);
    });
  },

  /**
   * Update all charts
   */
  updateCharts() {
    const { processedData, sentimentAnalysis, forecast } = this.state;

    if (!processedData) return;

    // Sentiment gauge
    this.updateSentimentGauge();

    // Sentiment line chart
    this.updateSentimentLine();

    // Distribution donut chart
    this.updateDistributionChart();

    // Top users bar chart
    this.updateTopUsersChart();

    // Calendar heatmap
    this.updateCalendarHeatmap();
  },

  /**
   * Update sentiment gauge
   */
  updateSentimentGauge() {
    const canvas = document.getElementById('gaugeChart');
    if (!canvas || !this.state.sentimentAnalysis) return;

    GaugeChart.draw(canvas, this.state.sentimentAnalysis.overallAverage, {
      title: 'Overall Sentiment'
    });
  },

  /**
   * Update sentiment line chart
   */
  updateSentimentLine() {
    const canvas = document.getElementById('sentimentLine');
    if (!canvas || !this.state.processedData) return;

    const { days, sentimentSeries } = this.state.processedData;
    const { controlBands, anomalies } = this.state.sentimentAnalysis || {};

    // Prepare markers for anomalies
    const markers = anomalies?.combined.map(a => ({
      index: a.index,
      color: a.type === 'spike' ? '#34d399' : '#f87171',
      label: a.type
    })) || [];

    LineChart.draw(canvas, {
      labels: days.map(d => d.slice(5)), // MM-DD
      values: sentimentSeries
    }, {
      title: 'Sentiment Over Time',
      yLabel: 'Sentiment Score',
      yMin: -1,
      yMax: 1,
      showPoints: false,
      fillArea: true,
      fillOpacity: 0.1,
      bands: controlBands,
      markers: markers.slice(0, 10), // Show top 10 anomalies
      formatXLabel: (v) => v
    });
  },

  /**
   * Update distribution donut chart
   */
  updateDistributionChart() {
    const canvas = document.getElementById('distributionChart');
    if (!canvas || !this.state.processedData) return;

    const distribution = DataProcessor.calculateDistribution(this.state.rawData);

    DonutChart.draw(canvas, {
      labels: ['Wow 🤯', 'Curious 🤔', 'Boring 😴'],
      values: [distribution.counts['🤯'], distribution.counts['🤔'], distribution.counts['😴']]
    }, {
      title: 'Emoji Distribution',
      colors: ['#34d399', '#fbbf24', '#f87171'],
      showPercentages: true,
      innerRadius: 0.6
    });
  },

  /**
   * Update top users bar chart
   */
  updateTopUsersChart() {
    const canvas = document.getElementById('topUsersChart');
    if (!canvas || !this.state.processedData) return;

    const { topUsers } = this.state.processedData;
    const top10 = topUsers.slice(0, 10);

    if (top10.length === 0) {
      BarChart.draw(canvas, { labels: [], values: [] });
      return;
    }

    BarChart.draw(canvas, {
      labels: top10.map(([id]) => id.slice(0, 15)),
      values: top10.map(([, count]) => count)
    }, {
      title: 'Top 10 Most Active Users',
      orientation: 'horizontal',
      yLabel: 'User',
      xLabel: 'Reactions',
      showValues: true
    });
  },

  /**
   * Update calendar heatmap
   */
  updateCalendarHeatmap() {
    const canvas = document.getElementById('calendarHeatmap');
    if (!canvas || !this.state.processedData) return;

    const { days, sentimentSeries } = this.state.processedData;

    HeatmapChart.draw(canvas, {
      dates: days,
      values: sentimentSeries
    }, {
      title: 'Daily Sentiment Calendar',
      type: 'calendar',
      cellSize: 14,
      cellGap: 3,
      colorScale: 'sentiment',
      minColor: '#f87171',
      maxColor: '#34d399',
      neutralColor: '#fbbf24'
    });
  },

  /**
   * Refresh visualizations
   */
  refreshVisualizations() {
    if (!this.state.processedData) return;
    this.updateAllVisualizations();
  },

  /**
   * Handle date range change
   */
  handleDateRangeChange(range) {
    // Filter data and reprocess
    // This is simplified - full implementation would filter and reprocess
    console.log('Date range changed:', range);
  },

  /**
   * Handle emoji filter change
   */
  handleEmojiFilterChange(emoji) {
    console.log('Emoji filter changed:', emoji);
    // Filter and update visualizations
  },

  /**
   * Handle audience filter change
   */
  handleAudienceFilterChange(audience) {
    console.log('Audience filter changed:', audience);
    // Filter and update visualizations
  },

  /**
   * Handle time range change
   */
  handleTimeRangeChange(range) {
    console.log('Time range changed:', range);
    // Apply time range filter and refresh
  },

  /**
   * Export data in specified format
   */
  exportData(format) {
    if (!this.state.processedData) {
      UIControls.showError('No data to export');
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    switch (format) {
      case 'json':
        ExportModule.exportJSON({
          metadata: {
            exportDate: new Date().toISOString(),
            totalReactions: this.state.processedData.total,
            uniqueUsers: this.state.processedData.uniqueUsers,
            dateRange: {
              start: this.state.processedData.minDate,
              end: this.state.processedData.maxDate
            }
          },
          data: this.state.processedData,
          analysis: this.state.sentimentAnalysis,
          insights: this.state.insights
        }, `vb-sentiment-${timestamp}.json`);
        break;

      case 'csv':
        ExportModule.exportCSV(this.state.processedData, `vb-sentiment-${timestamp}.csv`);
        break;

      case 'pdf':
        ExportModule.exportPDF(this.state.processedData, `vb-sentiment-report-${timestamp}.pdf`);
        break;

      default:
        UIControls.showError('Unknown export format');
    }
  },

  /**
   * Export all charts as PNG
   */
  async exportAllCharts() {
    if (!this.state.processedData) {
      UIControls.showError('No charts to export');
      return;
    }

    const canvases = [
      document.getElementById('gaugeChart'),
      document.getElementById('sentimentLine'),
      document.getElementById('distributionChart'),
      document.getElementById('topUsersChart'),
      document.getElementById('calendarHeatmap')
    ].filter(c => c !== null);

    if (canvases.length === 0) {
      UIControls.showError('No charts available to export');
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    await ExportModule.exportAllChartsPNG(canvases, `vb-dashboard-${timestamp}.png`);
  }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => VBSentimentApp.init());
} else {
  VBSentimentApp.init();
}

// Export for use in other modules
window.VBSentimentApp = VBSentimentApp;
