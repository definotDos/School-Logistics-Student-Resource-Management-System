import DashboardIcon from "./DashboardIcon";
import { useAppearance } from "../hooks/useStudentTheme";
import { accentColors, colorModes, defaults, isAppearanceSaved, updateAppearance } from "../utils/appearance";

export default function AppearancePanel() {
  const preferences = useAppearance();
  return <section className="utility-card appearance-card" aria-labelledby="appearance-title">
    <div className="utility-section-heading"><span className="utility-section-icon"><DashboardIcon name="overview" /></span><div><h2 id="appearance-title">Appearance</h2><p className="utility-muted">A workspace that feels like yours.</p></div></div>
    <fieldset className="utility-theme-options"><legend>Color mode</legend>{colorModes.map(({ id: theme, label, description }) => <label className="utility-theme-option" key={theme}>
      <input type="radio" name="settings-theme" value={theme} checked={preferences.theme === theme} onChange={() => updateAppearance({ theme })} />
      <span className={`utility-theme-preview ${theme}`} aria-hidden="true"><i /><span><b /><b /><b /></span></span><span className="utility-theme-label">{label}</span><small className="appearance-mode-description">{description}</small>
    </label>)}</fieldset>
    <p className="appearance-hint">System follows your device’s light or dark mode.</p>
    <fieldset className="appearance-colors"><legend>Accent palette</legend>{accentColors.map(accent => <label key={accent} className={`appearance-swatch ${accent}`}><input type="radio" name="accent" value={accent} checked={preferences.accent === accent} onChange={() => updateAppearance({ accent })} /><span aria-hidden="true">{preferences.accent === accent ? "\u2713" : ""}</span><strong>{accent[0].toUpperCase() + accent.slice(1)}</strong></label>)}</fieldset>
    <div className="appearance-controls">
      <div><label htmlFor="appearance-text">Text size</label><select id="appearance-text" value={preferences.textSize} onChange={event => updateAppearance({ textSize: event.target.value })}><option value="standard">Standard</option><option value="large">Large</option></select></div>
      <div><label htmlFor="appearance-density">Spacing</label><select id="appearance-density" value={preferences.density} onChange={event => updateAppearance({ density: event.target.value })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></div>
    </div>
    <label className="appearance-motion"><span><strong>Reduce motion</strong><small>Limit animations and transitions.</small></span><input type="checkbox" checked={preferences.reduceMotion} onChange={event => updateAppearance({ reduceMotion: event.target.checked })} /></label>
    <div className="appearance-sample"><span className="appearance-sample-label">LIVE PREVIEW</span><strong>Your workspace, your style</strong><p>Manage school resources with a view that suits you.</p><span className="appearance-sample-tag">Selected accent</span></div>
    <footer className="appearance-footer"><p role="status">{isAppearanceSaved() ? "Applied instantly · Saved on this browser" : "Applied for now. Browser storage is unavailable."}</p><button type="button" onClick={() => updateAppearance(defaults)}>Reset to defaults</button></footer>
  </section>;
}

