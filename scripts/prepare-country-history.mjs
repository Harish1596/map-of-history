import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { countryLabelCenter } from './lib/country-labels.mjs';
import { createCountryLabelList } from './lib/country-label-policy.mjs';

// Download CShapes-2.0.geojson separately. This transformation is offline.
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/prepare-country-history.mjs /path/to/CShapes-2.0.geojson');
const raw = readFileSync(input);
const source = JSON.parse(raw);
const referenceRaw = readFileSync(new URL('../public/data/world/countries.geojson', import.meta.url));
const reference = JSON.parse(referenceRaw).features;
const byName = new Map(reference.map((f) => [f.properties.name.toLowerCase(), f]));
const byId = new Map(reference.map((f) => [f.id, f]));
const aliases = {
  31:'BHS',115:'SUR',260:'DEU',325:'ITA',343:'MKD',345:'YUG',346:'BIH',360:'ROU',365:'RUS',370:'BLR',
  420:'GMB',437:'CIV',439:'BFA',484:'COG',490:'COD',510:'TZA',552:'ZWE',572:'SWZ',580:'MDG',630:'IRN',
  640:'TUR',678:'YEM',703:'KGZ',710:'CHN',731:'PRK',732:'KOR',775:'MMR',780:'LKA',811:'KHM',816:'VNM',930:'NCL',
};
const mappedId = (p) => aliases[p.gwcode] || byName.get(p.cntry_name.toLowerCase())?.id || `GW-${p.gwcode}`;
const date = (p, prefix) => `${p[`${prefix}year`]}-${String(p[`${prefix}month`]).padStart(2,'0')}-${String(p[`${prefix}day`]).padStart(2,'0')}`;
const output = new URL('../public/data/world/history/', import.meta.url);
mkdirSync(output, { recursive:true });
const collection = (features) => ({ type:'FeatureCollection', features });
const countries = new Map();
const snapshots = {};
const matched = new Set(source.features.filter((f) => f.properties.gwsyear <= 2006 && f.properties.gweyear >= 2000).map((f) => mappedId(f.properties)));
// These are later state splits or territories already covered by source polygons.
const excludedReference = new Set(['SDS','KOS','MNE','SRB','TLS','SOL','CYN','SAH','CUW','SXM']);
const timor = source.features.find((f) => f.properties.gwcode === 860 && f.properties.gwsyear === 2002);
const indonesia = source.features.find((f) => f.properties.gwcode === 850 && f.properties.gwsyear === 2002);
if (!timor || !indonesia) throw new Error('Missing source records for East Timor correction');
function add(feature, year, keySuffix = '', overrides = {}) {
  const p=feature.properties;
  const countryId = mappedId(p);
  const ref = byId.get(countryId);
  const id = `gw-${p.gwcode}-${date(p,'gws')}${keySuffix}`;
  const name = countryId === 'YUG' ? (year <= 2002 ? 'Federal Republic of Yugoslavia' : 'Serbia and Montenegro') : countryId === 'SWZ' ? 'Swaziland' : countryId === 'MKD' ? 'Macedonia' : ref?.properties.name || p.cntry_name;
  if (!countries.has(id)) countries.set(id, {
    type:'Feature', id,
    properties:{ id, countryId, name, label:name, rank:countryId === 'YUG' ? 4 : ref?.properties.rank || 5,
      source:'CShapes 2.0', sourceCode:p.gwcode, sourceFrom:date(p,'gws'), sourceTo:date(p,'gwe'), status:'Historical source unit', ...overrides },
    geometry:feature.geometry,
  });
  return id;
}
for (let year=2000;year<=2006;year++) {
  const target=`${year}-12-31`;
  const active=source.features.filter((f) => date(f.properties,'gws') <= target && date(f.properties,'gwe') >= target);
  const ids=[];
  for (const f of active) {
    const p=f.properties;
    if (p.gwcode === 850 && year < 2002) ids.push(add(indonesia,year,'-un-period',{ status:'Historical source unit', correction:'Post-2002 outline excludes UN-administered East Timor.' }));
    else ids.push(add(f,year,p.gwcode === 345 && year >= 2003 ? '-renamed' : '', p.gwcode === 860 ? { name:'Timor-Leste', label:'Timor-Leste', status:'Independent state' } : {}));
  }
  if (year < 2002) ids.push(add(timor,year,'-un',{ name:'East Timor', label:'East Timor (UN)', status:'UN administration', correction:'UN administration in 2000–2001; outline from independent Timor-Leste source record.' }));
  for (const ref of reference) {
    if (matched.has(ref.id) || excludedReference.has(ref.id)) continue;
    const id=`reference-${ref.id}`;
    if (!countries.has(id)) countries.set(id,{...ref,id,properties:{...ref.properties,id,countryId:ref.id,source:'Natural Earth reference',status:'Supplementary reference geometry; historical status not independently reconstructed'}});
    ids.push(id);
  }
  // The Netherlands Antilles existed through this interval. Only the two
  // separately mapped present-day components have local reference polygons.
  const id='reference-ANT';
  if (!countries.has(id)) countries.set(id,{type:'Feature',id,properties:{id,countryId:'ANT',name:'Netherlands Antilles',label:'Netherlands Antilles',rank:6,source:'Natural Earth reference',status:'Selected island outlines; not complete historical territory'},geometry:{type:'MultiPolygon',coordinates:['CUW','SXM'].flatMap((id)=>{const g=byId.get(id).geometry;return g.type==='Polygon'?[g.coordinates]:g.coordinates;})}});
  ids.push(id);
  snapshots[year]=ids.sort();
}
const countryFeatures=[...countries.values()].sort((a,b)=>a.id.localeCompare(b.id));
// Fixed collision order across versions: source rank, area, identifier.
// Inactive versions do not render; relative priority never depends on navigation.
const labels=[];
for (const feature of countryFeatures) labels.push({type:'Feature',id:feature.id,properties:{...feature.properties},geometry:{type:'Point',coordinates:countryLabelCenter(feature.geometry)}});
const policies=createCountryLabelList(countryFeatures);
const policyMap=new Map(policies.map((p)=>[p.id,p]));
for (const label of labels) label.properties={...label.properties,...policyMap.get(label.id)};
const data={version:1,snapshots,countries:collection(countryFeatures),labels:collection(labels)};
const serialized=JSON.stringify(data)+'\n';
writeFileSync(new URL('countries.json',output),serialized);
const sha=(value)=>createHash('sha256').update(value).digest('hex');
writeFileSync(new URL('metadata.json',output),JSON.stringify({
  title:'Selected year-end country snapshots, 2000–2006',version:1,snapshotDate:'31 December',years:[2000,2001,2002,2003,2004,2005,2006],
  source:'https://icr.ethz.ch/data/cshapes/',download:'https://icr.ethz.ch/data/cshapes/CShapes-2.0.geojson',sourceSha256:sha(raw),outputSha256:sha(serialized),referenceSha256:sha(referenceRaw),
  license:'CC BY-NC-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  attribution:'CShapes 2.0: Guy Schvitz, Seraina Rüegger, Luc Girardin, Lars-Erik Cederman, Nils Weidmann and Kristian Skrede Gleditsch (2022). Mapping the International System, 1886–2017. Journal of Conflict Resolution 66(1):144–161.',
  referenceSource:'https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/',referenceLicense:'Natural Earth reference geometries are public domain. Historical derivatives are distributed under CC BY-NC-SA 4.0.',
  boundaryConvention:'CShapes 2.0 Gleditsch–Ward source units, supplemented by Natural Earth small-country and territory reference outlines. Source conventions differ from the present-day Natural Earth de facto map; no universal recognition claim.',
  transformations:'Select records using integer date fields at 31 December (ignore timezone-shifted date strings). Retain source geometry without simplification. Generate Mercator main-landmass centroids with interior fallback. Reuse Natural Earth label ranks where matched, assign rank 4 to Yugoslavia and rank 5 to unmatched source units; compute area/font tiers and fixed collision order. Correct Yugoslavia name from 2003. Separate UN-administered East Timor in 2000–2001 using 2002 source outlines. Group mapped Curaçao and Sint Maarten outlines as selected Netherlands Antilles islands. No minor boundary geometry is invented.',
  limitations:'Selected historical reconstruction, not an exhaustive annual border atlas. CShapes omits several minor territorial changes and some small states/dependencies. Supplementary Natural Earth geometry is a modern reference, not independently date-verified. The Netherlands Antilles representation omits islands not separately available in the bundled reference. Coastlines and territorial conventions differ from Natural Earth. Source coding dates for Serbia/Montenegro differ within June 2006 from official declarations; year-end membership is unaffected. Small border settlements in changes.json marked not-encoded are chronology only. Modern physical layers, coastline fill and marine/island labels do not become historical observations.',
  corrections:[{subject:'East Timor 2000–2001',source:'https://peacekeeping.un.org/sites/default/files/past/etimor/Untaetchrono.html'},{subject:'Serbia and Montenegro name and succession',source:'https://www.un.org/en/about-us/member-states/yugoslavia'}],
},null,2)+'\n');
console.log(`Prepared ${countryFeatures.length} shared historical/reference records for seven snapshots.`);
