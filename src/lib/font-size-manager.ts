export type FontSizeOption = "normal" | "grande" | "extra-grande";

export function getSavedFontSize(): FontSizeOption {
  if (typeof window === "undefined") return "normal";
  const saved = localStorage.getItem("univans_font_size") as FontSizeOption;
  if (saved === "normal" || saved === "grande" || saved === "extra-grande") {
    return saved;
  }
  return "normal";
}

export function setGlobalFontSize(size: FontSizeOption) {
  if (typeof window === "undefined") return;
  localStorage.setItem("univans_font_size", size);
  document.documentElement.setAttribute("data-font-size", size);

  if (size === "normal") {
    document.documentElement.style.fontSize = "16px";
  } else if (size === "grande") {
    document.documentElement.style.fontSize = "17px";
  } else if (size === "extra-grande") {
    document.documentElement.style.fontSize = "18px";
  }
}

export function initGlobalFontSize() {
  const current = getSavedFontSize();
  setGlobalFontSize(current);
}
