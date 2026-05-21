const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'scraped_debug.html'), 'utf8');

// Find all elements (<div...>, <img...>, etc.) with data-tooltip-html
const elementRegex = /<([a-z0-9]+)\s+([^>]*data-tooltip-html="[^"]*"[^>]*)>/gi;
let match;
const active = new Set();
const inactive = new Set();

while ((match = elementRegex.exec(html)) !== null) {
  const tagName = match[1];
  const attrs = match[2];
  
  // Extract alt or title or <b>...</b> from data-tooltip-html
  const tooltipMatch = attrs.match(/data-tooltip-html="<small><b>([^<]+)<\/b>/);
  if (!tooltipMatch) continue;
  
  const name = tooltipMatch[1];
  
  // Extract class
  const classMatch = attrs.match(/class="([^"]*)"/);
  const className = classMatch ? classMatch[1] : '';
  
  if (className.includes('nonActive')) {
    inactive.add(name);
  } else {
    active.add(name);
  }
}

console.log('ACTIVE ELEMENTS:', Array.from(active));
