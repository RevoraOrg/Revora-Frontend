/** Validate product terminology in production TypeScript sources. */
const fs = require('node:fs');
const path = require('node:path');

const SRC_DIR = path.join(__dirname, '../src');
const REPLACEMENTS = {
  dividend: 'RevenueShare payout',
  dividends: 'RevenueShare payouts',
  'revenue-share': 'RevenueShare',
  'revenue sharing': 'RevenueShare distributions',
};

/** Mask comments while preserving strings, line numbers and column positions. */
function maskComments(content) {
  let quote = null;
  let result = '';
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (quote) {
      result += char;
      if (char === '\\') result += content[++i] || '';
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === '`') {
      quote = char;
      result += char;
    } else if (char === '/' && content[i + 1] === '/') {
      while (i < content.length && content[i] !== '\n') {
        result += ' ';
        i++;
      }
      if (i < content.length) result += '\n';
    } else if (char === '/' && content[i + 1] === '*') {
      result += '  ';
      i += 2;
      while (i < content.length && !(content[i] === '*' && content[i + 1] === '/')) {
        result += content[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < content.length) {
        result += '  ';
        i++;
      }
    } else {
      result += char;
    }
  }
  return result;
}

/** Return violations without reading files, logging, or changing process state. */
function findViolations(content) {
  const originalLines = content.split('\n');
  const violations = [];
  maskComments(content).split('\n').forEach((line, index) => {
    // Documentation URL paths are identifiers, not user-facing product copy.
    const copy = line.replace(/https?:\/\/[^\s"'`<>]+/gi, '');
    for (const match of copy.matchAll(/\b(dividends?|revenue-share|revenue sharing)\b/gi)) {
      const term = match[0].toLowerCase();
      violations.push({ line: index + 1, term, replacement: REPLACEMENTS[term], text: originalLines[index].trim() });
    }
  });
  return violations;
}

function scanDirectory(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'test') count += scanDirectory(fullPath);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)
      && fullPath !== path.join(SRC_DIR, 'constants', 'terminology.ts')) {
      for (const violation of findViolations(fs.readFileSync(fullPath, 'utf8'))) {
        console.error(`VIOLATION: ${fullPath}:${violation.line}`);
        console.error(`   Found: "${violation.term}"`);
        console.error(`   Replace with: "${violation.replacement}"`);
        console.error(`   Line: "${violation.text}"\n`);
        count++;
      }
    }
  }
  return count;
}

if (require.main === module) {
  console.log('Validating terminology consistency...\n');
  const count = scanDirectory(SRC_DIR);
  if (count) {
    console.error('Terminology validation FAILED');
    console.error('Please fix the violations above before committing.');
    process.exitCode = 1;
  } else {
    console.log('All terminology is consistent! No prohibited terms found.');
  }
}

module.exports = { findViolations };
