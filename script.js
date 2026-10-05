// script.js
const CONFIG = {
  recipientName: "Loletyy",
  subtitle: "A collection of special memories just for you.",
  startYear: 2026,
  startMonth: 1,
  endYear: 2026,
  endMonth: 11,
  memoriesFile: "memories.json"
};

let currentYear = CONFIG.startYear;
let currentMonth = CONFIG.startMonth;
let memoriesMap = {};

const passwordDialog = document.getElementById("passwordDialog");
const passwordInput = document.getElementById("passwordInput");
const unlockBtn = document.getElementById("unlockBtn");
const cancelUnlockBtn = document.getElementById("cancelUnlockBtn");

function closePasswordDialog() {
  if (passwordDialog.open && typeof passwordDialog.close === "function") {
    passwordDialog.close();
  } else {
    passwordDialog.removeAttribute("open");
  }
}

function getUnlockPassword() {
  return new Promise((resolve) => {
    passwordInput.value = "";

    const submitPassword = () => {
      const value = passwordInput.value.trim();
      closePasswordDialog();
      resolve(value);
    };

    const cancelPassword = () => {
      closePasswordDialog();
      resolve("");
    };

    if (typeof passwordDialog.showModal === "function") {
      passwordDialog.showModal();
    } else {
      passwordDialog.setAttribute("open", "open");
    }

    unlockBtn.onclick = submitPassword;
    cancelUnlockBtn.onclick = cancelPassword;
    passwordDialog.oncancel = (event) => {
      event.preventDefault();
      cancelPassword();
    };

    passwordInput.focus();
  });
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function deriveMemoryKeys(password, saltBytes) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 250000,
      hash: "SHA-1"
    },
    keyMaterial,
    512
  );

  const derivedBytes = new Uint8Array(derivedBits);
  return {
    encKey: derivedBytes.slice(0, 32),
    macKey: derivedBytes.slice(32, 64)
  };
}

async function decryptEncryptedMemories(encryptedText, password) {
  const payload = JSON.parse(encryptedText);

  if (!payload || !payload.kdf || !payload.cipher) {
    throw new Error("Invalid encrypted memory payload.");
  }

  const saltBytes = base64ToBytes(payload.kdf.salt);
  const ivBytes = base64ToBytes(payload.cipher.iv);
  const encryptedBytes = base64ToBytes(payload.cipher.data);
  const expectedMacBytes = base64ToBytes(payload.cipher.mac);

  const { encKey, macKey } = await deriveMemoryKeys(password, saltBytes);

  const macKeyHandle = await crypto.subtle.importKey(
    "raw",
    macKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const macData = new Uint8Array(ivBytes.length + encryptedBytes.length);
  macData.set(ivBytes, 0);
  macData.set(encryptedBytes, ivBytes.length);

  const actualMacBytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", macKeyHandle, macData)
  );

  if (actualMacBytes.length !== expectedMacBytes.length) {
    throw new Error("Incorrect calendar password.");
  }

  for (let index = 0; index < actualMacBytes.length; index += 1) {
    if (actualMacBytes[index] !== expectedMacBytes[index]) {
      throw new Error("Incorrect calendar password.");
    }
  }

  const aesKey = await crypto.subtle.importKey(
    "raw",
    encKey,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: ivBytes },
    aesKey,
    encryptedBytes
  );

  const jsonText = new TextDecoder().decode(new Uint8Array(decryptedBuffer));
  return JSON.parse(jsonText);
}

const coverPage = document.getElementById("coverPage");
const calendarPage = document.getElementById("calendarPage");
const openCalendarBtn = document.getElementById("openCalendarBtn");

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

titleEl.textContent = "Happy Birthday, " + CONFIG.recipientName;
subtitleEl.textContent = CONFIG.subtitle;

const bgMusic = new Audio('./music.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.2;

openCalendarBtn.addEventListener("click", () => {
  bgMusic.play();
  coverPage.classList.add("hidden");
  calendarPage.classList.remove("hidden");
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
}

async function loadMemories() {
  try {
    const response = await fetch(CONFIG.memoriesFile, { cache: "no-store" });
    if (!response.ok) {
      memoriesMap = {};
      return;
    }

    const rawText = await response.text();
    const trimmed = rawText.trim();

    if (!trimmed) {
      memoriesMap = {};
      return;
    }

    if (trimmed.startsWith("{") && trimmed.includes('"kdf"')) {
      const password = await getUnlockPassword();
      if (!password) {
        memoriesMap = {};
        return;
      }

      memoriesMap = await decryptEncryptedMemories(trimmed, password);
      return;
    }

    memoriesMap = JSON.parse(trimmed);
  } catch (error) {
    console.error("Unable to load memories:", error);
    if (window.location.protocol === "file:") {
      window.alert("This calendar must be opened through a local web server, not as a file URL, for the encrypted memories to load.");
    }
    memoriesMap = {};
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
  monthLabelEl.textContent = formatMonthLabel(currentYear, currentMonth);
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

async function init() {
  await loadMemories();
  renderCalendar();
}

init();
