/**
 * Terminology Consistency Tests
 * 
 * These tests verify that prohibited terms (like "dividend") are not used
 * and that consistent RevenueShare terminology is applied across the UI.
 * 
 * Run with: npm test (once vitest is configured)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const SRC_DIR = resolve(__dirname, '../src');

// Prohibited terms that should NOT appear in UI copy
const PROHIBITED_TERMS = [
  'dividend',
  'dividends',
  'revenue-share',  // Should be "RevenueShare" (no hyphen)
  'revenue sharing', // Should be "RevenueShare distributions"
];

// Required terms that SHOULD appear (consistent terminology)
const REQUIRED_TERMS = [
  'RevenueShare',
  'RevenueShare offerings',
  'RevenueShare payouts',
];

describe('Terminology Consistency', () => {
  const getSourceFiles = (): string[] => {
    const files: string[] = [];
    
    const scanDir = (dir: string) => {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(SRC_DIR);
    return files;
  };

  const files = getSourceFiles();

  describe('Prohibited terms should not be used', () => {
    PROHIBITED_TERMS.forEach((term) => {
      it(`should not contain "${term}" in any source file`, () => {
        const violations: string[] = [];
        
        for (const file of files) {
          const content = readFileSync(file, 'utf-8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            // Skip comments and string constants in terminology.ts
            if (file.endsWith('terminology.ts')) return;
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
            
            if (line.toLowerCase().includes(term.toLowerCase())) {
              violations.push(`${file}:${index + 1} - "${line.trim()}"`);
            }
          });
        }
        
        expect(violations).toEqual([]);
      });
    });
  });

  describe('Required terms should be present', () => {
    REQUIRED_TERMS.forEach((term) => {
      it(`should contain "${term}" in the codebase`, () => {
        let found = false;
        
        for (const file of files) {
          if (file.endsWith('terminology.ts')) continue;
          
          const content = readFileSync(file, 'utf-8');
          if (content.includes(term)) {
            found = true;
            break;
          }
        }
        
        expect(found).toBe(true);
      });
    });
  });

  describe('Accessibility: ARIA attributes', () => {
    it('should have aria-required on required form inputs', () => {
      const authFiles = files.filter(f => 
        f.includes('Login.tsx') || f.includes('Signup.tsx') || f.includes('ForgotPassword.tsx')
      );
      
      authFiles.forEach(file => {
        const content = readFileSync(file, 'utf-8');
        
        // Check that required inputs have aria-required
        const hasRequiredInputs = content.includes('required');
        const hasAriaRequired = content.includes('aria-required="true"');
        
        if (hasRequiredInputs) {
          expect(hasAriaRequired).toBe(true);
        }
      });
    });

    it('should have aria-label on all form inputs', () => {
      const authFiles = files.filter(f => 
        f.includes('Login.tsx') || f.includes('Signup.tsx') || f.includes('ForgotPassword.tsx')
      );
      
      authFiles.forEach(file => {
        const content = readFileSync(file, 'utf-8');
        const inputCount = (content.match(/<input/g) || []).length;
        const ariaLabelCount = (content.match(/aria-label/g) || []).length;
        
        expect(ariaLabelCount).toBeGreaterThanOrEqual(inputCount);
      });
    });
  });
});
