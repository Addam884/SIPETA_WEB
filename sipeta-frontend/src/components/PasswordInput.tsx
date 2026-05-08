import { useState } from "react";

type Props = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
};

function PasswordInput({ value, onChange, placeholder }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div className="form-group__input-wrap">
      
      {/* ICON KIRI (LOCK) */}
      <svg
        className="form-group__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>

      {/* INPUT */}
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder || "Masukkan password..."}
        value={value}
        onChange={onChange}
        required
      />

      {/* ICON MATA */}
      <button
        type="button"
        className="form-group__eye"
        onClick={() => setShow(!show)}
        style={{ padding: 0, lineHeight: 0, right: "12px" }}
      >
        {show ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.77 21.77 0 0 1 5.06-6.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-2.16 3.19M1 1l22 22"/>
          </svg>
        )}
      </button>
    </div>
  );
}

export default PasswordInput;