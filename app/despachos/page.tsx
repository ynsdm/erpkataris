'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function DespachosPage() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryNotes, setDeliveryNotes] = useState<{ [key: string]: string }>({});
  
  // Estado para el Modo Oscuro / Claro
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const initDespachos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        setProfile(profileData);

        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('*')
          .eq('driver_id', session.user.id)
          .order('created_at', { ascending: false });
        
        if (invoicesData) {
          setInvoices(invoicesData);

          const assignedClientIds = Array.from(new Set(invoicesData.map((inv: any) => inv.client_id || inv.client_name)));

          const { data: clientsData } = await supabase
            .from('clients')
            .select('*');

          if (clientsData) {
            const filteredClients = clientsData.filter((c: any) => 
              assignedClientIds.includes(c.id) || assignedClientIds.includes(c.name)
            );
            setClients(filteredClients);
          }
        }
      }
      setLoading(false);
    };

    initDespachos();
  }, []);

  // Transmitir ubicación GPS
  useEffect(() => {
    if (profile?.id && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await supabase.from('profiles').update({
            current_lat: latitude,
            current_lng: longitude,
            location_updated_at: new Date().toISOString(),
          }).eq('id', profile.id);
        },
        (error) => console.error('Error GPS Chofer:', error),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [profile]);

  const mapLat = selectedClient?.lat || profile?.current_lat || 10.6427;
  const mapLng = selectedClient?.lng || profile?.current_lng || -71.6125;

  const handleUpdateStatus = async (invoiceId: string, newStatus: string) => {
    const now = new Date().toISOString();
    const note = deliveryNotes[invoiceId] || '';

    const { error } = await supabase
      .from('invoices')
      .update({
        dispatch_status: newStatus,
        dispatched_at: newStatus !== 'no despachada' ? now : null,
        delivery_notes: note
      })
      .eq('id', invoiceId);

    if (!error) {
      setInvoices(invoices.map(inv => inv.id === invoiceId ? { ...inv, dispatch_status: newStatus, dispatched_at: now, delivery_notes: note } : inv));
      alert(`Factura actualizada a: ${newStatus.toUpperCase()}`);
    } else {
      alert('Error al actualizar el estatus de despacho.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-white'}`}>
        <p className="animate-pulse">Cargando tu hoja de ruta y entregas asignadas...</p>
      </div>
    );
  }

  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen p-4 md:p-6 space-y-6 transition-colors duration-300 ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-white'}`}>
      
      {/* HEADER CON CONTROLES */}
      <header className={`border p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <div>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            App Móvil Chofer / Despachos Asignados
          </span>
          <h1 className="text-2xl font-bold mt-1">🚚 Mi Ruta de Entregas</h1>
          <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Mostrando solo facturas asignadas a tu vehículo.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border text-xs flex items-center space-x-2 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Chofer: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{profile?.full_name || session?.user?.email}</strong></span>
          </div>

          {/* Botón Cambiar Tema */}
          <button
            onClick={() => setTheme(isLight ? 'dark' : 'light')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isLight 
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {isLight ? '🌙 Modo Oscuro' : '☀️ Modo Claro'}
          </button>

          {/* Botón Salir */}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors shadow"
          >
            🚪 Salir
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mapa */}
        <div className={`lg:col-span-7 border rounded-2xl h-[500px] overflow-hidden relative shadow-inner ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <iframe
            title="Mapa de Entregas Asignadas"
            width="100%"
            height="100%"
            className="border-0 grayscale contrast-125 opacity-90 hover:grayscale-0 transition-all duration-500"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - 0.02}%2C${mapLat - 0.02}%2C${mapLng + 0.02}%2C${mapLat + 0.02}&layer=mapnik&marker=${mapLat}%2C${mapLng}`}
          />
          <div className={`absolute top-4 right-4 backdrop-blur-md border px-4 py-2 rounded-xl text-xs shadow-lg ${isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-slate-950/90 border-slate-800 text-white'}`}>
            📍 {selectedClient ? `Ubicación GPS: ${selectedClient.name}` : 'Posición del Chofer'}
          </div>
        </div>

        {/* Lista de Clientes */}
        <div className={`lg:col-span-5 border p-4 rounded-2xl space-y-3 flex flex-col h-[500px] ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            📍 Clientes Asignados ({clients.length})
          </h2>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {clients.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No tienes facturas de despacho asignadas en este momento.</p>
            ) : (
              clients.map((client) => {
                const clientInvoices = invoices.filter(inv => inv.client_id === client.id || inv.client_name === client.name);
                const isSelected = selectedClient?.id === client.id;

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                      isSelected 
                        ? 'bg-blue-600/20 border-blue-500 shadow-lg' 
                        : isLight 
                          ? 'bg-slate-50 border-slate-200 hover:border-slate-300' 
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{client.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${isLight ? 'bg-slate-200 text-blue-600' : 'bg-slate-800 text-blue-400'}`}>
                        {clientInvoices.length} Facturas
                      </span>
                    </div>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} truncate`}>📍 {client.address || 'Ubicación registrada'}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Gestión de Facturas */}
      <div className={`border p-6 rounded-2xl space-y-4 shadow-xl ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <h2 className="text-lg font-bold flex items-center space-x-2">
          <span>📦 Facturas del Cliente:</span>
          <span className="text-blue-500">{selectedClient ? selectedClient.name : 'Selecciona un cliente arriba'}</span>
        </h2>

        {!selectedClient ? (
          <p className="text-sm text-slate-400 py-6 text-center">Selecciona un cliente de tu lista para ver sus facturas y registrar la entrega.</p>
        ) : (
          <div className="space-y-4">
            {invoices
              .filter(inv => inv.client_id === selectedClient.id || inv.client_name === selectedClient.name)
              .map((inv) => {
                const status = inv.dispatch_status || 'no despachada';

                return (
                  <div key={inv.id} className={`border p-4 rounded-xl space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b pb-3 border-opacity-50">
                      <div>
                        <span className="text-xs font-mono text-blue-400 font-bold">FACTURA #{inv.id.slice(0, 8)}</span>
                        <p className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>${Number(inv.total || 0).toFixed(2)} USD</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        status === 'despachada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        status === 'rechazada' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {status}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Notas de Entrega</label>
                      <input
                        type="text"
                        placeholder="Ej. Recibido por vigilante, pago pendiente, etc."
                        defaultValue={inv.delivery_notes || ''}
                        onChange={(e) => setDeliveryNotes({ ...deliveryNotes, [inv.id]: e.target.value })}
                        className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 ${isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'}`}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => handleUpdateStatus(inv.id, 'despachada')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow"
                      >
                        ✅ Marcar Despachada
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(inv.id, 'no despachada')}
                        className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow"
                      >
                        ⏳ No Despachada
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(inv.id, 'rechazada')}
                        className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow"
                      >
                        ❌ Rechazada / Devuelta
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}