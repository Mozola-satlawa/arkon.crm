// app.stamp.patch.js – przycisk „Dodaj stempel (QR + hash)” w szczegółach dokumentu
async function addStamp(agreementId){
  const footer = prompt('Tekst w stopce (opcjonalny):','Zweryfikuj kod QR lub porównaj skrót SHA-256');
  const res = await fetch('/.netlify/functions/pdf-stamp', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ agreementId, footerText: footer || null })
  }).then(r=>r.json());
  if(!res.ok){ alert('Błąd stempla: '+(res.error||'')); return; }
  alert('Gotowe! Utworzono plik ze stemplem. Hash: '+res.short+'…');
  // Tutaj możesz odświeżyć listę dokumentów, aby zobaczyć „stamped-pdf”
}
// Po wyrenderowaniu listy dokumentów przypnij przycisk do każdego PDF-a:
// btnStamp.addEventListener('click', ()=> addStamp(agreementId));
