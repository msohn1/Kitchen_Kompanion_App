function openTab(tabName) {
  const contents = document.getElementsByClassName("tabcontent");
  for (let c of contents) c.style.display = "none";
  const el = document.getElementById(tabName);
  if (el) el.style.display = "block";

  // Highlight active tab button
  const tablinks = document.getElementsByClassName("tablink");
  for (let btn of tablinks) {
    btn.classList.remove("active");
    // Find which tab this button opens
    const onclick = btn.getAttribute("onclick");
    if (onclick && onclick.includes(tabName)) {
      btn.classList.add("active");
    }
  }
}

openTab("inventory");

const profileImg = document.getElementById("profileImg");
const alertEl = document.getElementById("alert");
if (profileImg && alertEl) {
  profileImg.onclick = () => {
    alertEl.classList.remove("hidden");
  };
}

function closeAlert() {
  const a = document.getElementById("alert");
  if (a) a.classList.add("hidden");
}

function showChoices() {
  const cam1El = document.querySelector('input[name="camera1"]:checked');
  const cam2El = document.getElementById("camera2");
  const outEl = document.getElementById("choiceOutput");
  if (!cam1El || !cam2El || !outEl) return;
  const camera1 = cam1El.value;
  const camera2 = cam2El.value;
  outEl.textContent = `You chose ${camera1} and ${camera2}.`;
}

function addItem() {
  const input = document.getElementById("todoInput");
  const list = document.getElementById("todoList");
  if (!input || !list) return;
  const text = input.value.trim();
  if (!text) return;

  const li = document.createElement("li");
  li.textContent = text;

  li.onclick = () => li.classList.toggle("done");

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "×";
  removeBtn.onclick = () => li.remove();

  li.appendChild(removeBtn);
  list.appendChild(li);
  input.value = "";
}

const today = new Date();

const formattedDate = today.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

const todayEl = document.getElementById("today");
if (todayEl) todayEl.textContent = formattedDate;
/* ---------- Inventory Data ---------- */
const INVENTORY_KEY = "kk_inventory_v1";
let inventory = JSON.parse(localStorage.getItem(INVENTORY_KEY) || "[]");

// normalize existing items to ensure category exists
// migration: ensure category exists and try to infer category from name when missing/other
function inferCategoryFromName(name) {
  const s = String(name || '').toLowerCase();
  if (!s) return 'other';
  if (/milk|yogurt|butter|cheese|egg|eggs/.test(s)) return 'dairy';
  if (/bacon|chicken|beef|pork|salmon|tuna|shrimp|meat/.test(s)) return 'protein';
  if (/bread|rice|pasta|flour|cereal|noodle/.test(s)) return 'carb';
  if (/spinach|lettuce|tomato|straw|berry|blueber|pea|carrot|produce|veggies|vegetable/.test(s)) return 'veggies';
  if (/frozen|ice|frozen peas|frozen/.test(s)) return 'frozen';
  if (/salt|sauce|ketchup|mustard|sugar|spice|condiment/.test(s)) return 'condiment';
  return 'other';
}

inventory = inventory.map(it => {
  const category = (it.category || '').toLowerCase();
  const finalCat = (category && category !== 'other') ? category : inferCategoryFromName(it.name);
  return { ...it, category: finalCat };
});

// Seed a few items the first time.
if (inventory.length === 0) {
  inventory = [
    { id: cid(), name: "Milk", qty: 0.5, unit: "gal", minQty: 0.5, expiry: addDaysISO(3), category: 'dairy' },
    { id: cid(), name: "Eggs", qty: 6, unit: "pcs", minQty: 6, expiry: addDaysISO(7), category: 'dairy' },
    { id: cid(), name: "Spinach", qty: 0.2, unit: "lb", minQty: 0.3, expiry: addDaysISO(2), category: 'veggies' },
    { id: cid(), name: "Greek Yogurt", qty: 1, unit: "ct", minQty: 1, expiry: addDaysISO(10), category: 'dairy' },
    { id: cid(), name: "Bacon", qty: 0.2, unit: "lb", minQty: 0.3, expiry: addDaysISO(5), category: 'protein' }
  ];
  persist();
}

/* ---------- Inventory UI State ---------- */
let currentFilter = "all"; // all | low | expiring
let currentSearch = "";
let currentCategory = "all"; // all or category key like 'dairy'

/* ---------- Helpers ---------- */
function cid() { return Math.random().toString(36).slice(2, 10); }
function persist() { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory)); }
function daysUntil(dateISO) {
  if (!dateISO) return "";
  const ms = new Date(dateISO).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
  return Math.ceil(ms / 86400000);
}
function addDaysISO(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}

function formatDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ---------- Filtering ---------- */
function isLow(item) { return Number(item.qty) <= Number(item.minQty); }
function isExpiring(item) {
  const d = daysUntil(item.expiry);
  return typeof d === "number" && d <= 3; // within 3 days (or overdue)
}
function passesFilter(item) {
  if (currentFilter === "low" && !isLow(item)) return false;
  if (currentFilter === "expiring" && !isExpiring(item)) return false;
  if (currentCategory !== "all" && (String(item.category || "").toLowerCase() !== String(currentCategory).toLowerCase())) return false;
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    if (!item.name.toLowerCase().includes(q)) return false;
  }
  return true;
}

/* ---------- Rendering ---------- */
function renderInventory() {
  const tbody = document.getElementById("invBody");
  const empty = document.getElementById("invEmpty");
  tbody.innerHTML = "";

  const shown = inventory.filter(passesFilter).sort((a, b) => a.name.localeCompare(b.name));

  if (shown.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  for (const it of shown) {
    const tr = document.createElement("tr");

    // Name + badges (stacked): primary badges on first line, category on its own line below
    const tdName = document.createElement("td");
    const nameLine = document.createElement('div');
    nameLine.className = 'name-line';
    nameLine.textContent = it.name;

    const badgeLine = document.createElement('div');
    badgeLine.className = 'badge-line';
    const badgeLeft = document.createElement('div'); badgeLeft.className = 'badge-col left';
    const badgeRight = document.createElement('div'); badgeRight.className = 'badge-col right';
    // primary badges: Low on left, Expiring on right
    if (isLow(it)) {
      const b = document.createElement("span");
      b.className = "badge low"; b.textContent = "Low";
      badgeLeft.appendChild(b);
    }
    if (isExpiring(it)) {
      const b2 = document.createElement("span");
      b2.className = "badge exp"; b2.textContent = "Expiring";
      badgeRight.appendChild(b2);
    }
    badgeLine.appendChild(badgeLeft);
    badgeLine.appendChild(badgeRight);
  const tdQty = domTD("num", fmtNum(it.qty));
  const tdUnit = domTD("", it.unit || "");
    const tdCat = domTD("category", "");
    if (it.category) {
      const catBadge = document.createElement('span');
      // add a category-specific class, sanitizing the category key to be a valid class name
      const key = String(it.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      catBadge.className = 'badge cat cat-' + key;
      catBadge.textContent = it.category.charAt(0).toUpperCase() + it.category.slice(1);
      tdCat.appendChild(catBadge);
    }
  const tdExp  = domTD("", formatDateShort(it.expiry || ""));
    // show category on its own line (unless both Low and Expiring present => hide for spacing)
    const cat = String(it.category || "");
    const showCategory = cat && !(isLow(it) && isExpiring(it));
    tdName.appendChild(nameLine);
    tdName.appendChild(badgeLine);

    const tdAct = document.createElement("td");
    tdAct.className = 'action-cell';

    const minusBtn = makeRowBtn("−", () => adjustQty(it.id, -1)); minusBtn.classList.add('small');
    const plusBtn = makeRowBtn("+", () => adjustQty(it.id, +1)); plusBtn.classList.add('small');
    const delBtn = makeRowBtn("Delete", () => removeItem(it.id)); delBtn.classList.add('danger');

  // layout: single horizontal row with minus, plus, Delete
  const actionsWrap = document.createElement('div'); actionsWrap.className = 'row-actions';
  actionsWrap.append(minusBtn, plusBtn, delBtn);
  tdAct.appendChild(actionsWrap);

    tr.append(tdName, tdQty, tdUnit, tdCat, tdExp, tdAct);
    tbody.appendChild(tr);
  }
  // After rendering inventory, ensure low/expiring items are present in shopping list
  syncLowExpiringToShopping();
}

// Ensure items that are low or expiring exist in the shopping list (no duplicates)
function syncLowExpiringToShopping() {
  if (!Array.isArray(shopping)) shopping = [];
  let added = false;
  // first cleanup any auto-added items that are no longer applicable
  cleanupAutoAddedShopping();
  for (const it of inventory) {
    if (!it || !it.name) continue;
    if (isLow(it) || isExpiring(it)) {
      const key = String(it.name).trim().toLowerCase();
      const exists = shopping.some(s => String(s.name || '').trim().toLowerCase() === key);
      if (!exists) {
        // determine reason
        const low = isLow(it);
        const exp = isExpiring(it);
        const reason = low && exp ? 'both' : (low ? 'low' : (exp ? 'expiring' : 'auto'));
        shopping.push({ id: cid(), name: it.name, category: String(it.category || 'other').toLowerCase(), bought: false, autoAdded: true, reason });
        added = true;
      }
    }
  }
  // update reason for existing auto items if necessary
  for (const s of shopping) {
    if (!s.autoAdded) continue;
    const inv = inventory.find(i => String(i.name || '').trim().toLowerCase() === String(s.name || '').trim().toLowerCase());
    if (inv) {
      const low = isLow(inv); const exp = isExpiring(inv);
      const reason = low && exp ? 'both' : (low ? 'low' : (exp ? 'expiring' : 'auto'));
      if (s.reason !== reason) { s.reason = reason; added = true; }
    }
  }
  if (added) {
    persistShop();
    renderShopping();
  }
}

function domTD(cls, text) {
  const td = document.createElement("td");
  if (cls) td.className = cls;
  td.textContent = text;
  return td;
}
function fmtNum(n) { const v = Number(n); return Number.isFinite(v) ? (v % 1 ? v.toFixed(2) : String(v)) : ""; }
function makeRowBtn(label, fn) {
  const b = document.createElement("button");
  b.className = "btn row-btn";
  b.textContent = label;
  b.onclick = fn;
  return b;
}

/* ---------- Mutations ---------- */
function addItemFromForm(form) {
  const data = new FormData(form);
  const item = {
    id: cid(),
    name: String(data.get("name")).trim(),
    qty: Number(data.get("qty")),
    unit: String(data.get("unit") || ""),
    minQty: Number(data.get("minQty")),
    expiry: String(data.get("expiry") || ""),
    category: String(data.get("category") || "other").toLowerCase()
  };
  if (!item.name) return;
  inventory.push(item);
  persist();
  renderInventory();
}

function removeItem(id) {
  inventory = inventory.filter(x => x.id !== id);
  persist();
  renderInventory();
}

function adjustQty(id, delta) {
  const it = inventory.find(x => x.id === id);
  if (!it) return;
  it.qty = Math.max(0, Number(it.qty) + delta);
  persist();
  renderInventory();
}

/* ---------- Modal Controls ---------- */
const addModal = document.getElementById("addModal");
function showAddModal() { if (!addModal) return; addModal.classList.add("show"); addModal.setAttribute("aria-hidden","false"); }
function hideAddModal() { if (!addModal) return; addModal.classList.remove("show"); addModal.setAttribute("aria-hidden","true"); }

/* ---------- Shopping Data & UI ---------- */
const SHOPPING_KEY = 'kk_shopping_v1';
let shopping = JSON.parse(localStorage.getItem(SHOPPING_KEY) || '[]');

function persistShop() { localStorage.setItem(SHOPPING_KEY, JSON.stringify(shopping)); }

function renderShopping() {
  const tbody = document.getElementById('shopBody');
  const empty = document.getElementById('shopEmpty');
  if (!tbody || !empty) return;
  tbody.innerHTML = '';
  const filterCat = document.getElementById('shopFilterCategory')?.value || 'all';
  const q = document.getElementById('shopSearch')?.value.trim().toLowerCase() || '';
  const autoFilter = document.getElementById('shopAutoFilter')?.value || 'all';
  const shown = shopping.filter(it => {
    if (filterCat !== 'all' && String(it.category || '').toLowerCase() !== filterCat) return false;
    if (q && !String(it.name || '').toLowerCase().includes(q)) return false;
    // autoFilter: all | auto | manual
    if (autoFilter === 'auto' && !it.autoAdded) return false;
    if (autoFilter === 'manual' && it.autoAdded) return false;
    return true;
  }).sort((a,b) => a.name.localeCompare(b.name));
  if (shown.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  for (const it of shown) {
    const tr = document.createElement('tr');
  // checkbox column
  const tdChk = document.createElement('td'); tdChk.className = 'chk-col';
  const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = !!it.bought; chk.className = 'row-check'; chk.onchange = () => { toggleBought(it.id); };
  tdChk.appendChild(chk);

  const tdName = document.createElement('td');
  const nameLine = document.createElement('div');
  nameLine.className = 'name-line';
  nameLine.textContent = it.name;
  if (it.bought) nameLine.style.textDecoration = 'line-through';
  const badgeLine = document.createElement('div'); badgeLine.className = 'badge-line';
  tdName.append(nameLine, badgeLine);

    const tdCat = document.createElement('td');
    if (it.category) {
      const c = document.createElement('span'); c.className = 'badge cat cat-' + String(it.category).toLowerCase().replace(/[^a-z0-9]+/g,'-'); c.textContent = it.category.charAt(0).toUpperCase() + it.category.slice(1);
      tdCat.appendChild(c);
    }
    // visual marker for auto-added items
    if (it.autoAdded) {
      const autoMark = document.createElement('span'); autoMark.className = 'auto-mark'; autoMark.textContent = 'Auto'; autoMark.title = 'Automatically added from inventory (low/expiring)';
      tdCat.appendChild(autoMark);
    }

    // Source column (manual | low | expiring | both)
    const tdSource = document.createElement('td');
    const src = String(it.reason || (it.autoAdded ? 'auto' : 'manual'));
    const srcBadge = document.createElement('span'); srcBadge.className = 'source-badge source-' + src.replace(/[^a-z0-9]+/g,'-');
    // user-friendly text
    const labelMap = { manual: 'Manual', low: 'Low', expiring: 'Expiring', both: 'Low & Expiring', auto: 'Auto' };
    srcBadge.textContent = labelMap[src] || src;
    tdSource.appendChild(srcBadge);

    const tdAct = document.createElement('td'); tdAct.className = 'action-cell';
    const actionsWrap = document.createElement('div'); actionsWrap.className = 'row-actions';
    const del = document.createElement('button'); del.className = 'btn row-btn danger small'; del.textContent = 'Delete'; del.onclick = () => removeShopItem(it.id);
    actionsWrap.append(del);
    tdAct.append(actionsWrap);

    // mark row visually when auto-added
    if (it.autoAdded) tr.classList.add('auto-row');
    tr.append(tdChk, tdName, tdCat, tdSource, tdAct);
    tbody.appendChild(tr);
  }
}

// Remove auto-added shopping items when their inventory source is no longer low/expiring
function cleanupAutoAddedShopping() {
  if (!Array.isArray(shopping) || !Array.isArray(inventory)) return;
  const preserved = [];
  let changed = false;
  for (const s of shopping) {
    if (!s.autoAdded) { preserved.push(s); continue; }
    // find matching inventory item by name
    const key = String(s.name || '').trim().toLowerCase();
    const inv = inventory.find(i => String(i.name || '').trim().toLowerCase() === key);
    if (!inv) {
      // if inventory item removed, keep the shopping entry (user might still want to buy)
      preserved.push(s);
    } else {
      // if inventory item exists but is no longer low/expiring, drop the auto-added shopping entry
      if (isLow(inv) || isExpiring(inv)) {
        preserved.push(s);
      } else {
        changed = true;
      }
    }
  }
  if (changed) { shopping = preserved; persistShop(); renderShopping(); }
}

function addShopItemFromForm(form) {
  const data = new FormData(form);
  const item = { id: cid(), name: String(data.get('name')).trim(), category: String(data.get('category') || 'other').toLowerCase(), bought: false, autoAdded: false, reason: 'manual' };
  if (!item.name) return;
  shopping.push(item);
  persistShop();
  renderShopping();
}

function removeShopItem(id) {
  shopping = shopping.filter(x => x.id !== id);
  persistShop(); renderShopping();
}

function toggleBought(id) {
  const it = shopping.find(x => x.id === id); if (!it) return; it.bought = !it.bought; persistShop(); renderShopping();
}

/* ---------- Wire up events ---------- */
const fFilterAll = document.getElementById("filterAll");
const fFilterLow = document.getElementById("filterLow");
const fFilterExp = document.getElementById("filterExpiring");
const fFilterCategory = document.getElementById("filterCategory");
const fSearch = document.getElementById("invSearch");
const openAddBtn = document.getElementById("openAddModal");
const closeAddBtn = document.getElementById("closeAddModal");
const cancelAddBtn = document.getElementById("cancelAdd");
const addForm = document.getElementById("addForm");

// Shopping UI elements
const openAddShopBtn = document.getElementById('openAddShopModal');
const closeAddShopBtn = document.getElementById('closeAddShopModal');
const cancelAddShopBtn = document.getElementById('cancelAddShop');
const addShopForm = document.getElementById('addShopForm');
const shopFilterCategory = document.getElementById('shopFilterCategory');
const shopSearch = document.getElementById('shopSearch');
const shopAutoFilter = document.getElementById('shopAutoFilter');


if (fFilterAll) fFilterAll.onclick = () => { currentFilter = "all"; renderInventory(); };
if (fFilterLow) fFilterLow.onclick = () => { currentFilter = "low"; renderInventory(); };
if (fFilterExp) fFilterExp.onclick = () => { currentFilter = "expiring"; renderInventory(); };
if (fFilterCategory) fFilterCategory.addEventListener('change', (e) => { currentCategory = e.target.value; renderInventory(); });
if (fSearch) fSearch.addEventListener("input", (e) => { currentSearch = e.target.value.trim(); renderInventory(); });

if (openAddBtn) openAddBtn.onclick = showAddModal;
if (closeAddBtn) closeAddBtn.onclick = hideAddModal;
if (cancelAddBtn) cancelAddBtn.onclick = hideAddModal;
if (addModal) addModal.addEventListener("click", (e) => { if (e.target === addModal) hideAddModal(); });

if (addForm) {
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addItemFromForm(e.target);
    e.target.reset();
    hideAddModal();
  });
}

// Shopping modal wiring
const addShopModal = document.getElementById('addShopModal');
function showAddShopModal() { if (!addShopModal) return; addShopModal.classList.add('show'); addShopModal.setAttribute('aria-hidden','false'); }
function hideAddShopModal() { if (!addShopModal) return; addShopModal.classList.remove('show'); addShopModal.setAttribute('aria-hidden','true'); }

if (openAddShopBtn) openAddShopBtn.onclick = showAddShopModal;
if (closeAddShopBtn) closeAddShopBtn.onclick = hideAddShopModal;
if (cancelAddShopBtn) cancelAddShopBtn.onclick = hideAddShopModal;
if (addShopModal) addShopModal.addEventListener('click', (e) => { if (e.target === addShopModal) hideAddShopModal(); });
if (addShopForm) {
  addShopForm.addEventListener('submit', (e) => { e.preventDefault(); addShopItemFromForm(e.target); e.target.reset(); hideAddShopModal(); });
}
if (shopFilterCategory) shopFilterCategory.addEventListener('change', () => renderShopping());
if (shopSearch) shopSearch.addEventListener('input', () => renderShopping());
if (shopAutoFilter) shopAutoFilter.addEventListener('change', () => renderShopping());


function toggleExpand(selectedCard) {
  const allCards = document.querySelectorAll('.recipe-card');

  allCards.forEach(card => {
    if (card !== selectedCard) {
      card.classList.remove('expanded');
    }
  });

  selectedCard.classList.toggle('expanded');
}

/* ---------- Initial paint on load ---------- */
renderInventory();
renderShopping();
