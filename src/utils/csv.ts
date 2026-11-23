/**
 * RFC 4180 compliant CSV parser utility.
 *
 * Handles quoted fields, escaped quotes (""), embedded commas and newlines,
 * CRLF/LF/CR line endings, and UTF-8 BOM. Returns 1-based starting line
 * numbers for each parsed row to support accurate error reporting.
 */

export interface ParsedCsvRow {
  /** 1-based line number in the source CSV where this row begins. */
  rowNumber: number;
  /** Parsed cell values for this row. */
  cells: string[];
}

export interface ParseCsvOptions {
  /**
   * Trim leading and trailing whitespace from each parsed cell.
   * Defaults to `false` to preserve exact values for round-trip symmetry with `toCsv`.
   */
  trim?: boolean;
  /**
   * Skip blank lines (rows containing no commas, no quotes, and only whitespace).
   * Defaults to `true`.
   */
  skipEmptyRows?: boolean;
}

/**
 * Parse RFC 4180 CSV text into rows with 1-based source line numbers.
 */
export function parseCsv(
  text: string,
  options: ParseCsvOptions = {},
): ParsedCsvRow[] {
  const { trim = false, skipEmptyRows = true } = options;

  // Strip UTF-8 BOM if present
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (input.length === 0) {
    return [];
  }

  const rows: ParsedCsvRow[] = [];
  let cells: string[] = [];
  let current = '';
  let inQuotes = false;
  let cellHadQuotes = false;
  let rowHadQuotes = false;
  let currentLine = 1;
  let rowStartLine = 1;

  const finalizeCell = () => {
    cells.push(trim ? current.trim() : current);
    current = '';
    cellHadQuotes = false;
  };

  const finalizeRow = () => {
    finalizeCell();
    const isBlank =
      !rowHadQuotes &&
      cells.length === 1 &&
      cells[0].trim() === '';

    if (!skipEmptyRows || !isBlank) {
      rows.push({ rowNumber: rowStartLine, cells });
    }

    cells = [];
    rowHadQuotes = false;
    rowStartLine = currentLine;
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < input.length && input[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === '\r') {
          current += ch;
          if (i + 1 < input.length && input[i + 1] === '\n') {
            current += '\n';
            i++;
          }
          currentLine++;
        } else if (ch === '\n') {
          current += ch;
          currentLine++;
        } else {
          current += ch;
        }
      }
    } else {
      if (ch === '"' && !cellHadQuotes && current.length === 0) {
        inQuotes = true;
        cellHadQuotes = true;
        rowHadQuotes = true;
      } else if (ch === ',') {
        finalizeCell();
      } else if (ch === '\r') {
        if (i + 1 < input.length && input[i + 1] === '\n') {
          i++;
        }
        currentLine++;
        finalizeRow();
      } else if (ch === '\n') {
        currentLine++;
        finalizeRow();
      } else {
        current += ch;
      }
    }
  }

  // Finalize the last row if there is any remaining content
  const hasRemainingContent =
    cells.length > 0 || current.length > 0 || rowHadQuotes;

  if (hasRemainingContent) {
    finalizeRow();
  }

  return rows;
}
