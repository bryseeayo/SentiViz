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
        if (this.elements.fileInput) this.elements.fileInput.click();
      });
    }

    // Browse button
    if (this.elements.browseBtn) {
      console.log('Setting up browse button click handler');
      this.elements.browseBtn.addEventListener('click', (e) => {
        // Using label[for] to open file dialog cross-browser
        console.log('Browse button clicked!');
        // Ensure file input is interactable for Safari
        if (this.elements.fileInput) {
          this.ensureFileInputInteractable();
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

  // Ensure file input can be triggered programmatically (Safari fix)
  ensureFileInputInteractable() {
    const input = this.elements.fileInput;
    if (!input) return;
    if (input.hasAttribute('hidden')) input.removeAttribute('hidden');
    // If input is display:none, make it visually hidden instead
    const style = window.getComputedStyle(input);
    if (style.display === 'none') {
      input.style.display = 'block';
      input.classList.add('visually-hidden');
    }
  },

  /**
   * Handle file upload
   */
  async handleFileUpload(file) {
    console.log('handleFileUpload called with file:', file);

    if (!file) {
      console.error('No file provided');
      return;
    }

    // Accept .csv (case-insensitive) and common CSV MIME types
    const nameOk = /\.csv$/i.test(file.name || '');
    const typeOk = /text\/csv|application\/vnd\.ms-excel/i.test(file.type || '');
    if (!nameOk && !typeOk) {
      console.error('File is not recognized as CSV:', file.name, file.type);
      alert('Please upload a CSV file');
      return;
    }

    console.log('Starting file processing...');
    this.showLoading(true);

    try {
      // Read file
      console.log('Reading file...');
      const text = await this.readFileAsText(file);
      console.log('File read, length:', text.length);

      // Parse CSV
      console.log('Parsing CSV...');
      const parsed = CSVParser.parse(text);
      console.log('Parsed rows:', parsed.rows.length);

      const vbData = CSVParser.extractVBDailyData(parsed.rows);
      console.log('Extracted VB data:', vbData.length);

      // Validate
      console.log('Validating data...');
      const validation = CSVParser.validate(vbData);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      if (validation.warnings) {
        console.warn(validation.warnings);
      }

      // Store raw data
      this.state.rawData = validation.validRows;
      console.log('Stored raw data:', this.state.rawData.length, 'rows');

      // Process data
      console.log('Processing data...');
      await this.processData();

      // Reset file input to allow re-selecting the same file later
      if (this.elements.fileInput) {
        this.elements.fileInput.value = '';
      }

      alert(`Loaded ${this.state.rawData.length} reactions successfully!`);
      console.log('File upload complete!');
    } catch (error) {
      console.error('File upload error:', error);
      alert(`Failed to load file: ${error.message}`);
    } finally {
      this.showLoading(false);
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
    console.log('Updating all visualizations...');

    // Hide welcome state, show dashboard
    const welcomeState = document.getElementById('welcomeState');
    if (welcomeState) {
      welcomeState.style.display = 'none';
    }

    if (this.elements.dashboardContainer) {
      this.elements.dashboardContainer.style.display = 'block';
    }

    // Update metrics
    this.updateMetrics();

    // Update insights panel
    this.updateInsights();

    // Update all charts
    this.updateCharts();

    console.log('All visualizations updated!');
  },

  /**
   * Update metrics display
   */
  updateMetrics() {
    const { processedData, sentimentAnalysis } = this.state;

    if (!processedData) return;

    console.log('Updating metrics...');

    // Update metric values (avoid optional chaining on assignment)
    const elTotal = document.getElementById('metricTotal');
    if (elTotal) elTotal.textContent = Utils.formatNumber(processedData.total);
    const elUsers = document.getElementById('metricUsers');
    if (elUsers) elUsers.textContent = Utils.formatNumber(processedData.uniqueUsers);

    // Update sentiment score
    const sentimentScore = (sentimentAnalysis && sentimentAnalysis.overallAverage) || 0;
    const sentimentPercent = ((sentimentScore + 1) / 2 * 100).toFixed(0); // Convert -1 to 1 range to 0-100%
    const elSent = document.getElementById('metricSentiment');
    if (elSent) elSent.textContent = `${sentimentPercent}%`;

    // Calculate engagement rate (% of unique users who responded)
    const engagementRate = processedData.uniqueUsers > 0 ?
      ((processedData.total / processedData.uniqueUsers) * 100).toFixed(1) : '0';
    const elEng = document.getElementById('metricEngagement');
    if (elEng) elEng.textContent = `${engagementRate}%`;

    // Update change indicators (compare last 7 days vs previous 7 days)
    this.updateMetricChanges();
  },

  /**
   * Update metric change indicators
   */
  updateMetricChanges() {
    // For now, show neutral changes
    // TODO: Implement actual period-over-period comparison
    const changes = ['metricTotalChange', 'metricSentimentChange', 'metricEngagementChange', 'metricUsersChange'];
    changes.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '—';
        el.className = 'metric-change neutral';
      }
    });
  },

  /**
   * Update insights panel
   */
  updateInsights() {
    console.log('Updating insights...');

    if (!this.state.insights) {
      console.warn('No insights available');
      return;
    }

    // Update top insight banner
    const topInsight = document.getElementById('topInsight');
    if (topInsight && this.state.insights.summary) {
      const insightText = topInsight.querySelector('.insight-text');
      if (insightText) {
        insightText.textContent = this.state.insights.summary || 'Data loaded successfully!';
      }
    }

    // Update trend insight
    const trendInsight = document.getElementById('trendInsight');
    if (trendInsight && this.state.insights.trend) {
      const insightText = trendInsight.querySelector('.insight-text');
      if (insightText) {
        insightText.textContent = this.state.insights.trend;
      }
    }

    // Update anomaly insight
    const anomalyInsight = document.getElementById('anomalyInsight');
    if (anomalyInsight && this.state.insights.anomaly) {
      const insightText = anomalyInsight.querySelector('.insight-text');
      if (insightText) {
        insightText.textContent = this.state.insights.anomaly;
      }
    }
  },

  /**
   * Update all charts
   */
  updateCharts() {
    const { processedData } = this.state;

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

    // Additional charts
    this.updateVelocityChart();
    this.updateRetentionChart();
    this.updateForecastChart();
    this.updateTimePatternChart();
    this.updateWeekdayChart();
    this.updateTransitionsChart();
    this.updateRecentActivity();
  },

  /**
   * Update sentiment gauge
   */
  updateSentimentGauge() {
    const canvas = document.getElementById('sentimentGauge');
    if (!canvas || !this.state.sentimentAnalysis) return;

    console.log('Drawing sentiment gauge...');
    GaugeChart.draw(canvas, this.state.sentimentAnalysis.overallAverage, {
      title: 'Overall Sentiment'
    });
  },

  /**
   * Update sentiment line chart
   */
  updateSentimentLine() {
    const canvas = document.getElementById('sentimentTrend');
    if (!canvas || !this.state.processedData) return;

    console.log('Drawing sentiment trend...');

    const { days, sentimentSeries } = this.state.processedData;
    const sa = this.state.sentimentAnalysis || {};
    const controlBands = sa.controlBands;
    const anomaliesCombined = sa.anomalies && sa.anomalies.combined ? sa.anomalies.combined : [];

    // Prepare markers for anomalies
    const markers = anomaliesCombined.map(a => ({
      index: a.index,
      color: a.type === 'spike' ? '#34d399' : '#f87171',
      label: a.type
    }));

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
    const canvas = document.getElementById('emotionDistribution');
    if (!canvas || !this.state.processedData) return;

    console.log('Drawing emotion distribution...');
    const distribution = DataProcessor.calculateDistribution(this.state.rawData);

    DonutChart.draw(canvas, {
      labels: ['Wow 🤯', 'Curious 🤔', 'Boring 😴'],
      values: [distribution.counts['🤯'], distribution.counts['🤔'], distribution.counts['😴']]
    }, {
      title: 'Emoji Distribution',
      colors: ['#f59e0b', '#3b82f6', '#6b7280'],
      showPercentages: true,
      innerRadius: 0.6
    });

    // Update percentage displays
    const total = (distribution.counts['🤯'] || 0) + (distribution.counts['🤔'] || 0) + (distribution.counts['😴'] || 0);
    const wowEl = document.getElementById('wowPercent');
    const curEl = document.getElementById('curiousPercent');
    const borEl = document.getElementById('boringPercent');
    if (total > 0) {
      if (wowEl) wowEl.textContent = `${((distribution.counts['🤯'] / total) * 100).toFixed(1)}%`;
      if (curEl) curEl.textContent = `${((distribution.counts['🤔'] / total) * 100).toFixed(1)}%`;
      if (borEl) borEl.textContent = `${((distribution.counts['😴'] / total) * 100).toFixed(1)}%`;
    } else {
      if (wowEl) wowEl.textContent = '—';
      if (curEl) curEl.textContent = '—';
      if (borEl) borEl.textContent = '—';
    }
  },

  /**
   * Update Top Contributors list (renders into #topContributorsList)
   */
  updateTopUsersChart() {
    if (!this.state.processedData) return;

    const container = document.getElementById('topContributorsList');
    if (!container) return;

    const { topUsers, total } = this.state.processedData;
    const top10 = topUsers.slice(0, 10);

    if (top10.length === 0) {
      container.innerHTML = '<div class="empty">No active readers yet</div>';
      return;
    }

    const rows = top10.map(([id, count], index) => {
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
      const label = id || 'unknown';
      const color = Utils.stringToColor(label);
      return `
        <div class="list-row" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid #1f2937;">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <span style="width:20px;color:#94a3b8;">${index + 1}</span>
            <span style="width:10px;height:10px;border-radius:9999px;background:${color};display:inline-block;"></span>
            <span title="${label}" style="color:#e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${label}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="color:#9ca3af;min-width:48px;text-align:right;">${pct}%</span>
            <span style="color:#f1f5f9;font-variant-numeric:tabular-nums;min-width:32px;text-align:right;">${count}</span>
          </div>
        </div>`;
    }).join('');

    // Header row
    const header = `
      <div class="list-header" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;color:#94a3b8;border-bottom:1px solid #111827;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="width:20px;"></span>
          <span>User</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span>% of total</span>
          <span>Reactions</span>
        </div>
      </div>`;

    container.innerHTML = header + rows;
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
   * Update velocity chart
   */
  updateVelocityChart() {
    const canvas = document.getElementById('velocityChart');
    if (!canvas || !this.state.processedData) return;
    const values = SentimentAnalytics.calculateVelocity(this.state.processedData.sentimentSeries);
    LineChart.draw(canvas, {
      labels: this.state.processedData.days.map(d => d.slice(5)),
      values
    }, {
      title: 'Sentiment Velocity',
      yLabel: 'Δ per 3 days',
      yMin: Math.min(-1, Math.min(...values)),
      yMax: Math.max(1, Math.max(...values)),
      lineColor: '#f59e0b',
      fillArea: true,
      fillOpacity: 0.15
    });
  },

  /**
   * Update retention chart
   */
  updateRetentionChart() {
    const canvas = document.getElementById('retentionChart');
    if (!canvas || !this.state.processedData) return;
    const r = DataProcessor.calculateRetention(this.state.processedData.userItems, this.state.processedData.days);
    const labels = ['1d', '3d', '7d'];
    const values = [r.d1, r.d3, r.d7].map(v => Math.round(v * 100));
    BarChart.draw(canvas, { labels, values }, {
      title: 'Retention (return within days)',
      xLabel: 'Window',
      yLabel: '% Users',
      showValues: true,
      barColor: '#3b82f6',
      formatValue: v => `${v}%`
    });
  },

  /**
   * Update forecast chart
   */
  updateForecastChart() {
    const canvas = document.getElementById('forecastChart');
    if (!canvas || !this.state.processedData || !this.state.forecast) return;
    const histLabels = this.state.processedData.days.map(d => d.slice(5));
    const histValues = this.state.processedData.sentimentSeries;
    const ens = this.state.forecast.ensemble || this.state.forecast.simple || this.state.forecast.exponential;
    if (!ens || !ens.predictions || ens.predictions.length === 0) return;
    LineChart.draw(canvas, {
      labels: histLabels,
      values: histValues
    }, {
      title: 'Forecast (7 days)',
      yLabel: 'Sentiment',
      yMin: -1,
      yMax: 1,
      lineColor: '#22c55e',
      forecast: {
        predictions: ens.predictions,
        upper: ens.confidence && ens.confidence.upper ? ens.confidence.upper : null,
        lower: ens.confidence && ens.confidence.lower ? ens.confidence.lower : null
      }
    });
  },

  /**
   * Update time pattern (hour of day)
   */
  updateTimePatternChart() {
    const canvas = document.getElementById('timePatternChart');
    if (!canvas || !this.state.processedData) return;
    const hours = new Array(24).fill(0);
    this.state.processedData.rawData.forEach(item => {
      const d = new Date(item.date);
      hours[d.getHours()] += 1;
    });
    BarChart.draw(canvas, {
      labels: hours.map((_, i) => i.toString().padStart(2, '0')),
      values: hours
    }, {
      title: 'Responses by Hour',
      xLabel: 'Hour',
      yLabel: 'Responses',
      barColor: '#a78bfa',
      showValues: false
    });
  },

  /**
   * Update weekday chart
   */
  updateWeekdayChart() {
    const canvas = document.getElementById('weekdayChart');
    if (!canvas || !this.state.processedData) return;
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    this.state.processedData.rawData.forEach(item => {
      const w = new Date(item.date).getDay();
      const wgt = DataProcessor.EMOJI_WEIGHTS[item.emoji];
      if (wgt !== undefined) {
        sums[w] += wgt;
        counts[w] += 1;
      }
    });
    const avg = sums.map((s, i) => counts[i] > 0 ? s / counts[i] : 0);
    const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    BarChart.draw(canvas, { labels, values: avg }, {
      title: 'Avg Sentiment by Weekday',
      xLabel: 'Weekday',
      yLabel: 'Average Sentiment',
      barColor: '#f87171',
      showValues: false
    });
  },

  /**
   * Update transitions chart (render as bar categories)
   */
  updateTransitionsChart() {
    const canvas = document.getElementById('transitionsMatrix');
    if (!canvas || !this.state.processedData) return;
    const t = DataProcessor.calculateTransitions(this.state.processedData.userItems, this.state.processedData.days);
    const labels = Object.keys(t);
    const values = labels.map(k => t[k]);
    BarChart.draw(canvas, { labels, values }, {
      title: 'Emoji Transitions (day-to-day)',
      xLabel: 'From→To',
      yLabel: 'Count',
      showValues: false,
      barColor: '#10b981',
      maxBars: 9
    });
  },

  /**
   * Update recent activity list
   */
  updateRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container || !this.state.processedData) return;
    const items = this.state.processedData.rawData.slice(-50).reverse();
    if (items.length === 0) {
      container.innerHTML = '<div class="empty">No recent activity</div>';
      return;
    }
    const rows = items.map(it => {
      const d = new Date(it.date);
      const dateStr = `${d.toISOString().split('T')[0]} ${d.toTimeString().slice(0,5)}`;
      const id = it.networkId || 'unknown';
      return `<div class="row" style=\"display:flex;justify-content:space-between;padding:6px 8px;border-bottom:1px solid #111827;\">`
           + `<span style=\"min-width:70px;\">${it.emoji}</span>`
           + `<span style=\"flex:1;color:#e5e7eb;\">${id}</span>`
           + `<span style=\"color:#9ca3af;\">${dateStr}</span>`
           + `</div>`;
    }).join('');
    const header = `<div class=\"hdr\" style=\"display:flex;justify-content:space-between;padding:6px 8px;color:#94a3b8;border-bottom:1px solid #0b1220;\">`
                 + `<span>Emoji</span><span>User</span><span>When</span>`
                 + `</div>`;
    container.innerHTML = header + rows;
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
  },

  /**
   * Show/hide loading overlay
   */
  showLoading(show = true) {
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
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
