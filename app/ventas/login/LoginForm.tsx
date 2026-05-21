"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

function PasswordInput({
  value,
  onChange,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? "Ocultar clave" : "Mostrar clave"}
        className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

type Mode = "login" | "forgot" | "reset";

export default function LoginForm({
  token,
  from,
}: {
  token?: string;
  from?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(token ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ventas/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error de login");
        return;
      }
      // Redirige a la pantalla original o a /ventas.
      router.push(from || "/ventas");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ventas/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error");
        return;
      }
      setInfo("Si el email existe, te mandamos un link para resetear la clave.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== newPassword2) {
      setError("Las claves no coinciden");
      return;
    }
    if (newPassword.length < 8) {
      setError("La clave debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ventas/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "No se pudo resetear");
        return;
      }
      router.push(from || "/ventas");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg shadow-sm p-6">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Cumplimiento Cuadro Básico</h1>
      <p className="text-xs text-slate-500 mb-6">Drean Argentina · Acceso de ventas</p>

      {mode === "reset" ? (
        <form onSubmit={onSubmitReset} className="space-y-4">
          <p className="text-sm text-slate-600">Elegí una clave nueva (mínimo 8 caracteres).</p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">NUEVA CLAVE</label>
            <PasswordInput value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">REPETIR</label>
            <PasswordInput value={newPassword2} onChange={setNewPassword2} autoComplete="new-password" />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-md text-sm font-medium transition-colors"
          >
            {loading ? "Guardando…" : "Guardar y entrar"}
          </button>
        </form>
      ) : mode === "login" ? (
        <form onSubmit={onSubmitLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">EMAIL</label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">CLAVE</label>
            <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-md text-sm font-medium transition-colors"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              setError(null);
              setInfo(null);
            }}
            className="w-full text-xs text-slate-500 hover:text-slate-700"
          >
            Olvidé mi clave
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmitForgot} className="space-y-4">
          <p className="text-sm text-slate-600">
            Ingresá tu email y te mandamos un link para elegir una clave nueva.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">EMAIL</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {info && <div className="text-sm text-emerald-600">{info}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-md text-sm font-medium transition-colors"
          >
            {loading ? "Mandando…" : "Mandar link"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setInfo(null);
            }}
            className="w-full text-xs text-slate-500 hover:text-slate-700"
          >
            Volver al login
          </button>
        </form>
      )}
    </div>
  );
}
