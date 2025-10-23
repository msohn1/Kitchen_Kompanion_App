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

// Update visual active state for inventory filter buttons
function updateInventoryFilterButtons() {
  const map = [
    { id: 'filterAll', val: 'all' },
    { id: 'filterLow', val: 'low' },
    { id: 'filterExpiring', val: 'expiring' }
  ];
  for (const m of map) {
    const el = document.getElementById(m.id);
    if (!el) continue;
    if (currentFilter === m.val) el.classList.add('active'); else el.classList.remove('active');
  }
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
  // update button highlight states
  updateInventoryFilterButtons();
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
      const autoMark = document.createElement('span'); autoMark.className = 'auto-mark'; autoMark.title = 'Automatically added from inventory (low/expiring)';
      autoMark.setAttribute('role','img'); autoMark.setAttribute('aria-label','Auto-added');
      // textual Auto marker for clarity
      autoMark.textContent = 'Auto';
      tdCat.appendChild(autoMark);
    }

    // Source column (manual | low | expiring | both)
    const tdSource = document.createElement('td');
    const src = String(it.reason || (it.autoAdded ? 'auto' : 'manual'));
    const srcBadge = document.createElement('span'); srcBadge.className = 'source-badge source-' + src.replace(/[^a-z0-9]+/g,'-');
    // user-friendly text
  const labelMap = { manual: 'Manual', low: 'Low', expiring: 'Expiring', both: 'Low & Expiring', auto: 'Auto', recipe: 'Recipe' };
    srcBadge.textContent = labelMap[src] || src;
    tdSource.appendChild(srcBadge);

    const tdAct = document.createElement('td'); tdAct.className = 'action-cell';
    const actionsWrap = document.createElement('div'); actionsWrap.className = 'row-actions';
    const del = document.createElement('button'); del.className = 'btn row-btn danger small'; del.textContent = 'Delete'; del.onclick = () => removeShopItem(it.id);
    actionsWrap.append(del);
    tdAct.append(actionsWrap);

    // mark row visually when auto-added
    if (it.autoAdded) tr.classList.add('auto-row');
    // mark row visually when recipe-sourced
    if ((it.reason || '').toLowerCase() === 'recipe') tr.classList.add('row-source-recipe');
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

/* ---------- Settings ---------- */
const SETTINGS_KEY = 'kk_settings_v1';
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');

// Allergy constants (keys used in settings) and keyword map for recipe filtering
const ALLERGY_OPTIONS = [
  { key: 'peanuts', label: 'Peanuts' },
  { key: 'tree-nuts', label: 'Tree nuts' },
  { key: 'milk', label: 'Milk' },
  { key: 'eggs', label: 'Eggs' },
  { key: 'soy', label: 'Soy' },
  { key: 'wheat', label: 'Wheat' },
  { key: 'gluten', label: 'Gluten' },
  { key: 'fish', label: 'Fish' },
  { key: 'shellfish', label: 'Shellfish' },
  { key: 'sesame', label: 'Sesame' },
  { key: 'mustard', label: 'Mustard' },
  { key: 'sulfites', label: 'Sulfites' },
  { key: 'celery', label: 'Celery' },
  { key: 'mollusks', label: 'Mollusks' },
  { key: 'other', label: 'Other' }
];
const ALLERGY_KEYS = ALLERGY_OPTIONS.map(o => o.key);

const ALLERGY_KEYWORDS = {
  'peanuts': ['peanut','peanuts'],
  'tree-nuts': ['almond','walnut','cashew','pecan','hazelnut','brazil nut','macadamia','pistachio','tree nut'],
  'milk': ['milk','cheese','butter','cream','yogurt','whey','casein'],
  'eggs': ['egg','eggs','mayonnaise'],
  'soy': ['soy','tofu','edamame','soy sauce','tamari','miso'],
  'wheat': ['wheat','flour','bread','pasta','seitan'],
  'gluten': ['gluten','wheat','barley','rye','malt'],
  'fish': ['fish','salmon','tuna','cod','trout','anchovy'],
  'shellfish': ['shrimp','prawn','crab','lobster','shellfish'],
  'sesame': ['sesame','tahini','benne'],
  'mustard': ['mustard'],
  'sulfites': ['sulfite','sulphite','sulphites'],
  'celery': ['celery'],
  'mollusks': ['clam','oyster','mussel','scallop','mollusk']
};

// Expanded ingredient synonyms mapping. Broad set covering cheeses, herbs, veg variants, proteins, canned/frozen forms and pantry items.
const INGREDIENT_SYNONYMS = {
  // cheeses -> canonical 'cheese'
  'mozzarella': 'cheese', 'mozzarella cheese': 'cheese', 'fresh mozzarella': 'cheese', 'buffalo mozzarella': 'cheese',
  'cheddar': 'cheese', 'cheddar cheese': 'cheese', 'parmesan': 'cheese', 'parmigiano': 'cheese', 'parmesan cheese': 'cheese', 'provolone': 'cheese', 'feta': 'cheese', 'goat cheese': 'cheese', 'brie': 'cheese', 'camembert': 'cheese', 'gorgonzola': 'cheese', 'blue cheese': 'cheese', 'asiago': 'cheese', 'emmental': 'cheese', 'swiss cheese': 'cheese', 'gouda': 'cheese',

  // dairy / milk variants
  'milk': 'milk', 'whole milk': 'milk', 'skim milk': 'milk', '2% milk': 'milk', 'butter': 'butter', 'unsalted butter': 'butter', 'salted butter': 'butter', 'cream': 'cream', 'heavy cream': 'cream', 'sour cream': 'cream', 'greek yogurt': 'yogurt', 'yoghurt': 'yogurt', 'yogurt': 'yogurt', 'buttermilk': 'milk',

  // eggs
  'eggs': 'egg', 'egg': 'egg', 'egg whites': 'egg', 'egg yolk': 'egg',

  // meats & proteins
  'chicken breast': 'chicken', 'chicken thighs': 'chicken', 'chicken thigh': 'chicken', 'chicken': 'chicken', 'ground beef': 'beef', 'beef': 'beef', 'pork': 'pork', 'bacon': 'bacon', 'salami': 'pork', 'salmon': 'fish', 'tuna': 'fish', 'cod': 'fish', 'shrimp': 'shellfish', 'prawn': 'shellfish', 'tofu': 'tofu',

  // vegetables (fresh/frozen/canned variants)
  'tomatoes': 'tomato', 'tomato': 'tomato', 'cherry tomatoes': 'tomato', 'sun-dried tomato': 'tomato', 'potatoes': 'potato', 'potato': 'potato', 'sweet potato': 'potato',
  'broccoli': 'broccoli', 'broccoli florets': 'broccoli', 'carrots': 'carrot', 'zucchini': 'zucchini', 'spinach': 'spinach', 'mixed greens': 'greens', 'spring mix': 'greens', 'lettuce': 'lettuce', 'kale': 'kale',

  // aromatics & herbs
  'garlic': 'garlic', 'garlic clove': 'garlic', 'minced garlic': 'garlic', 'onion': 'onion', 'red onion': 'onion', 'white onion': 'onion', 'shallot': 'shallot', 'scallion': 'green onion', 'green onions': 'green onion', 'leek': 'leek',
  'fresh basil': 'basil', 'dried basil': 'basil', 'parsley': 'parsley', 'cilantro': 'cilantro', 'coriander': 'cilantro', 'rosemary': 'rosemary', 'thyme': 'thyme', 'oregano': 'oregano',

  // oils & condiments
  'olive oil': 'oil', 'extra virgin olive oil': 'oil', 'vegetable oil': 'oil', 'canola oil': 'oil', 'sesame oil': 'oil', 'soy sauce': 'soy sauce', 'tamari': 'soy sauce', 'ketchup': 'ketchup', 'mustard': 'mustard', 'salsa': 'salsa', 'mayonnaise': 'mayo', 'mayo': 'mayo',

  // pantry staples & grains
  'rice': 'rice', 'white rice': 'rice', 'brown rice': 'rice', 'pasta': 'pasta', 'spaghetti': 'pasta', 'penne': 'pasta', 'flour': 'flour', 'sugar': 'sugar', 'salt': 'salt', 'black pepper': 'pepper', 'pepper': 'pepper', 'quinoa': 'quinoa', 'couscous': 'couscous',

  // legumes, nuts & seeds
  'chickpeas': 'chickpea', 'garbanzo beans': 'chickpea', 'lentils': 'lentil', 'beans': 'bean', 'black beans': 'bean', 'kidney beans': 'bean',
  'peanut': 'peanut', 'peanuts': 'peanut', 'almond': 'almond', 'walnut': 'walnut', 'cashew': 'cashew',

  // canned/frozen indicators (map to base)
  'canned tomatoes': 'tomato', 'diced tomatoes': 'tomato', 'crushed tomatoes': 'tomato', 'tomato paste': 'tomato',
  'frozen peas': 'peas', 'frozen corn': 'corn', 'canned corn': 'corn', 'frozen vegetables': 'veg', 'canned beans': 'bean',

  // spices & seasonings (kept literal but common variants included)
  'paprika': 'paprika', 'smoked paprika': 'paprika', 'cumin': 'cumin', 'chili powder': 'chili', 'red pepper flakes': 'chili',

  // fruits & misc
  'lemon': 'lemon', 'lime': 'lime', 'avocado': 'avocado', 'olive': 'olive', 'olives': 'olive', 'honey': 'honey',

  // fallback plural forms (some common plurals mapped to singular base)
  'tomatoes': 'tomato', 'potatoes': 'potato', 'carrots': 'carrot', 'berries': 'berry',
};

// Simple lightweight stemmer (very small subset of rules) to reduce plurals/ed/ing
function stemWord(w) {
  if (!w) return w;
  // common irregulars
  const irregular = { 'children': 'child', 'mice': 'mouse', 'geese': 'goose' };
  if (irregular[w]) return irregular[w];
  // remove common endings
  if (w.endsWith('ing') && w.length > 4) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 3) return w.slice(0, -2);
  if (w.endsWith('es') && w.length > 3) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 2) return w.slice(0, -1);
  return w;
}

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));
  for (let i=0;i<=m;i++) dp[i][0]=i;
  for (let j=0;j<=n;j++) dp[0][j]=j;
  for (let i=1;i<=m;i++) {
    for (let j=1;j<=n;j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

function toTitleCase(s) { return String(s || '').toLowerCase().split(' ').map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '').join(' '); }


function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function persistSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

function renderSettings() {
  // dietary checkboxes
  const diets = new Set(settings.diet || []);
  document.querySelectorAll('input[name="diet"]').forEach(chk => { chk.checked = diets.has(chk.value); });
  // allergies: set checkboxes from settings.allergies
  const allergySet = new Set((settings.allergies || []).map(x => String(x).toLowerCase()));
  document.querySelectorAll('input[name="allergy"]').forEach(chk => { chk.checked = allergySet.has(chk.value); });
  // other allergy text (stored separately in settings.otherAllergies)
  const otherInput = document.querySelector('input[name="allergy-other"]'); if (otherInput) otherInput.value = settings.otherAllergies || '';
  // skill
  const skill = document.getElementById('skillSelect'); if (skill) skill.value = settings.skill || 'beginner';
  // food pref
  const fp = document.getElementById('foodPref'); if (fp) fp.value = settings.foodPref || 'none';
}

function loadSettings() { settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); renderSettings(); }

function saveSettingsFromForm() {
  const sel = Array.from(document.querySelectorAll('input[name="diet"]:checked')).map(i => i.value);
  settings.diet = sel;
  // collect allergies from predefined checkboxes and optional other text
  const allergies = Array.from(document.querySelectorAll('input[name="allergy"]:checked')).map(c => c.value);
  const other = String(document.querySelector('input[name="allergy-other"]')?.value || '').trim();
  settings.allergies = allergies; // only keys
  settings.otherAllergies = other || '';
  settings.skill = document.getElementById('skillSelect')?.value || 'beginner';
  settings.foodPref = document.getElementById('foodPref')?.value || 'none';
  persistSettings(); renderSettings();
}

// recipe filtering: hide recipes that contain any selected allergy keywords
function filterRecipesByAllergies() {
  const selected = new Set((settings.allergies || []).map(s => String(s).toLowerCase()));
  const other = String(settings.otherAllergies || '').toLowerCase();
  const recipeCards = document.querySelectorAll('.recipe-card');
  for (const card of recipeCards) {
    const ingEls = card.querySelectorAll('.ingredients li');
    let text = '';
    ingEls.forEach(li => { text += ' ' + (li.textContent || '').toLowerCase(); });
    let exclude = false;
    for (const a of selected) {
      const keywords = ALLERGY_KEYWORDS[a] || [a];
      for (const kw of keywords) {
        const re = new RegExp('\\b' + escapeRegExp(kw) + '\\b', 'i');
        if (re.test(text)) { exclude = true; break; }
      }
      if (exclude) break;
    }
    if (!exclude && other) {
      const reOther = new RegExp('\\b' + escapeRegExp(other) + '\\b', 'i');
      if (reOther.test(text)) exclude = true;
    }
    if (exclude) card.classList.add('hidden'); else card.classList.remove('hidden');
  }
}

/* ---------- Recipes (data-driven) ---------- */
const recipes = [
  {
    id: 'r1', title: 'Breakfast Sandwich', time: 10, difficulty: 'beginner', diet: [],
    ingredients: ['bread','egg','bacon','cheese'],
    steps: ['Cook bacon until crispy and set aside.','Fry an egg to your liking.','Toast the bread slices.','Assemble sandwich with egg, bacon, and cheese.']
  },
  {
    id: 'r2', title: 'Garlic Chicken Bowl', time: 25, difficulty: 'novice', diet: [],
    ingredients: ['chicken breast','rice','garlic','soy sauce','broccoli'],
    steps: ['Dice chicken and sauté with minced garlic.','Add soy sauce and cook until browned.','Serve over a bowl of rice.']
  },
  {
    id: 'r3', title: 'Mozzarella Toast', time: 8, difficulty: 'beginner', diet: ['vegetarian'],
    ingredients: ['bread','tomato','mozzarella','olive oil'],
    steps: ['Brush bread with olive oil and toast lightly.','Add tomato and mozzarella slices on top.','Toast again until cheese melts.']
  }
  ,
  {
    id: 'r4', title: 'Avocado Toast', time: 6, difficulty: 'beginner', diet: ['vegan'],
    ingredients: ['bread','avocado','lemon','salt','pepper'],
    steps: ['Toast the bread to desired crispness.','Mash avocado with lemon, salt and pepper.','Spread avocado mix on toast and serve.']
  },
  {
    id: 'r5', title: 'Pasta Primavera', time: 30, difficulty: 'intermediate', diet: ['vegetarian'],
    ingredients: ['pasta','zucchini','bell pepper','tomato','parmesan','olive oil','garlic'],
    steps: ['Cook pasta until al dente.','Sauté garlic in olive oil, add vegetables and cook until tender.','Toss pasta with vegetables and finish with parmesan.']
  },
  {
    id: 'r6', title: 'Stir-Fry Veggies & Tofu', time: 20, difficulty: 'novice', diet: ['vegan'],
    ingredients: ['tofu','broccoli','carrot','soy sauce','garlic','rice'],
    steps: ['Press and cube tofu, then pan-fry until golden.','Stir-fry vegetables with garlic, add tofu and soy sauce.','Serve over steamed rice.']
  },
  {
    id: 'r7', title: 'Beef Tacos', time: 18, difficulty: 'novice', diet: [],
    ingredients: ['ground beef','taco shell','lettuce','cheddar','salsa'],
    steps: ['Brown ground beef and season as desired.','Warm taco shells.','Assemble tacos with beef, lettuce, cheese and salsa.']
  }
];

function normalizeIngredient(text) {
  // strip counts/units and punctuation, collapse whitespace
  let s = String(text || '').toLowerCase().replace(/\b(\d+|\d+\/\d+|cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|slices|slice|cloves|grams|gram|g|kg|ml|l|oz)\b/g,'');
  s = s.replace(/[.,()]/g,'').replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,' ').trim();
  if (!s) return '';
  // simple plural handling: strip trailing 's' for common plurals (naive)
  const exceptions = new Set(['cheese','oil','fish','beef','pork','milk','sugar']);
  s = s.split(' ').map(w => {
    if (!w) return w;
    if (exceptions.has(w)) return w;
    if (w.endsWith("es") && w.length > 3) return w.slice(0, -2);
    if (w.endsWith('s') && w.length > 2) return w.slice(0, -1);
    return w;
  }).join(' ');
  // apply synonyms mapping for multi-word keys first
  for (const [k, v] of Object.entries(INGREDIENT_SYNONYMS)) {
    const re = new RegExp('\\b' + escapeRegExp(k) + '\\b', 'i');
    if (re.test(s)) { s = s.replace(re, v); }
  }
  // stem tokens
  s = s.split(' ').map(tok => stemWord(tok)).join(' ').trim();
  return s;
}

function computeRecipeMatch(recipe) {
  const invCanon = inventory.map(i => normalizeIngredient(i.name || ''));
  const available = [];
  const missing = [];
  const perIngredient = []; // [{ orig, norm, available: bool }]
  for (const ing of recipe.ingredients) {
    const n = normalizeIngredient(ing);
    // treat match as token overlap (inventory token included in ingredient or vice-versa)
    let found = invCanon.some(inv => {
      if (!inv || !n) return false;
      if (inv === n || inv.includes(n) || n.includes(inv)) return true;
      const invTokens = inv.split(' ');
      const nTokens = n.split(' ');
      // token overlap
      if (invTokens.some(tok => nTokens.includes(tok))) return true;
      // fuzzy token match: allow short typos by levenshtein distance threshold
      for (const a of invTokens) {
        for (const b of nTokens) {
          if (!a || !b) continue;
          const maxLen = Math.max(a.length, b.length);
          const dist = levenshtein(a, b);
          // threshold: allow up to 20% of length as typos, min 1
          if (dist > 0 && dist <= Math.max(1, Math.floor(maxLen * 0.2))) return true;
        }
      }
      return false;
    });
    if (found) { available.push(ing); perIngredient.push({ orig: ing, norm: n, available: true }); }
    else { missing.push(ing); perIngredient.push({ orig: ing, norm: n, available: false }); }
  }
  return { availableCount: available.length, total: recipe.ingredients.length, missing, perIngredient };
}

function renderRecipes() {
  const container = document.getElementById('recipesList'); if (!container) return;
  container.innerHTML = '';
  const q = document.getElementById('recipeSearch')?.value.trim().toLowerCase() || '';
  const dietFilter = document.getElementById('recipeDietFilter')?.value || 'all';
  const sortMode = document.getElementById('recipeSort')?.value || 'recommended';

  // prepare sorted list
  const list = recipes.map(r => {
    const match = computeRecipeMatch(r);
    return { ...r, match };
  }).filter(r => {
    // diet filter
    if (dietFilter !== 'all' && !(r.diet || []).includes(dietFilter)) return false;
    // search
    if (q) {
      const hay = (r.title + ' ' + r.ingredients.join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // sort according to recipeSort control
  if (sortMode === 'recommended') {
    list.sort((a,b) => (b.match.availableCount / b.match.total) - (a.match.availableCount / a.match.total));
  } else if (sortMode === 'missing') {
    // most ingredients match -> descending by availableCount
    list.sort((a,b) => (b.match.availableCount - a.match.availableCount) || (a.title.localeCompare(b.title)));
  } else if (sortMode === 'time') {
    list.sort((a,b) => (a.time || 0) - (b.time || 0));
  }

  for (const r of list) {
    const card = document.createElement('div'); card.className = 'recipe-card';
    const head = document.createElement('div'); head.className = 'card-header';
    const left = document.createElement('div'); left.style.display = 'flex'; left.style.alignItems = 'center'; left.style.gap = '8px';
    const h3 = document.createElement('h3'); h3.textContent = r.title; left.appendChild(h3);
    // diet badges
    if (Array.isArray(r.diet)) {
      for (const d of r.diet) {
        const db = document.createElement('span'); db.className = 'diet-badge diet-' + String(d).toLowerCase().replace(/[^a-z0-9]+/g,'-'); db.textContent = d.charAt(0).toUpperCase() + d.slice(1);
        left.appendChild(db);
      }
    }
    head.appendChild(left);
    const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = `${r.match.availableCount}/${r.match.total} ingredients available • ${r.time} min`;
    head.appendChild(meta);
    const toggle = document.createElement('button'); toggle.className = 'toggle-btn'; toggle.textContent = '+'; toggle.onclick = () => card.classList.toggle('expanded'); head.appendChild(toggle);
    card.appendChild(head);

    const content = document.createElement('div'); content.className = 'card-content';
    const ingDiv = document.createElement('div'); ingDiv.className = 'ingredients'; const h4 = document.createElement('h4'); h4.textContent = 'Ingredients'; ingDiv.appendChild(h4);
    const ul = document.createElement('ul');
    // use perIngredient availability if present
    const per = (r.match && r.match.perIngredient) || r.ingredients.map(i => ({ orig: i, norm: normalizeIngredient(i), available: false }));
    for (const p of per) {
      const li = document.createElement('li');
      const pill = document.createElement('span');
      pill.className = 'ing-pill ' + (p.available ? 'ing-available' : 'ing-missing');
  pill.textContent = p.available ? '✓' : '✕';
  pill.title = p.available ? 'Available in inventory' : 'Missing from inventory (✕)';
      const text = document.createElement('span'); text.textContent = ' ' + toTitleCase(p.orig);
      li.appendChild(pill); li.appendChild(text); ul.appendChild(li);
    }
    ingDiv.appendChild(ul);
    content.appendChild(ingDiv);
    const stepsDiv = document.createElement('div'); stepsDiv.className = 'steps'; const h4s = document.createElement('h4'); h4s.textContent = 'Steps'; stepsDiv.appendChild(h4s);
    const ol = document.createElement('ol'); for (const s of r.steps) { const li = document.createElement('li'); li.textContent = s; ol.appendChild(li); } stepsDiv.appendChild(ol);
    content.appendChild(stepsDiv);

    // actions
    const actions = document.createElement('div'); actions.className = 'card-actions';
    const addBtn = document.createElement('button'); addBtn.className = 'btn'; addBtn.textContent = 'Add missing to Shopping';
    addBtn.onclick = () => {
      const missing = computeRecipeMatch(r).missing;
      if (!missing || missing.length === 0) return;
      showConfirmMissingModal(missing);
    };
    actions.appendChild(addBtn);
    content.appendChild(actions);

    card.appendChild(content);
    container.appendChild(card);
  }
  // apply allergy filtering on the rendered set
  filterRecipesByAllergies();
}

// wire recipe controls
const recipeSearch = document.getElementById('recipeSearch');
const recipeDietFilter = document.getElementById('recipeDietFilter');
if (recipeSearch) recipeSearch.addEventListener('input', () => renderRecipes());
if (recipeDietFilter) recipeDietFilter.addEventListener('change', () => renderRecipes());

// render initially
renderRecipes();

// wiring
const addAllergyBtn = document.getElementById('addAllergyBtn');
const allergyInput = document.getElementById('allergyInput');
const saveSettingsBtn = document.getElementById('saveSettings');
const resetSettingsBtn = document.getElementById('resetSettings');

if (addAllergyBtn && allergyInput) addAllergyBtn.onclick = () => {
  const v = String(allergyInput.value || '').trim(); if (!v) return; settings.allergies = Array.from(new Set([...(settings.allergies || []), v])); allergyInput.value = ''; persistSettings(); renderSettings(); };

if (saveSettingsBtn) saveSettingsBtn.onclick = () => { saveSettingsFromForm(); };
if (resetSettingsBtn) resetSettingsBtn.onclick = () => { settings = {}; persistSettings(); renderSettings(); };

loadSettings();
// apply recipe filtering initially
filterRecipesByAllergies();
// call filtering after settings change
if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => filterRecipesByAllergies());
if (resetSettingsBtn) resetSettingsBtn.addEventListener('click', () => filterRecipesByAllergies());

/* ---------- Confirm-missing modal wiring ---------- */
const confirmModal = document.getElementById('confirmMissingModal');
const missingListEl = document.getElementById('missingList');
const confirmAddMissingBtn = document.getElementById('confirmAddMissing');
const cancelConfirmMissingBtn = document.getElementById('cancelConfirmMissing');
const closeConfirmMissingBtn = document.getElementById('closeConfirmMissing');

function showConfirmMissingModal(missing) {
  if (!confirmModal || !missingListEl) return;
  missingListEl.innerHTML = '';
  // build a checkbox list
  for (const m of missing) {
    const id = 'miss_' + cid();
    const lab = document.createElement('label'); lab.style.display = 'block';
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.id = id; chk.checked = true; chk.dataset.name = String(m).trim();
    const span = document.createElement('span'); span.textContent = ' ' + toTitleCase(m);
    lab.appendChild(chk); lab.appendChild(span);
    missingListEl.appendChild(lab);
  }
  confirmModal.classList.add('show'); confirmModal.setAttribute('aria-hidden','false');
}

function hideConfirmMissingModal() { if (!confirmModal) return; confirmModal.classList.remove('show'); confirmModal.setAttribute('aria-hidden','true'); }

function confirmAddMissingHandler() {
  if (!missingListEl) return;
  const checks = Array.from(missingListEl.querySelectorAll('input[type="checkbox"]'));
  const noticeEl = document.getElementById('confirmNotice');
  if (noticeEl) { noticeEl.style.display = 'none'; noticeEl.textContent = ''; }
  let added = false;
  const skipped = [];
  for (const c of checks) {
    if (!c.checked) continue;
    const rawName = String(c.dataset.name || '').trim();
    if (!rawName) continue;
    const exists = shopping.some(s => String(s.name || '').trim().toLowerCase() === rawName.toLowerCase());
    if (exists) {
      skipped.push(toTitleCase(rawName));
      continue;
    }
    // add as recipe-sourced item, store in Title Case for consistency
    const name = toTitleCase(rawName);
    shopping.push({ id: cid(), name, category: 'other', bought: false, autoAdded: false, reason: 'recipe' });
    added = true;
  }
  if (added) { persistShop(); renderShopping(); }
  // show skipped/duplicate notice if any
  if (skipped.length && noticeEl) {
    noticeEl.textContent = 'Items are already in the shopping list: ' + skipped.join(', ');
    noticeEl.style.display = '';
    // keep the modal open so user can see the notice; they may close when ready
  } else {
    // no skips — close modal after adding
    hideConfirmMissingModal();
  }
}

if (cancelConfirmMissingBtn) cancelConfirmMissingBtn.onclick = hideConfirmMissingModal;
if (closeConfirmMissingBtn) closeConfirmMissingBtn.onclick = hideConfirmMissingModal;
if (confirmAddMissingBtn) confirmAddMissingBtn.onclick = confirmAddMissingHandler;
if (confirmModal) confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) hideConfirmMissingModal(); });
