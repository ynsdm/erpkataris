'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

export default function Home() {
  const [payroll, setPayroll] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<'today' | 'month' | 'year' | 'all'>('month');
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'inventory' | 'clients' | 'invoices' | 'cxc' | 'expenses' | 'analytics' | 'payroll' | 'purchases' | 'cxp' | 'configuracion' | 'ventas' | 'sellers' | 'bancos'>('dashboard');

  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);

  // MODALES
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showAddPayrollModal, setShowAddPayrollModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showNewSellerModal, setShowNewSellerModal] = useState(false);

  // ESTADOS CLIENTES (CON RUTA, GPS, LÍMITE DE CRÉDITO Y MÍNIMO DE VENTAS)
  const [clientSearch, setClientSearch] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');
  const [clientCode, setClientCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientGps, setClientGps] = useState('');
  const [clientRoute, setClientRoute] = useState('Ruta Principal');
  const [clientCreditLimit, setClientCreditLimit] = useState('500');
  const [clientMinSales, setClientMinSales] = useState('100');
  const [assignedSellerId, setAssignedSellerId] = useState('');
  const [loadingClient, setLoadingClient] = useState(false);

  // VENDEDORES Y CUOTAS
  const [editingQuotaSeller, setEditingQuotaSeller] = useState<any | null>(null);
  const [newQuotaValue, setNewQuotaValue] = useState('');
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerEmail, setNewSellerEmail] = useState('');
  const [newSellerPassword, setNewSellerPassword] = useState('');
  const [newSellerQuota, setNewSellerQuota] = useState('1000');
  const [loadingNewSeller, setLoadingNewSeller] = useState(false);

  // COMPRAS Y PROVEEDORES
  const [purchaseCart, setPurchaseCart] = useState<any[]>([]);
  const [purchaseProdId, setPurchaseProdId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseInvoiceNum, setPurchaseInvoiceNum] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [selectedPurchaseForPay, setSelectedPurchaseForPay] = useState<any | null>(null);
  const [cxpPaymentData, setCxpPaymentData] = useState({ amount: 0, payment_method: 'Transferencia', reference_number: '', notes: '' });

  // BANCOS Y CONCILIACIÓN
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankTransactions, setBankTransactions] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [newBank, setNewBank] = useState({ bank_name: '', account_number: '', currency: 'USD', initial_balance: 0 });
  const [newTx, setNewTx] = useState({ description: '', reference_number: '', amount: '', type: 'ingreso' });

  // EMPLEADOS Y NÓMINA
  const [employees, setEmployees] = useState<any[]>([]);
  const [newEmp, setNewEmp] = useState({ first_name: '', last_name: '', national_id: '', phone: '', position: '', base_salary: 0, payment_frequency: 'Quincenal' });
  const [newPayrollPay, setNewPayrollPay] = useState({ employee_id: '', base_salary_paid: 0, bonuses: 0, commissions: 0, deductions: 0, payment_period: '', payment_method: 'Transferencia' });

  // PRODUCTOS Y GASTOS
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [loadingInv, setLoadingInv] = useState(false);

  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('operativo');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [loadingExpense, setLoadingExpense] = useState(false);

  // VENTAS Y FACTURACIÓN
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

  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<any>(null);
  const [invoiceItemsList, setInvoiceItemsList] = useState<any[]>([]);

  // CONFIGURACIÓN Y TASA
  const [activeConfigTab, setActiveConfigTab] = useState<'empresa' | 'tickets' | 'usuarios' | 'roles' | 'pagos'>('empresa');
  const [tenantSettings, setTenantSettings] = useState<any>({ default_credit_days: 5, ticket_header: 'GRUPO KATARIS C.A.', ticket_footer: '¡Gracias por su compra!', ticket_show_bcv: true, allowed_payment_methods: ['Efectivo USD', 'Pago Móvil', 'Zelle', 'Efectivo Bs'] });
  const [newRoleName, setNewRoleName] = useState('');
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  const [exchangeRateInput, setExchangeRateInput] = useState('');
  const [loadingRate, setLoadingRate] = useState(false);

  // LOGIN / REGISTRO
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

  useEffect(() => {
    if (profile && profile.role) {
      const userRole = String(profile.role).toLowerCase().trim();
      if (userRole === 'seller' || userRole === 'vendedor') {
        window.location.replace('/pos');
      }
    }
  }, [profile]);

  const fetchUserData = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*, tenants(*)').eq('id', userId).maybeSingle();
      if (data) {
        setProfile(data);
        if (data.tenants) {
          setTenant(data.tenants);
          setExchangeRateInput(data.tenants.exchange_rate || '36.00');
          fetchAllData(data.tenant_id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllData = async (tenantId: string) => {
    const { data: prodData } = await supabase.from('products').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (prodData) setProducts(prodData);

    const { data: sellersData } = await supabase.from('profiles').select('id, full_name, role, monthly_quota').eq('tenant_id', tenantId);
    if (sellersData) setSellers(sellersData);

    const { data: suppliersData } = await supabase.from('suppliers').select('*').eq('tenant_id', tenantId).order('name', { ascending: true });
    if (suppliersData) setSuppliers(suppliersData);

    const { data: clientData } = await supabase.from('clients').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (clientData) setClients(clientData);

    const { data: invData } = await supabase.from('invoices').select('*, clients(*)').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (invData) setInvoices(invData);

    const { data: payData } = await supabase.from('payments').select('*, invoices(id, clients(name))').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (payData) setPayments(payData);

    const { data: expData } = await supabase.from('expenses').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (expData) setExpenses(expData);

    const { data: payrollData } = await supabase.from('payroll_payments').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (payrollData) setPayroll(payrollData);

    const { data: purchasesData } = await supabase.from('purchases').select('*, suppliers(name)').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (purchasesData) setPurchases(purchasesData);

    const { data: empData } = await supabase.from('employees').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (empData) setEmployees(empData);

    const { data: suppPayData } = await supabase.from('supplier_payments').select('*, purchases(*, suppliers(name))').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (suppPayData) setSupplierPayments(suppPayData);

    const { data: bankData } = await supabase.from('bank_accounts').select('*').eq('tenant_id', tenantId);
    if (bankData) setBankAccounts(bankData);

    const { data: txData } = await supabase.from('bank_transactions').select('*, bank_accounts(bank_name)').eq('tenant_id', tenantId).order('transaction_date', { ascending: false });
    if (txData) setBankTransactions(txData);
  };

  const currentRate = Number(tenant?.exchange_rate || 36.00);

  // REGISTRAR CLIENTE PROFESIONAL
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setLoadingClient(true);

    try {
      const generatedCode = clientCode.trim() || `CLI-${(clients.length + 1).toString().padStart(4, '0')}`;

      const { error } = await supabase.from('clients').insert([
        {
          tenant_id: profile.tenant_id,
          client_code: generatedCode,
          name: clientName,
          document_id: clientDoc,
          email: clientEmail,
          phone: clientPhone,
          address: clientAddress,
          gps_location: clientGps,
          route: clientRoute || 'Ruta Principal',
          credit_limit: parseFloat(clientCreditLimit) || 0,
          min_monthly_sales: parseFloat(clientMinSales) || 0,
          assigned_seller_id: assignedSellerId || null,
        },
      ]);

      if (error) throw error;
      setClientName(''); setClientDoc(''); setClientEmail(''); setClientPhone(''); setClientAddress(''); setClientGps(''); setClientRoute('Ruta Principal'); setClientCreditLimit('500'); setClientMinSales('100'); setAssignedSellerId(''); setClientCode('');
      setShowAddClientModal(false);
      fetchAllData(profile.tenant_id);
      alert('¡Cliente registrado con éxito!');
    } catch (err: any) {
      alert('Error al registrar cliente: ' + err.message);
    } finally {
      setLoadingClient(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setLoadingClient(true);

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          client_code: editingClient.client_code,
          name: editingClient.name,
          document_id: editingClient.document_id,
          assigned_seller_id: editingClient.assigned_seller_id || null,
          email: editingClient.email,
          phone: editingClient.phone,
          address: editingClient.address,
          gps_location: editingClient.gps_location,
          route: editingClient.route,
          credit_limit: parseFloat(editingClient.credit_limit || 0),
          min_monthly_sales: parseFloat(editingClient.min_monthly_sales || 0),
        })
        .eq('id', editingClient.id);

      if (error) throw error;
      setEditingClient(null);
      if (profile?.tenant_id) fetchAllData(profile.tenant_id);
      alert('¡Cliente actualizado con éxito!');
    } catch (err: any) {
      alert('Error al actualizar cliente: ' + err.message);
    } finally {
      setLoadingClient(false);
    }
  };

  // RESTO DE FUNCIONES DE NEGOCIO...
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setLoadingInv(true);
    try {
      const { error } = await supabase.from('products').insert([{
        tenant_id: profile.tenant_id, name: productName, sku: productSku, price: parseFloat(productPrice), stock: parseInt(productStock)
      }]);
      if (error) throw error;
      setProductName(''); setProductSku(''); setProductPrice(''); setProductStock('');
      setShowAddProductModal(false);
      fetchAllData(profile.tenant_id);
    } catch (err: any) { alert(err.message); } finally { setLoadingInv(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null); setProfile(null); setTenant(null);
  };

  const isAdmin = profile?.role === 'admin';

  // FILTRADO CLIENTES
  const filteredClientsList = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                          (c.document_id && c.document_id.toLowerCase().includes(clientSearch.toLowerCase())) ||
                          (c.client_code && c.client_code.toLowerCase().includes(clientSearch.toLowerCase()));
    const matchesRoute = selectedRouteFilter === 'ALL' || c.route === selectedRouteFilter;
    return matchesSearch && matchesRoute;
  });

  const availableRoutes = Array.from(new Set(clients.map(c => c.route || 'General')));

  if (session) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex">
        {/* BARRA LATERAL */}
        <aside className="w-64 bg-slate-800 border-r border-slate-700 p-6 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white tracking-wide">Kataris ERP</h1>
              <p className="text-xs text-blue-400 font-medium mt-1 uppercase tracking-wider">
                {tenant ? tenant.name : 'CARGANDO...'}
              </p>
              <div className="mt-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700/60 flex justify-between items-center text-xs">
                <span className="text-slate-400">Tasa BCV:</span>
                <span className="text-emerald-400 font-bold">Bs. {currentRate.toFixed(2)}</span>
              </div>
            </div>

            <nav className="space-y-1.5">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'analytics', label: 'Análisis de Resultados' },
                { id: 'payroll', label: 'Nómina y Personal' },
                ...(isAdmin ? [{ id: 'expenses', label: 'Gastos y Egresos' }] : []),
                { id: 'ventas', label: 'Ventas' },
                { id: 'cxc', label: 'Cuentas por Cobrar' },
                { id: 'inventory', label: 'Inventarios' },
                { id: 'purchases', label: 'Compras / Proveedores' },
                { id: 'cxp', label: 'Cuentas por Pagar' },
                { id: 'bancos', label: 'Bancos y Conciliación' },
                { id: 'clients', label: 'Clientes' },
                { id: 'sellers', label: 'Vendedores' },
                { id: 'configuracion', label: '⚙️ Configuración' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as any)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    currentView === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p className="text-sm font-semibold text-white">{profile?.full_name || 'Usuario'}</p>
            <p className="text-xs text-blue-400 capitalize font-medium mb-3">Rol: {profile?.role || 'Usuario'}</p>
            <button onClick={handleLogout} className="w-full bg-slate-700 hover:bg-red-600/80 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 p-8 overflow-y-auto">
          
          {/* VISTA CLIENTES (LIMPIA, SIN SECCIONES ENCIMA) */}
          {currentView === 'clients' && (
            <div className="space-y-6">
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Directorio Profesional de Clientes</h2>
                  <p className="text-sm text-slate-400">Gestión de rutas, ubicación GPS, límites de crédito y vendedores asignados.</p>
                </div>
                
                <button
                  onClick={() => setShowAddClientModal(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg flex items-center space-x-2"
                >
                  <span>+ Nuevo Cliente</span>
                </button>
              </header>

              {/* FILTROS Y BÚSQUEDA */}
              <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="🔍 Buscar cliente por nombre, RIF o código..."
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
                    {availableRoutes.map((route) => (
                      <option key={route} value={route}>{route}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TABLA DE CLIENTES LIMPIA */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-4">CÓDIGO</th>
                      <th className="p-4">CLIENTE / RIF</th>
                      <th className="p-4">RUTA</th>
                      <th className="p-4">VENDEDOR</th>
                      <th className="p-4">LÍMITE CRÉDITO</th>
                      <th className="p-4">MÍN. COMPRA</th>
                      <th className="p-4">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {filteredClientsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          No se encontraron clientes con los criterios de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredClientsList.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-700/20">
                          <td className="p-4 font-mono font-bold text-blue-400">{c.client_code || 'CLI-000'}</td>
                          <td className="p-4">
                            <p className="font-bold text-white">{c.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{c.document_id || 'Sin RIF'}</p>
                          </td>
                          <td className="p-4">
                            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-lg text-xs font-bold">
                              📍 {c.route || 'General'}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-emerald-400">
                            {sellers.find((s) => s.id === c.assigned_seller_id)?.full_name || 'Sin Asignar'}
                          </td>
                          <td className="p-4 font-bold text-amber-400">
                            ${Number(c.credit_limit || 0).toFixed(2)}
                          </td>
                          <td className="p-4 font-bold text-slate-300">
                            ${Number(c.min_monthly_sales || 0).toFixed(2)}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => setEditingClient(c)}
                              className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              ✏️ Modificar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEMÁS VISTAS DEL ERP CONTINÚAN DE FORMA COMPATIBLE... */}
        </main>

        {/* --- MODAL PROFESIONAL: REGISTRAR NUEVO CLIENTE --- */}
        {showAddClientModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                <h3 className="text-lg font-bold text-white">REGISTRAR NUEVO CLIENTE PROFESIONAL</h3>
                <button onClick={() => setShowAddClientModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
              </div>

              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Código Único</label>
                    <input
                      type="text"
                      placeholder={`CLI-${(clients.length + 1).toString().padStart(4, '0')}`}
                      value={clientCode}
                      onChange={(e) => setClientCode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nombre / Razón Social *</label>
                    <input
                      type="text"
                      required
                      placeholder="Cliente Comercial C.A."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">RIF / DNI *</label>
                    <input
                      type="text"
                      required
                      placeholder="J-12345678-9"
                      value={clientDoc}
                      onChange={(e) => setClientDoc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">📍 Ruta de Reparto / Zona *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Ruta Norte - Maracaibo"
                      value={clientRoute}
                      onChange={(e) => setClientRoute(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-emerald-400 font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Vendedor Asignado</label>
                    <select
                      value={assignedSellerId}
                      onChange={(e) => setAssignedSellerId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                    >
                      <option value="">-- Sin Asignar --</option>
                      {sellers.map((s) => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">🗺️ Coordenadas / Link GPS</label>
                    <input
                      type="text"
                      placeholder="Ej: 10.654, -71.631 o URL Maps"
                      value={clientGps}
                      onChange={(e) => setClientGps(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">💳 Límite de Crédito ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="500.00"
                      value={clientCreditLimit}
                      onChange={(e) => setClientCreditLimit(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-amber-400 font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">📉 Mínimo de Venta / Compra Mensual ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="100.00"
                      value={clientMinSales}
                      onChange={(e) => setClientMinSales(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-blue-400 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="cliente@empresa.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Teléfono</label>
                    <input
                      type="text"
                      placeholder="0414-0000000"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Dirección Fiscal / Comercial</label>
                    <input
                      type="text"
                      placeholder="Av. 4 Bella Vista"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowAddClientModal(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loadingClient}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50"
                  >
                    {loadingClient ? 'Guardando...' : 'Guardar Cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  // INTERFAZ DE LOGIN
  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-center text-white mb-6">Kataris ERP</h1>
        <p className="text-center text-slate-400 text-sm mb-6">Inicia sesión para continuar</p>
      </div>
    </main>
  );
}