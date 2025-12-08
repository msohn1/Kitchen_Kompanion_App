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

/* ---------- On-screen keyboard simulation (mobile) ---------- */
(() => {
  const root = document.documentElement;
  let initialInnerHeight = window.innerHeight || document.documentElement.clientHeight;
  let keyboardOpen = false;
  let spacerEl = null;

  function ensureSpacer() {
    if (spacerEl) return spacerEl;
    spacerEl = document.createElement('div');
    spacerEl.id = 'keyboard-spacer';
    spacerEl.className = 'keyboard-spacer';
    document.body.appendChild(spacerEl);
    return spacerEl;
  }

  function positionSpacer(px) {
    const app = document.querySelector('.app');
    const s = ensureSpacer();
    s.style.height = px + 'px';
    // align horizontally with the app container when possible
    if (app) {
      const r = app.getBoundingClientRect();
      s.style.left = r.left + 'px';
      s.style.width = r.width + 'px';
      s.style.transform = 'none';
    } else {
      s.style.left = '50%';
      s.style.transform = 'translateX(-50%)';
      s.style.width = getComputedStyle(document.documentElement).getPropertyValue('--app-width') || '640px';
    }
    s.style.display = px > 0 ? 'block' : 'none';
  }

  function setKeyboardHeight(px) {
    root.style.setProperty('--keyboard-height', px + 'px');
    positionSpacer(px);
    document.body.classList.add('keyboard-open');
    keyboardOpen = true;
  }

  function clearKeyboard() {
    root.style.setProperty('--keyboard-height', '0px');
    if (spacerEl) spacerEl.style.display = 'none';
    document.body.classList.remove('keyboard-open');
    keyboardOpen = false;
  }

  // Update initial height if orientation or layout changes significantly
  window.addEventListener('orientationchange', () => {
    initialInnerHeight = window.innerHeight || document.documentElement.clientHeight;
    // reposition spacer in case layout moved
    if (keyboardOpen) positionSpacer(parseInt(getComputedStyle(root).getPropertyValue('--keyboard-height')) || 0);
  });

  // If viewport shrinks (typical when real keyboard shows on mobile), use that delta
  window.addEventListener('resize', () => {
    const nowH = window.innerHeight || document.documentElement.clientHeight;
    const delta = Math.round(initialInnerHeight - nowH);
    if (delta > 120) {
      setKeyboardHeight(delta);
    }
    // reposition spacer to follow any layout changes
    if (keyboardOpen) {
      const val = parseInt(getComputedStyle(root).getPropertyValue('--keyboard-height')) || 0;
      positionSpacer(val);
    }
  });

  // Focus handling: only trigger when input is inside an open modal
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!el) return;
    const tag = (el.tagName || '').toUpperCase();
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !el.isContentEditable) return;
    const modal = el.closest('.modal.show');
    if (!modal) return; // only when editing inside modal

    // compute keyboard height: prefer actual viewport change, otherwise fallback
    const nowH = window.innerHeight || document.documentElement.clientHeight;
    const delta = Math.round(initialInnerHeight - nowH);
    let h = delta > 120 ? delta : Math.min(360, Math.round(initialInnerHeight * 0.38));
    setKeyboardHeight(h);

    // Make sure the focused input is visible in modal
    setTimeout(() => {
      try {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        // reposition spacer after any possible layout shift
        positionSpacer(h);
      } catch (err) {
        // ignore
      }
    }, 60);
  });

  document.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el) return;
    const tag = (el.tagName || '').toUpperCase();
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !el.isContentEditable) return;

    // small debounce to allow focus to move between inputs inside modal
    setTimeout(() => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable) && active.closest('.modal.show')) {
        return; // still focused inside modal
      }
      clearKeyboard();
    }, 150);
  });

  // When modals are hidden, clear keyboard state
  const modals = document.querySelectorAll('.modal');
  modals.forEach((m) => {
    const obs = new MutationObserver(() => {
      if (!m.classList.contains('show')) {
        clearKeyboard();
      }
    });
    obs.observe(m, { attributes: true, attributeFilter: ['class'] });
  });
})();

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
  day: "numeric",
});

const todayEl = document.getElementById("today");
if (todayEl) todayEl.textContent = formattedDate;
/* ---------- Inventory Data ---------- */
const INVENTORY_KEY = "kk_inventory_v1";
let inventory = JSON.parse(localStorage.getItem(INVENTORY_KEY) || "[]");
// Auto-add snooze (prevents immediate reappearance in Shopping after transfer)
const SNOOZE_KEY = "kk_snooze_v1";
const AUTO_ADD_SNOOZE_DAYS = 4; // default snooze window in days
let autoSnooze = {};
try {
  autoSnooze = JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}") || {};
} catch {
  autoSnooze = {};
}
function persistSnooze() {
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(autoSnooze));
}
function setSnooze(name, days = AUTO_ADD_SNOOZE_DAYS) {
  const key = String(name || "")
    .trim()
    .toLowerCase();
  if (!key) return;
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 0));
  autoSnooze[key] = d.toISOString();
  persistSnooze();
}
function isSnoozed(name) {
  const key = String(name || "")
    .trim()
    .toLowerCase();
  if (!key) return false;
  const iso = autoSnooze[key];
  if (!iso) return false;
  const until = new Date(iso);
  if (!until || Number.isNaN(until.getTime())) {
    delete autoSnooze[key];
    persistSnooze();
    return false;
  }
  const now = new Date();
  if (now < until) return true;
  // expired snooze -> cleanup
  delete autoSnooze[key];
  persistSnooze();
  return false;
}

// normalize existing items to ensure category exists
// migration: ensure category exists and try to infer category from name when missing/other
function inferCategoryFromName(name) {
  const s = String(name || "").toLowerCase();
  if (!s) return "other";
  if (/milk|yogurt|butter|cheese|egg|eggs/.test(s)) return "dairy";
  if (/bacon|chicken|beef|pork|salmon|tuna|shrimp|meat/.test(s)) return "protein";
  if (/bread|rice|pasta|flour|cereal|noodle/.test(s)) return "carb";
  if (/spinach|lettuce|tomato|straw|berry|blueber|pea|carrot|produce|veggies|vegetable/.test(s))
    return "veggies";
  if (/frozen|ice|frozen peas|frozen/.test(s)) return "frozen";
  if (/salt|sauce|ketchup|mustard|sugar|spice|condiment/.test(s)) return "condiment";
  return "other";
}

inventory = inventory.map((it) => {
  const category = (it.category || "").toLowerCase();
  const finalCat = category && category !== "other" ? category : inferCategoryFromName(it.name);
  return { ...it, category: finalCat };
});

/* ---------- Inventory UI State ---------- */
let currentFilter = "all"; // all | low | expiring
let currentSearch = "";
let currentCategory = "all"; // all or category key like 'dairy'

/* ---------- Helpers ---------- */
function cid() {
  return Math.random().toString(36).slice(2, 10);
}
function persist() {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
}
function daysUntil(dateISO) {
  if (!dateISO) return "";
  const ms = new Date(dateISO).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(ms / 86400000);
}
function addDaysISO(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// How many days before expiry an item is considered "expiring"
const EXPIRING_DAYS = 3;

function formatDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  const year = d.getFullYear().toString().slice(-2);
  return `${month} ${day}, '${year}`;
}

/* ---------- Filtering ---------- */
function isLow(item) {
  return Number(item.qty) <= Number(item.minQty);
}
function isExpiring(item) {
  const d = daysUntil(item.expiry);
  return typeof d === "number" && d <= EXPIRING_DAYS; // within EXPIRING_DAYS (or overdue)
}
function passesFilter(item) {
  if (currentFilter === "low" && !isLow(item)) return false;
  if (currentFilter === "expiring" && !isExpiring(item)) return false;
  if (
    currentCategory !== "all" &&
    String(item.category || "").toLowerCase() !== String(currentCategory).toLowerCase()
  )
    return false;
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    if (!item.name.toLowerCase().includes(q)) return false;
  }
  return true;
}

// Update visual active state for inventory filter buttons
function updateInventoryFilterButtons() {
  const map = [
    { id: "filterAll", val: "all" },
    { id: "filterLow", val: "low" },
    { id: "filterExpiring", val: "expiring" },
  ];
  for (const m of map) {
    const el = document.getElementById(m.id);
    if (!el) continue;
    if (currentFilter === m.val) el.classList.add("active");
    else el.classList.remove("active");
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
    const nameLine = document.createElement("div");
    nameLine.className = "name-line clickable";
    nameLine.textContent = it.name;
    const openFullEdit = () => showEditItemModal(it.id);
    nameLine.tabIndex = 0;
    nameLine.addEventListener("click", openFullEdit);
    nameLine.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openFullEdit();
      }
    });

    const badgeLine = document.createElement("div");
    badgeLine.className = "badge-line";
    const badgeLeft = document.createElement("div");
    badgeLeft.className = "badge-col left";
    const badgeRight = document.createElement("div");
    badgeRight.className = "badge-col right";
    // primary badges: Low on left, Expiring on right
    if (isLow(it)) {
      const b = document.createElement("span");
      b.className = "badge low";
      b.textContent = "Low";
      badgeLeft.appendChild(b);
    }
    if (isExpiring(it)) {
      const b2 = document.createElement("span");
      b2.className = "badge exp";
      b2.textContent = "Expiring";
      badgeRight.appendChild(b2);
    }
    badgeLine.appendChild(badgeLeft);
    badgeLine.appendChild(badgeRight);
    const tdQty = makeQtyEditableCell(it);
    const tdUnit = domTD("", it.unit || "");
    const tdCat = domTD("category", "");
    if (it.category) {
      const catBadge = document.createElement("span");
      // add a category-specific class, sanitizing the category key to be a valid class name
      const key = String(it.category || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      catBadge.className = "badge cat cat-" + key;
      catBadge.textContent = it.category.charAt(0).toUpperCase() + it.category.slice(1);
      tdCat.appendChild(catBadge);
    }
    const tdExp = makeExpiryEditableCell(it);
    // show category on its own line (unless both Low and Expiring present => hide for spacing)
    const cat = String(it.category || "");
    const showCategory = cat && !(isLow(it) && isExpiring(it));
    tdName.appendChild(nameLine);
    tdName.appendChild(badgeLine);

    const tdAct = document.createElement("td");
    tdAct.className = "action-cell";

    const minusBtn = makeRowBtn("−", () => adjustQty(it.id, -1));
    minusBtn.classList.add("small");
    const plusBtn = makeRowBtn("+", () => adjustQty(it.id, +1));
    plusBtn.classList.add("small");
    const delBtn = makeRowBtn("×", () => removeItem(it.id));
    delBtn.classList.add("danger", "small");

    // layout: single horizontal row with minus, plus, Delete
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "row-actions";
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

/* ---------- Edit full inventory item modal ---------- */
const editItemModal = document.getElementById("editItemModal");
const closeEditItemModalBtn = document.getElementById("closeEditItemModal");
const editItemForm = document.getElementById("editItemForm");
const cancelEditItemBtn = document.getElementById("cancelEditItem");
// inputs
const editItemIdInput = document.getElementById("editItemId");
const editItemNameInput = document.getElementById("editItemName");
const editItemQtyInput = document.getElementById("editItemQty");
const editItemUnitInput = document.getElementById("editItemUnit");
const editItemMinQtyInput = document.getElementById("editItemMinQty");
const editItemExpiryInput = document.getElementById("editItemExpiry");
const editItemCategorySelect = document.getElementById("editItemCategory");

function showEditItemModal(id) {
  if (!editItemModal) return;
  const it = inventory.find((x) => x.id === id);
  if (!it) return;
  editItemIdInput.value = it.id;
  editItemNameInput.value = it.name || "";
  editItemQtyInput.value = String(Number(it.qty) || 0);
  editItemUnitInput.value = it.unit || "";
  editItemMinQtyInput.value = String(Number(it.minQty) || 0);
  editItemExpiryInput.value = it.expiry && /^\d{4}-\d{2}-\d{2}$/.test(String(it.expiry)) ? it.expiry : "";
  editItemCategorySelect.value = String(it.category || "other").toLowerCase();
  editItemModal.classList.add("show");
  editItemModal.setAttribute("aria-hidden", "false");
  setTimeout(() => editItemNameInput?.focus(), 0);
}

function hideEditItemModal() {
  if (!editItemModal) return;
  editItemModal.classList.remove("show");
  editItemModal.setAttribute("aria-hidden", "true");
}

if (closeEditItemModalBtn) closeEditItemModalBtn.onclick = hideEditItemModal;
if (cancelEditItemBtn) cancelEditItemBtn.onclick = hideEditItemModal;
if (editItemModal)
  editItemModal.addEventListener("click", (e) => {
    if (e.target === editItemModal) hideEditItemModal();
  });

if (editItemForm)
  editItemForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = editItemIdInput.value;
    const it = inventory.find((x) => x.id === id);
    if (!it) {
      hideEditItemModal();
      return;
    }
    const nextName = String(editItemNameInput.value || "").trim();
    const qtyVal = Number(editItemQtyInput.value);
    const minQtyVal = Number(editItemMinQtyInput.value);
    const unitVal = String(editItemUnitInput.value || "");
    const expiryVal = String(editItemExpiryInput.value || "");
    const catVal = String(editItemCategorySelect.value || "other").toLowerCase();

    if (!nextName) {
      await confirmDialog("Name is required.", { title: "Edit item", okText: "OK" });
      return;
    }
    if (!Number.isFinite(qtyVal) || qtyVal < 0) {
      await confirmDialog("Quantity must be a non-negative number.", { title: "Edit item", okText: "OK" });
      return;
    }
    if (!Number.isFinite(minQtyVal) || minQtyVal < 0) {
      await confirmDialog("Min qty must be a non-negative number.", { title: "Edit item", okText: "OK" });
      return;
    }
    // Prevent duplicate names (case-insensitive) except for this same item
    const dup = inventory.some(
      (x) => x.id !== id && String(x.name || "").trim().toLowerCase() === nextName.toLowerCase()
    );
    if (dup) {
      await confirmDialog(`"${nextName}" is already in your Inventory. Choose a different name.`, {
        title: "Duplicate item",
        okText: "OK",
      });
      return;
    }
    // If qty <= 0, confirm deletion instead of saving
    if (qtyVal <= 0) {
      hideEditItemModal();
      const ok = await confirmDialog(
        `Set quantity to ${qtyVal}. Delete "${it.name}" from inventory?`,
        { title: "Delete item", okText: "Confirm" }
      );
      if (!ok) {
        // reopen for correction
        showEditItemModal(id);
        return;
      }
      inventory = inventory.filter((x) => x.id !== id);
      persist();
      renderInventory();
      return;
    }

    // Apply updates
    it.name = nextName;
    it.qty = qtyVal;
    it.unit = unitVal;
    it.minQty = minQtyVal;
    it.expiry = expiryVal;
    it.category = catVal || "other";
    persist();
    renderInventory();
    hideEditItemModal();
  });

// Ensure items that are low or expiring exist in the shopping list (no duplicates)
function syncLowExpiringToShopping() {
  if (!Array.isArray(shopping)) shopping = [];
  let added = false;
  // first cleanup any auto-added items that are no longer applicable
  cleanupAutoAddedShopping();
  for (const it of inventory) {
    if (!it || !it.name) continue;
    // Skip if recently transferred and within snooze window
    if (isSnoozed(it.name)) continue;
    if (isLow(it) || isExpiring(it)) {
      const key = String(it.name).trim().toLowerCase();
      const exists = shopping.some(
        (s) =>
          String(s.name || "")
            .trim()
            .toLowerCase() === key
      );
      if (!exists) {
        // determine reason
        const low = isLow(it);
        const exp = isExpiring(it);
        const reason = low && exp ? "both" : low ? "low" : exp ? "expiring" : "auto";
        shopping.push({
          id: cid(),
          name: it.name,
          qty: 1,
          category: String(it.category || "other").toLowerCase(),
          bought: false,
          autoAdded: true,
          reason,
        });
        added = true;
      }
    }
  }
  // update reason for existing auto items if necessary
  for (const s of shopping) {
    if (!s.autoAdded) continue;
    const inv = inventory.find(
      (i) =>
        String(i.name || "")
          .trim()
          .toLowerCase() ===
        String(s.name || "")
          .trim()
          .toLowerCase()
    );
    if (inv) {
      const low = isLow(inv);
      const exp = isExpiring(inv);
      const reason = low && exp ? "both" : low ? "low" : exp ? "expiring" : "auto";
      if (s.reason !== reason) {
        s.reason = reason;
        added = true;
      }
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
function fmtNum(n) {
  const v = Number(n);
  return Number.isFinite(v) ? (v % 1 ? v.toFixed(2) : String(v)) : "";
}
function makeRowBtn(label, fn) {
  const b = document.createElement("button");
  b.className = "btn row-btn";
  b.textContent = label;
  b.onclick = fn;
  return b;
}

// Editable cells for Inventory Qty and Expiry
function makeQtyEditableCell(it) {
  const td = document.createElement("td");
  td.className = "num editable-cell editable-qty";
  td.textContent = fmtNum(it.qty);
  td.tabIndex = 0;
  const openModal = () => showEditCellModal(it.id, "qty");
  td.addEventListener("click", openModal);
  td.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal();
    }
  });
  return td;
}

function makeExpiryEditableCell(it) {
  const td = document.createElement("td");
  td.className = "editable-cell editable-expiry";
  td.textContent = formatDateShort(it.expiry || "");
  td.tabIndex = 0;
  const openModal = () => showEditCellModal(it.id, "expiry");
  td.addEventListener("click", openModal);
  td.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal();
    }
  });
  return td;
}

function makeShopQtyEditableCell(it) {
  const td = document.createElement("td");
  td.className = "num editable-cell editable-qty";
  td.textContent = it.qty || 1;
  td.tabIndex = 0;
  const openModal = () => showEditCellModal(it.id, "qty", "shopping");
  td.addEventListener("click", openModal);
  td.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal();
    }
  });
  return td;
}

/* ---------- Mutations ---------- */
async function addItemFromForm(form) {
  const data = new FormData(form);
  const item = {
    id: cid(),
    name: String(data.get("name")).trim(),
    qty: Number(data.get("qty")),
    unit: String(data.get("unit") || ""),
    minQty: Number(data.get("minQty")),
    expiry: String(data.get("expiry") || ""),
    category: String(data.get("category") || "other").toLowerCase(),
  };
  if (!item.name) return false;
  // Prevent duplicates by name (case-insensitive)
  const exists = inventory.some(
    (x) =>
      String(x.name || "")
        .trim()
        .toLowerCase() === item.name.toLowerCase()
  );
  if (exists) {
    await confirmDialog(
      `"${item.name}" is already in your Inventory. Adjust its quantity instead.`,
      { title: "Duplicate item", okText: "OK" }
    );
    return false;
  }
  inventory.push(item);
  persist();
  renderInventory();
  return true;
}

async function removeItem(id) {
  const it = inventory.find((x) => x.id === id);
  const name = it?.name || "this item";
  const ok = await confirmDialog(`Are you sure you want to delete "${name}" from inventory?`, {
    title: "Delete item",
    okText: "Confirm",
  });
  if (!ok) return;
  inventory = inventory.filter((x) => x.id !== id);
  persist();
  renderInventory();
}

async function adjustQty(id, delta) {
  const it = inventory.find((x) => x.id === id);
  if (!it) return;
  const current = Number(it.qty) || 0;
  const next = current + delta;
  // If decrement would take qty to 0 or below, confirm delete instead of setting 0
  if (next <= 0) {
    const ok = await confirmDialog(
      `Quantity would be ${next}. Delete "${it.name}" from inventory?`,
      { title: "Delete item", okText: "Confirm" }
    );
    if (!ok) return; // Do not change qty
    // Inline delete to avoid double-confirm
    inventory = inventory.filter((x) => x.id !== id);
    persist();
    renderInventory();
    return;
  }
  it.qty = next;
  persist();
  renderInventory();
}

/* ---------- Modal Controls ---------- */
const addModal = document.getElementById("addModal");
function showAddModal() {
  if (!addModal) return;
  addModal.classList.add("show");
  addModal.setAttribute("aria-hidden", "false");
}
function hideAddModal() {
  if (!addModal) return;
  addModal.classList.remove("show");
  addModal.setAttribute("aria-hidden", "true");
}

/* ---------- Shopping Data & UI ---------- */
const SHOPPING_KEY = "kk_shopping_v1";
let shopping = JSON.parse(localStorage.getItem(SHOPPING_KEY) || "[]");

function persistShop() {
  localStorage.setItem(SHOPPING_KEY, JSON.stringify(shopping));
}

// If this is a new user (both lists empty), provide a small set of sample data
if ((inventory.length || 0) === 0 && (shopping.length || 0) === 0) {
  inventory = [
    { id: cid(), name: "Milk", qty: 0.5, unit: "gal", minQty: 0.5, expiry: addDaysISO(3), category: "dairy" },
    { id: cid(), name: "Eggs", qty: 6, unit: "pcs", minQty: 6, expiry: addDaysISO(7), category: "dairy" },
    { id: cid(), name: "Spinach", qty: 0.2, unit: "lb", minQty: 0.3, expiry: addDaysISO(2), category: "veggies" },
    { id: cid(), name: "Greek Yogurt", qty: 1, unit: "ct", minQty: 1, expiry: addDaysISO(10), category: "dairy" },
    { id: cid(), name: "Bacon", qty: 0.2, unit: "lb", minQty: 0.3, expiry: addDaysISO(5), category: "protein" },
  ];

  shopping = [
    { id: cid(), name: "Bread", qty: 1, category: "bakery", bought: false, autoAdded: false, reason: "sample" },
    { id: cid(), name: "Cheese", qty: 3, category: "dairy", bought: false, autoAdded: false, reason: "sample" },
    { id: cid(), name: "Tomato", qty: 4, category: "veggies", bought: false, autoAdded: false, reason: "sample" },
  ];

  persist();
  persistShop();
}

function renderShopping() {
  const tbody = document.getElementById("shopBody");
  const empty = document.getElementById("shopEmpty");
  if (!tbody || !empty) return;
  tbody.innerHTML = "";
  const filterCat = document.getElementById("shopFilterCategory")?.value || "all";
  const q = document.getElementById("shopSearch")?.value.trim().toLowerCase() || "";
  const autoFilter = document.getElementById("shopAutoFilter")?.value || "all";
  const shown = shopping
    .filter((it) => {
      if (filterCat !== "all" && String(it.category || "").toLowerCase() !== filterCat)
        return false;
      if (
        q &&
        !String(it.name || "")
          .toLowerCase()
          .includes(q)
      )
        return false;
      // autoFilter: all | auto | manual
      if (autoFilter === "auto" && !it.autoAdded) return false;
      if (autoFilter === "manual" && it.autoAdded) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  if (shown.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  for (const it of shown) {
    const tr = document.createElement("tr");
    // checkbox column
    const tdChk = document.createElement("td");
    tdChk.className = "chk-col";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = !!it.bought;
    chk.className = "row-check";
    chk.onchange = () => {
      toggleBought(it.id);
    };
    tdChk.appendChild(chk);

    const tdName = document.createElement("td");
    const nameLine = document.createElement("div");
    nameLine.className = "name-line";
    nameLine.textContent = it.name;
    if (it.bought) nameLine.style.textDecoration = "line-through";
    const badgeLine = document.createElement("div");
    badgeLine.className = "badge-line";
    tdName.append(nameLine, badgeLine);

    // Quantity column - editable with modal
    const tdQty = makeShopQtyEditableCell(it);

    const tdCat = document.createElement("td");
    if (it.category) {
      const c = document.createElement("span");
      c.className =
        "badge cat cat-" +
        String(it.category)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
      c.textContent = it.category.charAt(0).toUpperCase() + it.category.slice(1);
      tdCat.appendChild(c);
    }
    // visual marker for auto-added items
    if (it.autoAdded) {
      const autoMark = document.createElement("span");
      autoMark.className = "auto-mark";
      autoMark.title = "Automatically added from inventory (low/expiring)";
      autoMark.setAttribute("role", "img");
      autoMark.setAttribute("aria-label", "Auto-added");
      // textual Auto marker for clarity
      autoMark.textContent = "Auto";
      tdCat.appendChild(autoMark);
    }

    // Source column (manual | low | expiring | both)
    const tdSource = document.createElement("td");
    const src = String(it.reason || (it.autoAdded ? "auto" : "manual"));
    const srcBadge = document.createElement("span");
    srcBadge.className = "source-badge source-" + src.replace(/[^a-z0-9]+/g, "-");
    // user-friendly text
    const labelMap = {
      manual: "Manual",
      low: "Low",
      expiring: "Expiring",
      both: "Low & Expiring",
      auto: "Auto",
      recipe: "Recipe",
    };
    srcBadge.textContent = labelMap[src] || src;
    tdSource.appendChild(srcBadge);

    const tdAct = document.createElement("td");
    tdAct.className = "action-cell";
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "row-actions";

    // Add -/+ buttons and Delete button in same row
    const minusBtn = document.createElement("button");
    minusBtn.className = "btn row-btn small";
    minusBtn.textContent = "−";
    minusBtn.onclick = () => adjustShopQty(it.id, -1);

    const plusBtn = document.createElement("button");
    plusBtn.className = "btn row-btn small";
    plusBtn.textContent = "+";
    plusBtn.onclick = () => adjustShopQty(it.id, +1);

    const del = document.createElement("button");
    del.className = "btn row-btn danger small";
    del.textContent = "×";
    del.onclick = () => removeShopItem(it.id);

    actionsWrap.append(minusBtn, plusBtn, del);
    tdAct.append(actionsWrap);

    // mark row visually when auto-added
    if (it.autoAdded) tr.classList.add("auto-row");
    // mark row visually when recipe-sourced
    if ((it.reason || "").toLowerCase() === "recipe") tr.classList.add("row-source-recipe");
    tr.append(tdChk, tdName, tdQty, tdCat, tdSource, tdAct);
    tbody.appendChild(tr);
  }
}

// Remove auto-added shopping items when their inventory source is no longer low/expiring
function cleanupAutoAddedShopping() {
  if (!Array.isArray(shopping) || !Array.isArray(inventory)) return;
  const preserved = [];
  let changed = false;
  for (const s of shopping) {
    if (!s.autoAdded) {
      preserved.push(s);
      continue;
    }
    // find matching inventory item by name
    const key = String(s.name || "")
      .trim()
      .toLowerCase();
    const inv = inventory.find(
      (i) =>
        String(i.name || "")
          .trim()
          .toLowerCase() === key
    );
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
  if (changed) {
    shopping = preserved;
    persistShop();
    renderShopping();
  }
}

async function addShopItemFromForm(form) {
  const data = new FormData(form);
  const item = {
    id: cid(),
    name: String(data.get("name")).trim(),
    qty: Number(data.get("qty")) || 1,
    category: String(data.get("category") || "other").toLowerCase(),
    bought: false,
    autoAdded: false,
    reason: "manual",
  };
  if (!item.name) return false;
  // Prevent duplicates in Shopping by name (case-insensitive)
  const exists = shopping.some(
    (x) =>
      String(x.name || "")
        .trim()
        .toLowerCase() === item.name.toLowerCase()
  );
  if (exists) {
    await confirmDialog(
      `"${item.name}" is already in your Shopping list. Adjust its quantity instead.`,
      { title: "Duplicate item", okText: "OK" }
    );
    return false;
  }
  shopping.push(item);
  persistShop();
  renderShopping();
  return true;
}

async function removeShopItem(id) {
  const it = shopping.find((x) => x.id === id);
  const name = it?.name || "this item";
  const ok = await confirmDialog(`Are you sure you want to delete "${name}" from shopping?`, {
    title: "Delete item",
    okText: "Confirm",
  });
  if (!ok) return;
  shopping = shopping.filter((x) => x.id !== id);
  persistShop();
  renderShopping();
}

async function adjustShopQty(id, delta) {
  const it = shopping.find((x) => x.id === id);
  if (!it) return;
  const current = Number(it.qty) || 1;
  const next = current + delta;
  if (next <= 0) {
    const ok = await confirmDialog(
      `Quantity would be ${next}. Delete "${it.name}" from shopping?`,
      { title: "Delete item", okText: "Confirm" }
    );
    if (!ok) return; // Do not change qty
    // Inline delete to avoid double-confirm
    shopping = shopping.filter((x) => x.id !== id);
    persistShop();
    renderShopping();
    return;
  }
  it.qty = next;
  persistShop();
  renderShopping();
}

function toggleBought(id) {
  const it = shopping.find((x) => x.id === id);
  if (!it) return;
  it.bought = !it.bought;
  persistShop();
  renderShopping();
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
const openAddShopBtn = document.getElementById("openAddShopModal");
const closeAddShopBtn = document.getElementById("closeAddShopModal");
const cancelAddShopBtn = document.getElementById("cancelAddShop");
const addShopForm = document.getElementById("addShopForm");
const shopFilterCategory = document.getElementById("shopFilterCategory");
const shopSearch = document.getElementById("shopSearch");
const shopAutoFilter = document.getElementById("shopAutoFilter");
const transferBoughtBtn = document.getElementById("transferBought");

if (fFilterAll)
  fFilterAll.onclick = () => {
    currentFilter = "all";
    renderInventory();
  };
if (fFilterLow)
  fFilterLow.onclick = () => {
    currentFilter = "low";
    renderInventory();
  };
if (fFilterExp)
  fFilterExp.onclick = () => {
    currentFilter = "expiring";
    renderInventory();
  };
if (fFilterCategory)
  fFilterCategory.addEventListener("change", (e) => {
    currentCategory = e.target.value;
    renderInventory();
  });
if (fSearch)
  fSearch.addEventListener("input", (e) => {
    currentSearch = e.target.value.trim();
    renderInventory();
  });

if (openAddBtn) openAddBtn.onclick = showAddModal;
if (closeAddBtn) closeAddBtn.onclick = hideAddModal;
if (cancelAddBtn) cancelAddBtn.onclick = hideAddModal;
if (addModal)
  addModal.addEventListener("click", (e) => {
    if (e.target === addModal) hideAddModal();
  });

if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = await addItemFromForm(e.target);
    if (ok) {
      e.target.reset();
      hideAddModal();
    }
  });
}

// Shopping modal wiring
const addShopModal = document.getElementById("addShopModal");
function showAddShopModal() {
  if (!addShopModal) return;
  addShopModal.classList.add("show");
  addShopModal.setAttribute("aria-hidden", "false");
}
function hideAddShopModal() {
  if (!addShopModal) return;
  addShopModal.classList.remove("show");
  addShopModal.setAttribute("aria-hidden", "true");
}

if (openAddShopBtn) openAddShopBtn.onclick = showAddShopModal;
if (closeAddShopBtn) closeAddShopBtn.onclick = hideAddShopModal;
if (cancelAddShopBtn) cancelAddShopBtn.onclick = hideAddShopModal;
if (addShopModal)
  addShopModal.addEventListener("click", (e) => {
    if (e.target === addShopModal) hideAddShopModal();
  });
if (addShopForm) {
  addShopForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = await addShopItemFromForm(e.target);
    if (ok) {
      e.target.reset();
      hideAddShopModal();
    }
  });
}
if (shopFilterCategory) shopFilterCategory.addEventListener("change", () => renderShopping());
if (shopSearch) shopSearch.addEventListener("input", () => renderShopping());
if (shopAutoFilter) shopAutoFilter.addEventListener("change", () => renderShopping());
if (transferBoughtBtn)
  transferBoughtBtn.onclick = async () => {
    const purchased = (shopping || []).filter((it) => !!it.bought);
    const count = purchased.length;
    if (count === 0) {
      // Friendly notice using confirm dialog fallback
      await confirmDialog(
        "No purchased items are checked. Mark items as bought first, then try again.",
        { title: "Nothing to Transfer", okText: "OK" }
      );
      return;
    }
    const ok = await confirmDialog(
      `Transfer ${count} purchased item${count > 1 ? "s" : ""} to Inventory? This will add quantities to existing items (if names match) or create new items, and remove them from Shopping.`,
      { title: "Transfer to Inventory", okText: "Confirm" }
    );
    if (!ok) return;
    transferPurchasedToInventory(purchased);
  };

/* ---------- Edit inventory cell modal (Qty/Expiry) ---------- */
const editCellModal = document.getElementById("editCellModal");
const closeEditCellModalBtn = document.getElementById("closeEditCellModal");
const editCellTitle = document.getElementById("editCellTitle");
const editCellForm = document.getElementById("editCellForm");
const editQtyLabel = document.getElementById("editQtyLabel");
const editQtyInput = document.getElementById("editQtyInput");
const editExpiryLabel = document.getElementById("editExpiryLabel");
const editExpiryInput = document.getElementById("editExpiryInput");
const cancelEditCellBtn = document.getElementById("cancelEditCell");

let currentEdit = { id: null, field: null, source: "inventory" };

function showEditCellModal(id, field, source = "inventory") {
  const it =
    source === "shopping" ? shopping.find((x) => x.id === id) : inventory.find((x) => x.id === id);
  if (!it || !editCellModal) return;
  currentEdit = { id, field, source };
  if (field === "qty") {
    editCellTitle.textContent = "Edit Quantity";
    editQtyLabel.style.display = "";
    editExpiryLabel.style.display = "none";
    editQtyInput.value = String(Number(it.qty) || (source === "shopping" ? 1 : 0));
    setTimeout(() => editQtyInput?.focus(), 0);
  } else {
    editCellTitle.textContent = "Edit Expiry";
    editQtyLabel.style.display = "none";
    editExpiryLabel.style.display = "";
    editExpiryInput.value =
      it.expiry && /^\d{4}-\d{2}-\d{2}$/.test(String(it.expiry)) ? it.expiry : "";
    setTimeout(() => editExpiryInput?.focus(), 0);
  }
  editCellModal.classList.add("show");
  editCellModal.setAttribute("aria-hidden", "false");
}
function hideEditCellModal() {
  if (!editCellModal) return;
  editCellModal.classList.remove("show");
  editCellModal.setAttribute("aria-hidden", "true");
  currentEdit = { id: null, field: null, source: "inventory" };
}

if (closeEditCellModalBtn) closeEditCellModalBtn.onclick = hideEditCellModal;
if (cancelEditCellBtn) cancelEditCellBtn.onclick = hideEditCellModal;
if (editCellModal)
  editCellModal.addEventListener("click", (e) => {
    if (e.target === editCellModal) hideEditCellModal();
  });
if (editCellForm)
  editCellForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const source = currentEdit.source;
    const it =
      source === "shopping"
        ? shopping.find((x) => x.id === currentEdit.id)
        : inventory.find((x) => x.id === currentEdit.id);
    if (!it) {
      hideEditCellModal();
      return;
    }
    if (currentEdit.field === "qty") {
      const v = Number(editQtyInput.value);
      if (!Number.isFinite(v)) {
        return;
      }
      // If new qty is <= 0, confirm deletion instead of saving 0
      if (v <= 0) {
        const state = { ...currentEdit };
        const prevVal = String(editQtyInput.value);
        // Close the edit modal first so the confirmation shows immediately
        hideEditCellModal();
        const msg = `Set quantity to ${v}. Delete \"${it.name}\" from ${source === "shopping" ? "shopping" : "inventory"}?`;
        const ok = await confirmDialog(msg, { title: "Delete item", okText: "Confirm" });
        if (!ok) {
          // Re-open the edit modal so the user can adjust the value
          showEditCellModal(state.id, state.field, state.source);
          if (state.field === "qty") {
            editQtyInput.value = prevVal;
            setTimeout(() => editQtyInput?.focus(), 0);
          }
          return;
        }
        // Inline delete to avoid double-confirm
        if (source === "shopping") {
          shopping = shopping.filter((x) => x.id !== state.id);
          persistShop();
          renderShopping();
        } else {
          inventory = inventory.filter((x) => x.id !== state.id);
          persist();
          renderInventory();
        }
        // edit modal is already hidden
        return;
      }
      it.qty = v;
    } else {
      // expiry can be blank
      it.expiry = String(editExpiryInput.value || "");
    }
    if (source === "shopping") {
      persistShop();
      renderShopping();
    } else {
      persist();
      renderInventory();
    }
    hideEditCellModal();
  });

function transferPurchasedToInventory(items) {
  if (!Array.isArray(items) || items.length === 0) return;
  let invChanged = false;
  // 1) Merge into Inventory first
  for (const s of items) {
    if (!s || !s.name) continue;
    const key = String(s.name).trim().toLowerCase();
    const inv = inventory.find(
      (i) =>
        String(i.name || "")
          .trim()
          .toLowerCase() === key
    );
    if (inv) {
      const addQty = Number(s.qty) || 1;
      inv.qty = (Number(inv.qty) || 0) + addQty;
      invChanged = true;
    } else {
      const cat = String(s.category || "").toLowerCase() || inferCategoryFromName(s.name);
      inventory.push({
        id: cid(),
        name: toTitleCase(s.name),
        qty: Number(s.qty) || 1,
        unit: "",
        minQty: 0,
        expiry: "",
        category: cat || "other",
      });
      invChanged = true;
    }
    // Snooze auto-add for this item to avoid immediate reappearance in Shopping
    setSnooze(s.name, AUTO_ADD_SNOOZE_DAYS);
  }
  if (invChanged) {
    persist();
    renderInventory();
  }

  // 2) Remove transferred items from Shopping (by id, with name fallback)
  const ids = new Set(items.map((x) => x && x.id).filter(Boolean));
  const names = new Set(
    items
      .map((x) =>
        String((x && x.name) || "")
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
  );
  const nextShopping = [];
  let shopChanged = false;
  for (const it of shopping) {
    const shouldRemove =
      ids.has(it.id) ||
      (it.bought &&
        names.has(
          String(it.name || "")
            .trim()
            .toLowerCase()
        ));
    if (shouldRemove) {
      shopChanged = true;
      continue;
    }
    nextShopping.push(it);
  }
  if (shopChanged) {
    shopping = nextShopping;
    persistShop();
    renderShopping();
  }
}

// Reusable confirmation modal
const confirmModal = document.getElementById("confirmModal");
const confirmTitleEl = document.getElementById("confirmTitle");
const confirmMessageEl = document.getElementById("confirmMessage");
const confirmOkBtn = document.getElementById("confirmOk");
const confirmCancelBtn = document.getElementById("confirmCancel");
const closeConfirmModalBtn = document.getElementById("closeConfirmModal");

function showConfirmModal() {
  if (!confirmModal) return;
  confirmModal.classList.add("show");
  confirmModal.setAttribute("aria-hidden", "false");
}
function hideConfirmModal() {
  if (!confirmModal) return;
  confirmModal.classList.remove("show");
  confirmModal.setAttribute("aria-hidden", "true");
}

function confirmDialog(message, opts = {}) {
  if (!confirmModal) {
    // Fallback to native confirm if custom modal not present
    return Promise.resolve(window.confirm(typeof message === "string" ? message : "Are you sure?"));
  }
  const { title = "Confirm", okText = "OK", cancelText = "Cancel", okVariant = "accent" } = opts;
  confirmTitleEl.textContent = title;
  confirmMessageEl.textContent = message || "";
  confirmOkBtn.textContent = okText;
  confirmCancelBtn.textContent = cancelText;
  // set button style variant
  confirmOkBtn.classList.remove("accent", "danger");
  confirmOkBtn.classList.add(okVariant === "danger" ? "danger" : "accent");

  return new Promise((resolve) => {
    const onOk = () => {
      cleanup();
      hideConfirmModal();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      hideConfirmModal();
      resolve(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    const onBackdrop = (e) => {
      if (e.target === confirmModal) {
        onCancel();
      }
    };

    function cleanup() {
      confirmOkBtn.removeEventListener("click", onOk);
      confirmCancelBtn.removeEventListener("click", onCancel);
      if (closeConfirmModalBtn) closeConfirmModalBtn.removeEventListener("click", onCancel);
      window.removeEventListener("keydown", onKey);
      confirmModal.removeEventListener("click", onBackdrop);
    }

    confirmOkBtn.addEventListener("click", onOk);
    confirmCancelBtn.addEventListener("click", onCancel);
    if (closeConfirmModalBtn) closeConfirmModalBtn.addEventListener("click", onCancel);
    window.addEventListener("keydown", onKey);
    confirmModal.addEventListener("click", onBackdrop);
    showConfirmModal();
  });
}

function toggleExpand(selectedCard) {
  const allCards = document.querySelectorAll(".recipe-card");

  allCards.forEach((card) => {
    if (card !== selectedCard) {
      card.classList.remove("expanded");
    }
  });

  selectedCard.classList.toggle("expanded");
}

/* ---------- Initial paint on load ---------- */
renderInventory();
renderShopping();

/* ---------- Settings ---------- */
const SETTINGS_KEY = "kk_settings_v1";
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");

// Allergy constants (keys used in settings) and keyword map for recipe filtering
const ALLERGY_OPTIONS = [
  { key: "peanuts", label: "Peanuts" },
  { key: "tree-nuts", label: "Tree nuts" },
  { key: "milk", label: "Milk" },
  { key: "eggs", label: "Eggs" },
  { key: "soy", label: "Soy" },
  { key: "wheat", label: "Wheat" },
  { key: "gluten", label: "Gluten" },
  { key: "fish", label: "Fish" },
  { key: "shellfish", label: "Shellfish" },
  { key: "sesame", label: "Sesame" },
  { key: "mustard", label: "Mustard" },
  { key: "sulfites", label: "Sulfites" },
  { key: "celery", label: "Celery" },
  { key: "mollusks", label: "Mollusks" },
  { key: "corn", label: "Corn" },
];
const ALLERGY_KEYS = ALLERGY_OPTIONS.map((o) => o.key);

const ALLERGY_KEYWORDS = {
  peanuts: ["peanut", "peanuts"],
  "tree-nuts": [
    "almond",
    "walnut",
    "cashew",
    "pecan",
    "hazelnut",
    "brazil nut",
    "macadamia",
    "pistachio",
    "tree nut",
  ],
  milk: ["milk", "cheese", "butter", "cream", "yogurt", "whey", "casein"],
  eggs: ["egg", "eggs", "mayonnaise"],
  soy: ["soy", "tofu", "edamame", "soy sauce", "tamari", "miso"],
  wheat: ["wheat", "flour", "bread", "pasta", "seitan"],
  gluten: ["gluten", "wheat", "barley", "rye", "malt"],
  fish: ["fish", "salmon", "tuna", "cod", "trout", "anchovy"],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "shellfish"],
  sesame: ["sesame", "tahini", "benne"],
  mustard: ["mustard"],
  sulfites: ["sulfite", "sulphite", "sulphites"],
  celery: ["celery"],
  mollusks: ["clam", "oyster", "mussel", "scallop", "mollusk"],
  corn: ["corn", "maize", "corn syrup"],
};

// Expanded ingredient synonyms mapping. Broad set covering cheeses, herbs, veg variants, proteins, canned/frozen forms and pantry items.
const INGREDIENT_SYNONYMS = {
  // cheeses -> canonical 'cheese'
  mozzarella: "cheese",
  "mozzarella cheese": "cheese",
  "fresh mozzarella": "cheese",
  "buffalo mozzarella": "cheese",
  cheddar: "cheese",
  "cheddar cheese": "cheese",
  parmesan: "cheese",
  parmigiano: "cheese",
  "parmesan cheese": "cheese",
  provolone: "cheese",
  feta: "cheese",
  "goat cheese": "cheese",
  brie: "cheese",
  camembert: "cheese",
  gorgonzola: "cheese",
  "blue cheese": "cheese",
  asiago: "cheese",
  emmental: "cheese",
  "swiss cheese": "cheese",
  gouda: "cheese",

  // dairy / milk variants
  milk: "milk",
  "whole milk": "milk",
  "skim milk": "milk",
  "2% milk": "milk",
  butter: "butter",
  "unsalted butter": "butter",
  "salted butter": "butter",
  cream: "cream",
  "heavy cream": "cream",
  "sour cream": "cream",
  "greek yogurt": "yogurt",
  yoghurt: "yogurt",
  yogurt: "yogurt",
  buttermilk: "milk",

  // eggs
  eggs: "egg",
  egg: "egg",
  "egg whites": "egg",
  "egg yolk": "egg",

  // meats & proteins
  "chicken breast": "chicken",
  "chicken thighs": "chicken",
  "chicken thigh": "chicken",
  chicken: "chicken",
  "ground beef": "beef",
  beef: "beef",
  pork: "pork",
  bacon: "bacon",
  salami: "pork",
  salmon: "fish",
  tuna: "fish",
  cod: "fish",
  shrimp: "shellfish",
  prawn: "shellfish",
  tofu: "tofu",

  // vegetables (fresh/frozen/canned variants)
  tomatoes: "tomato",
  tomato: "tomato",
  "cherry tomatoes": "tomato",
  "sun-dried tomato": "tomato",
  potatoes: "potato",
  potato: "potato",
  "sweet potato": "potato",
  broccoli: "broccoli",
  "broccoli florets": "broccoli",
  carrots: "carrot",
  zucchini: "zucchini",
  spinach: "spinach",
  "mixed greens": "greens",
  "spring mix": "greens",
  lettuce: "lettuce",
  kale: "kale",

  // aromatics & herbs
  garlic: "garlic",
  "garlic clove": "garlic",
  "minced garlic": "garlic",
  onion: "onion",
  "red onion": "onion",
  "white onion": "onion",
  shallot: "shallot",
  scallion: "green onion",
  "green onions": "green onion",
  leek: "leek",
  "fresh basil": "basil",
  "dried basil": "basil",
  parsley: "parsley",
  cilantro: "cilantro",
  coriander: "cilantro",
  rosemary: "rosemary",
  thyme: "thyme",
  oregano: "oregano",

  // oils & condiments
  "olive oil": "oil",
  "extra virgin olive oil": "oil",
  "vegetable oil": "oil",
  "canola oil": "oil",
  "sesame oil": "oil",
  "soy sauce": "soy sauce",
  tamari: "soy sauce",
  ketchup: "ketchup",
  mustard: "mustard",
  salsa: "salsa",
  mayonnaise: "mayo",
  mayo: "mayo",

  // pantry staples & grains
  rice: "rice",
  "white rice": "rice",
  "brown rice": "rice",
  pasta: "pasta",
  spaghetti: "pasta",
  penne: "pasta",
  flour: "flour",
  sugar: "sugar",
  salt: "salt",
  "black pepper": "pepper",
  pepper: "pepper",
  quinoa: "quinoa",
  couscous: "couscous",

  // legumes, nuts & seeds
  chickpeas: "chickpea",
  "garbanzo beans": "chickpea",
  lentils: "lentil",
  beans: "bean",
  "black beans": "bean",
  "kidney beans": "bean",
  peanut: "peanut",
  peanuts: "peanut",
  almond: "almond",
  walnut: "walnut",
  cashew: "cashew",

  // canned/frozen indicators (map to base)
  "canned tomatoes": "tomato",
  "diced tomatoes": "tomato",
  "crushed tomatoes": "tomato",
  "tomato paste": "tomato",
  "frozen peas": "peas",
  "frozen corn": "corn",
  "canned corn": "corn",
  "frozen vegetables": "veg",
  "canned beans": "bean",

  // spices & seasonings (kept literal but common variants included)
  paprika: "paprika",
  "smoked paprika": "paprika",
  cumin: "cumin",
  "chili powder": "chili",
  "red pepper flakes": "chili",

  // fruits & misc
  lemon: "lemon",
  lime: "lime",
  avocado: "avocado",
  olive: "olive",
  olives: "olive",
  honey: "honey",

  // fallback plural forms (some common plurals mapped to singular base)
  tomatoes: "tomato",
  potatoes: "potato",
  carrots: "carrot",
  berries: "berry",
};

// Simple lightweight stemmer (very small subset of rules) to reduce plurals/ed/ing
function stemWord(w) {
  if (!w) return w;
  // common irregulars
  const irregular = { children: "child", mice: "mouse", geese: "goose" };
  if (irregular[w]) return irregular[w];
  // remove common endings
  if (w.endsWith("ing") && w.length > 4) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 3) return w.slice(0, -2);
  if (w.endsWith("es") && w.length > 3) return w.slice(0, -2);
  if (w.endsWith("s") && w.length > 2) return w.slice(0, -1);
  return w;
}

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;
  const m = a.length,
    n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function toTitleCase(s) {
  return String(s || "")
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function persistSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function renderSettings() {
  // dietary checkboxes
  const diets = new Set(settings.diet || []);
  document.querySelectorAll('input[name="diet"]').forEach((chk) => {
    chk.checked = diets.has(chk.value);
  });
  // allergies: set checkboxes from settings.allergies
  const allergySet = new Set((settings.allergies || []).map((x) => String(x).toLowerCase()));
  document.querySelectorAll('input[name="allergy"]').forEach((chk) => {
    chk.checked = allergySet.has(chk.value);
  });
  // skill
  const skill = document.getElementById("skillSelect");
  if (skill) skill.value = settings.skill || "beginner";
  // food pref
  const fp = document.getElementById("foodPref");
  if (fp) fp.value = settings.foodPref || "none";
}

function loadSettings() {
  settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  // Migration: remove deprecated 'nut-free' diet option if present
  if (Array.isArray(settings.diet) && settings.diet.includes("nut-free")) {
    settings.diet = settings.diet.filter((d) => d !== "nut-free");
    persistSettings();
  }
  renderSettings();
}

function saveSettingsFromForm() {
  const sel = Array.from(document.querySelectorAll('input[name="diet"]:checked')).map(
    (i) => i.value
  );
  settings.diet = sel;
  // collect allergies from predefined checkboxes and optional other text
  const allergies = Array.from(document.querySelectorAll('input[name="allergy"]:checked')).map(
    (c) => c.value
  );
  settings.allergies = allergies; // only keys
  settings.skill = document.getElementById("skillSelect")?.value || "beginner";
  settings.foodPref = document.getElementById("foodPref")?.value || "none";
  persistSettings();
  renderSettings();
  // Re-render recipes to apply new filters
  renderRecipes();
}

// recipe filtering: hide recipes that contain any selected allergy keywords
function filterRecipesByAllergies() {
  const selected = new Set((settings.allergies || []).map((s) => String(s).toLowerCase()));
  const recipeCards = document.querySelectorAll(".recipe-card");
  for (const card of recipeCards) {
    const ingEls = card.querySelectorAll(".ingredients li");
    let text = "";
    ingEls.forEach((li) => {
      text += " " + (li.textContent || "").toLowerCase();
    });
    let exclude = false;
    for (const a of selected) {
      const keywords = ALLERGY_KEYWORDS[a] || [a];
      for (const kw of keywords) {
        const re = new RegExp("\\b" + escapeRegExp(kw) + "\\b", "i");
        if (re.test(text)) {
          exclude = true;
          break;
        }
      }
      if (exclude) break;
    }
    if (exclude) card.classList.add("hidden");
    else card.classList.remove("hidden");
  }
}

/* ---------- Recipes (data-driven) ---------- */
const recipes = [
  // Beginner recipes
  {
    id: "r1",
    title: "Breakfast Sandwich",
    time: 10,
    difficulty: "beginner",
    diet: [],
    ingredients: ["bread", "egg", "bacon", "cheese"],
    steps: [
      "Cook bacon until crispy and set aside.",
      "Fry an egg to your liking.",
      "Toast the bread slices.",
      "Assemble sandwich with egg, bacon, and cheese.",
    ],
  },
  {
    id: "r2",
    title: "Garlic Chicken Bowl",
    time: 25,
    difficulty: "novice",
    diet: [],
    ingredients: ["chicken breast", "rice", "garlic", "soy sauce", "broccoli"],
    steps: [
      "Dice chicken and sauté with minced garlic.",
      "Add soy sauce and cook until browned.",
      "Serve over a bowl of rice.",
    ],
  },
  {
    id: "r3",
    title: "Mozzarella Toast",
    time: 8,
    difficulty: "beginner",
    diet: ["vegetarian"],
    ingredients: ["bread", "tomato", "mozzarella", "olive oil"],
    steps: [
      "Brush bread with olive oil and toast lightly.",
      "Add tomato and mozzarella slices on top.",
      "Toast again until cheese melts.",
    ],
  },
  {
    id: "r4",
    title: "Avocado Toast",
    time: 6,
    difficulty: "beginner",
    diet: ["vegan", "vegetarian"],
    ingredients: ["bread", "avocado", "lemon", "salt", "pepper"],
    steps: [
      "Toast the bread to desired crispness.",
      "Mash avocado with lemon, salt and pepper.",
      "Spread avocado mix on toast and serve.",
    ],
  },
  {
    id: "r5",
    title: "Pasta Primavera",
    time: 30,
    difficulty: "intermediate",
    diet: ["vegetarian"],
    ingredients: ["pasta", "zucchini", "bell pepper", "tomato", "parmesan", "olive oil", "garlic"],
    steps: [
      "Cook pasta until al dente.",
      "Sauté garlic in olive oil, add vegetables and cook until tender.",
      "Toss pasta with vegetables and finish with parmesan.",
    ],
  },
  {
    id: "r6",
    title: "Stir-Fry Veggies & Tofu",
    time: 20,
    difficulty: "novice",
    diet: ["vegan", "vegetarian"],
    ingredients: ["tofu", "broccoli", "carrot", "soy sauce", "garlic", "rice"],
    steps: [
      "Press and cube tofu, then pan-fry until golden.",
      "Stir-fry vegetables with garlic, add tofu and soy sauce.",
      "Serve over steamed rice.",
    ],
  },
  {
    id: "r7",
    title: "Beef Tacos",
    time: 18,
    difficulty: "novice",
    diet: [],
    ingredients: ["ground beef", "taco shell", "lettuce", "cheddar", "salsa"],
    steps: [
      "Brown ground beef and season as desired.",
      "Warm taco shells.",
      "Assemble tacos with beef, lettuce, cheese and salsa.",
    ],
  },
  // Additional beginner recipes
  {
    id: "r8",
    title: "Scrambled Eggs",
    time: 5,
    difficulty: "beginner",
    diet: ["vegetarian"],
    ingredients: ["eggs", "butter", "salt", "pepper", "milk"],
    steps: [
      "Beat eggs with milk, salt and pepper.",
      "Melt butter in a pan over medium heat.",
      "Pour in eggs and gently stir until cooked.",
    ],
  },
  {
    id: "r9",
    title: "Grilled Cheese Sandwich",
    time: 8,
    difficulty: "beginner",
    diet: ["vegetarian"],
    ingredients: ["bread", "cheddar", "butter"],
    steps: [
      "Butter bread slices on one side.",
      "Place cheese between unbuttered sides.",
      "Grill in pan until golden and cheese melts.",
    ],
  },
  {
    id: "r10",
    title: "Peanut Butter Banana Toast",
    time: 5,
    difficulty: "beginner",
    diet: ["vegan", "vegetarian"],
    ingredients: ["bread", "peanut butter", "banana", "honey"],
    steps: [
      "Toast the bread.",
      "Spread peanut butter on toast.",
      "Slice banana and arrange on top, drizzle with honey.",
    ],
  },
  // Novice recipes
  {
    id: "r11",
    title: "Spaghetti Aglio e Olio",
    time: 20,
    difficulty: "novice",
    diet: ["vegan", "vegetarian"],
    ingredients: ["spaghetti", "garlic", "olive oil", "red pepper flakes", "parsley"],
    steps: [
      "Cook spaghetti until al dente.",
      "Sauté sliced garlic in olive oil until golden.",
      "Toss pasta with garlic oil and red pepper flakes.",
      "Garnish with fresh parsley.",
    ],
  },
  {
    id: "r12",
    title: "Chicken Quesadilla",
    time: 15,
    difficulty: "novice",
    diet: [],
    ingredients: ["chicken breast", "tortilla", "cheddar", "bell pepper", "onion"],
    steps: [
      "Cook and dice chicken breast.",
      "Sauté peppers and onions.",
      "Fill tortilla with chicken, veggies, and cheese, fold and grill until crispy.",
    ],
  },
  {
    id: "r13",
    title: "Vegetable Fried Rice",
    time: 25,
    difficulty: "novice",
    diet: ["vegan", "vegetarian"],
    ingredients: ["rice", "carrot", "peas", "corn", "soy sauce", "garlic", "green onion"],
    steps: [
      "Cook rice and let it cool.",
      "Sauté garlic, then add vegetables.",
      "Add rice and soy sauce, stir-fry until heated through.",
      "Garnish with green onions.",
    ],
  },
  {
    id: "r14",
    title: "Salmon Teriyaki",
    time: 20,
    difficulty: "novice",
    diet: ["pescatarian"],
    ingredients: ["salmon", "soy sauce", "honey", "garlic", "ginger", "rice"],
    steps: [
      "Mix soy sauce, honey, garlic and ginger for marinade.",
      "Marinate salmon for 10 minutes.",
      "Pan-fry or bake salmon until cooked.",
      "Serve over rice.",
    ],
  },
  {
    id: "r15",
    title: "Caprese Salad",
    time: 10,
    difficulty: "beginner",
    diet: ["vegetarian"],
    ingredients: ["tomato", "mozzarella", "basil", "olive oil", "balsamic vinegar", "salt"],
    steps: [
      "Slice tomatoes and mozzarella.",
      "Arrange alternating slices on a plate.",
      "Add fresh basil leaves.",
      "Drizzle with olive oil and balsamic, season with salt.",
    ],
  },
  // Intermediate recipes
  {
    id: "r16",
    title: "Chicken Piccata",
    time: 35,
    difficulty: "intermediate",
    diet: [],
    ingredients: ["chicken breast", "flour", "butter", "lemon", "capers", "white wine", "parsley"],
    steps: [
      "Pound chicken thin and dredge in flour.",
      "Pan-fry chicken in butter until golden.",
      "Make sauce with lemon, capers, wine, and pan drippings.",
      "Pour sauce over chicken and garnish with parsley.",
    ],
  },
  {
    id: "r17",
    title: "Vegetable Curry",
    time: 40,
    difficulty: "intermediate",
    diet: ["vegan", "vegetarian"],
    ingredients: [
      "potato",
      "carrot",
      "cauliflower",
      "coconut milk",
      "curry powder",
      "onion",
      "garlic",
      "ginger",
      "rice",
    ],
    steps: [
      "Sauté onion, garlic, and ginger.",
      "Add curry powder and vegetables.",
      "Pour in coconut milk and simmer until vegetables are tender.",
      "Serve over rice.",
    ],
  },
  {
    id: "r18",
    title: "Shrimp Scampi",
    time: 25,
    difficulty: "intermediate",
    diet: ["pescatarian"],
    ingredients: [
      "shrimp",
      "pasta",
      "garlic",
      "butter",
      "white wine",
      "lemon",
      "parsley",
      "red pepper flakes",
    ],
    steps: [
      "Cook pasta until al dente.",
      "Sauté garlic in butter, add shrimp and cook until pink.",
      "Add wine, lemon juice and red pepper flakes.",
      "Toss with pasta and garnish with parsley.",
    ],
  },
  {
    id: "r19",
    title: "Mushroom Risotto",
    time: 45,
    difficulty: "intermediate",
    diet: ["vegetarian"],
    ingredients: [
      "arborio rice",
      "mushroom",
      "onion",
      "white wine",
      "vegetable broth",
      "parmesan",
      "butter",
      "garlic",
    ],
    steps: [
      "Sauté mushrooms and set aside.",
      "Sauté onion and garlic, add rice and toast.",
      "Add wine, then gradually add warm broth while stirring constantly.",
      "Stir in mushrooms, butter, and parmesan.",
    ],
  },
  {
    id: "r20",
    title: "Beef Stir-Fry",
    time: 30,
    difficulty: "intermediate",
    diet: [],
    ingredients: [
      "beef",
      "broccoli",
      "bell pepper",
      "soy sauce",
      "ginger",
      "garlic",
      "cornstarch",
      "rice",
    ],
    steps: [
      "Slice beef thin and marinate with soy sauce and cornstarch.",
      "Stir-fry beef over high heat, set aside.",
      "Stir-fry vegetables with ginger and garlic.",
      "Return beef to pan, toss everything together.",
      "Serve over rice.",
    ],
  },
  // Expert recipes
  {
    id: "r21",
    title: "Beef Wellington",
    time: 120,
    difficulty: "expert",
    diet: [],
    ingredients: [
      "beef tenderloin",
      "puff pastry",
      "mushroom",
      "shallot",
      "butter",
      "egg",
      "prosciutto",
      "dijon mustard",
    ],
    steps: [
      "Sear beef on all sides, brush with mustard.",
      "Make mushroom duxelles with finely chopped mushrooms and shallots.",
      "Wrap beef in prosciutto and mushroom mixture.",
      "Encase in puff pastry, brush with egg wash.",
      "Bake until pastry is golden and beef is cooked to desired doneness.",
    ],
  },
  {
    id: "r22",
    title: "Coq au Vin",
    time: 90,
    difficulty: "expert",
    diet: [],
    ingredients: [
      "chicken",
      "bacon",
      "onion",
      "carrot",
      "garlic",
      "red wine",
      "chicken broth",
      "mushroom",
      "tomato paste",
      "thyme",
      "bay leaf",
    ],
    steps: [
      "Brown chicken pieces and bacon, set aside.",
      "Sauté vegetables in the same pan.",
      "Add tomato paste, wine, broth, and herbs.",
      "Return chicken and bacon, simmer for 45 minutes.",
      "Add mushrooms and cook until tender.",
    ],
  },
  {
    id: "r23",
    title: "Vegetarian Lasagna",
    time: 75,
    difficulty: "expert",
    diet: ["vegetarian"],
    ingredients: [
      "lasagna noodles",
      "ricotta",
      "mozzarella",
      "parmesan",
      "spinach",
      "zucchini",
      "tomato sauce",
      "onion",
      "garlic",
      "egg",
      "basil",
    ],
    steps: [
      "Sauté vegetables with garlic and onion.",
      "Mix ricotta with egg, spinach, and herbs.",
      "Layer noodles, ricotta mixture, vegetables, sauce, and cheese.",
      "Repeat layers, ending with cheese on top.",
      "Bake covered for 45 minutes, then uncovered for 15 minutes until golden.",
    ],
  },
  {
    id: "r24",
    title: "Seared Scallops with Risotto",
    time: 60,
    difficulty: "expert",
    diet: ["pescatarian"],
    ingredients: [
      "scallops",
      "arborio rice",
      "white wine",
      "vegetable broth",
      "lemon",
      "butter",
      "shallot",
      "parmesan",
      "asparagus",
    ],
    steps: [
      "Make risotto by toasting rice, adding wine and gradually adding broth while stirring.",
      "Blanch and chop asparagus, stir into risotto with parmesan.",
      "Pat scallops dry, season well.",
      "Sear scallops in hot butter until golden crust forms, about 2 minutes per side.",
      "Serve scallops over risotto with lemon butter sauce.",
    ],
  },
  {
    id: "r25",
    title: "Duck Confit",
    time: 150,
    difficulty: "expert",
    diet: [],
    ingredients: ["duck legs", "duck fat", "garlic", "thyme", "bay leaf", "salt", "pepper"],
    steps: [
      "Cure duck legs with salt, pepper, thyme, and garlic overnight.",
      "Rinse and pat dry duck legs.",
      "Submerge duck in melted duck fat in a deep pan.",
      "Cook in low oven (250°F) for 2-3 hours until tender.",
      "Crisp skin in hot pan before serving.",
    ],
  },
  // Additional recipes for preferences
  {
    id: "r26",
    title: "Cauliflower Rice Bowl",
    time: 20,
    difficulty: "novice",
    diet: ["vegan", "vegetarian"],
    ingredients: ["cauliflower", "chickpea", "tahini", "lemon", "garlic", "spinach", "olive oil"],
    steps: [
      "Rice cauliflower in food processor.",
      "Sauté cauliflower rice with garlic.",
      "Roast chickpeas with spices.",
      "Assemble bowl with cauliflower rice, chickpeas, spinach, and tahini dressing.",
    ],
  },
  {
    id: "r27",
    title: "Protein Pancakes",
    time: 15,
    difficulty: "beginner",
    diet: ["vegetarian"],
    ingredients: ["egg", "banana", "protein powder", "oats", "cinnamon", "butter"],
    steps: [
      "Blend eggs, banana, protein powder, oats, and cinnamon.",
      "Heat butter in pan.",
      "Pour batter to make pancakes, flip when bubbles form.",
      "Serve with toppings of choice.",
    ],
  },
  {
    id: "r28",
    title: "Zucchini Noodles with Pesto",
    time: 15,
    difficulty: "novice",
    diet: ["vegetarian"],
    ingredients: ["zucchini", "basil", "pine nuts", "parmesan", "garlic", "olive oil", "lemon"],
    steps: [
      "Spiralize zucchini into noodles.",
      "Make pesto by blending basil, pine nuts, parmesan, garlic, and olive oil.",
      "Toss zucchini noodles with pesto.",
      "Add lemon juice and serve.",
    ],
  },
  {
    id: "r29",
    title: "Grilled Chicken Salad",
    time: 25,
    difficulty: "novice",
    diet: [],
    ingredients: [
      "chicken breast",
      "lettuce",
      "tomato",
      "cucumber",
      "avocado",
      "olive oil",
      "lemon",
      "salt",
      "pepper",
    ],
    steps: [
      "Season and grill chicken breast.",
      "Chop lettuce, tomato, cucumber, and avocado.",
      "Slice cooked chicken.",
      "Toss salad with olive oil and lemon dressing, top with chicken.",
    ],
  },
  {
    id: "r30",
    title: "Lentil Soup",
    time: 45,
    difficulty: "intermediate",
    diet: ["vegan", "vegetarian"],
    ingredients: [
      "lentils",
      "carrot",
      "celery",
      "onion",
      "garlic",
      "vegetable broth",
      "tomato",
      "cumin",
      "bay leaf",
    ],
    steps: [
      "Sauté onion, carrot, celery, and garlic.",
      "Add lentils, broth, tomatoes, cumin, and bay leaf.",
      "Simmer for 30 minutes until lentils are tender.",
      "Season to taste and serve.",
    ],
  },
  // More Beginner Recipes
  {
    id: "r31",
    title: "Smoothie Bowl",
    time: 10,
    difficulty: "beginner",
    diet: ["vegan", "vegetarian"],
    ingredients: ["banana", "berries", "almond milk", "granola", "honey", "chia seeds"],
    steps: [
      "Blend frozen banana, berries, and almond milk until smooth.",
      "Pour into a bowl.",
      "Top with granola, fresh fruit, and chia seeds.",
      "Drizzle with honey if desired.",
    ],
  },
  {
    id: "r32",
    title: "Tuna Salad Sandwich",
    time: 10,
    difficulty: "beginner",
    diet: ["pescatarian"],
    ingredients: ["canned tuna", "bread", "mayonnaise", "celery", "lettuce", "tomato"],
    steps: [
      "Mix tuna with mayonnaise and diced celery.",
      "Toast bread if desired.",
      "Assemble sandwich with tuna mixture, lettuce, and tomato.",
    ],
  },
  {
    id: "r33",
    title: "Hummus and Veggie Wrap",
    time: 8,
    difficulty: "beginner",
    diet: ["vegan", "vegetarian"],
    ingredients: ["tortilla", "hummus", "cucumber", "tomato", "lettuce", "carrot", "bell pepper"],
    steps: [
      "Spread hummus on tortilla.",
      "Add sliced vegetables.",
      "Roll up tightly and slice in half.",
    ],
  },
  {
    id: "r34",
    title: "Oatmeal with Berries",
    time: 10,
    difficulty: "beginner",
    diet: ["vegan", "vegetarian"],
    ingredients: ["oats", "almond milk", "berries", "honey", "cinnamon", "banana"],
    steps: [
      "Cook oats in almond milk according to package directions.",
      "Top with fresh berries, sliced banana, and cinnamon.",
      "Drizzle with honey to taste.",
    ],
  },
  {
    id: "r35",
    title: "Egg Salad",
    time: 15,
    difficulty: "beginner",
    diet: ["vegetarian"],
    ingredients: ["eggs", "mayonnaise", "mustard", "celery", "salt", "pepper", "paprika"],
    steps: [
      "Hard boil eggs and let cool.",
      "Peel and chop eggs.",
      "Mix with mayonnaise, mustard, diced celery, salt, and pepper.",
      "Sprinkle with paprika and serve on bread or lettuce.",
    ],
  },
  // More Novice Recipes
  {
    id: "r36",
    title: "Greek Salad with Chicken",
    time: 20,
    difficulty: "novice",
    diet: [],
    ingredients: ["chicken breast", "cucumber", "tomato", "feta", "olive", "red onion", "olive oil", "lemon"],
    steps: [
      "Grill or pan-fry seasoned chicken breast.",
      "Chop cucumber, tomato, onion, and olives.",
      "Toss vegetables with feta, olive oil, and lemon juice.",
      "Slice chicken and serve over salad.",
    ],
  },
  {
    id: "r37",
    title: "Fish Tacos",
    time: 25,
    difficulty: "novice",
    diet: ["pescatarian"],
    ingredients: ["white fish", "tortilla", "cabbage", "lime", "sour cream", "cilantro", "avocado"],
    steps: [
      "Season and pan-fry or bake fish until flaky.",
      "Shred cabbage and mix with lime juice.",
      "Warm tortillas.",
      "Assemble tacos with fish, cabbage slaw, avocado, and sour cream.",
    ],
  },
  {
    id: "r38",
    title: "Margherita Pizza",
    time: 20,
    difficulty: "novice",
    diet: ["vegetarian"],
    ingredients: ["pizza dough", "tomato sauce", "mozzarella", "basil", "olive oil", "garlic"],
    steps: [
      "Roll out pizza dough.",
      "Spread tomato sauce and minced garlic.",
      "Add mozzarella slices.",
      "Bake at 450°F for 12-15 minutes.",
      "Top with fresh basil and olive oil.",
    ],
  },
  {
    id: "r39",
    title: "Pad Thai",
    time: 30,
    difficulty: "novice",
    diet: [],
    ingredients: ["rice noodles", "shrimp", "egg", "peanuts", "bean sprouts", "lime", "fish sauce", "garlic", "green onion"],
    steps: [
      "Soak rice noodles until soft.",
      "Scramble egg and set aside.",
      "Stir-fry shrimp and garlic.",
      "Add noodles, fish sauce, and egg.",
      "Toss with bean sprouts and peanuts, garnish with lime.",
    ],
  },
  {
    id: "r40",
    title: "Black Bean Burrito",
    time: 15,
    difficulty: "novice",
    diet: ["vegan", "vegetarian"],
    ingredients: ["tortilla", "black beans", "rice", "salsa", "avocado", "lettuce", "corn"],
    steps: [
      "Heat black beans and rice.",
      "Warm tortilla.",
      "Fill with beans, rice, corn, and salsa.",
      "Top with avocado and lettuce, roll up.",
    ],
  },
  // More Intermediate Recipes
  {
    id: "r41",
    title: "Thai Green Curry",
    time: 40,
    difficulty: "intermediate",
    diet: [],
    ingredients: ["chicken", "green curry paste", "coconut milk", "bamboo shoots", "eggplant", "basil", "fish sauce", "rice"],
    steps: [
      "Sauté curry paste in oil.",
      "Add chicken and cook until sealed.",
      "Pour in coconut milk and simmer.",
      "Add vegetables and cook until tender.",
      "Finish with fish sauce and basil, serve over rice.",
    ],
  },
  {
    id: "r42",
    title: "Eggplant Parmesan",
    time: 60,
    difficulty: "intermediate",
    diet: ["vegetarian"],
    ingredients: ["eggplant", "flour", "egg", "breadcrumbs", "tomato sauce", "mozzarella", "parmesan", "basil"],
    steps: [
      "Slice eggplant and salt to remove moisture.",
      "Bread eggplant slices with flour, egg, and breadcrumbs.",
      "Fry until golden.",
      "Layer in baking dish with tomato sauce and cheese.",
      "Bake at 375°F for 30 minutes until bubbly.",
    ],
  },
  {
    id: "r43",
    title: "Honey Garlic Salmon",
    time: 25,
    difficulty: "intermediate",
    diet: ["pescatarian"],
    ingredients: ["salmon", "honey", "garlic", "soy sauce", "lemon", "butter", "asparagus"],
    steps: [
      "Mix honey, garlic, soy sauce, and lemon juice.",
      "Marinate salmon for 15 minutes.",
      "Pan-sear salmon in butter, basting with marinade.",
      "Serve with roasted asparagus.",
    ],
  },
  {
    id: "r44",
    title: "Stuffed Bell Peppers",
    time: 50,
    difficulty: "intermediate",
    diet: [],
    ingredients: ["bell pepper", "ground beef", "rice", "onion", "tomato sauce", "cheddar", "garlic"],
    steps: [
      "Cut tops off peppers and remove seeds.",
      "Cook ground beef with onion and garlic.",
      "Mix beef with cooked rice and tomato sauce.",
      "Stuff peppers and top with cheese.",
      "Bake at 375°F for 35 minutes.",
    ],
  },
  {
    id: "r45",
    title: "Falafel Bowl",
    time: 45,
    difficulty: "intermediate",
    diet: ["vegan", "vegetarian"],
    ingredients: ["chickpea", "onion", "garlic", "parsley", "cumin", "tahini", "lemon", "cucumber", "tomato", "lettuce"],
    steps: [
      "Blend chickpeas, onion, garlic, parsley, and cumin.",
      "Form into balls and fry until crispy.",
      "Make tahini sauce with tahini, lemon, and garlic.",
      "Assemble bowl with greens, falafel, vegetables, and tahini sauce.",
    ],
  },
  // More Expert Recipes
  {
    id: "r46",
    title: "Lobster Thermidor",
    time: 90,
    difficulty: "expert",
    diet: ["pescatarian"],
    ingredients: ["lobster", "butter", "shallot", "white wine", "cream", "mustard", "parmesan", "egg yolk", "tarragon"],
    steps: [
      "Boil lobster and extract meat, reserve shells.",
      "Make sauce with butter, shallots, wine, cream, and mustard.",
      "Temper egg yolk into sauce.",
      "Mix lobster meat with sauce, fill shells.",
      "Top with parmesan and broil until golden.",
    ],
  },
  {
    id: "r47",
    title: "Osso Buco",
    time: 150,
    difficulty: "expert",
    diet: [],
    ingredients: ["veal shank", "flour", "carrot", "celery", "onion", "white wine", "tomato", "beef broth", "lemon", "parsley", "garlic"],
    steps: [
      "Dredge veal shanks in flour and brown on all sides.",
      "Sauté vegetables in same pan.",
      "Add wine, tomatoes, and broth.",
      "Return meat, cover and braise for 2 hours until tender.",
      "Make gremolata with lemon zest, parsley, and garlic to serve.",
    ],
  },
  {
    id: "r48",
    title: "Homemade Ramen",
    time: 180,
    difficulty: "expert",
    diet: [],
    ingredients: ["pork belly", "ramen noodles", "soy sauce", "miso", "ginger", "garlic", "green onion", "egg", "seaweed", "chicken broth"],
    steps: [
      "Make rich broth by simmering pork bones for 3+ hours.",
      "Marinate and slow-cook pork belly.",
      "Prepare soft-boiled eggs.",
      "Cook ramen noodles according to package.",
      "Assemble bowls with broth, noodles, pork, egg, and toppings.",
    ],
  },
  {
    id: "r49",
    title: "Soufflé",
    time: 60,
    difficulty: "expert",
    diet: ["vegetarian"],
    ingredients: ["egg", "butter", "flour", "milk", "cheese", "cream of tartar", "salt", "pepper"],
    steps: [
      "Make thick béchamel with butter, flour, and milk.",
      "Stir in cheese and egg yolks.",
      "Beat egg whites with cream of tartar until stiff peaks.",
      "Fold egg whites gently into cheese mixture.",
      "Bake at 375°F for 30-35 minutes without opening oven.",
    ],
  },
  {
    id: "r50",
    title: "Paella",
    time: 90,
    difficulty: "expert",
    diet: ["pescatarian"],
    ingredients: ["rice", "shrimp", "mussels", "squid", "saffron", "tomato", "bell pepper", "peas", "chicken broth", "garlic", "paprika"],
    steps: [
      "Heat broth with saffron.",
      "Sauté garlic, peppers, and tomatoes in large pan.",
      "Add rice and paprika, toast briefly.",
      "Pour in saffron broth, don't stir.",
      "Add seafood and peas, cook until rice is done and forms socarrat crust.",
    ],
  },
];

// Helper to check if recipe matches dietary restrictions
function recipeMatchesDiet(recipe) {
  if (!settings.diet || settings.diet.length === 0) return true;
  const userDiets = new Set(settings.diet.map((d) => d.toLowerCase()));

  // If user has dietary restrictions, recipe must match at least one
  if (userDiets.has("vegan")) {
    return recipe.diet.includes("vegan");
  }
  if (userDiets.has("vegetarian")) {
    return recipe.diet.includes("vegetarian") || recipe.diet.includes("vegan");
  }
  if (userDiets.has("pescatarian")) {
    // Pescatarian can eat vegetarian, vegan, and pescatarian recipes
    return (
      recipe.diet.includes("pescatarian") ||
      recipe.diet.includes("vegetarian") ||
      recipe.diet.includes("vegan")
    );
  }
  if (userDiets.has("gluten-free")) {
    // Check if recipe has wheat/gluten ingredients
    const glutenIngredients = [
      "bread",
      "pasta",
      "flour",
      "wheat",
      "spaghetti",
      "noodles",
      "tortilla",
      "puff pastry",
      "lasagna noodles",
    ];
    const hasGluten = recipe.ingredients.some((ing) =>
      glutenIngredients.some(
        (g) =>
          normalizeIngredient(ing).includes(g) ||
          normalizeIngredient(g).includes(normalizeIngredient(ing))
      )
    );
    if (hasGluten) return false;
  }
  if (userDiets.has("dairy-free")) {
    const dairyIngredients = [
      "milk",
      "cheese",
      "butter",
      "cream",
      "yogurt",
      "parmesan",
      "mozzarella",
      "cheddar",
      "ricotta",
    ];
    const hasDairy = recipe.ingredients.some((ing) =>
      dairyIngredients.some(
        (d) =>
          normalizeIngredient(ing).includes(d) ||
          normalizeIngredient(d).includes(normalizeIngredient(ing))
      )
    );
    if (hasDairy) return false;
  }

  return true;
}

// Helper to check if recipe matches skill level
function recipeMatchesSkill(recipe) {
  const skill = settings.skill || "beginner";
  const skillHierarchy = { beginner: 0, novice: 1, intermediate: 2, expert: 3 };
  const userLevel = skillHierarchy[skill] || 0;
  const recipeLevel = skillHierarchy[recipe.difficulty] || 0;

  // Show recipes at or below user's skill level
  return recipeLevel <= userLevel;
}

// Helper to check if recipe matches food preference
function recipeMatchesFoodPreference(recipe) {
  const pref = settings.foodPref || "none";
  if (pref === "none") return true;

  if (pref === "vegetarian") {
    return recipe.diet.includes("vegetarian") || recipe.diet.includes("vegan");
  }
  if (pref === "vegan") {
    return recipe.diet.includes("vegan");
  }
  if (pref === "low-carb") {
    // Prefer recipes without high-carb ingredients
    const carbIngredients = ["bread", "pasta", "rice", "potato", "tortilla", "noodles"];
    const hasHighCarbs = recipe.ingredients.some((ing) =>
      carbIngredients.some((c) => normalizeIngredient(ing).includes(c))
    );
    // Don't completely exclude, but de-prioritize (we'll handle in sorting)
    return !hasHighCarbs;
  }
  if (pref === "high-protein") {
    // Prefer recipes with protein ingredients
    const proteinIngredients = [
      "chicken",
      "beef",
      "pork",
      "salmon",
      "tuna",
      "shrimp",
      "egg",
      "tofu",
      "lentils",
      "chickpea",
      "scallops",
      "duck",
      "protein powder",
    ];
    const hasProtein = recipe.ingredients.some((ing) =>
      proteinIngredients.some(
        (p) =>
          normalizeIngredient(ing).includes(p) ||
          normalizeIngredient(p).includes(normalizeIngredient(ing))
      )
    );
    return hasProtein;
  }

  return true;
}

function normalizeIngredient(text) {
  // strip counts/units and punctuation, collapse whitespace
  let s = String(text || "")
    .toLowerCase()
    .replace(
      /\b(\d+|\d+\/\d+|cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|slices|slice|cloves|grams|gram|g|kg|ml|l|oz)\b/g,
      ""
    );
  s = s
    .replace(/[.,()]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "";
  // simple plural handling: strip trailing 's' for common plurals (naive)
  const exceptions = new Set(["cheese", "oil", "fish", "beef", "pork", "milk", "sugar"]);
  s = s
    .split(" ")
    .map((w) => {
      if (!w) return w;
      if (exceptions.has(w)) return w;
      if (w.endsWith("es") && w.length > 3) return w.slice(0, -2);
      if (w.endsWith("s") && w.length > 2) return w.slice(0, -1);
      return w;
    })
    .join(" ");
  // apply synonyms mapping for multi-word keys first
  for (const [k, v] of Object.entries(INGREDIENT_SYNONYMS)) {
    const re = new RegExp("\\b" + escapeRegExp(k) + "\\b", "i");
    if (re.test(s)) {
      s = s.replace(re, v);
    }
  }
  // stem tokens
  s = s
    .split(" ")
    .map((tok) => stemWord(tok))
    .join(" ")
    .trim();
  return s;
}

function computeRecipeMatch(recipe) {
  const invCanon = inventory.map((i) => normalizeIngredient(i.name || ""));
  const available = [];
  const missing = [];
  const perIngredient = []; // [{ orig, norm, available: bool }]
  for (const ing of recipe.ingredients) {
    const n = normalizeIngredient(ing);
    // treat match as token overlap (inventory token included in ingredient or vice-versa)
    let found = invCanon.some((inv) => {
      if (!inv || !n) return false;
      if (inv === n || inv.includes(n) || n.includes(inv)) return true;
      const invTokens = inv.split(" ");
      const nTokens = n.split(" ");
      // token overlap
      if (invTokens.some((tok) => nTokens.includes(tok))) return true;
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
    if (found) {
      available.push(ing);
      perIngredient.push({ orig: ing, norm: n, available: true });
    } else {
      missing.push(ing);
      perIngredient.push({ orig: ing, norm: n, available: false });
    }
  }
  return {
    availableCount: available.length,
    total: recipe.ingredients.length,
    missing,
    perIngredient,
  };
}

function renderRecipes() {
  const container = document.getElementById("recipesList");
  if (!container) return;
  container.innerHTML = "";
  const q = document.getElementById("recipeSearch")?.value.trim().toLowerCase() || "";
  const dietFilter = document.getElementById("recipeDietFilter")?.value || "all";
  const sortMode = document.getElementById("recipeSort")?.value || "recommended";

  // prepare sorted list
  const list = recipes
    .map((r) => {
      const match = computeRecipeMatch(r);
      return { ...r, match };
    })
    .filter((r) => {
      // Apply settings-based filters first
      if (!recipeMatchesDiet(r)) return false;
      if (!recipeMatchesSkill(r)) return false;
      if (!recipeMatchesFoodPreference(r)) return false;

      // diet filter from UI
      if (dietFilter !== "all" && !(r.diet || []).includes(dietFilter)) return false;
      // search
      if (q) {
        const hay = (r.title + " " + r.ingredients.join(" ")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

  // sort according to recipeSort control
  if (sortMode === "recommended") {
    list.sort(
      (a, b) => b.match.availableCount / b.match.total - a.match.availableCount / a.match.total
    );
  } else if (sortMode === "missing") {
    // most ingredients match -> descending by availableCount
    list.sort(
      (a, b) => b.match.availableCount - a.match.availableCount || a.title.localeCompare(b.title)
    );
  } else if (sortMode === "time") {
    list.sort((a, b) => (a.time || 0) - (b.time || 0));
  }

  for (const r of list) {
    const card = document.createElement("div");
    card.className = "recipe-card";
    const head = document.createElement("div");
    head.className = "card-header";
    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "8px";
    const h3 = document.createElement("h3");
    // Create short title (remove "with ..." portion) for collapsed view
    const shortTitle = r.title.includes(" with ") 
      ? r.title.split(" with ")[0] 
      : r.title;
    h3.innerHTML = `<span class="title-short">${shortTitle}</span><span class="title-full">${r.title}</span>`;
    left.appendChild(h3);
    // diet badges (skip "vegetarian" if "vegan" is present)
    if (Array.isArray(r.diet)) {
      const isVegan = r.diet.some((d) => String(d).toLowerCase() === "vegan");
      for (const d of r.diet) {
        const dLower = String(d).toLowerCase();
        // Skip vegetarian badge when vegan badge is shown
        if (dLower === "vegetarian" && isVegan) continue;
        const db = document.createElement("span");
        db.className = "diet-badge diet-" + dLower.replace(/[^a-z0-9]+/g, "-");
        db.textContent = d.charAt(0).toUpperCase() + d.slice(1);
        left.appendChild(db);
      }
    }
    head.appendChild(left);
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${r.match.availableCount}/${r.match.total} ingredients available • ${r.time} min`;
    head.appendChild(meta);
    const toggle = document.createElement("button");
    toggle.className = "toggle-btn";
    toggle.textContent = "+";
    toggle.onclick = () => card.classList.toggle("expanded");
    head.appendChild(toggle);
    card.appendChild(head);

    const content = document.createElement("div");
    content.className = "card-content";
    const ingDiv = document.createElement("div");
    ingDiv.className = "ingredients";
    const h4 = document.createElement("h4");
    h4.textContent = "Ingredients";
    ingDiv.appendChild(h4);
    const ul = document.createElement("ul");
    // use perIngredient availability if present
    const per =
      (r.match && r.match.perIngredient) ||
      r.ingredients.map((i) => ({ orig: i, norm: normalizeIngredient(i), available: false }));
    for (const p of per) {
      const li = document.createElement("li");
      const pill = document.createElement("span");
      pill.className = "ing-pill " + (p.available ? "ing-available" : "ing-missing");
      pill.textContent = p.available ? "✓" : "✕";
      pill.title = p.available ? "Available in inventory" : "Missing from inventory (✕)";
      const text = document.createElement("span");
      text.textContent = " " + toTitleCase(p.orig);
      li.appendChild(pill);
      li.appendChild(text);
      ul.appendChild(li);
    }
    ingDiv.appendChild(ul);
    content.appendChild(ingDiv);
    const stepsDiv = document.createElement("div");
    stepsDiv.className = "steps";
    const h4s = document.createElement("h4");
    h4s.textContent = "Steps";
    stepsDiv.appendChild(h4s);
    const ol = document.createElement("ol");
    for (const s of r.steps) {
      const li = document.createElement("li");
      li.textContent = s;
      ol.appendChild(li);
    }
    stepsDiv.appendChild(ol);
    content.appendChild(stepsDiv);

    // actions
    const actions = document.createElement("div");
    actions.className = "card-actions";
    const addBtn = document.createElement("button");
    addBtn.className = "btn";
    addBtn.textContent = "Add Missing Ingredients to Shopping";
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
const recipeSearch = document.getElementById("recipeSearch");
const recipeDietFilter = document.getElementById("recipeDietFilter");
const recipeSortSelect = document.getElementById("recipeSort");
if (recipeSearch) recipeSearch.addEventListener("input", () => renderRecipes());
if (recipeDietFilter) recipeDietFilter.addEventListener("change", () => renderRecipes());
if (recipeSortSelect) recipeSortSelect.addEventListener("change", () => renderRecipes());

// render initially
renderRecipes();

// wiring
const addAllergyBtn = document.getElementById("addAllergyBtn");
const allergyInput = document.getElementById("allergyInput");
const saveSettingsBtn = document.getElementById("saveSettings");
const resetSettingsBtn = document.getElementById("resetSettings");

if (addAllergyBtn && allergyInput)
  addAllergyBtn.onclick = () => {
    const v = String(allergyInput.value || "").trim();
    if (!v) return;
    settings.allergies = Array.from(new Set([...(settings.allergies || []), v]));
    allergyInput.value = "";
    persistSettings();
    renderSettings();
  };

if (saveSettingsBtn)
  saveSettingsBtn.onclick = () => {
    saveSettingsFromForm();
  };
if (resetSettingsBtn)
  resetSettingsBtn.onclick = () => {
    settings = {};
    persistSettings();
    renderSettings();
  };

loadSettings();
// apply recipe filtering initially
filterRecipesByAllergies();
// call filtering after settings change
if (saveSettingsBtn) saveSettingsBtn.addEventListener("click", () => filterRecipesByAllergies());
if (resetSettingsBtn) resetSettingsBtn.addEventListener("click", () => filterRecipesByAllergies());

/* ---------- Confirm-missing modal wiring ---------- */
const confirmMissingModal = document.getElementById("confirmMissingModal");
const missingListEl = document.getElementById("missingList");
const confirmAddMissingBtn = document.getElementById("confirmAddMissing");
const closeConfirmMissingBtn = document.getElementById("closeConfirmMissing");
const cancelConfirmMissingBtn = document.getElementById("cancelConfirmMissing");

// Store the missing ingredients to add after confirmation
let pendingMissingIngredients = [];

function showConfirmMissingModal(missing) {
  if (!confirmMissingModal || !missingListEl) return;
  if (!missing || missing.length === 0) return;
  
  missingListEl.innerHTML = "";
  const toAdd = [];
  const alreadyExists = [];
  
  // Categorize items: to add vs. already exists
  for (const rawName of missing) {
    const name = String(rawName).trim();
    if (!name) continue;
    
    const exists = shopping.some(
      (s) =>
        String(s.name || "")
          .trim()
          .toLowerCase() === name.toLowerCase()
    );
    
    if (exists) {
      alreadyExists.push(toTitleCase(name));
    } else {
      toAdd.push(toTitleCase(name));
    }
  }
  
  // Store items to add for confirmation
  pendingMissingIngredients = toAdd;
  
  // Show items to be added
  if (toAdd.length > 0) {
    const addHeader = document.createElement("p");
    addHeader.innerHTML = "<strong>Will be added to Shopping List:</strong>";
    addHeader.style.marginBottom = "8px";
    missingListEl.appendChild(addHeader);
    
    const addList = document.createElement("ul");
    addList.style.marginBottom = "16px";
    for (const item of toAdd) {
      const li = document.createElement("li");
      li.textContent = item;
      addList.appendChild(li);
    }
    missingListEl.appendChild(addList);
  }
  
  // Show items already in list
  if (alreadyExists.length > 0) {
    const existsHeader = document.createElement("p");
    existsHeader.innerHTML = "<strong>Already in Shopping List:</strong>";
    existsHeader.style.marginBottom = "8px";
    missingListEl.appendChild(existsHeader);
    
    const existsList = document.createElement("ul");
    for (const item of alreadyExists) {
      const li = document.createElement("li");
      li.textContent = item;
      li.style.color = "var(--muted, #6b7280)";
      existsList.appendChild(li);
    }
    missingListEl.appendChild(existsList);
  }
  
  // If nothing to add, show message
  if (toAdd.length === 0 && alreadyExists.length > 0) {
    const notice = document.createElement("p");
    notice.textContent = "All ingredients are already in your shopping list.";
    notice.style.fontStyle = "italic";
    notice.style.color = "var(--muted, #6b7280)";
    notice.style.marginTop = "12px";
    missingListEl.appendChild(notice);
  }
  
  confirmMissingModal.classList.add("show");
  confirmMissingModal.setAttribute("aria-hidden", "false");
}

function confirmAddMissingHandler() {
  // Add the pending items to shopping list
  if (pendingMissingIngredients.length > 0) {
    for (const name of pendingMissingIngredients) {
      shopping.push({
        id: cid(),
        name: name,
        qty: 1,
        category: "other",
        bought: false,
        autoAdded: false,
        reason: "recipe",
      });
    }
    persistShop();
    renderShopping();
  }
  
  // Clear pending items and close modal
  pendingMissingIngredients = [];
  hideConfirmMissingModal();
}

function hideConfirmMissingModal() {
  if (!confirmMissingModal) return;
  pendingMissingIngredients = [];
  confirmMissingModal.classList.remove("show");
  confirmMissingModal.setAttribute("aria-hidden", "true");
}

if (closeConfirmMissingBtn) closeConfirmMissingBtn.onclick = hideConfirmMissingModal;
if (cancelConfirmMissingBtn) cancelConfirmMissingBtn.onclick = hideConfirmMissingModal;
if (confirmAddMissingBtn) confirmAddMissingBtn.onclick = confirmAddMissingHandler;
if (confirmMissingModal)
  confirmMissingModal.addEventListener("click", (e) => {
    if (e.target === confirmMissingModal) hideConfirmMissingModal();
  });
