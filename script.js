// script.js
const CONFIG = {
  recipientName: "Loletyy",
  subtitle: "A collection of special memories just for you.",
  startYear: 2026,
  startMonth: 1,
  endYear: 2026,
  endMonth: 5,
  memoriesFile: "memories.json",
  accessSalt: "vC6TB0JW/v1P4oY9ez+jLA==",
  accessHash: "008378928c502ce902643306e86d7aabe8f3cd01e3267458ece589e135ef3448"
};

let currentYear = CONFIG.startYear;
let currentMonth = CONFIG.startMonth;
let memoriesMap = {};

const coverPage = document.getElementById("coverPage");
const calendarPage = document.getElementById("calendarPage");
const unlockForm = document.getElementById("unlockForm");
const passwordInput = document.getElementById("passwordInput");
const accessMessage = document.getElementById("accessMessage");
const openCalendarBtn = document.getElementById("openCalendarBtn");

const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const monthLabelEls = [
  document.getElementById("monthLabelTop"),
  document.getElementById("monthLabelBottom")
];
const gridEl = document.getElementById("calendarGrid");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const prevBtn1 = document.getElementById("prevBtn1");
const nextBtn1 = document.getElementById("nextBtn1");

const captionDialog = document.getElementById("captionDialog");
const dialogImage = document.getElementById("dialogImage");
const dialogDate = document.getElementById("dialogDate");
const dialogCaption = document.getElementById("dialogCaption");

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

titleEl.textContent = "Happy Birthday, " + CONFIG.recipientName;
subtitleEl.textContent = CONFIG.subtitle;

const bgMusic = new Audio('./music.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.2;

unlockForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = (passwordInput.value || "").trim();
  if (!password) {
    accessMessage.textContent = "Enter password first.";
    return;
  }

  accessMessage.textContent = "Checking password...";
  openCalendarBtn.disabled = true;

  try {
    const validPassword = await verifyPassword(password);
    if (!validPassword) {
      accessMessage.textContent = "Incorrect password.";
      return;
    }

    accessMessage.textContent = "Unlocking memories...";
    await loadMemories(password);

    coverPage.classList.add("hidden");
    calendarPage.classList.remove("hidden");
    renderCalendar();

    bgMusic.play().catch(() => {
      // Ignore autoplay failure if browser blocks audio.
    });
  } catch {
    accessMessage.textContent = "Could not unlock memories.";
  } finally {
    openCalendarBtn.disabled = false;
  }
});

prevBtn.addEventListener("click", () => {
  if (!canGoPrev()) {
    return;
  }

  currentMonth -= 1;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }

  renderCalendar();
});

prevBtn1.addEventListener("click", () => {
  if (!canGoPrev()) {
    return;
  }

  currentMonth -= 1;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }

  renderCalendar();
});

nextBtn.addEventListener("click", () => {
  if (!canGoNext()) {
    return;
  }

  currentMonth += 1;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }

  renderCalendar();
});

nextBtn1.addEventListener("click", () => {
  if (!canGoNext()) {
    return;
  }

  currentMonth += 1;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }

  renderCalendar();
});

function pad(number) {
  return String(number).padStart(2, "0");
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
  prevBtn1.disabled = !canGoPrev();
  nextBtn1.disabled = !canGoNext();
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function concatBytes(first, second) {
  const merged = new Uint8Array(first.length + second.length);
  merged.set(first, 0);
  merged.set(second, first.length);
  return merged;
}

function equalBytes(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left[index] ^ right[index];
  }

  return result === 0;
}

async function deriveKeyMaterial(password, saltBase64, iterations, hash, lengthBits) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBytes(saltBase64),
      iterations,
      hash
    },
    baseKey,
    lengthBits
  );

  return new Uint8Array(bits);
}

async function verifyPassword(password) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(CONFIG.accessSalt + ":" + password)
  );

  return bytesToHex(new Uint8Array(digest)) === CONFIG.accessHash;
}

async function decryptMemoriesPayload(payload, password) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  if (!payload.kdf || !payload.cipher || !payload.cipher.data) {
    return payload;
  }

  const kdfHash = payload.kdf.hash || "SHA-1";
  const iterations = Number(payload.kdf.iterations || 250000);
  const keyLength = Number(payload.kdf.keyLength || 64);

  const keyMaterial = await deriveKeyMaterial(
    password,
    payload.kdf.salt,
    iterations,
    kdfHash,
    keyLength * 8
  );

  const encryptionKeyBytes = keyMaterial.slice(0, 32);
  const macKeyBytes = keyMaterial.slice(32, 64);
  const iv = base64ToBytes(payload.cipher.iv);
  const cipherBytes = base64ToBytes(payload.cipher.data);
  const expectedMac = base64ToBytes(payload.cipher.mac);

  const macKey = await crypto.subtle.importKey(
    "raw",
    macKeyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const computedMacBuffer = await crypto.subtle.sign("HMAC", macKey, concatBytes(iv, cipherBytes));
  const computedMac = new Uint8Array(computedMacBuffer);

  if (!equalBytes(computedMac, expectedMac)) {
    throw new Error("Integrity check failed");
  }

  const encryptionKey = await crypto.subtle.importKey(
    "raw",
    encryptionKeyBytes,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    encryptionKey,
    cipherBytes
  );

  const decryptedText = textDecoder.decode(decryptedBuffer);
  return JSON.parse(decryptedText);
}

async function loadMemories(password) {
  try {
    const response = await fetch(CONFIG.memoriesFile, { cache: "no-store" });
    if (!response.ok) {
      memoriesMap = {};
      return;
    }

    const payload = await response.json();
    memoriesMap = await decryptMemoriesPayload(payload, password);
  } catch {
    memoriesMap = {};
    throw new Error("Failed to load memories");
  }
}

function hasMemory(dateKey) {
  return Object.prototype.hasOwnProperty.call(memoriesMap, dateKey);
}

function openCaptionDialog(dateKey) {
  const memory = memoriesMap[dateKey];
  if (!memory) {
    return;
  }

  dialogImage.src = memory.image;
  dialogImage.alt = "Photo for " + dateKey;
  dialogDate.textContent = dateKey;
  dialogCaption.textContent = memory.caption || "A special memory.";

  if (typeof captionDialog.showModal === "function") {
    if (!captionDialog.open) {
      captionDialog.showModal();
    }
  } else {
    captionDialog.setAttribute("open", "open");
  }
}

function closeCaptionDialog() {
  if (captionDialog.open && typeof captionDialog.close === "function") {
    captionDialog.close();
  } else {
    captionDialog.removeAttribute("open");
  }
}

captionDialog.addEventListener("click", (event) => {
  const rect = captionDialog.getBoundingClientRect();
  const inside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;

  if (!inside) {
    closeCaptionDialog();
  }
});

captionDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeCaptionDialog();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCaptionDialog();
  }
});

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

    const media = document.createElement("div");
    media.className = "day-media";

    const img = document.createElement("img");
    img.src = memoriesMap[dateKey].image;
    img.alt = "Photo for " + dateKey;
    img.loading = "lazy";
    img.className = "day-image is-blurred";

    img.onerror = () => {
      card.classList.remove("has-memory");
      card.classList.add("disabled-day");
      card.disabled = true;
      media.remove();

      const text = document.createElement("p");
      text.textContent = "Photo missing";
      card.appendChild(text);
    };

    media.appendChild(img);
    card.appendChild(media);

    card.addEventListener("click", () => {
      openCaptionDialog(dateKey);
    });
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
  const monthLabel = formatMonthLabel(currentYear, currentMonth);
  monthLabelEls.forEach((element) => {
    if (element) {
      element.textContent = monthLabel;
    }
  });

  gridEl.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const mondayFirst = (firstDay.getDay() + 6) % 7;

  for (let index = 0; index < mondayFirst; index += 1) {
    gridEl.appendChild(createEmptyCard());
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    gridEl.appendChild(createDayCard(currentYear, currentMonth, day));
  }

  updateNavButtons();
}

function init() {
  updateNavButtons();
}

init();
