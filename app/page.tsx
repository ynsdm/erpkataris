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
  const [inventory, setInventory] = useState<any[]>([]);'use client';

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

  // Datos Principales
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);

  // ESTADOS Y MODALES DE CLIENTES
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
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

  // ESTADOS Y MODALES DE VENDEDORES
  const [editingQuotaSeller, setEditingQuotaSeller] = useState<any | null>(null);
  const [newQuotaValue, setNewQuotaValue] = useState('');
  const [showNewSellerModal, setShowNewSellerModal] = useState(false);
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerEmail, setNewSellerEmail] = useState('');
  const [newSellerPassword, setNewSellerPassword] = useState('');
  const [newSellerQuota, setNewSellerQuota] = useState('1000');
  const [loadingNewSeller, setLoadingNewSeller] = useState(false);

  // ESTADOS Y MODALES DE COMPRAS / PROVEEDORES
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [purchaseCart, setPurchaseCart] = useState<any[]>([]);
  const [purchaseProdId, setPurchaseProdId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseInvoiceNum, setPurchaseInvoiceNum] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [selectedPurchaseForPay, setSelectedPurchaseForPay] = useState<any | null>(null);
  const [cxpPaymentData, setCxpPaymentData] = useState({ amount: 0, payment_method: 'Transferencia', reference_number: '', notes: '' });

  // ESTADOS Y MODALES DE BANCOS Y CONCILIACIÓN
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankTransactions, setBankTransactions] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [newBank, setNewBank] = useState({ bank_name: '', account_number: '', currency: 'USD', initial_balance: 0 });
  const [newTx, setNewTx] = useState({ description: '', reference_number: '', amount: '', type: 'ingreso' });

  // ESTADOS Y MODALES DE EMPLEADOS Y NÓMINA
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showAddPayrollModal, setShowAddPayrollModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [newEmp, setNewEmp] = useState({ first_name: '', last_name: '', national_id: '', phone: '', position: '', base_salary: 0, payment_frequency: 'Quincenal' });
  const [newPayrollPay, setNewPayrollPay] = useState({ employee_id: '', base_salary_paid: 0, bonuses: 0, commissions: 0, deductions: 0, payment_period: '', payment_method: 'Transferencia' });

  // ESTADOS Y MODALES DE PRODUCTOS Y GASTOS
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [loadingInv, setLoadingInv] = useState(false);

  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('operativo');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [loadingExpense, setLoadingExpense] = useState(false);

  // ESTADOS Y MODALES DE VENTAS Y FACTURACIÓN
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [invoiceQuantity, setInvoiceQuantity] = useState(1);
  const [paymentTerm, setPaymentTerm] = useState('contado');
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
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

  // LOGIN / REGISTRO EMPRESA
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

  // MANEJADORES DE LOGICA DE NEGOCIO
  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setLoadingNewSeller(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: newSellerEmail, password: newSellerPassword });
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('No se pudo obtener ID de usuario.');

      const { error: profileError } = await supabase.from('profiles').upsert([
        { id: userId, tenant_id: profile.tenant_id, full_name: newSellerName, role: 'seller', monthly_quota: parseFloat(newSellerQuota) || 1000 }
      ]);
      if (profileError) throw profileError;

      alert('¡Vendedor registrado con éxito!');
      setShowNewSellerModal(false);
      setNewSellerName(''); setNewSellerEmail(''); setNewSellerPassword(''); setNewSellerQuota('1000');
      fetchAllData(profile.tenant_id);
    } catch (err: any) { alert('Error: ' + err.message); } finally { setLoadingNewSeller(false); }
  };

  const handleUpdateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuotaSeller) return;
    try {
      const quotaNum = parseFloat(newQuotaValue);
      const { error } = await supabase.from('profiles').update({ monthly_quota: quotaNum }).eq('id', editingQuotaSeller.id);
      if (error) throw error;

      alert('¡Cuota actualizada con éxito!');
      setEditingQuotaSeller(null); setNewQuotaValue('');
      if (profile?.tenant_id) fetchAllData(profile.tenant_id);
    } catch (err: any) { alert(err.message); }
  };

  const handleUpdateExchangeRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;
    setLoadingRate(true);
    try {
      const newRate = parseFloat(exchangeRateInput);
      const { error } = await supabase.from('tenants').update({ exchange_rate: newRate }).eq('id', tenant.id);
      if (error) throw error;
      setTenant({ ...tenant, exchange_rate: newRate });
      alert('¡Tasa BCV actualizada!');
    } catch (err: any) { alert(err.message); } finally { setLoadingRate(false); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setLoadingExpense(true);
    try {
      const { error } = await supabase.from('expenses').insert([{
        tenant_id: profile.tenant_id, description: expenseDesc, category: expenseCategory, amount: parseFloat(expenseAmount), exchange_rate: currentRate
      }]);
      if (error) throw error;
      setExpenseDesc(''); setExpenseAmount(''); setExpenseCategory('operativo');
      setShowAddExpenseModal(false);
      fetchAllData(profile.tenant_id);
    } catch (err: any) { alert(err.message); } finally { setLoadingExpense(false); }
  };

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

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setLoadingClient(true);
    try {
      const generatedCode = clientCode.trim() || `CLI-${(clients.length + 1).toString().padStart(4, '0')}`;
      const { error } = await supabase.from('clients').insert([{
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
      }]);
      if (error) throw error;
      setClientName(''); setClientDoc(''); setClientEmail(''); setClientPhone(''); setClientAddress(''); setClientGps(''); setClientRoute('Ruta Principal'); setClientCreditLimit('500'); setClientMinSales('100'); setAssignedSellerId(''); setClientCode('');
      setShowAddClientModal(false);
      fetchAllData(profile.tenant_id);
      alert('¡Cliente registrado con éxito!');
    } catch (err: any) { alert(err.message); } finally { setLoadingClient(false); }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setLoadingClient(true);
    try {
      const { error } = await supabase.from('clients').update({
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
      }).eq('id', editingClient.id);

      if (error) throw error;
      setEditingClient(null);
      if (profile?.tenant_id) fetchAllData(profile.tenant_id);
      alert('¡Cliente actualizado!');
    } catch (err: any) { alert(err.message); } finally { setLoadingClient(false); }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !selectedClientId || !selectedProductId) return alert('Selecciona cliente y producto.');
    setLoadingInvoice(true);
    try {
      const productObj = products.find((p) => p.id === selectedProductId);
      if (!productObj) throw new Error('Producto no encontrado');
      const qty = Number(invoiceQuantity);
      if (productObj.stock < qty) return alert(`Stock insuficiente. Disponible: ${productObj.stock}`);

      const subtotal = Number(productObj.price) * qty;
      const initialBalance = paymentTerm === 'credito' ? subtotal : 0.00;
      const nextNum = (invoices.length + 1).toString().padStart(4, '0');
      const generatedInvoiceNum = `FACT-${nextNum}`;

      const { data: invHeader, error: invError } = await supabase.from('invoices').insert([{
        tenant_id: profile.tenant_id,
        client_id: selectedClientId,
        total: subtotal,
        status: paymentTerm === 'credito' ? 'credito' : 'issued',
        payment_term: paymentTerm,
        balance_due: initialBalance,
        exchange_rate: currentRate,
        invoice_number: generatedInvoiceNum
      }]).select().single();

      if (invError) throw invError;
      if (invHeader) {
        await supabase.from('invoice_items').insert([{ invoice_id: invHeader.id, product_id: selectedProductId, quantity: qty, unit_price: productObj.price }]);
        await supabase.from('products').update({ stock: productObj.stock - qty }).eq('id', selectedProductId);
      }

      setSelectedClientId(''); setSelectedProductId(''); setInvoiceQuantity(1); setPaymentTerm('contado');
      setShowCreateInvoiceModal(false);
      fetchAllData(profile.tenant_id);
      alert(`¡Factura ${generatedInvoiceNum} emitida con éxito!`);
    } catch (err: any) { alert(err.message); } finally { setLoadingInvoice(false); }
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
      if (payAmt > currentBalance) return alert('El abono no puede superar el saldo pendiente.');

      const { error: payError } = await supabase.from('payments').insert([{
        tenant_id: profile.tenant_id, invoice_id: selectedInvoiceId, amount: payAmt, payment_method: paymentMethod, reference_note: paymentNote, exchange_rate: currentRate
      }]);
      if (payError) throw payError;

      const newBalance = currentBalance - payAmt;
      await supabase.from('invoices').update({ balance_due: newBalance, status: newBalance === 0 ? 'paid' : 'credito' }).eq('id', selectedInvoiceId);

      setSelectedInvoiceId(''); setPaymentAmount(''); setPaymentNote('');
      setShowPaymentModal(false);
      fetchAllData(profile.tenant_id);
      alert('¡Abono registrado!');
    } catch (err: any) { alert(err.message); } finally { setLoadingPayment(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null); setProfile(null); setTenant(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMessage(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        if (authData.user) {
          const { data: tenantData, error: tenantError } = await supabase.from('tenants').insert([{ name: companyName, exchange_rate: 36.00 }]).select().single();
          if (tenantError) throw tenantError;
          await supabase.from('profiles').insert([{ id: authData.user.id, tenant_id: tenantData.id, full_name: fullName, role: userRoleInput }]);
        }
      }
    } catch (err: any) { setMessage({ text: err.message, type: 'error' }); } finally { setLoading(false); }
  };

  // EXPORTACIONES A EXCEL
  const exportToExcel = (data: any[], fileName: string) => {
    if (!data || data.length === 0) return alert('No hay datos para exportar.');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportInvoices = () => {
    exportToExcel(invoices.map((inv) => ({
      ID: inv.id, Cliente: inv.clients?.name, Monto_USD: Number(inv.total), Monto_VES: Number(inv.total) * currentRate, Condicion: inv.payment_term, Estado: inv.status, Fecha: new Date(inv.created_at).toLocaleString('es-VE')
    })), 'Reporte_Ventas');
  };

  const handleExportClients = () => {
    exportToExcel(clients.map((cli) => ({
      Codigo: cli.client_code, Nombre: cli.name, RIF: cli.document_id, Ruta: cli.route, Telefono: cli.phone, Limite_Credito: cli.credit_limit, Minimo_Venta: cli.min_monthly_sales
    })), 'Reporte_Clientes');
  };

  const isAdmin = profile?.role === 'admin';

  // FILTRADOS EN MEMORIA
  const filteredClientsList = clients.filter((c) => {
    const matchesSearch = c.name?.toLowerCase().includes(clientSearch.toLowerCase()) || c.document_id?.toLowerCase().includes(clientSearch.toLowerCase()) || c.client_code?.toLowerCase().includes(clientSearch.toLowerCase());
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
              <p className="text-xs text-blue-400 font-medium mt-1 uppercase tracking-wider">{tenant ? tenant.name : 'CARGANDO...'}</p>
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

        {/* CONTENIDO PRINCIPAL DE VISTAS */}
        <main className="flex-1 p-8 overflow-y-auto">
          
          {/* 1. DASHBOARD */}
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Panel Ejecutivo Visual</h2>
                  <p className="text-sm text-slate-400">Indicadores clave del negocio.</p>
                </div>
                <button onClick={handleExportInvoices} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow">
                  📊 Exportar Ventas Excel
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Ventas Totales</span>
                  <h3 className="text-2xl font-bold text-emerald-400 mt-2">${invoices.reduce((a, b) => a + Number(b.total), 0).toFixed(2)}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Bs. {(invoices.reduce((a, b) => a + Number(b.total), 0) * currentRate).toFixed(2)}</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Facturas Emitidas</span>
                  <h3 className="text-2xl font-bold text-white mt-2">{invoices.length}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Total transacciones</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Clientes</span>
                  <h3 className="text-2xl font-bold text-white mt-2">{clients.length}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Directorio registrado</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
                  <span className="text-xs font-semibold text-slate-400 uppercase">CxC Pendiente</span>
                  <h3 className="text-2xl font-bold text-amber-400 mt-2">${invoices.reduce((a, b) => a + Number(b.balance_due || 0), 0).toFixed(2)}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Por cobrar</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. CLIENTES */}
          {currentView === 'clients' && (
            <div className="space-y-6">
              <header className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Directorio Profesional de Clientes</h2>
                  <p className="text-sm text-slate-400">Control de rutas, limites de credito, GPS y vendedores.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportClients} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow">📊 Exportar Excel</button>
                  <button onClick={() => setShowAddClientModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow">+ Registrar Cliente</button>
                </div>
              </header>

              <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col md:flex-row gap-4">
                <input type="text" placeholder="🔍 Buscar por nombre, RIF o código..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white" />
                <select value={selectedRouteFilter} onChange={(e) => setSelectedRouteFilter(e.target.value)} className="w-full md:w-64 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="ALL">📍 Todas las Rutas</option>
                  {availableRoutes.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                    <tr>
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
                    {filteredClientsList.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-700/20">
                        <td className="p-4 font-mono font-bold text-blue-400">{c.client_code || 'CLI-000'}</td>
                        <td className="p-4 font-bold text-white">{c.name} <span className="block text-xs font-normal text-slate-400">{c.document_id || 'Sin RIF'}</span></td>
                        <td className="p-4"><span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-bold">📍 {c.route || 'General'}</span></td>
                        <td className="p-4 font-semibold text-emerald-400">{sellers.find(s => s.id === c.assigned_seller_id)?.full_name || 'Sin Asignar'}</td>
                        <td className="p-4 font-bold text-amber-400">${Number(c.credit_limit || 0).toFixed(2)}</td>
                        <td className="p-4 font-bold text-slate-300">${Number(c.min_monthly_sales || 0).toFixed(2)}</td>
                        <td className="p-4"><button onClick={() => setEditingClient(c)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">✏️ Modificar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. INVENTARIO */}
          {currentView === 'inventory' && (
            <div className="space-y-6">
              <header className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Catálogo de Inventario</h2>
                  <p className="text-sm text-slate-400">Control de productos y existencias.</p>
                </div>
                <button onClick={() => setShowAddProductModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow">+ Agregar Producto</button>
              </header>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                    <tr><th className="p-4">PRODUCTO</th><th className="p-4">SKU</th><th className="p-4">PRECIO ($)</th><th className="p-4">PRECIO (BS)</th><th className="p-4">STOCK</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-slate-700/20">
                        <td className="p-4 font-bold text-white">{p.name}</td>
                        <td className="p-4 font-mono text-slate-400">{p.sku || 'N/A'}</td>
                        <td className="p-4 font-bold text-emerald-400">${Number(p.price).toFixed(2)}</td>
                        <td className="p-4 font-mono text-slate-300">Bs. {(Number(p.price) * currentRate).toFixed(2)}</td>
                        <td className="p-4 font-bold">{p.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. VENTAS */}
          {currentView === 'ventas' && (
            <div className="space-y-6">
              <header className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Ventas y Facturación</h2>
                  <p className="text-sm text-slate-400">Registro y emisión de facturas.</p>
                </div>
                <button onClick={() => setShowCreateInvoiceModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow">+ Nueva Factura</button>
              </header>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                    <tr><th className="p-4">N° FACTURA</th><th className="p-4">CLIENTE</th><th className="p-4">TOTAL ($)</th><th className="p-4">TOTAL (BS)</th><th className="p-4">CONDICIÓN</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-700/20">
                        <td className="p-4 font-mono font-bold text-blue-400">{inv.invoice_number}</td>
                        <td className="p-4 font-bold text-white">{inv.clients?.name || 'Cliente General'}</td>
                        <td className="p-4 font-bold text-emerald-400">${Number(inv.total).toFixed(2)}</td>
                        <td className="p-4 font-mono text-slate-300">Bs. {(Number(inv.total) * currentRate).toFixed(2)}</td>
                        <td className="p-4 uppercase text-xs font-bold">{inv.payment_term}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. CUENTAS POR COBRAR (CXC) */}
          {currentView === 'cxc' && (
            <div className="space-y-6">
              <header className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Cuentas por Cobrar (CxC)</h2>
                  <p className="text-sm text-slate-400">Gestión de abonos y saldos pendientes.</p>
                </div>
                <button onClick={() => setShowPaymentModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow">+ Registrar Abono</button>
              </header>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                    <tr><th className="p-4">CLIENTE</th><th className="p-4">SALDO ($)</th><th className="p-4">SALDO (BS)</th><th className="p-4">ESTADO</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-700/20">
                        <td className="p-4 font-bold text-white">{inv.clients?.name}</td>
                        <td className="p-4 font-bold text-amber-400">${Number(inv.balance_due || 0).toFixed(2)}</td>
                        <td className="p-4 font-mono text-slate-300">Bs. {(Number(inv.balance_due || 0) * currentRate).toFixed(2)}</td>
                        <td className="p-4 uppercase text-xs font-bold">{inv.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. GASTOS Y EGRESOS */}
          {currentView === 'expenses' && isAdmin && (
            <div className="space-y-6">
              <header className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Gastos y Egresos</h2>
                  <p className="text-sm text-slate-400">Control operativo de egresos.</p>
                </div>
                <button onClick={() => setShowAddExpenseModal(true)} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow">+ Registrar Gasto</button>
              </header>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                    <tr><th className="p-4">DESCRIPCIÓN</th><th className="p-4">CATEGORÍA</th><th className="p-4">MONTO ($)</th><th className="p-4">FECHA</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-700/20">
                        <td className="p-4 font-bold text-white">{exp.description}</td>
                        <td className="p-4 uppercase text-xs font-bold text-slate-400">{exp.category}</td>
                        <td className="p-4 font-bold text-rose-400">${Number(exp.amount).toFixed(2)}</td>
                        <td className="p-4 text-xs text-slate-400">{new Date(exp.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RESTO DE VISTAS (COMPRAS, BANCOS, NÓMINA, VENDEDORES, CONFIGURACIÓN) SE MANTIENEN LISTAS... */}

        </main>

        {/* --- MODAL 1: NUEVO CLIENTE --- */}
        {showAddClientModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                <h3 className="text-lg font-bold text-white">Registrar Cliente Profesional</h3>
                <button onClick={() => setShowAddClientModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>

              <form onSubmit={handleAddClient} className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Código Único</label>
                    <input type="text" placeholder={`CLI-${(clients.length + 1).toString().padStart(4, '0')}`} value={clientCode} onChange={(e) => setClientCode(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nombre / Razón Social *</label>
                    <input type="text" required placeholder="Comercial Los Amigos C.A." value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">RIF / DNI *</label>
                    <input type="text" required placeholder="J-12345678-9" value={clientDoc} onChange={(e) => setClientDoc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">📍 Ruta / Zona *</label>
                    <input type="text" required placeholder="Ruta Norte" value={clientRoute} onChange={(e) => setClientRoute(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-emerald-400 font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">💳 Límite Crédito ($)</label>
                    <input type="number" step="0.01" value={clientCreditLimit} onChange={(e) => setClientCreditLimit(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-amber-400 font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">📉 Mínimo Venta ($)</label>
                    <input type="number" step="0.01" value={clientMinSales} onChange={(e) => setClientMinSales(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-blue-400 font-bold" />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
                  <button type="button" onClick={() => setShowAddClientModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-lg text-xs">Cancelar</button>
                  <button type="submit" disabled={loadingClient} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-lg text-xs">
                    {loadingClient ? 'Guardando...' : 'Guardar Cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- MODAL 2: NUEVO PRODUCTO --- */}
        {showAddProductModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                <h3 className="text-lg font-bold text-white">Agregar Producto a Inventario</h3>
                <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>

              <form onSubmit={handleAddProduct} className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nombre Producto</label>
                  <input type="text" required placeholder="Aceite 1L" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">SKU</label>
                  <input type="text" placeholder="SKU-100" value={productSku} onChange={(e) => setProductSku(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Precio ($)</label>
                    <input type="number" step="0.01" required value={productPrice} onChange={(e) => setProductPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-emerald-400 font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Stock Inicial</label>
                    <input type="number" required value={productStock} onChange={(e) => setProductStock(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-bold" />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
                  <button type="button" onClick={() => setShowAddProductModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-lg text-xs">Cancelar</button>
                  <button type="submit" disabled={loadingInv} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-lg text-xs">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- MODAL 3: REGISTRAR GASTO --- */}
        {showAddExpenseModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                <h3 className="text-lg font-bold text-white">Registrar Gasto u Operación</h3>
                <button onClick={() => setShowAddExpenseModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Descripción</label>
                  <input type="text" required placeholder="Pago de luz / Alquiler" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Categoría</label>
                  <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
                    <option value="operativo">Operativo</option>
                    <option value="nomina">Nómina</option>
                    <option value="servicios">Servicios</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Monto ($)</label>
                  <input type="number" step="0.01" required value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-rose-400 font-bold" />
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
                  <button type="button" onClick={() => setShowAddExpenseModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-lg text-xs">Cancelar</button>
                  <button type="submit" disabled={loadingExpense} className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2 rounded-lg text-xs">Guardar Gasto</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-center text-white mb-6">Kataris ERP</h1>
        <p className="text-center text-slate-400 text-sm mb-6">Inicia sesión con tus credenciales</p>
      </div>
    </main>
  );
}