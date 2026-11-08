'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const compoundURL = c => `compound.html?c=${encodeURIComponent(c.slug)}`;
const dataPromise = fetch('data/compounds.json').then(r => { if (!r.ok) throw Error('Library unavailable'); return r.json(); });
const normalize = s => s.toLowerCase().trim();
function matching(data, query) {
  const q = normalize(query);
  return data.filter(c => [c.name, ...c.aliases].some(n => normalize(n).includes(q))).sort((a,b) => {
    const prefix = c => [c.name, ...c.aliases].some(n => normalize(n).startsWith(q));
    return Number(prefix(b)) - Number(prefix(a)) || a.name.localeCompare(b.name);
  });
}
const page = location.pathname.split('/').pop() || 'index.html';
for (const a of document.querySelectorAll('nav a')) if (a.getAttribute('href') === page) a.setAttribute('aria-current','page');
const search = $('#global-search'), suggestions = $('#suggestions');
let selected = -1, suggested = [];
function closeSuggestions() { suggestions.hidden = true; search.setAttribute('aria-expanded','false'); search.removeAttribute('aria-activedescendant'); selected = -1; }
function selectSuggestion(i) { selected = i; [...suggestions.children].forEach((li,n) => li.setAttribute('aria-selected', String(n === i))); if (i >= 0) search.setAttribute('aria-activedescendant', `suggestion-${i}`); }
dataPromise.then(data => {
  search.addEventListener('input', () => {
    if (!search.value.trim()) { closeSuggestions(); return; }
    suggested = matching(data, search.value).slice(0,8); selected = -1;
    search.removeAttribute('aria-activedescendant');
    suggestions.innerHTML = suggested.length ? suggested.map((c,i) => `<li role="option" aria-selected="false" id="suggestion-${i}" data-index="${i}"><span>${esc(c.name)}</span><span class="badge">${esc(c.class)}</span></li>`).join('') : '<li role="presentation">No matching compounds</li>';
    suggestions.hidden = false; search.setAttribute('aria-expanded','true');
  });
  search.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSuggestions(); return; }
    if (suggestions.hidden || !suggested.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); selectSuggestion((selected + (e.key === 'ArrowDown' ? 1 : -1) + suggested.length) % suggested.length); }
    if (e.key === 'Enter') { e.preventDefault(); location.href = compoundURL(suggested[selected < 0 ? 0 : selected]); }
    if (e.key === 'Tab') closeSuggestions();
  });
  suggestions.addEventListener('click', e => { const li = e.target.closest('[data-index]'); if (li) location.href = compoundURL(suggested[Number(li.dataset.index)]); });
  document.addEventListener('click', e => { if (!e.target.closest('.header-search')) closeSuggestions(); });
  if ($('#library-results')) initLibrary(data);
  if ($('#compound-content')) renderCompound(data);
  if ($('#compound-choices')) initRisks(data);
}).catch(() => {
  search.disabled = true; search.placeholder = 'Search temporarily unavailable';
  const target = $('#library-results') || $('#compound-content') || $('#compound-choices');
  if (target) target.innerHTML = '<p class="error">The reference data could not load. Please reload or try again later.</p>';
});
function initLibrary(data) {
  const input = $('#library-search'), filter = $('#class-filter'); let letter = '';
  filter.value = new URLSearchParams(location.search).get('class') || '';
  if (filter.selectedIndex < 0) filter.value = '';
  $('#alphabet').innerHTML = ['', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(l => `<button type="button" data-letter="${l}" aria-pressed="${!l}">${l || 'All'}</button>`).join('');
  function render() {
    const results = matching(data,input.value).filter(c => (!filter.value || c.class === filter.value) && (!letter || c.name.toUpperCase().startsWith(letter)));
    $('#result-count').textContent = `${results.length} reference${results.length === 1 ? '' : 's'} found · Editorial preview`;
    $('#library-results').innerHTML = results.length ? results.map(c => `<article class="card entry"><span class="badge">${esc(c.class)}</span><h3><a href="${compoundURL(c)}">${esc(c.name)}</a></h3><p class="aliases">${esc(c.aliases.join(' · '))}</p><p>${esc(c.mechanism)}</p><a href="${compoundURL(c)}">Read reference →</a></article>`).join('') : '<p>No matches. Try another name, class or letter.</p>';
    for (const b of $('#alphabet').children) { const active = b.dataset.letter === letter; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active)); }
  }
  input.addEventListener('input',render); filter.addEventListener('change',render);
  $('#alphabet').addEventListener('click',e => { if (e.target.tagName === 'BUTTON') { letter = e.target.dataset.letter; render(); } });
  render();
}
function safeURL(s) { try { const u = new URL(s); return u.protocol === 'https:' ? u.href : '#'; } catch { return '#'; } }
function renderCompound(data) {
  const slug = new URLSearchParams(location.search).get('c');
  const c = data.find(c => c.slug === slug);
  if (!c) { $('#compound-content').innerHTML = '<h1>Reference not found.</h1><p>Select an entry from the library.</p><a class="button" href="library.html">Browse compounds</a>'; return; }
  document.title = `${c.name} — Reference | Compound Vault`;
  const sections = [['Mechanism of action',c.mechanism],['Studied or claimed effects · evidence strength',c.effects_studied],['Side effects & known concerns',c.side_effects],['Long-term risks & uncertainty',c.long_term_risks]];
  $('#compound-content').innerHTML = `<a href="library.html">← Compound library</a><div class="compound-title"><span class="badge">${esc(c.class)}</span><h1>${esc(c.name)}</h1><p>Also known as: ${esc(c.aliases.join(', ') || 'No aliases recorded')}</p></div><div class="notice"><strong>Editorial preview · not clinically reviewed.</strong> Uncertain fields are labeled PLACEHOLDER – verify. This page is not a treatment guide. No risk list is exhaustive.</div><div class="compound-layout"><div>${sections.map(([title,text]) => `<section class="card"><h2>${esc(title)}</h2><p>${esc(text)}</p></section>`).join('')}<section class="card"><h2>Legal status by country</h2><p>Legal status can change. Verify with an official source and qualified local counsel.</p><table><thead><tr><th>Jurisdiction</th><th>Status / verification required</th></tr></thead><tbody>${[['Canada',c.legal_ca],['United States',c.legal_us],['United Kingdom',c.legal_uk]].map(([n,s]) => `<tr><th scope="row">${n}</th><td>${esc(s)}</td></tr>`).join('')}</tbody></table></section><section class="card"><h2>Research & references</h2><p>Seed references provide background, not a citation for every claim. PLACEHOLDER – add compound-specific primary studies and a clinical review date.</p><ol class="reference-list">${c.references.map(r => `<li><a href="${esc(safeURL(r.url))}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a></li>`).join('')}</ol></section></div><aside><div class="card"><h2>Molecular structure</h2><div class="structure">${c.structure_image ? `<img src="${esc(safeURL(c.structure_image))}" alt="${esc(c.name)} molecular structure">` : 'PLACEHOLDER – add a verified molecular structure image and attribution.'}</div></div><div class="card"><h2>At a glance</h2><p><strong>Chemical class</strong><br>${esc(c.class)}</p><p><strong>Half-life</strong><br>${esc(c.half_life)}</p><p><strong>Evidence status</strong><br>Seed content; expert review pending.</p></div><div class="card"><h2>Related references</h2>${c.related.map(slug => data.find(x => x.slug === slug)).filter(Boolean).map(r => `<p><a href="${compoundURL(r)}">${esc(r.name)} →</a></p>`).join('')}<p class="fine">Related does not mean compatible or safe to combine.</p></div></aside></div>`;
  const ld = document.createElement('script'); ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({'@context':'https://schema.org','@type':'Drug',name:c.name,alternateName:c.aliases,drugClass:c.class,description:c.mechanism,legalStatus:[['CA',c.legal_ca],['US',c.legal_us],['GB',c.legal_uk]].map(([country,status]) => ({'@type':'DrugLegalStatus',applicableLocation:{'@type':'Country',name:country},name:status})),url:new URL(compoundURL(c),location.href).href});
  document.head.append(ld);
}
const risks = {
  liver:{title:'Liver health',detail:'Some compounds can cause drug-induced liver injury. Risk varies by substance and cannot be inferred from symptoms alone.',labs:'Discuss ALT, AST, alkaline phosphatase and bilirubin with a clinician.'},
  lipids:{title:'Cholesterol & cardiovascular health',detail:'Adverse HDL/LDL changes can contribute to cardiovascular risk, even without obvious symptoms.',labs:'A clinician may consider a lipid panel and a broader cardiovascular risk assessment.'},
  blood_pressure:{title:'Blood pressure & fluid balance',detail:'Elevated blood pressure and fluid retention can strain the cardiovascular system.',labs:'Discuss properly measured blood pressure; kidney function and electrolytes may be appropriate based on clinical context.'},
  hematocrit:{title:'Red blood cells & hematocrit',detail:'Androgens may increase red blood cell production. Elevated hematocrit requires medical assessment.',labs:'A clinician may consider a complete blood count (CBC), including hemoglobin and hematocrit.'},
  hpta:{title:'Hormones & reproductive function',detail:'Exogenous androgen activity can suppress reproductive hormone signaling and sperm production. Recovery is variable.',labs:'Discuss symptom-guided hormone testing: testosterone, LH and FSH; estradiol or other tests only when clinically indicated.'},
  mood:{title:'Mood, sleep & mental health',detail:'Mood changes, anxiety, sleep disruption and dependence-related concerns may occur. Laboratory tests cannot rule these out.',labs:'Clinical assessment of mood, sleep and substance use; no single blood test establishes mental-health safety.'},
  unknown_human_data:{title:'Limited human evidence',detail:'Insufficient human data means harms, interactions and long-term consequences may be unknown—not absent.',labs:'No validated blood-test panel can establish safety. Ask a physician for an individualized assessment.'}
};
function initRisks(data) {
  $('#compound-choices').innerHTML = data.map(c => `<label class="choice"><input type="checkbox" value="${esc(c.slug)}"><span>${esc(c.name)}<br><small class="muted">${esc(c.class)}</small></span></label>`).join('');
  function update() {
    const selected = [...$('#compound-choices').querySelectorAll(':checked')].map(i => data.find(c => c.slug === i.value));
    const tags = [...new Set(selected.flatMap(c => c.risk_tags))];
    $('#risk-summary').textContent = selected.length ? `${selected.length} selected reference${selected.length === 1 ? '' : 's'} · ${tags.length} risk categories flagged. This is not a ranking or safety score.` : 'No compounds selected.';
    $('#risk-results').innerHTML = tags.map(t => { const r = risks[t]; return `<article class="card risk-card"><h3>${esc(r.title)}</h3><p>${esc(r.detail)}</p><p><strong>Topics for your physician:</strong> ${esc(r.labs)}</p><p class="fine">Tagged references: ${esc(selected.filter(c => c.risk_tags.includes(t)).map(c => c.name).join(', '))}</p></article>`; }).join('');
  }
  $('#compound-choices').addEventListener('change',update);
  $('#clear-risk').addEventListener('click',() => { $('#compound-choices').querySelectorAll('input').forEach(i => i.checked = false); update(); });
}
for (const a of document.querySelectorAll('.placeholder')) a.addEventListener('click',e => e.preventDefault());
