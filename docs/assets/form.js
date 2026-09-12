"use strict";

const page = document.body;
const slug = page.dataset.slug;
const form = document.querySelector("#sheetForm");
const fields = Array.from(form.querySelectorAll("textarea[name]"));
const submitButton = document.querySelector("#submitButton");
const saveStatus = document.querySelector("#saveStatus");
const successModal = document.querySelector("#successModal");
const sheetScroll = document.querySelector(".sheet-scroll");
const excelGrid = document.querySelector(".excel-grid");
const zoomLevel = document.querySelector("#zoomLevel");
const storageKey = `mooc-444-static-${slug}-draft-v1`;
const zoomKey = `mooc-444-static-${slug}-zoom-v1`;

let sheetScale = 1;
let autoFit = false;

function applyZoom(value, fit = false) {
  const requested = Number.isFinite(value) ? value : 1;
  autoFit = fit;
  sheetScale = fit ? requested : Math.min(1.6, Math.max(0.1, Math.round(requested * 100) / 100));
  excelGrid.style.zoom = String(sheetScale);
  zoomLevel.value = `${Math.round(sheetScale * 100)}%`;
  zoomLevel.textContent = zoomLevel.value;
  localStorage.setItem(zoomKey, String(sheetScale));
}

function fitToScreen() {
  excelGrid.style.zoom = "1";
  excelGrid.style.width = "1178px";
  const baseWidth = excelGrid.scrollWidth;
  const availableWidth = Math.max(1, sheetScroll.clientWidth - 2);
  applyZoom(Math.min(1, availableWidth / baseWidth), true);
  sheetScroll.scrollLeft = 0;
}

function getValues() {
  return Object.fromEntries(fields.map((input) => [input.name, input.value.trim()]));
}

function updateDerivedValues() {
  const values = getValues();
  document.querySelectorAll("[data-derived-from]").forEach((element) => {
    element.textContent = values[element.dataset.derivedFrom] || element.dataset.fallback;
  });
}

function saveDraft() {
  localStorage.setItem(storageKey, JSON.stringify(getValues()));
  saveStatus.textContent = `仅保存于本设备 · ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  updateDerivedValues();
}

function loadDraft() {
  try {
    const values = JSON.parse(localStorage.getItem(storageKey) || "{}");
    fields.forEach((input) => {
      if (typeof values[input.name] === "string") input.value = values[input.name];
    });
    if (Object.values(values).some(Boolean)) saveStatus.textContent = "已恢复本设备中的草稿";
  } catch (_error) {
    localStorage.removeItem(storageKey);
  }
  updateDerivedValues();
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach((element) => { element.textContent = ""; });
  fields.forEach((input) => input.removeAttribute("aria-invalid"));
}

function showErrors(errors) {
  Object.entries(errors).forEach(([name, message]) => {
    const input = form.elements[name];
    const error = document.querySelector(`[data-error-for="${name}"]`);
    if (input) input.setAttribute("aria-invalid", "true");
    if (error) error.textContent = message;
  });
  const firstInvalid = fields.find((input) => errors[input.name]);
  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalid.focus();
  }
}

let saveTimer;
form.addEventListener("input", () => {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveDraft, 220);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearErrors();
  const errors = {};
  fields.forEach((input) => {
    if (input.required && !input.value.trim()) errors[input.name] = "尚未填写";
  });
  if (Object.keys(errors).length) {
    showErrors(errors);
    saveStatus.textContent = "请完成标记的填写区域";
    return;
  }
  saveDraft();
  submitButton.querySelector("span").textContent = "已完成";
  saveStatus.textContent = "填写完成 · 未上传数据";
  document.querySelector("#resultCode").textContent = new Date().toLocaleString("zh-CN");
  successModal.hidden = false;
  document.body.classList.add("modal-open");
});

document.querySelector("#closeModal").addEventListener("click", () => {
  successModal.hidden = true;
  document.body.classList.remove("modal-open");
});

document.querySelector("#clearButton").addEventListener("click", () => {
  if (!window.confirm("确定清空当前设备上的本表内容吗？清空后无法恢复。")) return;
  form.reset();
  localStorage.removeItem(storageKey);
  clearErrors();
  updateDerivedValues();
  submitButton.querySelector("span").textContent = "完成填写";
  saveStatus.textContent = "已清空，仅影响当前设备";
});

document.querySelector("#printButton").addEventListener("click", () => {
  saveDraft();
  window.print();
});

document.querySelector("#zoomOutButton").addEventListener("click", () => applyZoom(sheetScale - 0.1));
document.querySelector("#zoomInButton").addEventListener("click", () => applyZoom(sheetScale + 0.1));
document.querySelector("#fitButton").addEventListener("click", fitToScreen);

window.addEventListener("beforeprint", () => {
  fields.forEach((input) => {
    input.dataset.screenHeight = input.style.height;
    input.style.height = `${input.scrollHeight}px`;
  });
});

window.addEventListener("afterprint", () => {
  fields.forEach((input) => {
    input.style.height = input.dataset.screenHeight || "";
    delete input.dataset.screenHeight;
  });
});

// Keep the same landscape table layout on desktop and mobile.
applyZoom(1);
let previousWidth = sheetScroll.clientWidth;
new ResizeObserver(() => {
  const width = sheetScroll.clientWidth;
  if (width !== previousWidth) {
    previousWidth = width;
    if (autoFit) fitToScreen();
  }
}).observe(sheetScroll);
loadDraft();
