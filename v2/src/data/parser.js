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

    // Helper: normalize header keys for flexible matching
    const normalize = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

    // Build header map per row to be robust to slight variations
    rows.forEach(row => {
      // Build a lowercase key map for this row
      const keyMap = new Map();
      Object.keys(row).forEach(k => keyMap.set(normalize(k), k));

      // Try to find the emoji/sentiment column
      const emojiKeyCandidates = [
        "how did today's edition of vb daily make you feel?",
        'how did today’s edition of vb daily make you feel?', // curly apostrophe
        'vb daily sentiment',
        'sentiment',
        'emotion',
        'reaction'
      ];

      let emojiKey = emojiKeyCandidates
        .map(n => keyMap.get(n))
        .find(Boolean);

      if (!emojiKey) {
        // Fallback: find any key that contains 'make you feel' or 'sentiment'
        const dynamicKey = Array.from(keyMap.keys()).find(k =>
          k.includes('make you feel') || k.includes('sentiment') || k === 'emoji'
        );
        if (dynamicKey) emojiKey = keyMap.get(dynamicKey);
      }

      // Try to find the date column
      const dateKeyCandidates = [
        'submit date (utc)',
        'submit date',
        'submission date',
        'timestamp',
        'date',
        'created at',
        'time'
      ];

      let dateKey = dateKeyCandidates
        .map(n => keyMap.get(n))
        .find(Boolean);

      if (!dateKey) {
        // Fallback: any key containing 'date' or 'time'
        const dynamicDateKey = Array.from(keyMap.keys()).find(k => k.includes('date') || k.includes('time'));
        if (dynamicDateKey) dateKey = keyMap.get(dynamicDateKey);
      }

      // Try to find a network/user id column
      const idKeyCandidates = [
        'network id',
        'network_id',
        'networkid',
        'user id',
        'userid',
        'id'
      ];

      let idKey = idKeyCandidates
        .map(n => keyMap.get(n))
        .find(Boolean);

      // Extract raw values
      const rawEmoji = emojiKey ? row[emojiKey] : null;
      const rawDate = dateKey ? row[dateKey] : null;
      const rawId = idKey ? row[idKey] : null;

      // Attempt to infer emoji from value if necessary
      const parsedEmoji = this.normalizeEmoji(rawEmoji, row);
      const parsedDate = this.parseDate(rawDate);

      if (parsedEmoji && parsedDate) {
        data.push({
          emoji: parsedEmoji,
          date: parsedDate,
          networkId: rawId || 'unknown',
          rawDate: rawDate
        });
      }
    });

    return data;
  },

  // Normalize various emoji/sentiment representations to one of the 3 emojis
  normalizeEmoji(value, rowObj) {
    if (!value) {
      // Fallback: scan row values for explicit emoji characters
      const match = Object.values(rowObj || {}).find(v => ['🤯', '🤔', '😴'].includes((v || '').toString().trim()));
      if (match) return match.toString().trim();
      return null;
    }

    const v = value.toString().trim();
    if (['🤯', '🤔', '😴'].includes(v)) return v;

    const lower = v.toLowerCase();
    if (lower.includes('wow') || lower.includes('mind blown') || lower.includes('very positive') || lower.includes('🤯')) return '🤯';
    if (lower.includes('curious') || lower.includes('neutral') || lower.includes('🤔')) return '🤔';
    if (lower.includes('boring') || lower.includes('negative') || lower.includes('😴') || lower.includes('bored')) return '😴';

    // Sometimes options contain text with emoji e.g., "Wow 🤯"
    if (v.includes('🤯')) return '🤯';
    if (v.includes('🤔')) return '🤔';
    if (v.includes('😴')) return '😴';

    return null;
  },

  // Parse date string to Date object
  parseDate(dateStr) {
    if (!dateStr) return null;

    // Try ISO/native Date first
    let date = new Date(dateStr);

    // If invalid, try other common formats
    if (isNaN(date.getTime())) {
      // Try MM/DD/YYYY and optional time
      const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?)?/i);
      if (match) {
        const [, m, d, y, hh, mm, ss, ampm] = match;
        let year = parseInt(y.length === 2 ? '20' + y : y, 10);
        let hour = hh ? parseInt(hh, 10) : 0;
        const minute = mm ? parseInt(mm, 10) : 0;
        const second = ss ? parseInt(ss, 10) : 0;
        if (ampm) {
          const up = ampm.toUpperCase();
          if (up === 'PM' && hour < 12) hour += 12;
          if (up === 'AM' && hour === 12) hour = 0;
        }
        date = new Date(year, parseInt(m, 10) - 1, parseInt(d, 10), hour, minute, second);
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
