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

export default function LoginForm({ from }: { from?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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

      <form onSubmit={onSubmit} className="space-y-4">
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
        <p className="text-xs text-slate-400 text-center pt-2">
          ¿Olvidaste tu clave? Pedile al admin que te la resetee.
        </p>
      </form>
    </div>
  );
}
