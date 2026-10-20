'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function POSPage() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);

  // Vistas POS: 'pedidos' | 'clientes' | 'dashboard'
  const [posTab, setPosTab] = useState<'pedidos' | 'clientes' | 'dashboard'>('pedidos');

  // Filtros Dashboard
  const [dashFilter, setDashFilter] = useState<'today' | 'month' | 'year'>('month');

  // Datos principales
  const [myInvoices, setMyInvoices] = useState<any[]>([]);
  const [myClients, setMyClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Modal / Carrito de Nuevo Pedido
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('contado');
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [loadingOrder, setLoadingOrder] = useState(false);

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

  const fetchPOSData = async (userId: string) => {
    try {
      // 1. Perfil y Tenant
      const { data: profData } = await supabase
        .from('profiles')
        .select('*, tenants(*)')
        .eq('id', userId)
        .maybeSingle();

      if (profData) {
        setProfile(profData);
        if (profData.tenants) setTenant(profData.tenants);

        const tenantId = profData.tenant_id;

// 2. Mis Facturas / Pedidos (Cargadas de forma directa)
        const { data: invData } = await supabase
          .from('invoices')
          .select('*, clients(*)')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (invData) {
          // Filtramos en memoria para asegurarnos de ver las tuyas o las generales
          const filtered = invData.filter((inv: any) => inv.seller_id === userId || inv.created_by === userId || !inv.seller_id);
          setMyInvoices(filtered);
        }

        // 3. Mis Clientes Asignados
        const { data: cliData } = await supabase
          .from('clients')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('assigned_seller_id', userId)
          .order('name', { ascending: true });

        if (cliData) setMyClients(cliData);

        // 4. Catálogo de Productos
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

  // Agregar producto al Carrito
  const addToCart = () => {
    if (!selectedProductId || itemQty <= 0) return;
    const prod = products.find((p) => p.id === selectedProductId);
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

  // Procesar Nuevo Pedido / Venta
  const handleCreateOrder = async () => {
    if (!selectedClientId) return alert('Por favor selecciona un cliente');
    if (cart.length === 0) return alert('El carrito está vacío');

    setLoadingOrder(true);
    try {
      const totalCart = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const nextNum = (myInvoices.length + 1).toString().padStart(4, '0');
      const invoiceNumber = `PED-${nextNum}`;

const { data: invHeader, error: invErr } = await supabase
  .from('invoices')
  .insert([
    {
      tenant_id: profile.tenant_id,
      client_id: selectedClientId,
      seller_id: profile.id, // <-- Este campo vincula la venta a tu usuario
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

      // Insertar ítems
      if (invHeader) {
        const itemsToInsert = cart.map((item) => ({
          invoice_id: invHeader.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        await supabase.from('invoice_items').insert(itemsToInsert);

        // Descontar stock
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

      alert('¡Pedido / Venta registrada con éxito!');
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

  // Logout
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

  // Cálculos Vendedor
  const now = new Date();
  const todayInvoices = myInvoices.filter((inv) => {
    const d = new Date(inv.created_at);
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthInvoices = myInvoices.filter((inv) => {
    const d = new Date(inv.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const yearInvoices = myInvoices.filter((inv) => {
    const d = new Date(inv.created_at);
    return d.getFullYear() === now.getFullYear();
  });

  // Facturas según el filtro del Dashboard
  const filteredDashInvoices = dashFilter === 'today' ? todayInvoices : dashFilter === 'month' ? monthInvoices : yearInvoices;
  const dashTotalSales = filteredDashInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

  // Cuota mensual
  const monthlyQuota = Number(profile?.monthly_quota || 1000);
  const totalSalesThisMonth = monthInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const quotaPercent = Math.min(Math.round((totalSalesThisMonth / monthlyQuota) * 100), 100);
  const quotaRemaining = Math.max(0, monthlyQuota - totalSalesThisMonth);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Barra Superior Independiente POS */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white font-extrabold px-3 py-1.5 rounded-lg text-lg tracking-wider">
            POS
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{tenant?.name || 'Kataris ERP'}</h1>
            <p className="text-xs text-slate-400">Vendedor: <span className="text-blue-400 font-semibold">{profile?.full_name || 'Vendedor Autorizado'}</span></p>
          </div>
        </div>

        {/* Tasa BCV y Menú Principal */}
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

      {/* Navegación por Opciones Exclusivas: PEDIDOS, CLIENTES, DASHBOARD */}
      <div className="bg-slate-800/60 border-b border-slate-700 px-6 py-3 flex justify-center gap-4">
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
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto overflow-y-auto">
        {/* VISTA 1: PEDIDOS */}
        {posTab === 'pedidos' && (
          <div className="space-y-6">
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

            {/* Listado de Pedidos del día */}
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

{/* VISTA 2: CLIENTES CON CUENTAS POR COBRAR (CxC) */}
        {posTab === 'clientes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Directorio de Clientes y Cuentas por Cobrar</h2>
              <p className="text-xs text-slate-400">Consulta el acumulado de compras del mes y las deudas pendientes a la tasa oficial del día</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myClients.length === 0 ? (
                <div className="col-span-full bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center text-slate-400">
                  No tienes clientes asignados a tu usuario actualmente.
                </div>
              ) : (
                myClients.map((client) => {
                  // 1. Facturas del mes de este cliente
                  const clientMonthInvoices = monthInvoices.filter((inv) => inv.client_id === client.id);
                  const totalSoldToClient = clientMonthInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
                  const hasPurchasedThisMonth = totalSoldToClient > 0;

                  // 2. Facturas Pendientes por Cobrar (CxC) de este cliente
                  const pendingInvoices = myInvoices.filter(
                    (inv) => inv.client_id === client.id && Number(inv.balance_due || 0) > 0.01 && inv.status !== 'paid'
                  );
                  const totalDebtUSD = pendingInvoices.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
                  const totalDebtVES = totalDebtUSD * currentRate;

                  return (
                    <div
                      key={client.id}
                      className={`p-5 rounded-2xl border transition-all space-y-4 ${
                        totalDebtUSD > 0
                          ? 'bg-slate-800/90 border-amber-500/50 shadow-lg shadow-amber-950/20'
                          : hasPurchasedThisMonth
                          ? 'bg-slate-800 border-emerald-500/40'
                          : 'bg-slate-800/60 border-slate-700/80'
                      }`}
                    >
                      {/* Estado y RIF */}
                      <div className="flex justify-between items-start">
                        <div className="flex gap-1.5 flex-wrap">
                          <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                            hasPurchasedThisMonth ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'
                          }`}>
                            {hasPurchasedThisMonth ? '✓ Compró este mes' : 'Sin compras este mes'}
                          </span>

                          {totalDebtUSD > 0 && (
                            <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
                              ⚠️ Deuda Pendiente
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{client.document_id || 'Sin RIF/CI'}</span>
                      </div>

                      {/* Nombre y Contacto */}
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{client.name}</h3>
                        <p className="text-xs text-slate-400">{client.phone || 'Sin teléfono'} • {client.address || 'Sin dirección'}</p>
                      </div>

                      {/* Resumen de Cuentas por Cobrar (Deuda) */}
                      <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/80 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 uppercase font-semibold">Saldo Pendiente (CxC):</span>
                          <div className="text-right">
                            <span className={`text-base font-extrabold ${totalDebtUSD > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                              ${totalDebtUSD.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-1.5">
                          <span className="text-slate-500 text-[11px]">Al cambio del día (BCV):</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            Bs. {totalDebtVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Desplegable de Facturas Vencidas / Pendientes */}
                      {pendingInvoices.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-slate-700/50">
                          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                            Facturas a Crédito ({pendingInvoices.length}):
                          </span>
                          <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                            {pendingInvoices.map((inv) => (
                              <div key={inv.id} className="bg-slate-900/50 p-2 rounded-lg text-xs flex justify-between items-center border border-slate-800">
                                <div>
                                  <span className="font-mono text-blue-400 font-bold block">{inv.invoice_number}</span>
                                  <span className="text-[10px] text-slate-500">{new Date(inv.created_at).toLocaleDateString('es-VE')}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-rose-400">${Number(inv.balance_due).toFixed(2)}</span>
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    Bs. {(Number(inv.balance_due) * currentRate).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Acumulado de Compras del Mes */}
                      <div className="border-t border-slate-700/60 pt-3 flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold">Ventas del Mes:</span>
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
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Resumen y Avance de Cuotas</h2>
                <p className="text-xs text-slate-400">Seguimiento de tu rendimiento individual de ventas</p>
              </div>

              {/* Filtro de Fecha */}
              <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex text-xs">
                <button
                  onClick={() => setDashFilter('today')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${dashFilter === 'today' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setDashFilter('month')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${dashFilter === 'month' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Este Mes
                </button>
                <button
                  onClick={() => setDashFilter('year')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${dashFilter === 'year' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Este Año
                </button>
              </div>
            </div>

            {/* Avance de Cuota Mensual */}
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white">Meta / Cuota del Mes</h3>
                  <p className="text-xs text-slate-400">
                    {quotaPercent >= 100
                      ? '🎉 ¡Felicidades! Has superado tu cuota de ventas del mes.'
                      : `Te faltan $${quotaRemaining.toFixed(2)} en ventas para alcanzar tu cuota.`}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${quotaPercent >= 100 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                  {quotaPercent}% Completado
                </span>
              </div>

              {/* Barra de Progreso */}
              <div className="w-full bg-slate-900 rounded-full h-4 border border-slate-700 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${quotaPercent >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                  style={{ width: `${quotaPercent}%` }}
                ></div>
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

            {/* Métrica de Ventas Filtrada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl">
                <span className="text-xs font-semibold text-slate-400 uppercase">Total Ventas ({dashFilter})</span>
                <p className="text-3xl font-extrabold text-emerald-400 mt-2">${dashTotalSales.toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-1">Equivalente a: <strong className="text-white">Bs. {(dashTotalSales * currentRate).toFixed(2)}</strong></p>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl">
                <span className="text-xs font-semibold text-slate-400 uppercase">Pedidos Procesados ({dashFilter})</span>
                <p className="text-3xl font-extrabold text-white mt-2">{filteredDashInvoices.length}</p>
                <p className="text-xs text-slate-400 mt-1">Transacciones completadas</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: NUEVO PEDIDO / REGISTRO RÁPIDO */}
      {showNewOrderModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-white">NUEVO PEDIDO / REGISTRO DE VENTA</h3>
              <button onClick={() => setShowNewOrderModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Cliente Asignado</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value="">Seleccionar Cliente...</option>
                  {myClients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Condición de Pago</label>
                <select
                  value={paymentTerm}
                  onChange={(e) => setPaymentTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito (5 Días)</option>
                </select>
              </div>
            </div>

            {/* Agregar Ítems */}
            <div className="border-t border-slate-700 pt-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Producto</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value="">Seleccionar Producto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} - ${p.price} (Stock: {p.stock})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={itemQty}
                  onChange={(e) => setItemQty(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-bold"
                />
              </div>

              <button
                onClick={addToCart}
                type="button"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-xl text-sm transition-colors"
              >
                + Agregar
              </button>
            </div>

            {/* Carrito Actual */}
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
                    <span className="text-xs text-slate-400 ml-2">
                      (Bs. {(cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0) * currentRate).toFixed(2)})
                    </span>
                  </div>

                  <button
                    onClick={handleCreateOrder}
                    disabled={loadingOrder}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loadingOrder ? 'Procesando...' : 'Confirmar Pedido'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}