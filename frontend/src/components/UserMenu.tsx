import { useEffect, useRef, useState } from "react";
import { useAuth } from "../AuthContext";

interface Props {
  onChangePassword: () => void;
}

export function UserMenu({ onChangePassword }: Props) {
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="user-avatar">
          {session?.email?.charAt(0).toUpperCase()}
        </span>
        <span className="user-email">{session?.email}</span>
        <span className="user-menu-caret">▾</span>
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <button
            className="user-menu-item"
            onClick={() => {
              setOpen(false);
              onChangePassword();
            }}
          >
            Trocar senha
          </button>
          <button
            className="user-menu-item user-menu-item-danger"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
