/* ---------- pure calculation (no DOM) ---------- */
function r2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }
function numOf(v) { var n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; }

var ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
var TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
function below1000(n) {
  var s = '';
  if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' HUNDRED'; n = n % 100; if (n) s += ' '; }
  if (n >= 20) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += ' ' + ONES[n % 10]; }
  else if (n > 0) { s += ONES[n]; }
  return s;
}
function wordsIndian(n) {
  n = Math.floor(n);
  if (n === 0) return 'ZERO';
  var parts = [];
  var cr = Math.floor(n / 1e7); n = n % 1e7;
  var lk = Math.floor(n / 1e5); n = n % 1e5;
  var th = Math.floor(n / 1e3); n = n % 1e3;
  if (cr) parts.push(below1000(cr) + ' CRORE');
  if (lk) parts.push(below1000(lk) + ' LAKH');
  if (th) parts.push(below1000(th) + ' THOUSAND');
  if (n) parts.push(below1000(n));
  return parts.join(' ');
}

function calcBill(o) {
  var rate = Math.max(0, o.taxPercent || 0) / 100;
  var rows = o.rows.map(function (r) {
    var rentIn = numOf(r.rent), epax = numOf(r.epax), food = numOf(r.food), laundry = numOf(r.laundry), other = numOf(r.other);
    var rentBase = o.inclusive ? rentIn / (1 + 2 * rate) : rentIn;
    var rent = r2(rentBase);
    var sgst = r2((rentBase + epax) * rate);
    var cgst = sgst;
    var total = r2(rent + epax + sgst + cgst + food + laundry + other);
    return { date: r.date, rent: rent, epax: epax, sgst: sgst, cgst: cgst, food: food, laundry: laundry, other: other, total: total };
  });
  var tot = {};
  ['rent', 'epax', 'sgst', 'cgst', 'food', 'laundry', 'other', 'total'].forEach(function (k) {
    tot[k] = r2(rows.reduce(function (a, r) { return a + r[k]; }, 0));
  });
  var discount = numOf(o.discount), advance = numOf(o.advance);
  var gross = Math.max(0, r2(tot.total - discount));
  var billAmt = Math.round(gross);
  var roundOff = r2(billAmt - gross);
  var balance = billAmt - advance;
  var net = balance > 0 ? r2(balance) : 0;
  var refund = balance < 0 ? r2(-balance) : 0;
  return { rows: rows, tot: tot, discount: discount, gross: gross, roundOff: roundOff, billAmt: billAmt, advance: advance, net: net, refund: refund, words: wordsIndian(billAmt) + ' RUPEES ONLY.' };
}

/* ---------- DOM ---------- */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var m = function (n) { return money.format(n); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var isoOf = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parseIso = function (s) { var p = (s || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; };
  var fmtDate = function (s) { var p = (s || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; };
  var GST_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

  var PERSIST = ['hName', 'hAddr', 'hPhone', 'hGst', 'bBank', 'bBranch', 'bAcc', 'bIfsc', 'hCity', 'taxRate', 'rentMode'];
  var STORE_KEY = 'hotel-bill-generator-v1';

  var today = new Date();
  var yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  $('billDate').value = isoOf(today);
  $('arrDate').value = isoOf(yesterday);
  $('depDate').value = isoOf(today);

  var state = { rows: [{ date: isoOf(yesterday), rent: '1500', epax: '', food: '', laundry: '', other: '' }] };

  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    PERSIST.forEach(function (id) { if (typeof saved[id] === 'string') $(id).value = saved[id]; });
  } catch (e) { /* storage unavailable */ }

  function save() {
    try {
      var o = {};
      PERSIST.forEach(function (id) { o[id] = $(id).value; });
      localStorage.setItem(STORE_KEY, JSON.stringify(o));
    } catch (e) { /* ignore */ }
  }

  function renderRows() {
    var keys = ['rent', 'epax', 'food', 'laundry', 'other'];
    var names = { rent: 'Rent', epax: 'Extra pax', food: 'Food', laundry: 'Laundry', other: 'Other' };
    $('rowsBody').innerHTML = state.rows.map(function (r, i) {
      return '<tr><td><input id="r' + i + '_date" type="date" data-i="' + i + '" data-k="date" value="' + esc(r.date) + '" aria-label="Date, row ' + (i + 1) + '"></td>' +
        keys.map(function (k) {
          return '<td><input id="r' + i + '_' + k + '" type="number" inputmode="decimal" min="0" step="0.01" data-i="' + i + '" data-k="' + k + '" value="' + esc(r[k]) + '" aria-label="' + names[k] + ', row ' + (i + 1) + '"></td>';
        }).join('') +
        '<td><button type="button" class="icon-btn" data-del="' + i + '" aria-label="Remove row ' + (i + 1) + '">&times;</button></td></tr>';
    }).join('');
  }

  function renderBill() {
    var taxPercent = parseFloat($('taxRate').value) || 0;
    var c = calcBill({
      rows: state.rows, taxPercent: taxPercent, inclusive: $('rentMode').value === 'incl',
      discount: $('discount').value, advance: $('advance').value
    });
    var rateLabel = (+taxPercent.toFixed(2)) + '%';
    $('subtitle').textContent = 'GST guest bill. SGST and CGST at ' + rateLabel + ' each, worked out for you.';

    var hn = $('hName').value.trim() || 'Hotel name';
    var initials = hn.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join('');
    var sub1 = [$('hAddr').value.trim(), $('hPhone').value.trim() ? 'Ph: ' + $('hPhone').value.trim() : ''].filter(Boolean).join(', ');
    var gstin = $('hGst').value.trim();
    var arrT = $('arrTime').value, depT = $('depTime').value;

    var bankLines = [];
    if ($('bBank').value.trim()) bankLines.push('<div>BANK NAME : <b>' + esc($('bBank').value.trim()) + '</b></div>');
    if ($('bBranch').value.trim()) bankLines.push('<div>BANK BRANCH : <b>' + esc($('bBranch').value.trim()) + '</b></div>');
    if ($('bAcc').value.trim()) bankLines.push('<div>A/C NO. : <b class="mono">' + esc($('bAcc').value.trim()) + '</b></div>');
    if ($('bIfsc').value.trim()) bankLines.push('<div>IFSC CODE : <b class="mono">' + esc($('bIfsc').value.trim().toUpperCase()) + '</b></div>');

    var body = c.rows.map(function (r) {
      return '<tr><td>' + esc(fmtDate(r.date)) + '</td><td>' + m(r.rent) + '</td><td>' + m(r.epax) + '</td><td>' + m(r.sgst) + '</td><td>' + m(r.cgst) + '</td><td>' + m(r.food) + '</td><td>' + m(r.laundry) + '</td><td>' + m(r.other) + '</td><td>' + m(r.total) + '</td></tr>';
    }).join('');

    var t = c.tot;
    var html =
      '<div class="b-head"><div class="b-mark" aria-hidden="true">' + esc(initials) + '</div><div>' +
      '<h2 class="b-name">' + esc(hn) + '</h2>' +
      (sub1 ? '<p class="b-sub">' + esc(sub1) + '</p>' : '') +
      (gstin ? '<p class="b-sub">GST No.: ' + esc(gstin.toUpperCase()) + '</p>' : '') +
      '</div></div>' +
            '<div class="b-meta"><div><span>Reg.No.:</span><b>' + esc($('regNo').value) + '</b></div><div><span>Room No.:</span><b>' + esc($('roomNo').value) + '</b></div><div><span>Bill No.:</span><b>' + esc($('billNo').value) + '</b></div><div><span>Bill Date :</span><b>' + esc(fmtDate($('billDate').value)) + '</b></div></div>' +
      '<div class="guest"><div class="col">' +
      '<div class="kv"><span>Name of Guest :</span><b>' + esc($('gName').value) + '</b></div>' +
      '<div class="kv"><span>Company/Address :</span><b>' + esc($('company').value) + '</b></div>' +
      '<div class="two"><div class="kv"><span>City :</span><b>' + esc($('gCity').value) + '</b></div><div class="kv"><span>PAX :</span><b class="mono">' + esc($('pax').value) + '</b></div></div>' +
      '<div class="kv"><span>Customer GST No. :</span><b class="mono">' + esc($('custGst').value.trim().toUpperCase()) + '</b></div>' +
      '</div><div class="col">' +
      '<div class="kv"><span>Arrival Date :</span><b class="mono">' + esc(fmtDate($('arrDate').value)) + '</b><span>Time :</span><b class="mono">' + esc(arrT) + '</b></div>' +
      '<div class="kv"><span>Departure Date :</span><b class="mono">' + esc(fmtDate($('depDate').value)) + '</b><span>Time :</span><b class="mono">' + esc(depT) + '</b></div>' +
      '</div></div>' +
      '<table class="charges"><thead><tr><th>Date</th><th>Rent</th><th>Epax</th><th>SGST<small>' + rateLabel + '</small></th><th>CGST<small>' + rateLabel + '</small></th><th>Food</th><th>Laundry</th><th>Other</th><th>Total</th></tr></thead>' +
      '<tbody>' + body + '<tr class="fill"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody>' +
      '<tfoot><tr><td>Total</td><td>' + m(t.rent) + '</td><td>' + m(t.epax) + '</td><td>' + m(t.sgst) + '</td><td>' + m(t.cgst) + '</td><td>' + m(t.food) + '</td><td>' + m(t.laundry) + '</td><td>' + m(t.other) + '</td><td>' + m(t.total) + '</td></tr></tfoot></table>' +
      '<p class="words"><b>In words Rs:</b> ' + esc(c.words) + '</p>' +
      '<div class="settle"><div class="bank">' + bankLines.join('') + '</div>' +
      '<table class="sum"><tbody>' +
      '<tr><td>Discount :</td><td>' + m(c.discount) + '</td></tr>' +
      (c.roundOff !== 0 ? '<tr><td>Round off :</td><td>' + (c.roundOff > 0 ? '+' : '-') + m(Math.abs(c.roundOff)) + '</td></tr>' : '') +
      '<tr class="strong"><td>Bill Amount :</td><td>' + m(c.billAmt) + '</td></tr>' +
      '<tr><td>Advance :</td><td>' + m(c.advance) + '</td></tr>' +
      '<tr><td>Refund :</td><td>' + m(c.refund) + '</td></tr>' +
      '<tr class="strong"><td>Net Bill Amount :</td><td>' + m(c.net) + '</td></tr>' +
      '</tbody></table></div>' +
      '<div class="sign"><div>Customer\'s Signature</div><div>For ' + esc(hn) + '</div></div>' +
      ($('hCity').value.trim() ? '<p class="jur">Subject to &ldquo;' + esc($('hCity').value.trim()) + '&rdquo; jurisdiction only</p>' : '');
    $('bill').innerHTML = html;
  }

  function checkHints() {
    var g = $('hGst').value.trim().toUpperCase();
    $('hGstHint').textContent = g && !GST_RE.test(g) ? 'The hotel GST No. does not look like a valid 15-character GSTIN.' : '';
    var cg = $('custGst').value.trim().toUpperCase();
    $('custGstHint').textContent = cg && !GST_RE.test(cg) ? 'The customer GST No. does not look like a valid 15-character GSTIN.' : '';
    var a = parseIso($('arrDate').value), d = parseIso($('depDate').value);
    $('dateHint').textContent = a && d && d < a ? 'Departure date is before the arrival date.' : '';
  }

  function refresh() { checkHints(); renderBill(); }

  document.querySelectorAll('input[id], select[id]').forEach(function (el) {
    if (el.closest('#rowsBody')) return;
    el.addEventListener('input', function () { if (PERSIST.indexOf(el.id) > -1) save(); refresh(); });
    el.addEventListener('change', function () { if (PERSIST.indexOf(el.id) > -1) save(); refresh(); });
  });

  $('rowsBody').addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.i != null) { state.rows[+t.dataset.i][t.dataset.k] = t.value; renderBill(); }
  });
  $('rowsBody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]');
    if (!b) return;
    state.rows.splice(+b.dataset.del, 1);
    renderRows(); renderBill();
  });

  $('addRow').addEventListener('click', function () {
    var last = state.rows[state.rows.length - 1];
    var base = last && parseIso(last.date) ? parseIso(last.date) : parseIso($('arrDate').value) || new Date();
    var next = last && parseIso(last.date) ? new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1) : base;
    state.rows.push({ date: isoOf(next), rent: $('nightRate').value, epax: '', food: '', laundry: '', other: '' });
    renderRows(); renderBill();
  });

  $('fillNights').addEventListener('click', function () {
    var a = parseIso($('arrDate').value), d = parseIso($('depDate').value);
    if (!a) { $('dateHint').textContent = 'Choose an arrival date first.'; return; }
    var rows = [];
    var cur = new Date(a.getTime());
    var end = d && d > a ? d : null;
    if (!end) { rows.push({ date: isoOf(a), rent: $('nightRate').value, epax: '', food: '', laundry: '', other: '' }); }
    else {
      var n = 0;
      while (cur < end && n < 90) {
        rows.push({ date: isoOf(cur), rent: $('nightRate').value, epax: '', food: '', laundry: '', other: '' });
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1); n++;
      }
    }
    state.rows = rows;
    renderRows(); refresh();
  });

  var armed = null;
  $('newBill').addEventListener('click', function () {
    var btn = $('newBill');
    if (!armed) {
      btn.textContent = 'Click again to clear this bill';
      btn.classList.add('warn');
      armed = setTimeout(function () { armed = null; btn.textContent = 'New bill'; btn.classList.remove('warn'); }, 4000);
      return;
    }
    clearTimeout(armed); armed = null;
    btn.textContent = 'New bill'; btn.classList.remove('warn');
    var bump = function (id) { var v = $(id).value; var mm = v.match(/^(.*?)(\d+)$/); if (mm) { $(id).value = mm[1] + String(+mm[2] + 1).padStart(mm[2].length, '0'); } };
    bump('billNo'); bump('regNo');
    ['roomNo', 'gName', 'company', 'gCity', 'custGst'].forEach(function (id) { $(id).value = ''; });
    $('pax').value = '1'; $('discount').value = '0'; $('advance').value = '0';
    $('billDate').value = isoOf(new Date());
    $('arrDate').value = isoOf(new Date()); $('depDate').value = isoOf(new Date(Date.now() + 86400000));
    state.rows = [{ date: $('arrDate').value, rent: $('nightRate').value, epax: '', food: '', laundry: '', other: '' }];
    renderRows(); refresh();
  });

  renderRows();
  refresh();
  var pb = document.getElementById('printBtn'), pn = document.getElementById('printNote'), printed = false;
  window.addEventListener('beforeprint', function () { printed = true; });
  pb.addEventListener('click', function () {
    printed = false; pn.hidden = true;
    try { window.print(); } catch (e) { /* blocked */ }
    setTimeout(function () { if (!printed) pn.hidden = false; }, 700);
  });
})();
