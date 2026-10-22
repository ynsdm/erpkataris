'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function POSPage() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
const [theme, setTheme] = useState<'dark' | 'light'>('dark');
const isLight = theme === 'light';

  // Vistas POS: 'pedidos' | 'clientes' | 'dashboard'
  const [posTab, setPosTab] = useState<'pedidos' | 'clientes' | 'dashboard'>('pedidos');

  // Filtros Dashboard
  const [dashFilter, setDashFilter] = useState<'today' | 'month' | 'year'>('month');

  // Datos principales
  const [myInvoices, setMyInvoices] = useState<any[]>([]);
  const [myClients, setMyClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Filtros y Búsqueda de Clientes
  const [clientSearch, setClientSearch] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');

  // Modal de Nuevo Cliente (con Ruta)
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDoc, setNewClientDoc] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientRoute, setNewClientRoute] = useState('Ruta Principal');
  const [loadingClient, setLoadingClient] = useState(false);

  // Modal / Carrito de Nuevo Pedido
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('contado');
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Estado para impresión de Ticket 80mm
  const [ticketData, setTicketData] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchPOSData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchPOSData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Código para activar geolocalización GPS del vendedor/chofer
  useEffect(() => {
    if (profile?.id && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await supabase.from('profiles').update({
            current_lat: latitude,
            current_lng: longitude,
            location_updated_at: new Date().toISOString(),
            is_active_tracker: true
          }).eq('id', profile.id);
        },
        (error) => console.error('Error al capturar GPS:', error),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [profile]);

const fetchPOSData = async (userId: string) => {
    try {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*, tenants(*)')
        .eq('id', userId)
        .maybeSingle();

      if (profData) {
        // 🛑 VALIDACIÓN DE SEGURIDAD POR ROL
        const allowedRoles = ['admin', 'seller', 'vendedor'];
        const userRole = (profData.role || '').toLowerCase();

        if (!allowedRoles.includes(userRole)) {
          alert('Acceso no autorizado: Esta sección es exclusiva para vendedores y administradores.');
          
          // Redirigir al módulo correspondiente según su rol
          if (userRole === 'driver' || userRole === 'chofer' || userRole === 'despachador') {
            window.location.href = '/despachos'; // O la ruta de choferes
          } else {
            window.location.href = '/';
          }
          return;
        }

        setProfile(profData);
        if (profData.tenants) setTenant(profData.tenants);

        const tenantId = profData.tenant_id;

        // Facturas / Pedidos
        const { data: invData } = await supabase
          .from('invoices')
          .select('*, clients(*)')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (invData) {
          const filtered = invData.filter((inv: any) => inv.seller_id === userId || inv.created_by === userId || !inv.seller_id);
          setMyInvoices(filtered);
        }

        // Clientes Asignados
        const { data: cliData } = await supabase
          .from('clients')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('assigned_seller_id', userId)
          .order('name', { ascending: true });

        if (cliData) setMyClients(cliData);

        // Productos
        const { data: prodData } = await supabase
          .from('products')
          .select('*')
          .eq('tenant_id', tenantId)
          .gt('stock', 0)
          .order('name', { ascending: true });

        if (prodData) setProducts(prodData);
      }
    } catch (err) {
      console.error('Error al cargar datos del POS:', err);
    }
  };

  const currentRate = Number(tenant?.exchange_rate || 36.00);

  // 🟢 FILTRO DINÁMICO Y ACUMULATIVO DE MARCAS PERMITIDAS EN EL POS
  const availableProductsForPOS = products.filter((product: any) => {
    // Si es administrador ve todo el inventario
    if (profile?.role === 'admin') return true;

    // Si no tiene restricciones configuradas o dice 'todas', ve todo
    const userAllowedBrands = profile?.allowed_brands ? profile.allowed_brands.toLowerCase().trim() : '';
    if (!userAllowedBrands || userAllowedBrands === 'todas') return true;

    // Separar marcas múltiples por comas (acumulativo: ej. "cali, primor, mavesa")
    const allowedList = userAllowedBrands.split(',').map((b: string) => b.trim());

    // Verificar si la marca del producto coincide con alguna permitida
    const productBrand = (product.brand || product.marca || '').toLowerCase().trim();
    return allowedList.some((allowedBrand: string) => productBrand.includes(allowedBrand));
  });

  // Registrar Nuevo Cliente con Ruta
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setLoadingClient(true);

    try {
      const generatedCode = `CLI-${(myClients.length + 1).toString().padStart(4, '0')}`;
      const { error } = await supabase.from('clients').insert([
        {
          tenant_id: profile.tenant_id,
          client_code: generatedCode,
          name: newClientName,
          document_id: newClientDoc,
          phone: newClientPhone,
          address: newClientAddress,
          route: newClientRoute.trim() || 'Ruta General',
          assigned_seller_id: profile.id,
        },
      ]);

      if (error) throw error;

      alert('¡Cliente registrado con éxito!');
      setShowNewClientModal(false);
      setNewClientName('');
      setNewClientDoc('');
      setNewClientPhone('');
      setNewClientAddress('');
      setNewClientRoute('Ruta Principal');
      fetchPOSData(profile.id);
    } catch (err: any) {
      alert('Error al registrar cliente: ' + err.message);
    } finally {
      setLoadingClient(false);
    }
  };

  // Agregar producto al Carrito (usando la lista filtrada por marcas)
  const addToCart = () => {
    if (!selectedProductId || itemQty <= 0) return;
    const prod = availableProductsForPOS.find((p) => p.id === selectedProductId);
    if (!prod) return;

    if (itemQty > prod.stock) {
      alert(`Stock insuficiente. Solo quedan ${prod.stock} unidades.`);
      return;
    }

    const existingIndex = cart.findIndex((i) => i.productId === selectedProductId);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += itemQty;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: prod.id,
          name: prod.name,
          unit_price: Number(prod.price),
          quantity: itemQty,
        },
      ]);
    }

    setSelectedProductId('');
    setItemQty(1);
  };

  // Procesar Pedido / Venta y mostrar Ticket 80mm
  const handleCreateOrder = async () => {
    if (!selectedClientId) return alert('Por favor selecciona un cliente');
    if (cart.length === 0) return alert('El carrito está vacío');

    setLoadingOrder(true);
    try {
      const totalCart = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const nextNum = (myInvoices.length + 1).toString().padStart(4, '0');
      const invoiceNumber = `PED-${nextNum}`;
      const clientObj = myClients.find(c => c.id === selectedClientId);

      const { data: invHeader, error: invErr } = await supabase
        .from('invoices')
        .insert([
          {
            tenant_id: profile.tenant_id,
            client_id: selectedClientId,
            seller_id: profile.id,
            total: totalCart,
            status: paymentTerm === 'credito' ? 'credito' : 'issued',
            payment_term: paymentTerm,
            balance_due: paymentTerm === 'credito' ? totalCart : 0,
            exchange_rate: currentRate,
            invoice_number: invoiceNumber,
          },
        ])
        .select()
        .single();

      if (invErr) throw invErr;

      if (invHeader) {
        const itemsToInsert = cart.map((item) => ({
          invoice_id: invHeader.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        await supabase.from('invoice_items').insert(itemsToInsert);

        for (const item of cart) {
          const pObj = products.find((p) => p.id === item.productId);
          if (pObj) {
            await supabase
              .from('products')
              .update({ stock: pObj.stock - item.quantity })
              .eq('id', item.productId);
          }
        }
      }

      setTicketData({
        invoice_number: invoiceNumber,
        client_name: clientObj?.name || 'Cliente General',
        client_route: clientObj?.route || 'General',
        created_at: new Date(),
        payment_term: paymentTerm,
        items: [...cart],
        total: totalCart
      });

      setShowNewOrderModal(false);
      setCart([]);
      setSelectedClientId('');
      fetchPOSData(profile.id);
    } catch (err: any) {
      alert('Error al registrar pedido: ' + err.message);
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center">
          <p className="mb-4">Por favor inicia sesión para acceder al POS de Vendedores.</p>
          <a href="/" className="bg-blue-600 px-4 py-2 rounded-lg font-bold text-sm">Ir al Inicio de Sesión</a>
        </div>
      </div>
    );
  }

  // Cálculos de tiempo y dashboard
  const now = new Date();
  const todayInvoices = myInvoices.filter((inv) => {
    const d = new Date(inv.created_at);
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthInvoices = myInvoices.filter((inv) => {
    const d = new Date(inv.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalSalesThisMonth = monthInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const monthlyQuota = Number(profile?.monthly_quota || profile?.sales_quota || 1000);
  const quotaPercent = Math.min(Math.round((totalSalesThisMonth / monthlyQuota) * 100), 100);
  const quotaRemaining = Math.max(0, monthlyQuota - totalSalesThisMonth);

  // Análisis de Rutas
  const routeSalesMap: { [route: string]: { total: number; count: number } } = {};
  monthInvoices.forEach((inv) => {
    const rName = inv.clients?.route || 'Sin Ruta';
    if (!routeSalesMap[rName]) {
      routeSalesMap[rName] = { total: 0, count: 0 };
    }
    routeSalesMap[rName].total += Number(inv.total || 0);
    routeSalesMap[rName].count += 1;
  });

  const rankedRoutes = Object.entries(routeSalesMap)
    .map(([route, data]) => ({ route, ...data }))
    .sort((a, b) => b.total - a.total);

  const filteredClients = myClients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.document_id && c.document_id.toLowerCase().includes(clientSearch.toLowerCase()));
    const matchesRoute = selectedRouteFilter === 'ALL' || c.route === selectedRouteFilter;
    return matchesSearch && matchesRoute;
  });

  const allAvailableRoutes = Array.from(new Set(myClients.map(c => c.route || 'General')));

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Barra Superior POS */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg print:hidden">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white font-extrabold px-3 py-1.5 rounded-lg text-lg tracking-wider">
            POS
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{tenant?.name || 'Kataris ERP'}</h1>
            <p className="text-xs text-slate-400">Vendedor: <span className="text-blue-400 font-semibold">{profile?.full_name || 'Vendedor Autorizado'}</span></p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-right">
            <span className="text-slate-400 block">Tasa Oficial</span>
            <span className="text-emerald-400 font-bold">Bs. {currentRate.toFixed(2)}</span>
          </div>

          <button onClick={handleLogout} className="bg-slate-700 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
            Salir
          </button>
        </div>
      </header>

      {/* Navegación POS */}
      <div className="bg-slate-800/60 border-b border-slate-700 px-6 py-3 flex justify-center gap-4 print:hidden">
        {[
          { id: 'pedidos', label: '📦 PEDIDOS', count: todayInvoices.length },
          { id: 'clientes', label: '👥 CLIENTES', count: myClients.length },
          { id: 'dashboard', label: '📊 DASHBOARD', count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPosTab(tab.id as any)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 ${
              posTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className="bg-slate-900 text-xs px-2 py-0.5 rounded-full text-blue-400 font-extrabold">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido Principal */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto overflow-y-auto print:p-0 print:max-w-none">
        
        {/* VISTA 1: PEDIDOS */}
        {posTab === 'pedidos' && (
          <div className="space-y-6 print:hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Ventas y Pedidos de Hoy</h2>
                <p className="text-xs text-slate-400">Resumen de transacciones realizadas hoy ({now.toLocaleDateString('es-VE')})</p>
              </div>

              <button
                onClick={() => setShowNewOrderModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center space-x-2 shadow-lg shadow-emerald-600/20"
              >
                <span>➕ NUEVO PEDIDO</span>
              </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-4">Nº Pedido</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Condición</th>
                    <th className="p-4">Monto ($)</th>
                    <th className="p-4">Monto (Bs)</th>
                    <th className="p-4">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {todayInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No has registrado ventas ni pedidos el día de hoy. ¡Haz clic en "NUEVO PEDIDO" para iniciar!
                      </td>
                    </tr>
                  ) : (
                    todayInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-700/20">
                        <td className="p-4 font-mono font-bold text-blue-400">{inv.invoice_number}</td>
                        <td className="p-4 font-semibold text-white">{inv.clients?.name || 'Cliente General'}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${inv.payment_term === 'credito' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {inv.payment_term}
                          </span>
                        </td>
                        <td className="p-4 font-extrabold text-emerald-400">${Number(inv.total).toFixed(2)}</td>
                        <td className="p-4 text-slate-300 font-mono">Bs. {(Number(inv.total) * currentRate).toFixed(2)}</td>
                        <td className="p-4 text-xs text-slate-400">{new Date(inv.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISTA 2: CLIENTES */}
        {posTab === 'clientes' && (
          <div className="space-y-6 print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Directorio de Clientes y Cuentas por Cobrar</h2>
                <p className="text-xs text-slate-400">Filtra por ruta o busca clientes por nombre/RIF</p>
              </div>
              <button
                onClick={() => setShowNewClientModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
              >
                + Nuevo Cliente
              </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="🔍 Buscar cliente por nombre o RIF/CI..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="w-full md:w-64">
                <select
                  value={selectedRouteFilter}
                  onChange={(e) => setSelectedRouteFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">📍 Todas las Rutas</option>
                  {allAvailableRoutes.map((route) => (
                    <option key={route} value={route}>{route}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.length === 0 ? (
                <div className="col-span-full bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center text-slate-400">
                  No se encontraron clientes con los filtros seleccionados.
                </div>
              ) : (
                filteredClients.map((client) => {
                  const clientMonthInvoices = monthInvoices.filter((inv) => inv.client_id === client.id);
                  const totalSoldToClient = clientMonthInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

                  const pendingInvoices = myInvoices.filter(
                    (inv) => inv.client_id === client.id && Number(inv.balance_due || 0) > 0.01 && inv.status !== 'paid'
                  );
                  const totalDebtUSD = pendingInvoices.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
                  const totalDebtVES = totalDebtUSD * currentRate;

                  return (
                    <div key={client.id} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          📍 {client.route || 'Sin Ruta'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{client.document_id || 'Sin RIF/CI'}</span>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{client.name}</h3>
                        <p className="text-xs text-slate-400">{client.phone || 'Sin teléfono'} • {client.address || 'Sin dirección'}</p>
                      </div>

                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Saldo Pendiente (CxC):</span>
                          <span className={`font-bold ${totalDebtUSD > 0 ? 'text-rose-400' : 'text-slate-300'}`}>${totalDebtUSD.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Al cambio (BCV):</span>
                          <span className="font-mono text-emerald-400">Bs. {totalDebtVES.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-700 pt-3 flex justify-between items-center text-xs">
                        <span className="text-slate-400">Ventas del Mes:</span>
                        <span className="font-bold text-white">${totalSoldToClient.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VISTA 3: DASHBOARD */}
        {posTab === 'dashboard' && (
          <div className="space-y-6 print:hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Resumen y Avance de Cuotas</h2>
                <p className="text-xs text-slate-400">Seguimiento de tu rendimiento y rutas comerciales</p>
              </div>
            </div>

            {/* SECCIÓN: MEJOR RUTA DEL MES */}
            <div className="bg-gradient-to-r from-blue-900/40 to-slate-800 border border-blue-500/30 p-6 rounded-2xl space-y-4 shadow-lg">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block">Análisis Logístico</span>
                  <h3 className="text-xl font-extrabold text-white">🗺️ Rendimiento por Rutas (Este Mes)</h3>
                </div>
                {rankedRoutes.length > 0 && (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                    🏆 Mejor Ruta: {rankedRoutes[0].route}
                  </span>
                )}
              </div>

              {rankedRoutes.length === 0 ? (
                <p className="text-xs text-slate-400">No hay ventas registradas en este mes para calcular rutas.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rankedRoutes.map((r, idx) => (
                    <div key={r.route} className={`bg-slate-900/80 p-4 rounded-xl border ${idx === 0 ? 'border-emerald-500/50' : 'border-slate-700'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-300">#{idx + 1} {r.route}</span>
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{r.count} pedidos</span>
                      </div>
                      <p className="text-2xl font-black text-emerald-400">${r.total.toFixed(2)}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">Bs. {(r.total * currentRate).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Avance de Cuota Mensual */}
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white">Meta / Cuota del Mes</h3>
                  <p className="text-xs text-slate-400">
                    {quotaPercent >= 100 ? '🎉 ¡Felicidades! Has superado tu cuota de ventas del mes.' : `Te faltan $${quotaRemaining.toFixed(2)} en ventas para alcanzar tu cuota.`}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${quotaPercent >= 100 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                  {quotaPercent}% Completado
                </span>
              </div>

              <div className="w-full bg-slate-900 rounded-full h-4 border border-slate-700 overflow-hidden">
                <div className={`h-full transition-all duration-500 ${quotaPercent >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${quotaPercent}%` }}></div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center pt-2">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Logrado Este Mes</span>
                  <span className="text-lg font-bold text-emerald-400">${totalSalesThisMonth.toFixed(2)}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Falta para la Meta</span>
                  <span className="text-lg font-bold text-amber-400">${quotaRemaining.toFixed(2)}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Cuota Asignada</span>
                  <span className="text-lg font-bold text-white">${monthlyQuota.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: NUEVO CLIENTE */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-white">Registrar Nuevo Cliente</h3>
              <button onClick={() => setShowNewClientModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nombre / Razón Social</label>
                <input type="text" required placeholder="Comercial Los Amigos C.A." value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">RIF / C.I.</label>
                <input type="text" placeholder="J-12345678-9" value={newClientDoc} onChange={(e) => setNewClientDoc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">📍 Ruta de Reparto / Zona</label>
                <input type="text" required placeholder="Ej: Ruta Norte, Zona Comercial Centro" value={newClientRoute} onChange={(e) => setNewClientRoute(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-semibold text-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Teléfono</label>
                <input type="text" placeholder="0414-0000000" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Dirección</label>
                <input type="text" placeholder="Avenida Principal..." value={newClientAddress} onChange={(e) => setNewClientAddress(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
                <button type="button" onClick={() => setShowNewClientModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-4 py-2 rounded-lg text-xs">Cancelar</button>
                <button type="submit" disabled={loadingClient} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-lg text-xs">
                  {loadingClient ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO PEDIDO / VENTA (Usa availableProductsForPOS) */}
      {showNewOrderModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-white">NUEVO PEDIDO / REGISTRO DE VENTA</h3>
              <button onClick={() => setShowNewOrderModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Cliente Asignado</label>
                <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">
                  <option value="">Seleccionar Cliente...</option>
                  {myClients.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.route || 'Sin Ruta'})</option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Condición de Pago</label>
                <select value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito (5 Días)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Producto (Marcas Permitidas)</label>
                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">
                  <option value="">Seleccionar Producto...</option>
                  {/* 🟢 Renderiza únicamente los productos de las marcas autorizadas al vendedor */}
                  {availableProductsForPOS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.brand || 'General'}) - ${p.price} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Cantidad</label>
                <input type="number" min="1" value={itemQty} onChange={(e) => setItemQty(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-bold" />
              </div>

              <button onClick={addToCart} type="button" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-xl text-sm transition-colors">
                + Agregar
              </button>
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-700 pt-3 space-y-3">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="p-2">Producto</th>
                      <th className="p-2">Cant</th>
                      <th className="p-2">Precio ($)</th>
                      <th className="p-2">Subtotal ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-700">
                        <td className="p-2 font-medium text-white">{item.name}</td>
                        <td className="p-2">{item.quantity}</td>
                        <td className="p-2">${item.unit_price.toFixed(2)}</td>
                        <td className="p-2 font-bold text-emerald-400">${(item.quantity * item.unit_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <div>
                    <span className="text-xs text-slate-400 block">Total del Pedido</span>
                    <span className="text-2xl font-extrabold text-emerald-400">
                      ${cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0).toFixed(2)}
                    </span>
                  </div>

                  <button onClick={handleCreateOrder} disabled={loadingOrder} className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                    {loadingOrder ? 'Procesando...' : 'Confirmar y Facturar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TICKET TÉRMICO 80mm */}
      {ticketData && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 print:bg-white print:p-0 print:absolute print:inset-0">
          <div className="bg-white text-black font-mono w-[80mm] p-4 rounded-xl shadow-2xl space-y-3 print:shadow-none print:w-full print:p-2">
            <div className="text-center border-b border-dashed border-black pb-2">
              <h2 className="font-bold text-sm">{tenant?.name || 'GRUPO KATARIS C.A.'}</h2>
              <p className="text-[10px]">RIF: J-00000000-0</p>
              <p className="text-[10px] font-bold mt-1">TICKET DE VENTA / PEDIDO</p>
            </div>

            <div className="text-[10px] space-y-0.5 border-b border-dashed border-black pb-2">
              <p><strong>Nº:</strong> {ticketData.invoice_number}</p>
              <p><strong>Fecha:</strong> {new Date(ticketData.created_at).toLocaleString('es-VE')}</p>
              <p><strong>Cliente:</strong> {ticketData.client_name}</p>
              <p><strong>Ruta:</strong> {ticketData.client_route}</p>
              <p><strong>Condición:</strong> {ticketData.payment_term.toUpperCase()}</p>
              <p><strong>Vendedor:</strong> {profile?.full_name}</p>
              <p><strong>Tasa BCV:</strong> Bs. {currentRate.toFixed(2)}</p>
            </div>

            <div className="text-[10px] border-b border-dashed border-black pb-2 space-y-1">
              <div className="flex justify-between font-bold border-b border-black pb-0.5">
                <span>CANT / DESC</span>
                <span>TOTAL</span>
              </div>
              {ticketData.items.map((it: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span>{it.quantity}x {it.name}</span>
                  <span>${(it.quantity * it.unit_price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="text-right text-xs space-y-1 border-b border-dashed border-black pb-2">
              <p className="text-sm font-bold">
                TOTAL USD: ${ticketData.total.toFixed(2)}
              </p>
              <p className="text-xs font-bold font-mono">
                TOTAL BS: Bs. {(ticketData.total * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="text-center text-[9px] space-y-1 pt-1">
              <p>¡Gracias por su compra!</p>
              <p>Documento no fiscal</p>
            </div>

            <div className="flex gap-2 pt-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs"
              >
                🖨️ Imprimir Ticket (80mm)
              </button>
              <button
                onClick={() => setTicketData(null)}
                className="bg-slate-300 hover:bg-slate-400 text-black font-bold px-4 py-2 rounded-lg text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}