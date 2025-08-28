// app.import.csv.patch.js
async function importCsv(file){
  const buf = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const res = await fetch('/.netlify/functions/import-csv',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csvBase64:base64})});
  const data = await res.json();
  alert('Import zakończony: dodano '+data.inserted+', pominięto '+data.skipped);
}
/* W UI: <input type="file" accept=".csv" onchange="importCsv(this.files[0])"> */
