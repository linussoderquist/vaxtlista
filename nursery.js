/* Reviewed nursery names. Source facts stay attached to the individual selection. */
(function(root){
  const escape = PlantDataView.escapeHtml;
  const normalize = name => String(name || "").normalize("NFC").replace(/[’‘'’®™]/g,"").replace(/\s+[x×]\s+/g," × ").replace(/\s+/g," ").trim().toLocaleLowerCase("sv");
  const cramers="https://shop.cramersblommor.com/vaxter/tradgardsvaxter/perenner/";
  const records=[
    {name:"Salvia nemorosa 'Caradonna'",common:"Stäppsalvia 'Caradonna'",parent:"Salvia nemorosa",source:cramers+"stappsalvia-4/",supplier:"Cramers",flowering:[6,9],facts:"Blomning juni–september. Höjd 60 cm. Sol, torrt läge, undvik vinterfukt."},
    {name:"Salvia nemorosa 'Ostfriesland'",common:"Stäppsalvia 'Ostfriesland'",parent:"Salvia nemorosa",source:cramers+"stappsalvia-5/",supplier:"Cramers"},
    {name:"Quercus robur fk ULTUNA E",common:"Skogsek fk ULTUNA E",parent:"Quercus robur",source:"https://stangby.nu/sortiment/quercus-robur-fk-ultuna-e/",supplier:"Stångby",facts:"Frökälla ULTUNA. E-märkt material. Sol. Utvecklas bäst med närings- och humusrik jord och tillgång till fukt."},
    {name:"Malus baccata 'Columnaris'",common:"Pelarapel 'Columnaris'",parent:"Malus baccata",aliases:["Malus baccata 'Fastigiata'","Malus baccata ‘Columnaris’ (syn. ’Fastigiata’)"],source:"https://stangby.nu/malus/",supplier:"Stångby"},
    {name:"Malus 'Evereste'",common:"Prydnadsapel 'Evereste'",source:"https://stangby.nu/malus/",supplier:"Stångby"},
    ...["Rebona","Fiorente","New Horizon","Rebella"].map(name=>({name:"Ulmus '"+name+"'",common:"Alm '"+name+"'",aliases:["Ulmus '"+name+"', RESISTA®","Ulmus '"+name+"' RESISTA®"],source:"https://bjorkhaga.se/resistenta-almar/",supplier:"Björkhaga"}))
  ];
  function build(plants){
    return records.map((record,index)=>{
      const parent=plants.find(p=>PlantDataView.scientificNameKey(p["Scientific name"])===record.parent?.toLowerCase());
      return {"Scientific name":record.name,"Svenskt namn":record.common,"Dyntaxa ID number":"nursery-"+index,nursery:{...record,parentId:parent?.["Dyntaxa ID number"]}};
    });
  }
  function find(plants,name){
    const query=normalize(name);
    return plants.find(p=>p.nursery&&[p["Scientific name"],p["Svenskt namn"],...(p.nursery.aliases||[])].some(alias=>normalize(alias)===query));
  }
  function describe(p){
    const r=p.nursery;
    if(!r)return "";
    return '<div class="simple-profile"><h3>'+escape(r.common)+'</h3><p><em>'+escape(r.name)+'</em></p><p>'+escape(r.facts||"Sortspecifika odlings- och blomningsuppgifter saknas i det granskade uttaget.")+'</p><p>Plantskolans sortuppgift · <a href="'+escape(r.source)+'">'+escape(r.supplier)+'</a> · kontrollerad 25 november 2026.</p><details><summary>Namnkoppling och ekologiska uppgifter</summary><p>'+escape(r.parent?"Kopplad till "+r.parent+". Artens egenskaper är vägledning och kan avvika för sorten.":"Registrerad på släkt- och sortnivå. Koppling till en enskild art saknas.")+'</p><p>Sortspecifika data om nektar och associerade organismer saknas i registret.</p>'+(r.parentId?'<p><a href="https://artfakta.se/taxa/'+encodeURIComponent(r.parentId)+'">Artens uppgifter i Artfakta</a></p>':"")+'</details></div>';
  }
  root.NurseryPlants={build,find,describe,normalize};
  if(typeof module!=="undefined")module.exports=root.NurseryPlants;
})(globalThis);
