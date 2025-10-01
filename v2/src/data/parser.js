// CSV Parser for VB Daily Sentiment Data

const CSVParser = {
  // Parse CSV text into array of objects
  parse(csvText) {
    const lines = this.splitLines(csvText);
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }

    const headers = this.parseLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = this.parseLine(lines[i]);
      if (values.length !== headers.length) continue;

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }

    return { headers, rows };
  },

  // Split CSV text into lines (handle different line endings)
  splitLines(text) {
    return text.split(/\r\n|\n|\r/);
  },

  // Parse single CSV line (RFC 4180 compliant - handle quoted fields)
  parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());

    return result;
  },

  // Extract VB Daily specific fields
  extractVBDailyData(rows) {
    const data = [];

    rows.forEach(row => {
      // Expected columns (flexible matching)
      const emoji = row['How did today\'s edition of VB Daily make you feel?'] ||
                    row['emotion'] ||
                    Object.values(row).find(v => ['🤯', '🤔', '😴'].includes(v));

      const submitDate = row['Submit Date (UTC)'] ||
                        row['submit_date'] ||
                        row['date'];

      const networkId = row['Network ID'] ||
                       row['network_id'] ||
                       row['id'];

      // Only include rows with required fields
      if (emoji && submitDate) {
        data.push({
          emoji: emoji.trim(),
          date: this.parseDate(submitDate),
          networkId: networkId || 'unknown',
          rawDate: submitDate
        });
      }
    });

    return data;
  },

  // Parse date string to Date object
  parseDate(dateStr) {
    if (!dateStr) return null;

    // Try ISO format first
    let date = new Date(dateStr);

    // If invalid, try other common formats
    if (isNaN(date.getTime())) {
      // Try MM/DD/YYYY
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        date = new Date(parts[2], parts[0] - 1, parts[1]);
      }
    }

    return isNaN(date.getTime()) ? null : date;
  },

  // Validate parsed data
  validate(data) {
    if (!data || data.length === 0) {
      return { valid: false, error: 'No valid data found' };
    }

    const validEmojis = ['🤯', '🤔', '😴'];
    const invalidRows = data.filter(row => !validEmojis.includes(row.emoji));

    if (invalidRows.length === data.length) {
      return {
        valid: false,
        error: 'No valid emoji reactions found. Expected: 🤯 (Wow), 🤔 (Curious), 😴 (Boring)'
      };
    }

    const validDates = data.filter(row => row.date && !isNaN(row.date.getTime()));
    if (validDates.length === 0) {
      return {
        valid: false,
        error: 'No valid dates found in data'
      };
    }

    return {
      valid: true,
      warnings: invalidRows.length > 0 ? `${invalidRows.length} rows had invalid emojis` : null,
      validRows: data.filter(row => validEmojis.includes(row.emoji) && row.date)
    };
  }
};

window.CSVParser = CSVParser;
