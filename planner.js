"use strict";
const el = id => document.getElementById(id);
const esc = PlantDataView.escapeHtml;
const norm = value => String(value ?? "").trim().replace(/\s+/g," ").toLocaleLowerCase("sv");
const filters = [
  ["Light","Ljus",[["Skugga",1,3],["Halvskugga",3,5],["Sol",5,7]]],
  ["Moisture","Markfukt",[["Torr",1,3],["Frisk",3,5],["Fuktig",5,7],["Blöt",7,9],["Periodvis översvämmad",9,10],["Permanent vatten",11,12]]],
  ["Soil reaction (pH)","Markreaktion",[["Sur",1,4],["Svagt sur",4,6],["Kring neutral",6,7],["Alkalisk",8,8]]],
  ["Salinity","Salttolerans",[["Inte salttålig",1,1],["Måttligt salttålig",2,2],["Gynnas av måttlig salthalt",3,3],["Främst måttlig–hög salthalt",4,4],["Endast hög salthalt",5,5]]]
];
const months = "Jan Feb Mar Apr Maj Jun Jul Aug Sep Okt Nov Dec".split(" ");
const key = "vaxtval-plan-v1";
let euNames = new Map();
let rows=[], site={}, catalog=[], byName=new Map(), flowering=null, floweringSources={}, traits, national, eu, risks, sheets=[], matrix=[], ready=false;
try {
  const saved=JSON.parse(localStorage.getItem(key));
  if(Array.isArray(saved?.rows)) rows=saved.rows.filter(r=>typeof r?.name==="string");
  site=saved?.site || {};
} catch {}
function note(message){el("feedback").textContent=message;}
function save(){try{localStorage.setItem(key,JSON.stringify({rows,site}));note("Sparat i den här webbläsaren.");}catch{note("Kunde inte spara lokalt. Exportera din lista.");} render();}
function route(){
  const planning=location.hash==="#vaxtval";
  el("planner").hidden=!planning; el("searchPage").hidden=planning;
  for(const [id,active] of [["plink",planning],["slink",!planning]]) {
    if(active) el(id).setAttribute("aria-current","page"); else el(id).removeAttribute("aria-current");
  }
  if(!planning && typeof map!=="undefined" && map) requestAnimationFrame(()=>map.invalidateSize());
}
window.addEventListener("hashchange",route);
window.addEventListener("DOMContentLoaded",route);
function addSearchSelection(){const p=currentSelectedPlant;if(!p)return;rows.push({name:p["Scientific name"]});save();location.hash="vaxtval";}
function match(name){return byName.get(norm(name)) || globalThis.NurseryPlants?.find(catalog,name);}
function status(p){
  if(p.nursery)return "Sortpost · se plantskolans ståndortsbeskrivning"+(site.zone?" · odlingszon saknar underlag":"");
  const issues=[],unknown=[];
  if(site.zone){
    const zone=['I','II','III','IV','V','VI','VII','VIII','IX'].indexOf(site.zone)+1;
    const heat=Number(p['Heat requirement']);
    if(!zone || !Number.isInteger(heat) || heat<1 || heat>14) unknown.push('odlingszon (värmekrav)');
    else if(heat>14-zone) issues.push('odlingszon '+site.zone+' (värmekrav)');
  }
  for(const [field,label,options] of filters){
    const range=options.find(o=>o[0]===site[field]); if(!range)continue;
    const value=Number(p[field]);
    if(!Number.isInteger(value)||value<1||value>options.at(-1)[2])unknown.push(label);
    else if(value<range[1]||value>range[2])issues.push(label);
  }
  return issues.length?"Avviker för "+issues.join(", "):unknown.length?"Uppgift saknas för "+unknown.join(", "):Object.values(site).some(Boolean)?"Matchar ståndorten":"";
}
function flags(p){
  const id=p["Dyntaxa ID number"], labels=[];
  if(national?.taxa[id]) labels.push("Nationellt listad · se artkortets undantag");

  if(risks?.get(id)) labels.push("Riskklass "+risks.get(id));
  return labels;
}
const posterForms = new Map([
  ["träd", ["trad", "Träd"]], ["buske", ["buske", "Buske"]],
  ["buske/träd", ["busktrad", "Buske/träd"]], ["ört", ["ort", "Ört"]],
  ["gräs", ["gras", "Gräs"]], ["gräs/halvgräs", ["halvgras", "Gräs/halvgräs"]],
  ["vattenväxt", ["vatten", "Vattenväxt"]], ["ormbunke", ["ormbunke", "Ormbunke"]],
  ["klättrande växt", ["klatter", "Klättrande växt"]],
  ["parasitiskt växt", ["parasit", "Parasitisk växt"]]
]);
let growthById = new Map(), growthInfoById = new Map(), growthInfoByParent = new Map(), plannerRedlist = null;

function formImage(plant) {
  const portrait = globalThis.SpeciesArt?.render(plant);
  if (portrait) return portrait;
  const direct = growthById.get(plant?.["Dyntaxa ID number"]);
  const parent = growthById.get(plant?.nursery?.parentId);
  const file = (direct || parent)?.[0] || "okand";
  return `<figure class="form-print"><img loading="lazy" decoding="async" src="assets/vaxtformer/${file}.webp" alt=""></figure>`;
}

function startPlanner(plants,n,t,e,r,redlist=null,habits=[]){
  plannerRedlist = redlist;
  growthById = new Map();
  growthInfoById = new Map();
  growthInfoByParent = new Map();
  for (const row of habits || []) {
    const id = row["Dyntaxa ID number"]?.trim();
    const form = posterForms.get(norm(row["Växtsätt"]));
    if (id && form) growthById.set(id, form);
    if (id) growthInfoById.set(id, {growth: row["Växtsätt"], height: row["Medelhöjd (cm)"]});
    const parentKey = PlantDataView.parentSpeciesKey(row["Växtnamn"]);
    if (parentKey && !/\b(ssp|subsp|var)\./i.test(String(row["Växtnamn"] || ""))) growthInfoByParent.set(parentKey, {growth: row["Växtsätt"], height: row["Medelhöjd (cm)"]});
  }
  catalog=plants;traits=n;national=t;
  eu=e ? new Map(e.filter(row=>row["Dyntaxa ID"]).map(row=>[row["Dyntaxa ID"],row])) : null;
  euNames.clear();
  for(const entry of e || []){
    const scientific=entry["Vetenskapligt namn"] || "";
    const alternativeNames = {
      "Syrenslide":["Koenigia polystachya","Rubrivena polystachya"],
      "Japansk humle":["Humulus scandens"],
      "Fjäderborstgräs":["Pennisetum setaceum"],
      "Kudzuböna, japansk arrowrot":["Pueraria lobata"],
      "Gisselpilört":["Polygonum perfoliatum"],
      "Hybridslide":["Reynoutria × bohemica"]
    };
    const aliases=[...(alternativeNames[entry["Svenskt namn"]] || []),scientific,...(scientific.endsWith(")")?[scientific.split(" (")[0]]:[]),...scientific.split("/"),...(entry["Svenskt namn"] || "").split(",")];
    for(const alias of aliases.filter(Boolean))euNames.set(norm(alias),entry);
  }
  risks=r ? new Map(r.map(x=>[x.TaxonId,x["Riskkategori, utfall enligt GEIAA metodik"]])) : null;
  for(const p of catalog){
    for(const name of [p["Scientific name"],PlantDataView.scientificNameKey(p["Scientific name"]),p["Svenskt namn"],t?.taxa[p["Dyntaxa ID number"]]?.swedishName]){
      if(!name)continue;const k=norm(name);
      byName.set(k,byName.has(k)&&byName.get(k)!==p?null:p);
    }
  }
  ready=true;
  el("conditions").innerHTML=filters.map(([field,label,options],i)=>'<label>'+label+'<select data-i="'+i+'"><option value="">Ej valt</option>'+options.map(([name])=>'<option '+(site[field]===name?'selected':'')+'>'+name+'</option>').join("")+'</select></label>').join("");
  el("conditions").innerHTML+='<label>Odlingszon · värmekrav<select data-field="zone"><option value="">Ej valt</option>'+['I','II','III','IV','V','VI','VII','VIII','IX'].map((zone,i)=>'<option value="'+zone+'" '+(site.zone===zone?'selected':'')+'>'+zone+' ('+(i+1)+')'+(i===8?' · subalpint':'')+'</option>').join('')+'</select></label><p class="zone-note">Matchningen bygger på värmekrav enligt Tyler et al., samma indelning som i Växtsök. IX (9) avser den subalpina zonen; klass 5 kräver gynnsamt mikroklimat där. Värmekrav är vägledning, ingen garanti för övervintring.</p>';
  note("");render();
  loadJson("data/flowering-sv.json").then(data=>{flowering={...data.taxa};floweringSources=data.taxonSources || {};for(const p of catalog){if(p.nursery?.flowering)flowering[p["Dyntaxa ID number"]]=p.nursery.flowering;}render();}).catch(()=>{el("calendar").textContent="Blomningsdata kunde inte laddas.";});
}

function renderSelectionFacts(plant, id) {
  const info = growthInfoById.get(String(id || "").trim()) || growthInfoByParent.get(PlantDataView.parentSpeciesKey(plant?.["Scientific name"])) || {};
  const record = PlantDataView.getSpecies(traits, id, plant?.["Scientific name"]);
  const rawHeight = info.height || record?.values.height;
  const number = Number(String(rawHeight ?? "").replace(",", "."));
  const height = Number.isFinite(number) && number > 0 ? `${number.toLocaleString("sv-SE", {maximumFractionDigits: 0})} cm` : "Uppgift saknas";
  return `<div class="selection-facts" aria-label="Växtsätt och medelhöjd"><div><span>Växtsätt</span><strong>${esc(info.growth || "Uppgift saknas")}</strong></div><div><span>Medelhöjd</span><strong>${esc(height)}</strong></div></div>`;
}
el("conditions").onchange=e=>{const field=e.target.dataset.field || filters[e.target.dataset.i]?.[0];if(field){site[field]=e.target.value;save();}};
el("pick").oninput=e=>{
  const q=norm(e.target.value);
  const hits=q.length>=2?catalog.filter(p=>[p["Scientific name"],p["Svenskt namn"]].some(s=>norm(s).includes(q))).slice(0,20):[];
  el("choices").innerHTML=hits.map(p=>'<option value="'+esc(p["Scientific name"])+'">'+esc(p["Svenskt namn"])+'</option>').join("");
};
el("addForm").onsubmit=e=>{e.preventDefault();if(!ready)return;const name=el("pick").value.trim();if(name){rows.push({name});el("pick").value="";save();}};
let clearedRows = null;
const clearListButton = el("clearList");
clearListButton.onclick = () => {
  if (rows.length) {
    clearedRows = rows;
    rows = [];
  } else if (clearedRows) {
    rows = clearedRows;
    clearedRows = null;
  }
  save();
};
const assoc=["","<6","6–12","13–24","25–50","51–100","101–200","201–400",">400"];
function floweringSourceHtml(id) {
  const source = floweringSources[id];
  return source ? '<small class="flowering-source">Blomning: <a href="'+esc(source.url)+'" target="_blank" rel="noopener">'+esc(source.label)+'</a></small>' : '';
}
function scoreEntry(row) {
  const today = new Date().toLocaleDateString("sv-SE", {timeZone:"Europe/Stockholm"});
    const plant = match(row.name);
    const id = plant?.["Dyntaxa ID number"];
    const record = PlantDataView.getSpecies(traits, id, plant?.["Scientific name"]);
    const euRecord = eu?.get(id) || euNames.get(norm(row.name));
    const nationalRecord = national?.taxa[id];
    return {
      key:id || (euRecord ? "eu:" + euRecord["Vetenskapligt namn"] : "name:" + norm(row.name)),
      name:plant?.["Svenskt namn"] || row.name,
      associated:plant?.["Biodiversity relevance"],
      nectar:record?.values.nectar_production ?? plant?.["Nectar production"],
      imputed:record?.imputed.includes("nectar_production"),
      risk:risks?.get(id),
      national:Boolean(nationalRecord),
      eu:Boolean(euRecord && (!euRecord["Gäller från"] || euRecord["Gäller från"] <= today)),
      futureEU:Boolean(euRecord?.["Gäller från"] > today),
      exception:Boolean(nationalRecord?.exception && nationalRecord.exception !== "none")
    };
}
function renderListSummary() {
  const container = el("listSummary");
  if (!rows.length) { container.innerHTML = ""; return; }
  const entries = rows.map(scoreEntry);
  const score = PlantListScore.calculate(entries);
  const sourcesMissing = !national || !eu || !risks;
  const number = value => value.toLocaleString("sv-SE", {maximumFractionDigits:2});
  const signed = value => value === 0 ? "0" : value > 0 ? "+" + number(value) : number(value);
  const visual = PlantListScore.appearance(score.total);
  container.innerHTML = '<section class="list-summary" aria-labelledby="score-title"><div class="score-kicker"><span>Sammanställning</span></div><h2 id="score-title">Listans<br>poäng</h2><div class="score-heading"><strong class="score-total score-'+visual.state+'" style="--score-digits:'+signed(score.total).length+';--score-border:'+visual.border+';--score-background:'+visual.background+';--score-color:'+visual.color+'">'+signed(score.total)+'<span>poäng'+(score.missing || sourcesMissing ? ' · delunderlag' : '')+'</span></strong><div class="score-caption"><p><b>'+score.items.length+(score.items.length === 1 ? ' växtart' : ' växtarter')+'</b></p></div></div>'+
    '<div class="score-analysis"><h3>Poängfördelning</h3><div class="score-components"><div><span class="info-tooltip" tabindex="0"
      data-tooltip="Poängen baseras på hur många andra arter som är associerade med de valda växterna. Växter med många associerade arter viktas högre.">
  Biodiversitetsrelevans
</span><strong>+'+number(score.associated)+'</strong></div><div><span class="info-tooltip" tabindex="0"
      data-tooltip="Poängen baseras på växternas nektarproduktion. Växter med hög nektarproduktion viktas högre eftersom de bidrar med föda till pollinerande insekter.">
  Nektarproduktion
</span><strong>+'+number(score.nectar)+'</strong></div><div><span class="info-tooltip" tabindex="0"
      data-tooltip="Växter med invasiv riskklassning ger poängavdrag. Avdragets storlek beror på riskklassning och eventuell upptagning på Sveriges eller EU:s förteckning över invasiva arter.">
  Invasivitetsavdrag
</span><strong>'+signed(-score.penalty)+'</strong></div></div></div>'+
    (score.listed ? '<p class="selection-warning"><strong>'+score.listed+' växtval är invasivlistade.</strong> Kontrollera regler och undantag i respektive kort även när summan är positiv.</p>' : '')+
    (sourcesMissing ? '<p class="selection-warning">Risk- eller invasivunderlag kunde inte laddas. Avdragen är ofullständiga.</p>' : '')+
    '<details><summary>Så räknas poängen</summary><p class="score-coverage">'+score.excluded+' växtval ger inga pluspoäng på grund av invasivrisk eller listning. '+score.missing+' övriga växtval saknar minst en plusuppgift. '+score.imputed+' nektarvärden är modellskattade.</p>'+
    '<p>Växtvals egen jämförelsemodell, version 2. Vikterna är valda för planering och har inte validerats som ett mått på faktisk biologisk mångfald. Summan påverkas av listans längd och datatäckning.</p>'+
    '<p>Associerade arter ger 0–7 poäng för källans klass 1–8. Nektar ger 0–6 poäng för klass 1–7. Poängen viktas exponentiellt: (maxklass − 1) × (2^(klass − 1) − 1) / (2^(maxklass − 1) − 1). Maxpoängen är oförändrade. Klasserna är ordinala. Saknade värden bidrar inte till summan och redovisas som saknade.</p>'+
    '<p>Avdrag per växt är NK 0, LO −2, PH −5, HI −10 och SE −15. Nationell listning ger −20 och gällande EU-listning −30. Endast det största avdraget används per växt. Listningsavdraget gäller även arter med villkorade undantag, vilka måste granskas i artkortet. Framtida EU-förbud visas i artkortet och börjar ge listningsavdrag från ikraftträdandet.</p>'+
    '<p>Riskklass LO–SE, svensk listning och EU-listning (även kommande) utesluter alla pluspoäng. NK utesluter inte pluspoäng. Uteslutna värden räknas inte som saknade eller modellskattade. Beräkningen använder full precision; visningen avrundas till två decimaler.</p><p>Utebliven riskklass ger inget riskklassavdrag. Sorter ärver inga pluspoäng från arten. Antal plantor och upprepad import av samma växt ökar inte poängen. Associerade organismer kan vara gemensamma för flera arter.</p>'+
    '<div class="score-table-wrap"><table><thead><tr><th>Växt</th><th>Associerade</th><th>Nektar</th><th>Avdrag</th><th>Summa</th></tr></thead><tbody>'+
    score.items.map(item => '<tr><th scope="row">'+esc(item.name)+(item.futureEU?' · kommande EU-förbud':'')+'</th><td>'+(item.excluded ? 'Räknas inte' : item.associated === null ? 'Saknas' : '+'+number(item.associated))+'</td><td>'+(item.excluded ? 'Räknas inte' : item.nectar === null ? 'Saknas' : '+'+number(item.nectar)+(item.imputed?'*':''))+'</td><td>−'+item.penalty+'</td><td>'+signed(item.total)+'</td></tr>').join("")+
    '</tbody></table></div><p>* Modellskattat nektarvärde.</p></details></section>';
}
function renderCardScore(row) {
  if(!globalThis.PlantListScore)return '';
  const score=PlantListScore.calculate([scoreEntry(row)]), item=score.items[0];
  const value=score.total.toLocaleString('sv-SE',{maximumFractionDigits:2});
  const partial=score.missing || !national || !eu || !risks;
  return '<div class="card-score '+(score.total<0?'negative':'positive')+'"><span>Poäng</span><strong>'+(score.total>0?'+':'')+value+'</strong></div>';
}
function render(){
  if(!ready)return;
  if (rows.length) clearedRows = null;
  clearListButton.hidden = !rows.length && !clearedRows;
  clearListButton.textContent = rows.length ? "Töm växtlistan" : "Ångra tömning";
  if (globalThis.PlantListScore) renderListSummary();
  const unique=new Map();
  el("entries").innerHTML=rows.map((row,i)=>{
    const p=match(row.name), id=p?.["Dyntaxa ID number"];
    if(p)unique.set(id,p);
    const euRecord = eu?.get(id) || euNames.get(norm(row.name));
    const euInfo = euRecord ? InvasivePlantView.renderEUStatus(euRecord) : "";
    const siteStatus=p?status(p):"Namn behöver granskas";
    const attention=!p || siteStatus.startsWith("Avviker");
    const nectar=PlantDataView.getSpecies(traits,id,p?.["Scientific name"]);
    const nectarClass=Number(nectar?.values.nectar_production ?? p?.["Nectar production"]);
    const nectarKnown=Number.isInteger(nectarClass)&&nectarClass>=1&&nectarClass<=7;
    const biodiversity=Number(p?.["Biodiversity relevance"]);
    const biodiversityKnown=Number.isInteger(biodiversity)&&biodiversity>=1&&biodiversity<=8;
    const interval=flowering?.[id];
    const riskCode = risks?.get(id);
    const native = Boolean(p && !p.nursery && String(p["Time of immigration"] ?? "").trim() === "0");
    const riskNotice = !native && riskCode ? InvasivePlantView.renderRiskStatus(riskCode) : "";
    const legalNotice = euInfo + (national?.taxa[id] ? InvasivePlantView.renderNationalStatus(national,id) : "");
    const warningClass = legalNotice || (!native && ["SE","HI"].includes(riskCode)) ? " selection-card-warning" : "";

    const segments=(value,max)=>'<span class="selection-scale" aria-hidden="true">'+Array.from({length:max},(_,n)=>'<i class="'+(n<value?'filled':'')+'">'+(n+1)+'</i>').join("")+'</span>';
    return '<article class="selection-card'+warningClass+'">'+formImage(p)+'<div class="poster-body"><header><div><h3>'+esc(p?.["Svenskt namn"]||row.name)+'</h3><small>'+esc(p?.["Scientific name"]||"Omatchad växt")+'</small></div><button data-remove="'+i+'" aria-label="Ta bort '+esc(row.name)+'">Ta bort</button></header>'+
      (p ? renderSelectionFacts(p,id) : "")+
      renderCardScore(row)+
      ((row.quantity||row.plot)?'<p class="selection-meta">'+[row.quantity?'Mängd '+esc(row.quantity):"",row.plot?'Yta '+esc(row.plot):""].filter(Boolean).join(" · ")+'</p>':"")+
      (siteStatus?'<p class="selection-status '+(attention?'needs-review':'')+'">'+esc(siteStatus)+'</p>':"")+
      '<div class="redlist-print">'+PlantDataView.renderRedlist(plannerRedlist,id)+(native ? '<span class="native-status">Inhemsk art</span>' : '')+'</div>' +
      (native ? legalNotice :
        '<div class="invasion"><strong class="classification-heading">Invasivklassning</strong>' + legalNotice + riskNotice +
        (!national || !eu || !risks ? '<p>Risk- eller listningsunderlag saknas.</p>' : '') +
        (!legalNotice && !riskNotice && national && eu && risks ? '<p>'+(!p || p.nursery ? 'Status saknas för detta växtval.' : 'Ingen träff i riskklassningen eller invasivlistorna.')+'</p>' : '') +
        '</div>') +
      '<div class="selection-metrics"><div><span>Nektarproduktion</span><strong>'+esc(nectarKnown?["","Ingen","Obetydlig","Liten","Måttlig","Ganska stor","Stor","Mycket stor"][nectarClass]:"Uppgift saknas")+'</strong>'+segments(nectarKnown?nectarClass:0,7)+'</div>'+ 
      '<div><span>Biodiversitetsrelevans</span><strong>'+esc(biodiversityKnown?assoc[biodiversity]:"Uppgift saknas")+'</strong>'+segments(biodiversityKnown?biodiversity:0,8)+'</div></div>'+
      '<div class="selection-flowering"><span>Blomning'+(interval?'':' · uppgift saknas')+'</span><div class="selection-months" role="img" aria-label="'+esc(interval?'Blomning '+months[interval[0]-1]+' till '+months[interval[1]-1]:'Blomningsuppgift saknas')+'">'+months.map((m,n)=>'<span class="'+(interval&&n+1>=interval[0]&&n+1<=interval[1]?'active':'')+'">'+m+'</span>').join("")+'</div>'+floweringSourceHtml(id)+'</div>'+
      (p?'<button class="selection-open" data-open="'+i+'">Öppna artkort</button>':"")+'</div></article>';

  }).join("")+(rows.length?'<button id="exportList">Exportera CSV</button>':'<div class="empty-list"><div class="print-triptych" aria-hidden="true"><img src="assets/arter/salg.webp" alt="Sälg"><img src="assets/arter/prastkrage.webp" alt="Prästkrage"><img src="assets/arter/rodklint.webp" alt="Rödklint"></div><h2>Din planteringslista är tom</h2><p>Lägg till en växt, importera din lista eller börja med sälg, prästkrage och rödklint.</p><button id="example">Prova en exempellista →</button></div>');
  if(el("example"))el("example").onclick=()=>{rows=["sälg","prästkrage","rödklint"].map(name=>({name}));save();};
  globalThis.PlannerCards?.refresh();
  if(el("exportList"))el("exportList").onclick=()=>{
    const csv=Papa.unparse([["Växtnamn","Mängd","Delyta"],...rows.map(r=>[r.name,r.quantity||"",r.plot||""])],{delimiter:";",escapeFormulae:true});
    const url=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="vaxtval.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  };
  const counted=[...unique].filter(([id])=>flowering?.[id]);
  el("calendar").innerHTML='<p>'+counted.length+' av '+unique.size+' matchade taxa har ett dokumenterat blomningsintervall. '+(rows.filter(r=>!match(r.name)).length)+' omatchade rader.</p><div class="months">'+months.map((m,i)=>{
    const blooming=counted.filter(([id])=>flowering[id][0]<=i+1&&flowering[id][1]>=i+1);
    return '<div class="'+(blooming.length?'bloom':'')+'" title="'+esc(blooming.map(([,p])=>p["Svenskt namn"]).join(", "))+'">'+m+'<strong>'+blooming.length+'</strong></div>';
  }).join("")+'</div><small>Antal olika taxa med belagd blomning per månad. Noll anger en lucka i underlaget för listan.</small>'+ (counted.length?'<details><summary>Visa arter och nektarklass</summary>'+counted.map(([id,p])=>{const record=PlantDataView.getSpecies(traits,id,p["Scientific name"]);return '<p>'+esc(p["Svenskt namn"])+' · '+months[flowering[id][0]-1]+'–'+months[flowering[id][1]-1]+' · '+(p.nursery?'Plantskolans sortuppgift':floweringSources[id] ? esc(floweringSources[id].label) : 'Artuppgift')+' · nektarklass '+esc(record?.values.nectar_production??p["Nectar production"]??"saknas")+(record?.imputed?.includes("nectar_production")?" (modellskattad)":"")+'</p>';}).join("")+'</details>':'');
  if(!national||!eu||!risks){el("candidates").textContent="Invasiv- eller riskunderlaget saknas.";return;}
  if(!Object.values(site).some(Boolean)){el("candidates").textContent="Välj minst ett ståndortsvillkor.";return;}
  const suitable=catalog.filter(p=>status(p)==="Matchar ståndorten"&&!unique.has(p["Dyntaxa ID number"])&&!national.taxa[p["Dyntaxa ID number"]]&&!eu.has(p["Dyntaxa ID number"])&&!["HI","SE"].includes(risks.get(p["Dyntaxa ID number"]))&&p["Time of immigration"]==="0").sort((a,b)=>a["Svenskt namn"].localeCompare(b["Svenskt namn"],"sv"));
  el("candidates").innerHTML='<p>'+suitable.length+' inhemska taxa matchar. Alla träffar visas i bokstavsordning.</p><div class="candidate-list">'+suitable.map(p=>'<button data-name="'+esc(p["Scientific name"])+'">'+esc(p["Svenskt namn"])+' +</button>').join("")+'</div>';
}
el("candidates").onclick=e=>{if(e.target.dataset.name){rows.push({name:e.target.dataset.name});save();}};
el("entries").onclick=e=>{
  const {remove,open}=e.target.dataset;
  if(remove!==undefined){rows.splice(Number(remove),1);save();}
  if(open!==undefined){location.hash="vaxtsok";searchPlantByScientific(match(rows[open].name)["Scientific name"]);}
};
function parseText(text){
  const parsed=Papa.parse(text.replace(/^\uFEFF/,""),{skipEmptyLines:"greedy",delimitersToGuess:["\t",";",","]});
  if(parsed.errors.some(e=>e.code!=="UndetectableDelimiter"))throw Error("Kontrollera citattecken och avgränsare i tabellen.");
  return parsed.data;
}
function prepare(data){
  matrix=data.filter(row=>row.some(v=>String(v??"").trim()));
  if(!matrix.length)throw Error("Tabellen är tom.");
  const width=Math.max(...matrix.slice(0,200).map(r=>r.length));
  const names=/^(växtnamn|växtslag|art|namn|artnamn|vetenskapligt namn|botaniskt namn|latinskt namn|latin name|botanical name|scientific name|svenskt namn|common name)$/;
  const head=matrix.findIndex(r=>r.some(v=>names.test(norm(v))));
  const header=head<0?matrix[0]:matrix[head];
  const cols=Array.from({length:width},(_,i)=>'Kolumn '+(i+1)+' · '+String(header[i]??"").slice(0,45));
  function select(id,title,index,optional){return '<label>'+title+'<select id="'+id+'">'+(optional?'<option value="-1">Ingen</option>':'')+cols.map((v,i)=>'<option value="'+i+'" '+(index===i?'selected':'')+'>'+esc(v)+'</option>').join("")+'</select></label>';}
  const scientific=header.findIndex(v=>/latin|vetenskapligt|botani|scientific/i.test(String(v)));
  el("mapping").innerHTML=(sheets.length>1?'<label>Arbetsblad<select id="sheet">'+sheets.map((s,i)=>'<option value="'+i+'" '+(data===s.data?'selected':'')+'>'+esc(s.sheet)+'</option>').join("")+'</select></label>':'')+select("nameCol","Växtnamn",scientific>=0?scientific:Math.max(0,header.findIndex(v=>names.test(norm(v)))),false)+select("cultivarCol","Sortnamn",header.findIndex(v=>/^(sort|sortnamn|cultivar)$/.test(norm(v))),true)+select("qtyCol","Mängd",header.findIndex(v=>/^(antal|mängd|qty|quantity)$/.test(norm(v))),true)+select("plotCol","Planteringsyta",header.findIndex(v=>/^(delyta|rabatt|yta|planteringsyta)$/.test(norm(v))),true)+'<label>Första datarad<input id="firstRow" type="number" min="1" max="'+matrix.length+'" value="'+(head<0?1:head+2)+'"></label><p id="sample"></p><button id="importRows">Lägg till rader</button>';
  if(el("sheet"))el("sheet").onchange=e=>prepare(sheets[e.target.value].data);
  function pending(){return matrix.slice(Number(el("firstRow").value)-1).map(r=>({name:[r[el("nameCol").value],r[el("cultivarCol").value]].filter(v=>v!=null&&String(v).trim()).join(" ").trim(),quantity:String(r[el("qtyCol").value]??""),plot:String(r[el("plotCol").value]??"")})).filter(r=>r.name);}
  function preview(){const list=pending();el("sample").textContent=list.length+' rader, '+list.filter(r=>match(r.name)).length+' matchade. '+list.slice(0,3).map(r=>r.name).join(' · ');}
  for(const id of ["nameCol","cultivarCol","qtyCol","plotCol","firstRow"])el(id).oninput=preview;
  preview();el("importRows").onclick=()=>{if(!ready||!el("firstRow").reportValidity())return;rows=rows.concat(pending());el("mapping").innerHTML="";el("file").value="";el("paste").value="";save();el("importBox").open=false;};
}
function importError(e){el("mapping").textContent=e.message||"Filen kunde inte läsas.";}
el("preview").onclick=()=>{try{sheets=[];prepare(parseText(el("paste").value));}catch(e){importError(e);}};
el("file").onchange=async e=>{try{
  const file=e.target.files[0];if(!file)return;sheets=[];
  if(/\.xlsx$/i.test(file.name)){sheets=(await readXlsxFile(file)).filter(s=>s.data.some(row=>row.some(v=>String(v??"").trim())));prepare(sheets.find(s=>s.data.length)?.data||[]);}
  else prepare(parseText(await file.text()));
}catch(e){importError(e);}};
