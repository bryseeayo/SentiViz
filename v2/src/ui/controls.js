// UI Controls Module
// Handles all user interactions, filters, and control events

const UIControls = {
  // State management
  state: {
    dateRange: { start: null, end: null },
    selectedEmoji: 'all',
    selectedUser: null,
    audienceFilter: 'all', // 'all', 'new', 'returning'
    timeRange: 'all', // 'all', '7d', '30d', '90d'
    sortBy: 'date',
    sortOrder: 'desc'
  },

  callbacks: {
    onDateRangeChange: null,
    onEmojiFilterChange: null,
    onUserSelect: null,
    onAudienceFilterChange: null,
    onTimeRangeChange: null,
    onRefresh: null
  },

  /**
   * Initialize UI controls
   */
  init(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.setupEventListeners();
  },

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Date range controls
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (startDateInput) {
      startDateInput.addEventListener('change', () => {
        this.state.dateRange.start = startDateInput.value ? new Date(startDateInput.value) : null;
        this.triggerCallback('onDateRangeChange', this.state.dateRange);
      });
    }

    if (endDateInput) {
      endDateInput.addEventListener('change', () => {
        this.state.dateRange.end = endDateInput.value ? new Date(endDateInput.value) : null;
        this.triggerCallback('onDateRangeChange', this.state.dateRange);
      });
    }

    // Emoji filter buttons
    const emojiButtons = document.querySelectorAll('[data-emoji-filter]');
    emojiButtons.forEach(button => {
      button.addEventListener('click', () => {
        const emoji = button.dataset.emojiFilter;
        this.setEmojiFilter(emoji);
        this.updateActiveButton(emojiButtons, button);
      });
    });

    // Audience filter
    const audienceSelect = document.getElementById('audienceFilter');
    if (audienceSelect) {
      audienceSelect.addEventListener('change', () => {
        this.state.audienceFilter = audienceSelect.value;
        this.triggerCallback('onAudienceFilterChange', audienceSelect.value);
      });
    }

    // Time range buttons
    const timeRangeButtons = document.querySelectorAll('[data-time-range]');
    timeRangeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const range = button.dataset.timeRange;
        this.setTimeRange(range);
        this.updateActiveButton(timeRangeButtons, button);
      });
    });

    // Refresh button
    const refreshButton = document.getElementById('refreshBtn');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        this.triggerCallback('onRefresh');
      });
    }

    // Reset filters button
    const resetButton = document.getElementById('resetFilters');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.resetFilters();
      });
    }

    // Sort controls
    const sortBySelect = document.getElementById('sortBy');
    if (sortBySelect) {
      sortBySelect.addEventListener('change', () => {
        this.state.sortBy = sortBySelect.value;
        this.triggerCallback('onRefresh');
      });
    }

    const sortOrderSelect = document.getElementById('sortOrder');
    if (sortOrderSelect) {
      sortOrderSelect.addEventListener('change', () => {
        this.state.sortOrder = sortOrderSelect.value;
        this.triggerCallback('onRefresh');
      });
    }
  },

  /**
   * Set emoji filter
   */
  setEmojiFilter(emoji) {
    this.state.selectedEmoji = emoji;
    this.triggerCallback('onEmojiFilterChange', emoji);
  },

  /**
   * Set time range and calculate dates
   */
  setTimeRange(range) {
    this.state.timeRange = range;

    const now = new Date();
    let startDate = null;

    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = null;
        break;
    }

    this.state.dateRange = {
      start: startDate,
      end: null // null means "now"
    };

    this.triggerCallback('onTimeRangeChange', { range, dateRange: this.state.dateRange });
  },

  /**
   * Reset all filters to default
   */
  resetFilters() {
    this.state = {
      dateRange: { start: null, end: null },
      selectedEmoji: 'all',
      selectedUser: null,
      audienceFilter: 'all',
      timeRange: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    };

    // Reset UI elements
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';

    const audienceSelect = document.getElementById('audienceFilter');
    if (audienceSelect) audienceSelect.value = 'all';

    const sortBySelect = document.getElementById('sortBy');
    if (sortBySelect) sortBySelect.value = 'date';

    const sortOrderSelect = document.getElementById('sortOrder');
    if (sortOrderSelect) sortOrderSelect.value = 'desc';

    // Remove active states
    document.querySelectorAll('.btn-filter.active').forEach(btn => {
      btn.classList.remove('active');
    });

    this.triggerCallback('onRefresh');
  },

  /**
   * Update active button state
   */
  updateActiveButton(buttons, activeButton) {
    buttons.forEach(btn => btn.classList.remove('active'));
    activeButton.classList.add('active');
  },

  /**
   * Trigger callback if defined
   */
  triggerCallback(name, data) {
    if (this.callbacks[name] && typeof this.callbacks[name] === 'function') {
      this.callbacks[name](data);
    }
  },

  /**
   * Get current filter state
   */
  getState() {
    return { ...this.state };
  },

  /**
   * Set date range programmatically
   */
  setDateRange(startDate, endDate) {
    this.state.dateRange = {
      start: startDate ? new Date(startDate) : null,
      end: endDate ? new Date(endDate) : null
    };

    // Update UI inputs
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (startDateInput && startDate) {
      startDateInput.value = this.formatDateForInput(startDate);
    }

    if (endDateInput && endDate) {
      endDateInput.value = this.formatDateForInput(endDate);
    }

    this.triggerCallback('onDateRangeChange', this.state.dateRange);
  },

  /**
   * Format date for input field (YYYY-MM-DD)
   */
  formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Show loading state
   */
  showLoading(show = true) {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }

    // Disable controls while loading
    const controls = document.querySelectorAll('button, select, input');
    controls.forEach(control => {
      control.disabled = show;
    });
  },

  /**
   * Show error message
   */
  showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';

      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    } else {
      // Fallback to alert
      alert(message);
    }
  },

  /**
   * Show success message
   */
  showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
      successDiv.textContent = message;
      successDiv.style.display = 'block';

      // Auto-hide after 3 seconds
      setTimeout(() => {
        successDiv.style.display = 'none';
      }, 3000);
    }
  },

  /**
   * Update metrics display
   */
  updateMetrics(metrics) {
    const metricElements = {
      totalReactions: document.getElementById('metricTotal'),
      uniqueUsers: document.getElementById('metricUsers'),
      avgSentiment: document.getElementById('metricSentiment'),
      dateRange: document.getElementById('metricDateRange')
    };

    if (metricElements.totalReactions) {
      metricElements.totalReactions.textContent = metrics.totalReactions?.toLocaleString() || '0';
    }

    if (metricElements.uniqueUsers) {
      metricElements.uniqueUsers.textContent = metrics.uniqueUsers?.toLocaleString() || '0';
    }

    if (metricElements.avgSentiment) {
      const sentiment = metrics.avgSentiment || 0;
      metricElements.avgSentiment.textContent = sentiment.toFixed(2);
      metricElements.avgSentiment.className = this.getSentimentClass(sentiment);
    }

    if (metricElements.dateRange && metrics.startDate && metrics.endDate) {
      const start = this.formatDate(metrics.startDate);
      const end = this.formatDate(metrics.endDate);
      metricElements.dateRange.textContent = `${start} - ${end}`;
    }
  },

  /**
   * Get sentiment class for styling
   */
  getSentimentClass(sentiment) {
    if (sentiment < -0.3) return 'sentiment-negative';
    if (sentiment < 0.3) return 'sentiment-neutral';
    return 'sentiment-positive';
  },

  /**
   * Format date for display
   */
  formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  /**
   * Toggle section visibility
   */
  toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      const isHidden = section.style.display === 'none';
      section.style.display = isHidden ? 'block' : 'none';

      // Update toggle button icon if exists
      const toggleBtn = document.querySelector(`[data-toggle="${sectionId}"]`);
      if (toggleBtn) {
        toggleBtn.textContent = isHidden ? '▼' : '▶';
      }
    }
  },

  /**
   * Setup collapsible sections
   */
  setupCollapsibleSections() {
    const toggleButtons = document.querySelectorAll('[data-toggle]');
    toggleButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.toggle;
        this.toggleSection(targetId);
      });
    });
  },

  /**
   * Highlight data point on chart interaction
   */
  setupChartInteraction(canvas, data, callback) {
    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Calculate which data point was clicked
      // This is a simplified example - actual implementation depends on chart type
      const index = Math.floor((x / rect.width) * data.length);

      if (index >= 0 && index < data.length) {
        callback(data[index], index);
      }
    });

    // Show tooltip on hover
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const index = Math.floor((x / rect.width) * data.length);

      if (index >= 0 && index < data.length) {
        this.showTooltip(event.clientX, event.clientY, data[index]);
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
  },

  /**
   * Show tooltip
   */
  showTooltip(x, y, data) {
    let tooltip = document.getElementById('chartTooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'chartTooltip';
      tooltip.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10000;
        display: none;
      `;
      document.body.appendChild(tooltip);
    }

    tooltip.innerHTML = `
      <strong>${data.label || data.date || ''}</strong><br>
      Value: ${data.value !== undefined ? data.value.toFixed(2) : 'N/A'}
    `;

    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 30}px`;
    tooltip.style.display = 'block';
  },

  /**
   * Hide tooltip
   */
  hideTooltip() {
    const tooltip = document.getElementById('chartTooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }
};

// Export for use in other modules
window.UIControls = UIControls;
