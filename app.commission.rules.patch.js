<!-- app.commission.rules.patch.js (PRZYKŁAD) -->
<script>
// Ustal stawki wg produktu + bonusy personalne — dopasuj do swoich reguł
window.applyCommissionRules = function(row){
  let rate = /pv/i.test(row.product) ? 0.05 : /pompa|heat/i.test(row.product) ? 0.04 : 0.03;
  // bonus 1pp dla Nowaka przy PV
  if (/nowak/i.test(row.agent) && /pv/i.test(row.product)) rate += 0.01;
  const commissionValue = Math.round((row.netValue||0) * rate);
  return { ratePercent: rate*100, commissionValue };
};
</script>
