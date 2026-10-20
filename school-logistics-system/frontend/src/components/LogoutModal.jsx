import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./LogoutModal.css";

export default function LogoutModal({ error, onRetry, onClose }) {
  const dialogRef = useRef(null);

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

  return createPortal(
    <dialog
      ref={dialogRef}
      className="logout-modal"
      aria-labelledby="logout-modal-title"
      aria-describedby="logout-modal-description"
      onCancel={(event) => {
        event.preventDefault();
        if (error) onClose();
      }}
    >
      <div className={`logout-modal-symbol${error ? " logout-modal-symbol-error" : ""}`} aria-hidden="true">
        {error ? "!" : <span className="logout-modal-spinner" />}
      </div>
      <div role="status" aria-live="polite" aria-atomic="true">
        <h2 id="logout-modal-title">{error ? "Unable to log out" : "Logging out…"}</h2>
        <p id="logout-modal-description">
          {error || "Please wait while we sign you out. You’ll return to the landing page shortly."}
        </p>
      </div>
      {error ? (
        <div className="logout-modal-actions">
          <button type="button" onClick={onClose}>Stay signed in</button>
          <button type="button" className="logout-modal-retry" onClick={onRetry}>Try again</button>
        </div>
      ) : <span className="logout-modal-caption">Student Resource Management</span>}
    </dialog>,
    document.body,
  );
}
