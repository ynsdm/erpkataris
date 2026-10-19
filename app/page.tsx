'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'inventory' | 'clients' | 'invoices'>('dashboard');

  // Estados para Inventario y Clientes
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Estados Formulario Producto
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [loadingInv, setLoadingInv] = useState(false);

  // Estados Formulario Cliente
  const [clientName, setClientName] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [loadingClient, setLoadingClient] = useState(false);

  // Estados Formulario Factura (Invoices)
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [invoiceQuantity, setInvoiceQuantity] = useState(1);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

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

  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, tenants(*)')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error al consultar datos:', error.message);
        return;
      }

      if (data) {
        setProfile(data);
        if (data.tenants) {
          setTenant(data.tenants);
          fetchAllData(data.tenant_id);
        }
      }
    } catch (err) {
      console.error('Error inesperado:', err);
    }
  };

  const fetchAllData = async (tenantId: string) => {
    const { data: prodData } = await supabase.from('products').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (prodData) setProducts(prodData);

    const { data: clientData } = await supabase.from('clients').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (clientData) setClients(clientData);

    const { data: invData } = await supabase.from('invoices').select('*, clients(name, document_id)').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (invData) setInvoices(invData);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setLoadingInv(true);

    try {
      const { error } = await supabase.from('products').insert([
        {
          tenant_id: profile.tenant_id,
          name: productName,
          sku: productSku,
          price: parseFloat(productPrice),
          stock: parseInt(productStock),
        },
      ]);

      if (error) throw error;
      setProductName(''); setProductSku(''); setProductPrice(''); setProductStock('');
      fetchAllData(profile.tenant_id);
    } catch (err: any) {
      alert('Error al registrar producto: ' + err.message);
    } finally {
      setLoadingInv(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setLoadingClient(true);

    try {
      const { error } = await supabase.from('clients').insert([
        {
          tenant_id: profile.tenant_id,
          name: clientName,
          document_id: clientDoc,
          email: clientEmail,
          phone: clientPhone,
          address: clientAddress,
        },
      ]);

      if (error) throw error;
      setClientName(''); setClientDoc(''); setClientEmail(''); setClientPhone(''); setClientAddress('');
      fetchAllData(profile.tenant_id);
    } catch (err: any) {
      alert('Error al registrar cliente: ' + err.message);
    } finally {
      setLoadingClient(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !selectedClientId || !selectedProductId) {
      alert('Por favor selecciona un cliente y un producto.');
      return;
    }

    setLoadingInvoice(true);
    try {
      const productObj = products.find((p) => p.id === selectedProductId);
      if (!productObj) throw new Error('Producto no encontrado');

      const qty = Number(invoiceQuantity);
      if (productObj.stock < qty) {
        alert(`Stock insuficiente. Stock disponible: ${productObj.stock}`);
        setLoadingInvoice(false);
        return;
      }

      const unitPrice = Number(productObj.price);
      const subtotal = unitPrice * qty;

      // 1. Crear la factura principal
      const { data: invHeader, error: invError } = await supabase
        .from('invoices')
        .insert([
          {
            tenant_id: profile.tenant_id,
            client_id: selectedClientId,
            total: subtotal,
            status: 'issued',
          },
        ])
        .select()
        .single();

      if (invError) throw invError;

      // 2. Crear el ítem de la factura
      const { error: itemError } = await supabase.from('invoice_items').insert([
        {
          tenant_id: profile.tenant_id,
          invoice_id: invHeader.id,
          product_id: selectedProductId,
          quantity: qty,
          unit_price: unitPrice,
          subtotal: subtotal,
        },
      ]);

      if (itemError) throw itemError;

      // 3. Descontar stock del producto en inventario
      const { error: stockError } = await supabase
        .from('products')
        .update({ stock: productObj.stock - qty })
        .eq('id', selectedProductId);

      if (stockError) throw stockError;

      setSelectedClientId('');
      setSelectedProductId('');
      setInvoiceQuantity(1);
      fetchAllData(profile.tenant_id);
      alert('¡Factura emitida con éxito y stock actualizado!');
    } catch (err: any) {
      alert('Error al emitir factura: ' + err.message);
    } finally {
      setLoadingInvoice(false);
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ text: '¡Sesión iniciada con éxito!', type: 'success' });
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
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
          setMessage({ text: '¡Empresa y cuenta creadas con éxito!', type: 'success' });
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Ocurrió un error inesperado', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Calcular ventas totales del mes
  const totalSalesMonth = invoices.reduce((acc, inv) => acc + Number(inv.total), 0);

  // VISTA 1: DASHBOARD Y MÓDULOS
  if (session) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex">
        {/* Sidebar Nav */}
        <aside className="w-64 bg-slate-800 border-r border-slate-700 p-6 flex flex-col justify-between">
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white tracking-wide">Kataris ERP</h1>
              <p className="text-xs text-blue-400 font-medium mt-1 uppercase tracking-wider">
                {tenant ? tenant.name : 'CARGANDO EMPRESA...'}
              </p>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('inventory')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'inventory' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Inventarios
              </button>
              <button
                onClick={() => setCurrentView('invoices')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'invoices' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Ventas / Invoices
              </button>
              <button
                onClick={() => setCurrentView('clients')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
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
        <main className="flex-1 p-8 overflow-y-auto">
          {currentView === 'dashboard' ? (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Panel de Control</h2>
                  <p className="text-sm text-slate-400">Bienvenido de nuevo al sistema de gestión.</p>
                </div>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full font-medium">
                  SaaS Activo (RLS Secure)
                </span>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ventas del Mes</p>
                  <h3 className="text-3xl font-bold text-emerald-400">${totalSalesMonth.toFixed(2)}</h3>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Productos Registrados</p>
                  <h3 className="text-3xl font-bold text-white">{products.length}</h3>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Clientes Activos</p>
                  <h3 className="text-3xl font-bold text-white">{clients.length}</h3>
                </div>
              </div>
            </>
          ) : currentView === 'inventory' ? (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Gestión de Inventario</h2>
                  <p className="text-sm text-slate-400">Administra los productos y existencias de tu empresa.</p>
                </div>
              </header>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4">Agregar Nuevo Producto</h3>
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Producto A"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">SKU / Código</label>
                    <input
                      type="text"
                      placeholder="SKU-001"
                      value={productSku}
                      onChange={(e) => setProductSku(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Precio ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Stock Inicial</label>
                    <input
                      type="number"
                      required
                      placeholder="10"
                      value={productStock}
                      onChange={(e) => setProductStock(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={loadingInv}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {loadingInv ? 'Guardando...' : 'Agregar'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-700/50 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-4">Producto</th>
                      <th className="p-4">SKU</th>
                      <th className="p-4">Precio</th>
                      <th className="p-4">Stock Disponible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">
                          No hay productos registrados en el inventario.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-700/20">
                          <td className="p-4 font-medium text-white">{p.name}</td>
                          <td className="p-4 text-slate-400">{p.sku || 'N/A'}</td>
                          <td className="p-4 text-emerald-400 font-semibold">${Number(p.price).toFixed(2)}</td>
                          <td className="p-4 text-slate-300">{p.stock} unidades</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : currentView === 'clients' ? (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Gestión de Clientes</h2>
                  <p className="text-sm text-slate-400">Directorio de clientes y datos fiscales de la empresa.</p>
                </div>
              </header>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4">Registrar Nuevo Cliente</h3>
                <form onSubmit={handleAddClient} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre / Razón Social</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Distribuidora C.A."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">RIF / Cédula</label>
                    <input
                      type="text"
                      placeholder="J-12345678-9"
                      value={clientDoc}
                      onChange={(e) => setClientDoc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="cliente@correo.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Teléfono</label>
                    <input
                      type="text"
                      placeholder="0414-1234567"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Dirección</label>
                    <input
                      type="text"
                      placeholder="Maracaibo, Edo. Zulia"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={loadingClient}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {loadingClient ? 'Guardando...' : 'Registrar Cliente'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-700/50 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-4">Cliente</th>
                      <th className="p-4">RIF / DNI</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4">Dirección</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">
                          No hay clientes registrados en la cartera.
                        </td>
                      </tr>
                    ) : (
                      clients.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-700/20">
                          <td className="p-4 font-medium text-white">{c.name}</td>
                          <td className="p-4 text-slate-400">{c.document_id || 'N/A'}</td>
                          <td className="p-4 text-slate-300">
                            <div>{c.email || 'Sin correo'}</div>
                            <div className="text-xs text-slate-400">{c.phone || 'Sin teléfono'}</div>
                          </td>
                          <td className="p-4 text-slate-400">{c.address || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Módulo de Ventas / Facturación</h2>
                  <p className="text-sm text-slate-400">Emite facturas y descuenta inventario automáticamente.</p>
                </div>
              </header>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4">Nueva Factura</h3>
                <form onSubmit={handleCreateInvoice} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Seleccionar Cliente</label>
                    <select
                      required
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Seleccione Cliente --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.document_id || 'S/D'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Seleccionar Producto</label>
                    <select
                      required
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Seleccione Producto --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} (${p.price} | Stock: {p.stock})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={invoiceQuantity}
                      onChange={(e) => setInvoiceQuantity(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={loadingInvoice}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {loadingInvoice ? 'Emitiendo...' : 'Emitir Factura'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-700/50 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-4">ID Factura</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          No hay facturas emitidas todavía.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-700/20">
                          <td className="p-4 font-mono text-xs text-slate-400">{inv.id.slice(0, 8)}...</td>
                          <td className="p-4 font-medium text-white">{inv.clients?.name || 'Cliente Genérico'}</td>
                          <td className="p-4 text-emerald-400 font-semibold">${Number(inv.total).toFixed(2)}</td>
                          <td className="p-4">
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-medium uppercase">
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 text-xs">{new Date(inv.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
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