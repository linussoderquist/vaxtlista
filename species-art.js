/* Original generated illustrations. Exact species IDs only; no cultivar inheritance. */
(function(root){
"use strict";
const portraits = [
  {
    "id": "223284",
    "slug": "salg",
    "name": "sälg",
    "scientificName": "Salix caprea"
  },
  {
    "id": "221338",
    "slug": "rodklover",
    "name": "rödklöver",
    "scientificName": "Trifolium pratense"
  },
  {
    "id": "220235",
    "slug": "prastkrage",
    "name": "prästkrage",
    "scientificName": "Leucanthemum vulgare"
  },
  {
    "id": "220054",
    "slug": "rodklint",
    "name": "rödklint",
    "scientificName": "Centaurea jacea"
  },
  {
    "id": "220023",
    "slug": "liten-blaklocka",
    "name": "liten blåklocka",
    "scientificName": "Campanula rotundifolia"
  },
  {
    "id": "221141",
    "slug": "gullviva",
    "name": "gullviva",
    "scientificName": "Primula veris"
  },
  {
    "id": "222782",
    "slug": "vitsippa",
    "name": "vitsippa",
    "scientificName": "Anemone nemorosa"
  },
  {
    "id": "222063",
    "slug": "mjolke",
    "name": "mjölke",
    "scientificName": "Chamaenerion angustifolium"
  },
  {
    "id": "221239",
    "slug": "karingtand",
    "name": "käringtand",
    "scientificName": "Lotus corniculatus"
  },
  {
    "id": "222498",
    "slug": "blasippa",
    "name": "blåsippa",
    "scientificName": "Hepatica nobilis"
  }
];
const byId = new Map(portraits.map(p=>[p.id,p]));
function get(plant) {
  return plant && !plant.nursery ? byId.get(String(plant["Dyntaxa ID number"] ?? "").trim()) || null : null;
}
function render(plant) {
  const art = get(plant);
  if (!art) return "";
  return '<figure class="form-print species-print"><img loading="lazy" decoding="async" width="1536" height="1024" src="assets/arter/'+art.slug+'.webp" alt="Illustration av '+art.name+' ('+art.scientificName+') i blom"><figcaption>Artillustration</figcaption></figure>';
}
root.SpeciesArt={portraits,get,render};
if(typeof module!=="undefined" && module.exports) module.exports=root.SpeciesArt;
})(globalThis);

