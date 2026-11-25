"use strict";
const el = id => document.getElementById(id);
const esc = PlantDataView.escapeHtml;
const norm = value => String(value ?? "").trim().replace(/\s+/g," ").toLocaleLowerCase("sv");
const filters = [
  ["Light","Ljus",[["Skugga",1,3],["Halvskugga",3,5],["Sol",5,7]]],
  ["Moisture","Markfukt",[["Torr",1,3],["Frisk",3,5],["Fuktig",5,7],["Blöt",7,9],["Periodvis översvämmad",9,10],["Permanent vatten",11,12]]],
  ["Soil reaction (pH)","Markreaktion",[["Sur",1,4],["Svagt sur",4,6],["Kring neutral",6,7],["Alkalisk",8,8]]]
];
const months = "Jan Feb Mar Apr Maj Jun Jul Aug Sep Okt Nov Dec".split(" ");
const key = "vaxtval-plan-v1";
let rows=[], site={}, catalog=[], byName=new Map(), flowering=null, traits, national, eu, risks, sheets=[], matrix=[], ready=false;
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
function match(name){return byName.get(norm(name));}
function status(p){
  const issues=[],unknown=[];
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
  if(eu?.has(id)) labels.push("EU-listad");
  if(risks?.get(id)) labels.push("Riskklass "+risks.get(id));
  return labels;
}
function startPlanner(plants,n,t,e,r){
  catalog=plants;traits=n;national=t;
  eu=e ? new Set(e.map(x=>x["Dyntaxa ID"])) : null;
  risks=r ? new Map(r.map(x=>[x.TaxonId,x["Riskkategori, utfall enligt GEIAA metodik"]])) : null;
  for(const p of catalog){
    for(const name of [p["Scientific name"],PlantDataView.scientificNameKey(p["Scientific name"]),p["Svenskt namn"],t?.taxa[p["Dyntaxa ID number"]]?.swedishName]){
      if(!name)continue;const k=norm(name);
      byName.set(k,byName.has(k)&&byName.get(k)!==p?null:p);
    }
  }
  ready=true;
  el("conditions").innerHTML=filters.map(([field,label,options],i)=>'<label>'+label+'<select data-i="'+i+'"><option value="">Ej valt</option>'+options.map(([name])=>'<option '+(site[field]===name?'selected':'')+'>'+name+'</option>').join("")+'</select></label>').join("");
  note("");render();
  loadJson("data/flowering-sv.json").then(data=>{flowering=data.taxa;render();}).catch(()=>{el("calendar").textContent="Blomningsdata kunde inte laddas.";});
}
el("conditions").onchange=e=>{site[filters[e.target.dataset.i][0]]=e.target.value;save();};
el("pick").oninput=e=>{
  const q=norm(e.target.value);
  const hits=q.length>=2?catalog.filter(p=>[p["Scientific name"],p["Svenskt namn"]].some(s=>norm(s).includes(q))).slice(0,20):[];
  el("choices").innerHTML=hits.map(p=>'<option value="'+esc(p["Scientific name"])+'">'+esc(p["Svenskt namn"])+'</option>').join("");
};
el("addForm").onsubmit=e=>{e.preventDefault();if(!ready)return;const name=el("pick").value.trim();if(name){rows.push({name});el("pick").value="";save();}};
const assoc=["","<6","6–12","13–24","25–50","51–100","101–200","201–400",">400"];
function render(){
  if(!ready)return;
  const unique=new Map();
  el("entries").innerHTML=rows.map((row,i)=>{
    const p=match(row.name), id=p?.["Dyntaxa ID number"];
    if(p)unique.set(id,p);
    const cls=p?.["Biodiversity relevance"];
    const messages=p?[status(p),cls>0&&assoc[cls]?"Associerade arter i källan "+assoc[cls]:"",...flags(p)]:["Omatchat namn eller sort · artuppgifter saknas"];
    return '<div class="row"><div><strong>'+esc(p?.["Svenskt namn"]||row.name)+'</strong><small>'+[row.name,row.quantity,row.plot].filter(Boolean).map(esc).join(" · ")+'</small><small>'+messages.filter(Boolean).map(esc).join(" · ")+'</small></div><div>'+(p?'<button data-open="'+i+'">Artkort</button> ':'')+'<button data-remove="'+i+'" aria-label="Ta bort '+esc(row.name)+'">Ta bort</button></div></div>';
  }).join("")+(rows.length?'<button id="exportList">Exportera CSV</button>':'<p>Listan är tom. <button id="example">Prova en exempellista</button></p>');
  if(el("example"))el("example").onclick=()=>{rows=["sälg","prästkrage","rödklint"].map(name=>({name}));save();};
  if(el("exportList"))el("exportList").onclick=()=>{
    const csv=Papa.unparse([["Växtnamn","Mängd","Delyta"],...rows.map(r=>[r.name,r.quantity||"",r.plot||""])],{delimiter:";",escapeFormulae:true});
    const url=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="vaxtval.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  };
  const counted=[...unique].filter(([id])=>flowering?.[id]);
  el("calendar").innerHTML='<p>'+counted.length+' av '+unique.size+' matchade taxa har ett dokumenterat blomningsintervall. '+(rows.filter(r=>!match(r.name)).length)+' omatchade rader.</p><div class="months">'+months.map((m,i)=>{
    const blooming=counted.filter(([id])=>flowering[id][0]<=i+1&&flowering[id][1]>=i+1);
    return '<div class="'+(blooming.length?'bloom':'')+'" title="'+esc(blooming.map(([,p])=>p["Svenskt namn"]).join(", "))+'">'+m+'<strong>'+blooming.length+'</strong></div>';
  }).join("")+'</div><small>Antal olika taxa med belagd blomning per månad. Noll anger en lucka i underlaget för listan.</small>'+ (counted.length?'<details><summary>Visa arter och nektarklass</summary>'+counted.map(([id,p])=>{const record=PlantDataView.getSpecies(traits,id);return '<p>'+esc(p["Svenskt namn"])+' · '+months[flowering[id][0]-1]+'–'+months[flowering[id][1]-1]+' · nektarklass '+esc(record?.values.nectar_production??"saknas")+(record?.imputed.includes("nectar_production")?" (modellskattad)":"")+'</p>';}).join("")+'</details>':'');
  if(!national||!eu||!risks){el("candidates").textContent="Invasiv- eller riskunderlaget saknas.";return;}
  if(!Object.values(site).some(Boolean)){el("candidates").textContent="Välj minst ett ståndortsvillkor.";return;}
  const suitable=catalog.filter(p=>status(p)==="Matchar ståndorten"&&!unique.has(p["Dyntaxa ID number"])&&!national.taxa[p["Dyntaxa ID number"]]&&!eu.has(p["Dyntaxa ID number"])&&!["HI","SE"].includes(risks.get(p["Dyntaxa ID number"]))&&p["Time of immigration"]==="0").sort((a,b)=>a["Svenskt namn"].localeCompare(b["Svenskt namn"],"sv"));
  el("candidates").innerHTML='<p>'+suitable.length+' inhemska taxa matchar. Visar högst 30 i bokstavsordning.</p>'+suitable.slice(0,30).map(p=>'<button data-name="'+esc(p["Scientific name"])+'">'+esc(p["Svenskt namn"])+' +</button> ').join("");
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
