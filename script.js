const CONFIG = {
recipientName: "Faroha",
subtitle: "A month of memories made for your birthday.",
startYear: 2026,
startMonth: 5,
captionsFile: "captions.json"
};

let currentYear = CONFIG.startYear;
let currentMonth = CONFIG.startMonth;
let captionsMap = {};

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
currentMonth -= 1;
if (currentMonth < 0) {
currentMonth = 11;
currentYear -= 1;
}
renderCalendar();
});

nextBtn.addEventListener("click", () => {
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
const clickedInside =
event.clientX >= rect.left &&
event.clientX <= rect.right &&
event.clientY >= rect.top &&
event.clientY <= rect.bottom;

if (!clickedInside) {
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

async function loadCaptions() {
try {
const res = await fetch(CONFIG.captionsFile, { cache: "no-store" });
if (!res.ok) {
captionsMap = {};
return;
}
captionsMap = await res.json();
} catch (e) {
captionsMap = {};
}
}

function openCaptionModal(dateKey) {
const imagePath = "photos/" + dateKey + ".jpg";
const caption = captionsMap[dateKey] || "A special memory from this day.";

dialogImage.src = imagePath;
dialogImage.alt = "Photo for " + dateKey;
dialogDate.textContent = dateKey;
dialogCaption.textContent = caption;

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
const card = document.createElement("button");
card.className = "day-card";
card.type = "button";
card.setAttribute("aria-label", "Open memory for " + dateKey);

const badge = document.createElement("span");
badge.className = "day-badge";
badge.textContent = String(day);
card.appendChild(badge);

const img = document.createElement("img");
img.src = "photos/" + dateKey + ".jpg";
img.alt = "Photo for " + dateKey;
img.loading = "lazy";

img.onerror = () => {
card.classList.add("no-photo");
if (img.parentElement === card) {
card.removeChild(img);
}
const noPhotoText = document.createElement("p");
noPhotoText.textContent = "No photo yet";
card.appendChild(noPhotoText);
};

card.appendChild(img);
card.addEventListener("click", () => openCaptionModal(dateKey));

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
}

async function init() {
await loadCaptions();
renderCalendar();
}

init();
