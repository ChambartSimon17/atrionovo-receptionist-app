import { Alert } from "react-native";

// ======================================================
// Web setup
// ======================================================
//
// React Native Web leaves Alert.alert empty, so every
// confirmation in the app would silently do nothing.
// This draws a small dialog with the same buttons.
// ======================================================

function showDialog(title, message, buttons) {
  const list = buttons?.length ? buttons : [{ text: "OK" }];
  const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;

  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", zIndex: "100000",
    background: "rgba(0,0,0,0.4)", display: "flex",
    alignItems: "center", justifyContent: "center", padding: "16px",
    fontFamily: "Inter_400Regular, system-ui, sans-serif",
  });

  const box = document.createElement("div");
  Object.assign(box.style, {
    background: dark ? "#1c1c1e" : "#fff", color: dark ? "#f2f2f7" : "#1c1c1e",
    borderRadius: "14px", width: "100%", maxWidth: "340px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.25)", overflow: "hidden",
  });

  const body = document.createElement("div");
  Object.assign(body.style, { padding: "20px 20px 16px", textAlign: "center" });

  if (title) {
    const heading = document.createElement("div");
    heading.textContent = title;
    Object.assign(heading.style, { fontWeight: "600", fontSize: "17px", marginBottom: message ? "6px" : "0" });
    body.appendChild(heading);
  }

  if (message) {
    const text = document.createElement("div");
    text.textContent = message;
    Object.assign(text.style, { fontSize: "14px", lineHeight: "1.4", whiteSpace: "pre-wrap" });
    body.appendChild(text);
  }

  box.appendChild(body);

  const close = (button) => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    button?.onPress?.();
  };

  const cancel = list.find((button) => button.style === "cancel");

  const onKey = (event) => {
    if (event.key === "Escape") close(cancel);
  };

  // Cancel goes last, like the iPhone does with long lists.
  const ordered = [...list.filter((button) => button !== cancel), ...(cancel ? [cancel] : [])];

  for (const button of ordered) {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = button.text ?? "OK";
    Object.assign(element.style, {
      display: "block", width: "100%", padding: "13px", border: "0",
      borderTop: `1px solid ${dark ? "#38383a" : "#e5e5ea"}`, background: "transparent",
      fontSize: "16px", cursor: "pointer", font: "inherit",
      color: button.style === "destructive" ? "#d70015" : dark ? "#64d2ff" : "#1F5F55",
      fontWeight: button.style === "cancel" ? "600" : "500",
    });
    element.addEventListener("click", () => close(button));
    box.appendChild(element);
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay && cancel) close(cancel);
  });
  document.addEventListener("keydown", onKey);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  box.querySelector("button")?.focus();
}

if (typeof document !== "undefined") {
  Alert.alert = (title, message, buttons) => showDialog(title, message, buttons);
}
