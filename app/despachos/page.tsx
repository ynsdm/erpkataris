'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Ajusta la ruta de importación si está en otra subcarpeta

export default function DespachosPage() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryNotes, setDeliveryNotes] = useState<{ [key: string]: string }>({});

  // 1. Cargar sesión y datos iniciales del chofer en ruta
  useEffect(() => {
    const initDespachos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        // Cargar perfil del chofer
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        setProfile(profileData);

        // Cargar facturas asignadas o pendientes
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (invoicesData) setInvoices(invoicesData);

        // Cargar clientes con sus coordenadas GPS
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*');
        
        if (clientsData) setClients(clientsData);
      }
      setLoading(false);
    };

    initDespachos();
  }, []);

  // 2. Transmitir ubicación GPS del chofer en tiempo real
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

  // 3. Algoritmo de proximidad: Ordenar clientes según cercanía a la posición actual del chofer
  const sortedClients = [...clients].sort((a, b) => {
    const driverLat = profile?.current_lat || 10.6427;
    const driverLng = profile?.current_lng || -71.6125;

    const distA = Math.hypot((a.lat || 10.6427) - driverLat, (a.lng || -71.6125) - driverLng);
    const distB = Math.hypot((b.lat || 10.6427) - driverLat, (b.lng || -71.6125) - driverLng);

    return distA - distB;
  });

  // Actualizar estatus de factura en ruta
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="animate-pulse">Cargando módulo de despachos en ruta...</p>
      </div>
    );
  }

  const currentLat = profile?.current_lat || 10.6427;
  const currentLng = profile?.current_lng || -71.6125;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 space-y-6">
      {/* Header del Móvil / Chofer */}
      <header className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Módulo Exclusivo Choferes / Ruta Activa
          </span>
          <h1 className="text-2xl font-bold mt-1">🚚 Panel de Despachos en Ruta</h1>
          <p className="text-sm text-slate-400">Ruta organizada automáticamente por proximidad GPS.</p>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Chofer: <strong className="text-white">{profile?.full_name || session?.user?.email}</strong></span>
        </div>
      </header>

      {/* Grid Principal: Mapa y Lista de Paradas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Mapa Interactivo de OpenStreetMap */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl h-[500px] overflow-hidden relative shadow-inner">
          <iframe
            title="Mapa de Ruta y Clientes"
            width="100%"
            height="100%"
            className="border-0 grayscale contrast-125 opacity-90 hover:grayscale-0 transition-all duration-500"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentLng - 0.04}%2C${currentLat - 0.04}%2C${currentLng + 0.04}%2C${currentLat + 0.04}&layer=mapnik&marker=${currentLat}%2C${currentLng}`}
          />
          <div className="absolute top-4 right-4 bg-slate-950/90 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-xl text-xs shadow-lg">
            📍 Tu posición GPS transmitiéndose en vivo
          </div>
        </div>

        {/* Lista de Clientes en Ruta (Ordenados por Proximidad) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 flex flex-col h-[500px]">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            📍 Ruta Optimizada por Proximidad ({sortedClients.length} Clientes)
          </h2>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {sortedClients.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No hay clientes con ubicación registrada.</p>
            ) : (
              sortedClients.map((client) => {
                const clientInvoices = invoices.filter(inv => inv.client_id === client.id || inv.client_name === client.name);
                const isSelected = selectedClient?.id === client.id;

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                      isSelected 
                        ? 'bg-blue-600/10 border-blue-500 shadow-lg' 
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-sm">{client.name}</span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-blue-400 font-mono">
                        {clientInvoices.length} Facturas
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">Dirección: {client.address || 'Sin dirección'}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Sección Inferior: Facturas del Cliente Seleccionado en el Mapa/Lista */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <span>📦 Facturas Asignadas al Cliente:</span>
          <span className="text-blue-400">{selectedClient ? selectedClient.name : 'Selecciona un cliente arriba'}</span>
        </h2>

        {!selectedClient ? (
          <p className="text-sm text-slate-500 py-6 text-center">Haz clic en un cliente de la lista de ruta para ver sus facturas pendientes de entrega.</p>
        ) : (
          <div className="space-y-4">
            {invoices.filter(inv => inv.client_id === selectedClient.id || inv.client_name === selectedClient.name).length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Este cliente no tiene facturas pendientes.</p>
            ) : (
              invoices
                .filter(inv => inv.client_id === selectedClient.id || inv.client_name === selectedClient.name)
                .map((inv) => {
                  const status = inv.dispatch_status || 'no despachada';

                  return (
                    <div key={inv.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-xs font-mono text-blue-400 font-bold">FACTURA #{inv.id.slice(0, 8)}</span>
                          <p className="text-base font-bold text-white">${Number(inv.total || 0).toFixed(2)} USD</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          status === 'despachada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          status === 'rechazada' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {status}
                        </span>
                      </div>

                      {/* Campo para notas de entrega */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Notas de Entrega / Novedades</label>
                        <input
                          type="text"
                          placeholder="Ej. Entregado al celador, cliente ausente, etc."
                          defaultValue={inv.delivery_notes || ''}
                          onChange={(e) => setDeliveryNotes({ ...deliveryNotes, [inv.id]: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Botones de estatus */}
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
                })
            )}
          </div>
        )}
      </div>
    </div>
  );
}