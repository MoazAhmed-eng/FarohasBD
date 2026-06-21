const CONFIG = {
  recipientName: "Aisha",
  message: "Wishing you joy, laughter, and beautiful memories.",
  birthdayDay: 21,
  startYear: 2026,
  startMonth: 5 // 0=Jan, 5=Jun
};

let currentYear = CONFIG.startYear;
let currentMonth = CONFIG.startMonth;

const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const monthLabelEl = document.getElementById("monthLabel");
const gridEl = document.getElementById("calendarGrid");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

titleEl.textContent = `Happy Birthday, ${CONFIG.recipientName}`;
subtitleEl.textContent = CONFIG.message;

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

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatMonthLabel(year, month) {
  return new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function createDayCard(year, month, day) {
  const card = document.createElement("article");
  card.className = "day-card";

  const dayHead = document.createElement("div");
  dayHead.className = "day-head";
  dayHead.textContent = day;
  card.appendChild(dayHead);

  if (day === CONFIG.birthdayDay) {
    card.classList.add("birthday");
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "Birthday";
    card.appendChild(badge);
  }

  const img = document.createElement("img");
  const fileName = `${year}-${pad(month + 1)}-${pad(day)}.jpg`;
  img.src = `photos/${fileName}`;
  img.alt = `Memory for ${fileName}`;

  img.onerror = () => {
    card.classList.add("no-photo");
    card.removeChild(img);
    const placeholder = document.createElement("p");
    placeholder.textContent = "Add photo: " + fileName;
    card.appendChild(placeholder);
  };

  card.appendChild(img);
  return card;
}

function renderCalendar() {
  monthLabelEl.textContent = formatMonthLabel(currentYear, currentMonth);
  gridEl.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Convert JS weekday to Monday-first index
  const mondayFirst = (firstDay.getDay() + 6) % 7;

  for (let i = 0; i < mondayFirst; i += 1) {
    const empty = document.createElement("div");
    empty.className = "empty-card";
    gridEl.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const card = createDayCard(currentYear, currentMonth, day);
    gridEl.appendChild(card);
  }
}

renderCalendar();
