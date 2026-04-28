/**
 * Terminology Validation Script
 * 
 * This script validates that prohibited terms are not used in the codebase.
 * Run with: node scripts/validate-terminology.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

// Prohibited terms
const PROHIBITED_TERMS = [
  { term: 'dividend', replacement: 'RevenueShare payout' },
  { term: 'dividends', replacement: 'RevenueShare payouts' },
  { term: 'revenue-share', replacement: 'RevenueShare' },
  { term: 'revenue sharing', replacement: 'RevenueShare distributions' },
];

let hasViolations = false;

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      validateFile(fullPath);
    }
  }
}

function validateFile(filePath) {
  // Skip the terminology constants file itself
  if (filePath.endsWith('terminology.ts')) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    
    PROHIBITED_TERMS.forEach(({ term, replacement }) => {
      if (line.toLowerCase().includes(term.toLowerCase())) {
        console.error(`❌ VIOLATION: ${filePath}:${index + 1}`);
        console.error(`   Found: "${term}"`);
        console.error(`   Replace with: "${replacement}"`);
        console.error(`   Line: "${line.trim()}"`);
        console.error('');
        hasViolations = true;
      }
    });
  });
}

console.log('🔍 Validating terminology consistency...\n');
scanDirectory(SRC_DIR);

if (hasViolations) {
  console.error('❌ Terminology validation FAILED');
  console.error('Please fix the violations above before committing.\n');
  process.exit(1);
} else {
  console.log('✅ All terminology is consistent!');
  console.log('✅ No prohibited terms found.\n');
  process.exit(0);
}
