'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // Escuchar el estado de autenticación de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Obtener perfil y datos de la empresa autenticada
  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, tenants(*)')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile(profileData);
        setTenant(profileData.tenants);
      }
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setTenant(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .insert([{ name: companyName }])
            .select()
            .single();

          if (tenantError) throw tenantError;

          const { error: profileError } = await supabase.from('profiles').insert([
            {
              id: authData.user.id,
              tenant_id: tenantData.id,
              full_name: fullName,
              role: 'admin',
            },
          ]);

          if (profileError) throw profileError;
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Ocurrió un error inesperado', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // VISTA 1: DASHBOARD PRINCIPAL (Si el usuario ya inició sesión)
  if (session) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex">
        {/* Sidebar Nav */}
        <aside className="w-64 bg-slate-800 border-r border-slate-700 p-6 flex flex-col justify-between">
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white tracking-wide">Kataris ERP</h1>
              <p className="text-xs text-blue-400 font-medium mt-1 uppercase tracking-wider">
                {tenant ? tenant.name : 'Cargando empresa...'}
              </p>
            </div>

            <nav className="space-y-2">
              <button className="w-full text-left px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm">
                Dashboard
              </button>
              <button className="w-full text-left px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white font-medium text-sm transition-colors">
                Inventarios
              </button>
              <button className="w-full text-left px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white font-medium text-sm transition-colors">
                Ventas / Invoices
              </button>
              <button className="w-full text-left px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white font-medium text-sm transition-colors">
                Clientes
              </button>
              <button className="w-full text-left px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white font-medium text-sm transition-colors">
                Configuración
              </button>
            </nav>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-white">{profile?.full_name || 'Usuario'}</p>
              <p className="text-xs text-slate-400 capitalize">Rol: {profile?.role || 'admin'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-700 hover:bg-red-600/80 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8">
          <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Panel de Control</h2>
              <p className="text-sm text-slate-400">Bienvenido de nuevo al sistema de gestión.</p>
            </div>
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full font-medium">
              SaaS Activo (RLS Secure)
            </span>
          </header>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ventas del Mes</p>
              <h3 className="text-3xl font-bold text-white">$0.00</h3>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Productos Registrados</p>
              <h3 className="text-3xl font-bold text-white">0</h3>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Clientes Activos</p>
              <h3 className="text-3xl font-bold text-white">0</h3>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // VISTA 2: FORMULARIO DE INGRESO / REGISTRO
  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Kataris ERP</h1>
          <p className="text-sm text-slate-400 mt-2">
            Plataforma SaaS Multi-tenant de Gestión Empresarial
          </p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-lg mb-6 border border-slate-700">
          <button
            onClick={() => { setIsLogin(true); setMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              isLogin ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setIsLogin(false); setMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              !isLogin ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Registrar Empresa
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm mb-6 ${
              message.type === 'error'
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Corporación Kataris C.A."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Tu Nombre y Apellido"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-colors mt-2 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : isLogin ? 'Ingresar al Sistema' : 'Crear Cuenta y Empresa'}
          </button>
        </form>
      </div>
    </main>
  );
}