function openTab(tabName) {
    const contents = document.getElementsByClassName("tabcontent");
    for (let c of contents) c.style.display = "none";
    document.getElementById(tabName).style.display = "block";
}

openTab("home");

document.getElementById("profileImg").onclick = () => {
    document.getElementById("alert").classList.remove("hidden");
};

function closeAlert() {
    document.getElementById("alert").classList.add("hidden");
}

function showChoices() {
    const camera1 = document.querySelector('input[name="camera1"]:checked').value;
    const camera2 = document.getElementById("camera2").value;
    document.getElementById("choiceOutput").textContent =
    `You chose ${camera1} and ${camera2}.`;
}

function addItem() {
    const input = document.getElementById("todoInput");
    const text = input.value.trim();
    if (!text) return;

    const li = document.createElement("li");
    li.textContent = text;

    li.onclick = () => li.classList.toggle("done");

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.onclick = () => li.remove();

    li.appendChild(removeBtn);
    document.getElementById("todoList").appendChild(li);
    input.value = "";
}

const today = new Date();

const formattedDate = today.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

document.getElementById("today").textContent = formattedDate;
/* ---------- Inventory Data ---------- */
const INVENTORY_KEY = "kk_inventory_v1";
let inventory = JSON.parse(localStorage.getItem(INVENTORY_KEY) || "[]");

// Seed a few items the first time.
if (inventory.length === 0) {
  inventory = [
    { id: cid(), name: "Milk", qty: 0.5, unit: "gal", minQty: 0.5, expiry: addDaysISO(3) },
    { id: cid(), name: "Eggs", qty: 6, unit: "pcs", minQty: 6, expiry: addDaysISO(7) },
    { id: cid(), name: "Spinach", qty: 0.2, unit: "lb", minQty: 0.3, expiry: addDaysISO(2) },
    { id: cid(), name: "Greek Yogurt", qty: 1, unit: "ct", minQty: 1, expiry: addDaysISO(10) },
    { id: cid(), name: "Bacon", qty: 0.2, unit: "lb", minQty: 0.3, expiry: addDaysISO(5) }
  ];
  persist();
}

/* ---------- Inventory UI State ---------- */
let currentFilter = "all"; // all | low | expiring
let currentSearch = "";

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

/* ---------- Filtering ---------- */
function isLow(item) { return Number(item.qty) <= Number(item.minQty); }
function isExpiring(item) {
  const d = daysUntil(item.expiry);
  return typeof d === "number" && d <= 3; // within 3 days (or overdue)
}
function passesFilter(item) {
  if (currentFilter === "low" && !isLow(item)) return false;
  if (currentFilter === "expiring" && !isExpiring(item)) return false;
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

    // Name + badges
    const tdName = document.createElement("td");
    tdName.textContent = it.name;
    if (isLow(it)) {
      const b = document.createElement("span");
      b.className = "badge low"; b.textContent = "Low";
      tdName.append(" ", b);
    }
    if (isExpiring(it)) {
      const b2 = document.createElement("span");
      b2.className = "badge exp"; b2.textContent = "Expiring";
      tdName.append(" ", b2);
    }

    const tdQty = domTD("num", fmtNum(it.qty));
    const tdUnit = domTD("", it.unit || "");
    const tdMin  = domTD("num", fmtNum(it.minQty));
    const tdExp  = domTD("", it.expiry || "");
    const dleft  = daysUntil(it.expiry);
    const tdDays = domTD("num", (dleft === "" ? "" : dleft));

    const tdAct = document.createElement("td");
    tdAct.style.textAlign = "right";
    tdAct.append(makeRowBtn("−", () => adjustQty(it.id, -1)),
                 " ",
                 makeRowBtn("+", () => adjustQty(it.id, +1)),
                 " ",
                 makeRowBtn("Delete", () => removeItem(it.id)));

    tr.append(tdName, tdQty, tdUnit, tdMin, tdExp, tdDays, tdAct);
    tbody.appendChild(tr);
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
  b.className = "btn"; b.style.padding = "4px 8px"; b.textContent = label; b.onclick = fn; return b;
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
    expiry: String(data.get("expiry") || "")
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
function showAddModal() { addModal.classList.add("show"); addModal.setAttribute("aria-hidden","false"); }
function hideAddModal() { addModal.classList.remove("show"); addModal.setAttribute("aria-hidden","true"); }

/* ---------- Wire up events ---------- */
document.getElementById("filterAll").onclick = () => { currentFilter = "all"; renderInventory(); };
document.getElementById("filterLow").onclick = () => { currentFilter = "low"; renderInventory(); };
document.getElementById("filterExpiring").onclick = () => { currentFilter = "expiring"; renderInventory(); };
document.getElementById("invSearch").addEventListener("input", (e) => { currentSearch = e.target.value.trim(); renderInventory(); });

document.getElementById("openAddModal").onclick = showAddModal;
document.getElementById("closeAddModal").onclick = hideAddModal;
document.getElementById("cancelAdd").onclick = hideAddModal;
document.getElementById("addModal").addEventListener("click", (e) => { if (e.target === addModal) hideAddModal(); });

document.getElementById("addForm").addEventListener("submit", (e) => {
  e.preventDefault();
  addItemFromForm(e.target);
  e.target.reset();
  hideAddModal();
});

/* ---------- Initial paint on load ---------- */
renderInventory();
