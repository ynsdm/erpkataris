'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'inventory' | 'clients' | 'invoices' | 'cxc' | 'expenses'>('dashboard');

  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<any>(null);
  const [invoiceItemsList, setInvoiceItemsList] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [loadingInv, setLoadingInv] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [loadingClient, setLoadingClient] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [invoiceQuantity, setInvoiceQuantity] = useState(1);
  const [paymentTerm, setPaymentTerm] = useState('contado');
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [paymentNote, setPaymentNote] = useState('');
  const [loadingPayment, setLoadingPayment] = useState(false);

  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('operativo');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [loadingExpense, setLoadingExpense] = useState(false);

  const [exchangeRateInput, setExchangeRateInput] = useState('');
  const [loadingRate, setLoadingRate] = useState(false);
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [userRoleInput, setUserRoleInput] = useState('admin');
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
          setExchangeRateInput(data.tenants.exchange_rate || '36.00');
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

    const { data: invData } = await supabase.from('invoices').select('*, clients(*)').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (invData) setInvoices(invData);

    const { data: payData } = await supabase.from('payments').select('*, invoices(id, clients(name))').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (payData) setPayments(payData);

    const { data: expData } = await supabase.from('expenses').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (expData) setExpenses(expData);
  };

  const handleUpdateExchangeRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;
    setLoadingRate(true);
    try {
      const newRate = parseFloat(exchangeRateInput);
      const { error } = await supabase
        .from('tenants')
        .update({ exchange_rate: newRate })
        .eq('id', tenant.id);

      if (error) throw error;
      setTenant({ ...tenant, exchange_rate: newRate });
      alert('¡Tasa de cambio actualizada con éxito!');
    } catch (err: any) {
      alert('Error al actualizar tasa: ' + err.message);
    } finally {
      setLoadingRate(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setLoadingExpense(true);
    try {
      const { error } = await supabase.from('expenses').insert([
        {
          tenant_id: profile.tenant_id,
          description: expenseDesc,
          category: expenseCategory,
          amount: parseFloat(expenseAmount),
        },
      ]);

      if (error) throw error;
      setExpenseDesc('');
      setExpenseAmount('');
      setExpenseCategory('operativo');
      fetchAllData(profile.tenant_id);
    } catch (err: any) {
      alert('Error al registrar gasto: ' + err.message);
    } finally {
      setLoadingExpense(false);
    }
  };

  const handleOpenInvoiceDetail = async (inv: any) => {
    setSelectedInvoiceDetail(inv);
    setLoadingDetail(true);
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*, products(name, sku)')
        .eq('invoice_id', inv.id);

      if (error) throw error;
      if (data) setInvoiceItemsList(data);
    } catch (err: any) {
      alert('Error al cargar detalle de factura: ' + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePrintTicket = () => {
    window.print();
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
      const initialBalance = paymentTerm === 'credito' ? subtotal : 0.00;
      const initialStatus = paymentTerm === 'credito' ? 'credito' : 'issued';

      const { data: invHeader, error: invError } = await supabase
        .from('invoices')
        .insert([
          {
            tenant_id: profile.tenant_id,
            client_id: selectedClientId,
            total: subtotal,
            status: initialStatus,
            payment_term: paymentTerm,
            balance_due: initialBalance,
          },
        ])
        .select()
        .single();

      if (invError) throw invError;

      await supabase.from('invoice_items').insert([
        {
          tenant_id: profile.tenant_id,
          invoice_id: invHeader.id,
          product_id: selectedProductId,
          quantity: qty,
          unit_price: unitPrice,
          subtotal: subtotal,
        },
      ]);

      await supabase
        .from('products')
        .update({ stock: productObj.stock - qty })
        .eq('id', selectedProductId);

      setSelectedClientId('');
      setSelectedProductId('');
      setInvoiceQuantity(1);
      setPaymentTerm('contado');
      fetchAllData(profile.tenant_id);
      alert('¡Factura emitida con éxito!');
    } catch (err: any) {
      alert('Error al emitir factura: ' + err.message);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !selectedInvoiceId || !paymentAmount) return;

    setLoadingPayment(true);
    try {
      const invObj = invoices.find((inv) => inv.id === selectedInvoiceId);
      if (!invObj) throw new Error('Factura no encontrada');

      const payAmt = Number(paymentAmount);
      const currentBalance = Number(invObj.balance_due);

      if (payAmt > currentBalance) {
        alert(`El abono ($${payAmt}) no puede ser mayor al saldo pendiente ($${currentBalance})`);
        setLoadingPayment(false);
        return;
      }

      const { error: payError } = await supabase.from('payments').insert([
        {
          tenant_id: profile.tenant_id,
          invoice_id: selectedInvoiceId,
          amount: payAmt,
          payment_method: paymentMethod,
          reference_note: paymentNote,
        },
      ]);

      if (payError) throw payError;

      const newBalance = currentBalance - payAmt;
      const newStatus = newBalance === 0 ? 'paid' : 'credito';

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ balance_due: newBalance, status: newStatus })
        .eq('id', selectedInvoiceId);

      if (updateError) throw updateError;

      setSelectedInvoiceId('');
      setPaymentAmount('');
      setPaymentNote('');
      fetchAllData(profile.tenant_id);
      alert('¡Abono registrado con éxito!');
    } catch (err: any) {
      alert('Error al registrar pago: ' + err.message);
    } finally {
      setLoadingPayment(false);
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
            .insert([{ name: companyName, exchange_rate: 36.0000 }])
            .select()
            .single();

          if (tenantError) throw tenantError;

          const { error: profileError } = await supabase.from('profiles').insert([
            {
              id: authData.user.id,
              tenant_id: tenantData.id,
              full_name: fullName,
              role: userRoleInput,
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

  const currentRate = Number(tenant?.exchange_rate || 36.00);
  const totalSalesMonth = invoices.reduce((acc, inv) => acc + Number(inv.total), 0);
  const totalPendingCxC = invoices.reduce((acc, inv) => acc + Number(inv.balance_due || 0), 0);
  const totalCollected = totalSalesMonth - totalPendingCxC;
  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
  const netCashFlow = totalCollected - totalExpenses;
  const maxInvoiceTotal = Math.max(...invoices.map((inv) => Number(inv.total)), 100);
  const isAdmin = profile?.role === 'admin';

  if (session) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex">
        <aside className="w-64 bg-slate-800 border-r border-slate-700 p-6 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white tracking-wide">Kataris ERP</h1>
              <p className="text-xs text-blue-400 font-medium mt-1 uppercase tracking-wider">
                {tenant ? tenant.name : 'CARGANDO EMPRESA...'}
              </p>
              <div className="mt-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700/60 flex justify-between items-center text-xs">
                <span className="text-slate-400">Tasa BCV:</span>
                <span className="text-emerald-400 font-bold">Bs. {currentRate.toFixed(2)}</span>
              </div>
            </div>

            <nav className="space-y-1.5">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              
              {isAdmin && (
                <button
                  onClick={() => setCurrentView('expenses')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    currentView === 'expenses' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  Gastos y Egresos (P&L)
                </button>
              )}

              <button
                onClick={() => setCurrentView('invoices')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'invoices' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Ventas / Facturación
              </button>
              <button
                onClick={() => setCurrentView('cxc')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'cxc' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Cuentas por Cobrar (CxC)
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
                onClick={() => setCurrentView('clients')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Clientes
              </button>
            </nav>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-white">{profile?.full_name || 'Usuario'}</p>
              <p className="text-xs text-blue-400 capitalize font-medium">Rol: {profile?.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-700 hover:bg-red-600/80 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
          {currentView === 'dashboard' ? (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Panel de Control General</h2>
                  <p className="text-sm text-slate-400">Resumen operativo y métricas del sistema.</p>
                </div>
                
                {isAdmin && (
                  <form onSubmit={handleUpdateExchangeRate} className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
                    <span className="text-xs text-slate-300 font-medium">Tasa $:</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={exchangeRateInput}
                      onChange={(e) => setExchangeRateInput(e.target.value)}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 text-xs font-bold focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={loadingRate}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2.5 py-1 rounded transition-colors"
                    >
                      {loadingRate ? '...' : 'Actualizar'}
                    </button>
                  </form>
                )}
              </header>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ventas Totales ($)</p>
                  <h3 className="text-2xl font-bold text-emerald-400">${totalSalesMonth.toFixed(2)}</h3>
                  <p className="text-xs text-slate-400 mt-1">Bs. {(totalSalesMonth * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                </div>

                {isAdmin ? (
                  <>
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gastos Operativos</p>
                      <h3 className="text-2xl font-bold text-red-400">${totalExpenses.toFixed(2)}</h3>
                      <p className="text-xs text-slate-400 mt-1">Egresos registrados</p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Flujo de Caja Neto</p>
                      <h3 className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        ${netCashFlow.toFixed(2)}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Ganancia neta</p>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mis Ventas Emitidas</p>
                    <h3 className="text-2xl font-bold text-blue-400">{invoices.length}</h3>
                    <p className="text-xs text-slate-400 mt-1">Facturas generadas</p>
                  </div>
                )}

                <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Clientes Activos</p>
                  <h3 className="text-2xl font-bold text-white">{clients.length}</h3>
                  <p className="text-xs text-slate-400 mt-1">Directorio al día</p>
                </div>
              </div>
            </>
          ) : currentView === 'expenses' && isAdmin ? (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Control de Gastos y Egresos (P&L)</h2>
                  <p className="text-sm text-slate-400">Exclusivo para administradores.</p>
                </div>
              </header>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4">Registrar Nuevo Gasto</h3>
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Descripción</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Alquiler"
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Categoría</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="operativo">Operativo</option>
                      <option value="nomina">Nómina</option>
                      <option value="proveedores">Proveedores</option>
                      <option value="servicios">Servicios</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={loadingExpense}
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {loadingExpense ? 'Registrando...' : 'Registrar'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-700/50 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-4">Descripción</th>
                      <th className="p-4">Categoría</th>
                      <th className="p-4">Monto ($)</th>
                      <th className="p-4">Monto (Bs.)</th>
                      <th className="p-4">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {expenses.length === 0 ? (
                      <tr><td colSpan={5} className="p-6 text-center text-slate-400">No hay egresos registrados.</td></tr>
                    ) : (
                      expenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-700/20">
                          <td className="p-4 font-medium text-white">{exp.description}</td>
                          <td className="p-4 uppercase text-xs font-semibold text-slate-300">{exp.category}</td>
                          <td className="p-4 text-red-400 font-semibold">${Number(exp.amount).toFixed(2)}</td>
                          <td className="p-4 text-slate-300">Bs. {(Number(exp.amount) * currentRate).toFixed(2)}</td>
                          <td className="p-4 text-slate-400 text-xs">{new Date(exp.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : currentView === 'inventory' ? (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Gestión de Inventario</h2>
                  <p className="text-sm text-slate-400">Control de productos y existencias.</p>
                </div>
              </header>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4">Agregar Producto</h3>
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre</label>
                    <input
                      type="text"
                      required
                      placeholder="Producto"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">SKU</label>
                    <input
                      type="text"
                      placeholder="SKU"
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
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Stock</label>
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
                      <th className="p-4">Precio ($)</th>
                      <th className="p-4">Precio (Bs.)</th>
                      <th className="p-4">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {products.length === 0 ? (
                      <tr><td colSpan={5} className="p-6 text-center text-slate-400">Sin productos.</td></tr>
                    ) : (
                      products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-700/20">
                          <td className="p-4 font-medium text-white">{p.name}</td>
                          <td className="p-4 text-slate-400">{p.sku || 'N/A'}</td>
                          <td className="p-4 text-emerald-400 font-semibold">${Number(p.price).toFixed(2)}</td>
                          <td className="p-4 text-slate-300">Bs. {(Number(p.price) * currentRate).toFixed(2)}</td>
                          <td className="p-4 text-slate-300">{p.stock}</td>
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
                  <h2 className="text-2xl font-bold text-white">Clientes</h2>
                  <p className="text-sm text-slate-400">Directorio de clientes.</p>
                </div>
              </header>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4">Registrar Cliente</h3>
                <form onSubmit={handleAddClient} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre</label>
                    <input
                      type="text"
                      required
                      placeholder="Cliente C.A."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">RIF / DNI</label>
                    <input
                      type="text"
                      placeholder="J-1234"
                      value={clientDoc}
                      onChange={(e) => setClientDoc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Correo</label>
                    <input
                      type="email"
                      placeholder="correo@correo.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Teléfono</label>
                    <input
                      type="text"
                      placeholder="0414"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Dirección</label>
                    <input
                      type="text"
                      placeholder="Dirección"
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
                      {loadingClient ? 'Guardando...' : 'Registrar'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-700/50 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-4">Cliente</th>
                      <th className="p-4">RIF</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4">Dirección</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {clients.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-slate-400">Sin clientes.</td></tr>
                    ) : (
                      clients.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-700/20">
                          <td className="p-4 font-medium text-white">{c.name}</td>
                          <td className="p-4 text-slate-400">{c.document_id || 'N/A'}</td>
                          <td className="p-4 text-slate-300">{c.email} / {c.phone}</td>
                          <td className="p-4 text-slate-400">{c.address}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : currentView === 'cxc' ? (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Cuentas por Cobrar (CxC)</h2>
                  <p className="text-sm text-slate-400">Control de créditos y abonos.</p>
                </div>
              </header>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4">Registrar Abono</h3>
                <form onSubmit={handleRegisterPayment} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Factura</label>
                    <select
                      required
                      value={selectedInvoiceId}
                      onChange={(e) => setSelectedInvoiceId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Seleccione --</option>
                      {invoices
                        .filter((inv) => Number(inv.balance_due) > 0)
                        .map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.clients?.name} - Deuda: ${Number(inv.balance_due).toFixed(2)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Método</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="zelle">Zelle</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="pago_movil">Pago Móvil</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Referencia</label>
                    <input
                      type="text"
                      placeholder="Ref"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={loadingPayment}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {loadingPayment ? '...' : 'Abonar'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-700/50 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Saldo Pendiente ($)</th>
                      <th className="p-4">Saldo Pendiente (Bs.)</th>
                      <th className="p-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {invoices.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-slate-400">Sin facturas.</td></tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-700/20">
                          <td className="p-4 font-medium text-white">{inv.clients?.name}</td>
                          <td className="p-4 text-amber-400 font-semibold">${Number(inv.balance_due || 0).toFixed(2)}</td>
                          <td className="p-4 text-slate-300">Bs. {(Number(inv.balance_due || 0) * currentRate).toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full uppercase border ${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              {inv.status === 'paid' ? 'Pagada' : 'Pendiente'}
                            </span>
                          </td>
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
                  <h2 className="text-2xl font-bold text-white">Ventas / Facturación</h2>
                  <p className="text-sm text-slate-400">Emisión de facturas y tickets multidivisa.</p>
                </div>
              </header>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-4">Nueva Factura</h3>
                <form onSubmit={handleCreateInvoice} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Cliente</label>
                    <select
                      required
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Seleccione --</option>
                      {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Producto</label>
                    <select
                      required
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Seleccione --</option>
                      {products.map((p) => (<option key={p.id} value={p.id}>{p.name} (${p.price})</option>))}
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
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Condición</label>
                    <select
                      value={paymentTerm}
                      onChange={(e) => setPaymentTerm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="contado">Contado</option>
                      <option value="credito">Crédito (5 Días)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={loadingInvoice}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {loadingInvoice ? 'Emitiendo...' : 'Emitir'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-700/50 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-4">ID</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Total ($)</th>
                      <th className="p-4">Total (Bs.)</th>
                      <th className="p-4">Condición</th>
                      <th className="p-4">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {invoices.length === 0 ? (
                      <tr><td colSpan={6} className="p-6 text-center text-slate-400">Sin facturas.</td></tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-700/25">
                          <td className="p-4 font-mono text-xs text-slate-400">{inv.id.slice(0, 8)}...</td>
                          <td className="p-4 font-medium text-white">{inv.clients?.name}</td>
                          <td className="p-4 text-white font-semibold">${Number(inv.total).toFixed(2)}</td>
                          <td className="p-4 text-slate-300">Bs. {(Number(inv.total) * currentRate).toFixed(2)}</td>
                          <td className="p-4 uppercase text-xs font-semibold text-slate-300">{inv.payment_term}</td>
                          <td className="p-4">
                            <button
                              onClick={() => handleOpenInvoiceDetail(inv)}
                              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                            >
                              Ver Ticket
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>

        {selectedInvoiceDetail && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-4">
                <h3 className="text-lg font-bold text-white">Ticket Fiscal Multidivisa</h3>
                <button onClick={() => setSelectedInvoiceDetail(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-6 font-mono text-xs space-y-3">
                <div className="text-center border-b border-slate-800 pb-3">
                  <h4 className="text-base font-bold text-white">{tenant?.name}</h4>
                  <p className="text-slate-400">Tasa BCV: Bs. {currentRate.toFixed(2)}</p>
                </div>
                <div className="space-y-1 text-slate-300">
                  <p><strong>Cliente:</strong> {selectedInvoiceDetail.clients?.name}</p>
                </div>
                <div className="border-t border-b border-slate-800 py-3 my-2">
                  {invoiceItemsList.map((item) => (
                    <div key={item.id} className="flex justify-between py-1">
                      <span>{item.quantity}x {item.products?.name}</span>
                      <span className="text-emerald-400">${Number(item.subtotal).toFixed(2)} (Bs. {(Number(item.subtotal) * currentRate).toFixed(2)})</span>
                    </div>
                  ))}
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm"><strong>TOTAL:</strong> <span className="text-emerald-400 font-bold text-base">${Number(selectedInvoiceDetail.total).toFixed(2)}</span></p>
                  <p className="text-xs text-slate-300">Bs. {(Number(selectedInvoiceDetail.total) * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={handlePrintTicket} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm">🖨️ Imprimir</button>
                <button onClick={() => setSelectedInvoiceDetail(null)} className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 px-4 rounded-lg text-sm">Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Kataris ERP</h1>
          <p className="text-sm text-slate-400 mt-2">Plataforma SaaS Multi-tenant con Roles Granulares</p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-lg mb-6 border border-slate-700">
          <button
            onClick={() => { setIsLogin(true); setMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setIsLogin(false); setMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Registrar Empresa
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm mb-6 ${message.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Nombre de la Empresa</label>
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
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Tu Nombre"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Rol del Usuario</label>
                <select
                  value={userRoleInput}
                  onChange={(e) => setUserRoleInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="admin">Administrador (Acceso Total)</option>
                  <option value="vender">Vendedor (Ventas e Inventario)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              placeholder="correo@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Contraseña</label>
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