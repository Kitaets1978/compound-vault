const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
function parseCSV(text) {
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(value); value = ''; }
    else if (c === '\n' && !quoted) { row.push(value.replace(/\r$/, '')); if (row.some(Boolean)) rows.push(row); row = []; value = ''; }
    else value += c;
  }
  if (quoted) throw Error('Unterminated quoted CSV field');
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}
const [headers, ...rows] = parseCSV(fs.readFileSync(path.join(root, 'data/compounds.csv'), 'utf8'));
const required = 'slug,name,aliases,class,structure_image,half_life,mechanism,effects_studied,side_effects,long_term_risks,legal_ca,legal_us,legal_uk,related,references,risk_tags'.split(',');
if (headers.join(',') !== required.join(',')) throw Error('CSV headers do not match documented schema');
const seen = new Set();
const data = rows.map((row, i) => {
  if (row.length !== headers.length) throw Error(`Row ${i + 2}: wrong column count`);
  const c = Object.fromEntries(headers.map((h, j) => [h, row[j].trim()]));
  if (!/^[a-z0-9-]+$/.test(c.slug) || seen.has(c.slug)) throw Error(`Invalid or duplicate slug: ${c.slug}`);
  seen.add(c.slug);
  if (!['anabolic steroid','SARM','peptide','PCT/ancillary','other'].includes(c.class)) throw Error('Unknown class');
  for (const k of ['aliases', 'related', 'risk_tags']) c[k] = c[k].split(';').map(s => s.trim()).filter(Boolean);
  if (c.risk_tags.some(t => !['liver','lipids','blood_pressure','hematocrit','hpta','mood','unknown_human_data'].includes(t))) throw Error('Unknown risk tag');
  c.references = c.references.split(';').filter(Boolean).map(r => { const [title, url] = r.split('|'); if (!title || !/^https:\/\//.test(url)) throw Error('Reference requires title|https URL'); return {title, url}; });
  return c;
});
for (const c of data) for (const slug of c.related) if (!seen.has(slug)) throw Error(`Unknown related slug: ${slug}`);
fs.writeFileSync(path.join(root, 'data/compounds.json'), JSON.stringify(data, null, 2) + '\n');
console.log(`Generated ${data.length} compounds`);
