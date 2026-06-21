const CONFIG = {
  recipientName: "Aisha",
  subtitle: "A collection of special memories just for you.",
  startYear: 2026,
  startMonth: 1,
  endYear: 2026,
  endMonth: 5,
  memoriesFile: "memories.json"
};

let currentYear = CONFIG.startYear;
let currentMonth = CONFIG.startMonth;
let memoriesMap = {};

const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const monthLabelEl = document.getElementById("monthLabel");
const gridEl = document.getElementById("calendarGrid");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const captionDialog = document.getElementById("captionDialog");
const dialogImage = document.getElementById("dialogImage");
const dialogDate = document.getElementById("dialogDate");
const dialogCaption = document.getElementById("dialogCaption");
const closeDialogBtn = document.getElementById("closeDialogBtn");

titleEl.textContent = "Happy Birthday, " + CONFIG.recipientName;
subtitleEl.textContent = CONFIG.subtitle;

prevBtn.addEventListener("click", () => {
  if (!canGoPrev()) return;
  currentMonth -= 1;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }
  renderCalendar();
});

nextBtn.addEventListener("click", () => {
  if (!canGoNext()) return;
  currentMonth += 1;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  renderCalendar();
});

closeDialogBtn.addEventListener("click", () => {
  captionDialog.close();
});

captionDialog.addEventListener("click", (event) => {
  const rect = captionDialog.getBoundingClientRect();
  const inside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;

  if (!inside) {
    captionDialog.close();
  }
});

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDateKey(year, month, day) {
  return year + "-" + pad(month + 1) + "-" + pad(day);
}

function formatMonthLabel(year, month) {
  return new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function monthIndex(year, month) {
  return year * 12 + month;
}

function canGoPrev() {
  return monthIndex(currentYear, currentMonth) > monthIndex(CONFIG.startYear, CONFIG.startMonth);
}

function canGoNext() {
  return monthIndex(currentYear, currentMonth) < monthIndex(CONFIG.endYear, CONFIG.endMonth);
}

function updateNavButtons() {
  prevBtn.disabled = !canGoPrev();
  nextBtn.disabled = !canGoNext();
}

async function loadMemories() {
  try {
    const response = await fetch(CONFIG.memoriesFile, { cache: "no-store" });
    if (!response.ok) {
      memoriesMap = {};
      return;
    }
    memoriesMap = await response.json();
  } catch {
    memoriesMap = {};
  }
}

function hasMemory(dateKey) {
  return Object.prototype.hasOwnProperty.call(memoriesMap, dateKey);
}

function openCaptionModal(dateKey) {
  const memory = memoriesMap[dateKey];
  if (!memory) return;

  dialogImage.src = memory.image;
  dialogImage.alt = "Photo for " + dateKey;
  dialogDate.textContent = dateKey;
  dialogCaption.textContent = memory.caption || "A special memory.";

  if (typeof captionDialog.showModal === "function") {
    captionDialog.showModal();
  }
}

function createEmptyCard() {
  const empty = document.createElement("div");
  empty.className = "empty-card";
  return empty;
}

function createDayCard(year, month, day) {
  const dateKey = formatDateKey(year, month, day);
  const enabled = hasMemory(dateKey);

  const card = document.createElement("button");
  card.className = "day-card";
  card.type = "button";

  const badge = document.createElement("span");
  badge.className = "day-badge";
  badge.textContent = String(day);
  card.appendChild(badge);

  if (enabled) {
    card.classList.add("has-memory");
    card.setAttribute("aria-label", "Open memory for " + dateKey);

    const marker = document.createElement("span");
    marker.className = "memory-dot";
    marker.setAttribute("aria-hidden", "true");
    card.appendChild(marker);

    const img = document.createElement("img");
    img.src = memoriesMap[dateKey].image;
    img.alt = "Photo for " + dateKey;
    img.loading = "lazy";

    img.onerror = () => {
      card.classList.remove("has-memory");
      card.classList.add("disabled-day");
      card.disabled = true;
      if (img.parentElement === card) {
        card.removeChild(img);
      }
      const text = document.createElement("p");
      text.textContent = "Photo missing";
      card.appendChild(text);
    };

    card.appendChild(img);
    card.addEventListener("click", () => openCaptionModal(dateKey));
  } else {
    card.classList.add("disabled-day");
    card.disabled = true;
    card.setAttribute("aria-label", "No memory for " + dateKey);

    const text = document.createElement("p");
    text.textContent = "No photo";
    card.appendChild(text);
  }

  return card;
}

function renderCalendar() {
  monthLabelEl.textContent = formatMonthLabel(currentYear, currentMonth);
  gridEl.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const mondayFirst = (firstDay.getDay() + 6) % 7;

  for (let i = 0; i < mondayFirst; i += 1) {
    gridEl.appendChild(createEmptyCard());
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    gridEl.appendChild(createDayCard(currentYear, currentMonth, day));
  }

  updateNavButtons();
}

async function init() {
  await loadMemories();
  renderCalendar();
}

init();
