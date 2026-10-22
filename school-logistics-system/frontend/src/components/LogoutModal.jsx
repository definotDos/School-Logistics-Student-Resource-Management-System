import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./LogoutModal.css";

export default function LogoutModal({ isLoggingOut, error, onConfirm, onClose }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const [isDarkMode] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("srmsLandingTheme") ?? "true");
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    if (isLoggingOut) dialogRef.current?.focus();
    else cancelRef.current?.focus();
  }, [isLoggingOut]);

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`logout-modal landing-palette${isDarkMode ? " dark-mode" : ""}`}
      aria-labelledby="logout-modal-title"
      aria-describedby="logout-modal-description"
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        if (!isLoggingOut) onClose();
      }}
    >
      <div className={`logout-modal-symbol${error ? " logout-modal-symbol-error" : ""}`} aria-hidden="true">
        {error ? "!" : isLoggingOut ? <span className="logout-modal-spinner" /> : (
          <svg className="logout-modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 17v3H4V4h6v3M9 12h12m-4-4 4 4-4 4" />
          </svg>
        )}
      </div>
      <div role="status" aria-live="polite" aria-atomic="true">
        <h2 id="logout-modal-title">{error ? "Unable to log out" : isLoggingOut ? "Logging out…" : "Log out of your account?"}</h2>
        <p id="logout-modal-description">
          {error || (isLoggingOut ? "Please wait while we sign you out. You’ll return to the landing page shortly." : "You’ll return to the landing page. You can sign in again whenever you’re ready.")}
        </p>
      </div>
      {!isLoggingOut ? (
        <div className="logout-modal-actions">
          <button ref={cancelRef} type="button" onClick={onClose}>Stay signed in</button>
          <button type="button" className="logout-modal-retry" onClick={onConfirm}>{error ? "Try again" : "Yes, log out"}</button>
        </div>
      ) : <span className="logout-modal-caption">Student Resource Management</span>}
    </dialog>,
    document.body,
  );
}
