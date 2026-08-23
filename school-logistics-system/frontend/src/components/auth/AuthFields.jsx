export function Field({ label, type = 'text', placeholder, value, onChange, autoComplete }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required
      />
    </label>
  )
}

export function SocialButton() {
  return (
    <button className="google-button" type="button">
      <b>G</b> Continue with Google
    </button>
  )
}

export function Divider() {
  return <div className="auth-divider"><span>or continue with email</span></div>
}
