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
  const [currentView, setCurrentView] = useState<'dashboard' | 'inventory' | 'clients' | 'invoices' | 'cxc' | 'expenses' | 'analytics' | 'payroll' | 'purchases' | 'cxp' | 'configuracion' | 'ventas'>('dashboard');

  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [Purchases, setPurchases] = useState<any[]>([]);

  const [purchaseCart, setPurchaseCart] = useState<any[]>([]);
  const [purchaseProdId, setPurchaseProdId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseInvoiceNum, setPurchaseInvoiceNum] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');

  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [selectedPurchaseForPay, setSelectedPurchaseForPay] = useState<any | null>(null);
  const [cxpPaymentData, setCxpPaymentData] = useState({
    amount: 0,
    payment_method: 'Transferencia',
    reference_number: '',
    notes: ''
  });

  // Estados de Empleados y Nómina
  const [employees, setEmployees] = useState<any[]>([]);
  const [newEmp, setNewEmp] = useState({
    first_name: '',
    last_name: '',
    national_id: '',
    phone: '',
    position: '',
    base_salary: 0,
    payment_frequency: 'Quincenal'
  });

  // Estado de Pago de Nómina
  const [newPayrollPay, setNewPayrollPay] = useState({
    employee_id: '',
    base_salary_paid: 0,
    bonuses: 0,
    commissions: 0,
    deductions: 0,
    payment_period: '',
    payment_method: 'Transferencia'
  });

  // Estados para el Módulo de Configuración
  const [activeConfigTab, setActiveConfigTab] = useState<'empresa' | 'tickets' | 'usuarios' | 'roles' | 'pagos'>('empresa');
  const [tenantSettings, setTenantSettings] = useState<any>({
    default_credit_days: 5,
    ticket_header: 'GRUPO KATARIS C.A.',
    ticket_footer: '¡Gracias por su compra!',
    ticket_show_bcv: true,
    allowed_payment_methods: ['Efectivo USD', 'Pago Móvil', 'Zelle', 'Efectivo Bs']
  });
  const [newRoleName, setNewRoleName] = useState('');
  const [customRoles, setCustomRoles] = useState<any[]>([]);

  const handleSaveSettings = async () => {
    try {
      alert('¡Configuración guardada exitosamente!');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Hubo un error al guardar los cambios.');
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const newRole = { id: Date.now(), role_name: newRoleName };
      setCustomRoles([...customRoles, newRole]);
      setNewRoleName('');
      alert('¡Rol creado con éxito!');
    } catch (error) {
      console.error('Error al crear rol:', error);
    }
  };

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

    const { data: purchasesData } = await supabase
      .from('purchases')
      .select('*, suppliers(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (purchasesData) setPurchases(purchasesData);

    const { data: empData } = await supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (empData) setEmployees(empData);

    const { data: suppPayData } = await supabase
      .from('supplier_payments')
      .select('*, purchases(*, suppliers(name))')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (suppPayData) setSupplierPayments(suppPayData);
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
    const rateAtMoment = Number(tenant?.exchange_rate || 36.00);

    try {
      const { error } = await supabase.from('expenses').insert([
        {
          tenant_id: profile.tenant_id,
          description: expenseDesc,
          category: expenseCategory,
          amount: parseFloat(expenseAmount),
          exchange_rate: rateAtMoment,
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
    const rateAtMoment = Number(tenant?.exchange_rate || 36.00);

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

      const nextNum = (invoices.length + 1).toString().padStart(4, '0');
      const generatedInvoiceNum = `FACT-${nextNum}`;

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
            exchange_rate: rateAtMoment,
            invoice_number: generatedInvoiceNum
          }
        ])
        .select()
        .single();

      if (invError) throw invError;

      if (invHeader) {
        await supabase.from('invoice_items').insert([
          {
            invoice_id: invHeader.id,
            product_id: selectedProductId,
            quantity: qty,
            unit_price: unitPrice
          }
        ]);
      }

      await supabase
        .from('products')
        .update({ stock: productObj.stock - qty })
        .eq('id', selectedProductId);

      setSelectedClientId('');
      setSelectedProductId('');
      setInvoiceQuantity(1);
      setPaymentTerm('contado');
      fetchAllData(profile.tenant_id);
      alert(`¡Factura ${generatedInvoiceNum} emitida con éxito!`);

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
    const rateAtMoment = Number(tenant?.exchange_rate || 36.00);

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
          exchange_rate: rateAtMoment,
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
  const isAdmin = profile?.role === 'admin';

  const filteredInvoices = invoices.filter((inv) => {
    if (!inv.created_at) return true;
    const invDate = new Date(inv.created_at);
    const now = new Date();

    if (dateFilter === 'today') {
      return (
        invDate.getDate() === now.getDate() &&
        invDate.getMonth() === now.getMonth() &&
        invDate.getFullYear() === now.getFullYear()
      );
    }
    if (dateFilter === 'month') {
      return (
        invDate.getMonth() === now.getMonth() &&
        invDate.getFullYear() === now.getFullYear()
      );
    }
    if (dateFilter === 'year') {
      return invDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const totalSalesFiltered = filteredInvoices.reduce((acc, inv) => acc + Number(inv.total), 0);
  const totalPendingCxCFiltered = filteredInvoices.reduce((acc, inv) => acc + Number(inv.balance_due || 0), 0);

  const sellerSalesMap: { [key: string]: number } = {};
  filteredInvoices.forEach((inv) => {
    const sellerName = inv.profiles?.full_name || 'Vendedor General';
    sellerSalesMap[sellerName] = (sellerSalesMap[sellerName] || 0) + Number(inv.total);
  });

  const topSellers = Object.entries(sellerSalesMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const exportToExcel = (data: any[], fileName: string) => {
    if (!data || data.length === 0) {
      alert('No hay datos disponibles para exportar en este módulo o rango.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportInvoices = () => {
    const formattedData = filteredInvoices.map((inv) => ({
      ID_Factura: inv.id,
      Cliente: inv.clients?.name || 'N/A',
      Monto_USD: Number(inv.total),
      Tasa_Histórica: Number(inv.exchange_rate || currentRate),
      Monto_VES: Number(inv.total) * Number(inv.exchange_rate || currentRate),
      Condición: inv.payment_term,
      Estado: inv.status,
      Vendedor: inv.profiles?.full_name || 'Vendedor General',
      Fecha: new Date(inv.created_at).toLocaleString('es-VE'),
    }));
    exportToExcel(formattedData, 'Reporte_Ventas_Kataris');
  };

  const handleExportExpenses = () => {
    const formattedData = expenses.map((exp) => ({
      ID_Gasto: exp.id,
      Descripción: exp.description,
      Categoría: exp.category,
      Monto_USD: Number(exp.amount),
      Tasa_Histórica: Number(exp.exchange_rate || currentRate),
      Monto_VES: Number(exp.amount) * Number(exp.exchange_rate || currentRate),
      Fecha: new Date(exp.created_at).toLocaleString('es-VE'),
    }));
    exportToExcel(formattedData, 'Reporte_Gastos_Kataris');
  };

  const handleExportCxC = () => {
    const pendingInvoices = invoices.filter((inv) => inv.status !== 'paid');
    const formattedData = pendingInvoices.map((inv) => ({
      ID_Factura: inv.id,
      Cliente: inv.clients?.name || 'N/A',
      Monto_Total_USD: Number(inv.total),
      Saldo_Pendiente_USD: Number(inv.balance_due || inv.total),
      Saldo_Pendiente_VES: Number(inv.balance_due || inv.total) * currentRate,
      Tasa_Emisión: Number(inv.exchange_rate || currentRate),
      Fecha_Emisión: new Date(inv.created_at).toLocaleDateString('es-VE'),
    }));
    exportToExcel(formattedData, 'Reporte_Cuentas_Por_Cobrar');
  };

  const handleExportInventory = () => {
    const formattedData = products.map((prod) => ({
      ID_Producto: prod.id,
      Nombre: prod.name,
      Stock_Actual: prod.stock,
      Precio_USD: Number(prod.price),
      Precio_VES: Number(prod.price) * currentRate,
      Valor_Stock_USD: Number(prod.price) * prod.stock,
      Valor_Stock_VES: Number(prod.price) * prod.stock * currentRate,
    }));
    exportToExcel(formattedData, 'Reporte_Inventario_Kataris');
  };

  const addItemToPurchaseCart = () => {
    if (!purchaseProdId || !purchaseQty || !purchaseCost) {
      alert('Por favor selecciona un producto, cantidad y costo unitario.');
      return;
    }

    const prod = products.find((p) => p.id === purchaseProdId);
    if (!prod) return;

    const newItem = {
      productId: purchaseProdId,
      name: prod.name,
      quantity: Number(purchaseQty),
      unit_cost: Number(purchaseCost),
    };

    setPurchaseCart([...purchaseCart, newItem]);
    setPurchaseProdId('');
    setPurchaseQty('');
    setPurchaseCost('');
  };

  const handleRegisterPurchase = async () => {
    if (!selectedSupplier) {
      alert('Por favor selecciona un proveedor.');
      return;
    }
    if (purchaseCart.length === 0) {
      alert('El carrito de compras está vacío.');
      return;
    }

    const totalPurchase = purchaseCart.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

    const { data, error } = await supabase.rpc('process_purchase_entry', {
      p_supplier_id: selectedSupplier,
      p_invoice_number: purchaseInvoiceNum || 'N/A',
      p_total: totalPurchase,
      p_exchange_rate: currentRate,
      p_items: purchaseCart.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      })),
    });

    if (!error) {
      alert('¡Compra registrada exitosamente! El inventario ha sido actualizado.');
      setPurchaseCart([]);
      setPurchaseInvoiceNum('');
      setSelectedSupplier('');
      if (tenant?.id) {
        await fetchAllData(tenant.id);
      }
    } else {
      alert('Error al registrar compra: ' + error.message);
    }
  };

  const handleExportPurchases = () => {
    if (!Purchases || Purchases.length === 0) {
      alert('No hay compras registradas para exportar.');
      return;
    }

    const formattedData = Purchases.map((p) => ({
      ID_Compra: p.id,
      Proveedor: p.suppliers?.name || 'N/A',
      Nro_Factura_Proveedor: p.supplier_invoice_number || 'N/A',
      Monto_Total_USD: Number(p.total),
      Tasa_Histórica: Number(p.exchange_rate || currentRate),
      Monto_Total_VES: Number(p.total) * Number(p.exchange_rate || currentRate),
      Estado_Pago: p.payment_status || 'paid',
      Fecha: new Date(p.created_at).toLocaleString('es-VE'),
    }));

    exportToExcel(formattedData, 'Reporte_Compras_Kataris');
  };

  const handleExportClients = () => {
    const formattedData = clients.map((cli) => ({
      ID_Cliente: cli.id,
      Nombre_o_Empresa: cli.name,
      Documento_RIF_CI: cli.document_id || 'N/A',
      Teléfono: cli.phone || 'N/A',
      Dirección: cli.address || 'N/A',
      Fecha_Registro: new Date(cli.created_at).toLocaleDateString('es-VE'),
    }));
    exportToExcel(formattedData, 'Reporte_Directorio_Clientes');
  };

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
              <button
                onClick={() => setCurrentView('analytics')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'analytics' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Análisis de Resultados
              </button>
              <button
                onClick={() => setCurrentView('payroll')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'payroll' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Nómina y Personal
              </button>
              {isAdmin && (
                <button
                  onClick={() => setCurrentView('expenses')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    currentView === 'expenses' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  Gastos y Egresos
                </button>
              )}

              <button
                onClick={() => setCurrentView('ventas')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'ventas' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Ventas
              </button>
              <button
                onClick={() => setCurrentView('cxc')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'cxc' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Cuentas por Cobrar
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
                onClick={() => setCurrentView('purchases')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'purchases' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Compras / Proveedores
              </button>
              <button
                onClick={() => setCurrentView('cxp')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'cxp' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Cuentas por Pagar
              </button>
              <button
                onClick={() => setCurrentView('clients')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Clientes
              </button>
              <button
                onClick={() => setCurrentView('configuracion')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  currentView === 'configuracion'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="text-lg">⚙️</span>
                <span>Configuración</span>
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
          {currentView === 'dashboard' && (
            <>
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Panel Ejecutivo Visual</h2>
                  <p className="text-sm text-slate-400">Indicadores de rendimiento y analítica filtrada por período.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center text-xs">
                    <button
                      onClick={() => setDateFilter('today')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                        dateFilter === 'today' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => setDateFilter('month')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                        dateFilter === 'month' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Este Mes
                    </button>
                    <button
                      onClick={() => setDateFilter('year')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                        dateFilter === 'year' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Este Año
                    </button>
                    <button
                      onClick={() => setDateFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                        dateFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todo
                    </button>
                  </div>
                  <button
                    onClick={handleExportInvoices}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    📊 Exportar Excel
                  </button>
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
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ventas Período</span>
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {dateFilter}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-400 mb-2">${totalSalesFiltered.toFixed(2)}</h3>
                  <div className="w-full bg-slate-900 rounded-full h-2 mb-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-[11px] text-slate-400">Bs. {(totalSalesFiltered * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Facturas Emitidas</span>
                    <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">Filtrado</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{filteredInvoices.length}</h3>
                  <div className="w-full bg-slate-900 rounded-full h-2 mb-2 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-[11px] text-slate-400">Transacciones en rango</p>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clientes en Cartera</span>
                    <span className="bg-purple-500/10 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full">Directorio</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{clients.length}</h3>
                  <div className="w-full bg-slate-900 rounded-full h-2 mb-2 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-[11px] text-slate-400">Total acumulado</p>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CxC Pendiente</span>
                    <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">Crédito</span>
                  </div>
                  <h3 className="text-2xl font-bold text-amber-400 mb-2">${totalPendingCxCFiltered.toFixed(2)}</h3>
                  <div className="w-full bg-slate-900 rounded-full h-2 mb-2 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-[11px] text-slate-400">Bs. {(totalPendingCxCFiltered * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Ventas por Fecha</h3>
                      <p className="text-xs text-slate-400">Evolución de ingresos en el período seleccionado</p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={filteredInvoices.slice().reverse().map((inv) => ({
                          fecha: new Date(inv.created_at).toLocaleDateString('es-VE', {
                            day: '2-digit',
                            month: '2-digit',
                          }),
                          total: Number(inv.total),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px', color: '#fff' }} />
                        <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Stock de Productos</h3>
                      <p className="text-xs text-slate-400">Existencias actuales registradas</p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={products.map((p) => ({ name: p.name, stock: p.stock }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px', color: '#fff' }} />
                        <Bar dataKey="stock" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm mb-8">
                <h3 className="text-lg font-bold text-white mb-4">🏆 Top Vendedores del Período</h3>
                {topSellers.length === 0 ? (
                  <p className="text-sm text-slate-400">No hay ventas registradas en este período.</p>
                ) : (
                  <div className="space-y-3">
                    {topSellers.map((seller, index) => (
                      <div key={seller.name} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-amber-500 text-slate-950' : index === 1 ? 'bg-slate-400 text-slate-950' : 'bg-amber-700 text-white'}`}>
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-white">{seller.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-400">${seller.total.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-400">Bs. {(seller.total * currentRate).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {currentView === 'expenses' && isAdmin && (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Control de Gastos y Egresos (P&L)</h2>
                  <p className="text-sm text-slate-400">Exclusivo para administradores.</p>
                </div>
                <button 
                  onClick={handleExportExpenses} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
                  📊 Exportar Gastos
                </button>
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
          )}

          {currentView === 'inventory' && (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Gestión de Inventario</h2>
                  <p className="text-sm text-slate-400">Control de productos y existencias.</p>
                </div>
                <button onClick={handleExportInventory} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
                  📊 Exportar Inventario
                </button>
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
          )}

          {currentView === 'purchases' && (
            <div className="space-y-8">
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Compras y Recepción de Mercancía</h2>
                  <p className="text-sm text-slate-400">Registra entradas de stock y facturas de proveedores</p>
                </div>
                <button 
                  onClick={handleExportPurchases}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  📊 Exportar Compras
                </button>
              </header>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-white">Registrar Nuevo Proveedor</h3>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const name = (form.elements.namedItem('supName') as HTMLInputElement).value;
                    const rif = (form.elements.namedItem('supRif') as HTMLInputElement).value;
                    const phone = (form.elements.namedItem('supPhone') as HTMLInputElement).value;
                    
                    const { error } = await supabase.from('suppliers').insert([{ 
                      tenant_id: tenant?.id, 
                      name, 
                      rif, 
                      phone 
                    }]);

                    if (!error) {
                      alert('¡Proveedor registrado exitosamente!');
                      form.reset();
                      fetchAllData(tenant?.id);
                    } else {
                      alert('Error al registrar proveedor: ' + error.message);
                    }
                  }} 
                  className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre / Empresa</label>
                    <input 
                      type="text" 
                      name="supName" 
                      required 
                      placeholder="Ej: Distribuidora C.A." 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">RIF / Documento</label>
                    <input 
                      type="text" 
                      name="supRif" 
                      placeholder="Ej: J-12345678-9" 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      name="supPhone" 
                      placeholder="Ej: 0414-1234567" 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                  >
                    + Guardar Proveedor
                  </button>
                </form>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-white">Nueva Entrada de Inventario</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Proveedor</label>
                    <select 
                      value={selectedSupplier} 
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Seleccionar Proveedor...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.rif || 'Sin RIF'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">N° Factura / Control Proveedor</label>
                    <input 
                      type="text" 
                      placeholder="Ej: FACT-9908" 
                      value={purchaseInvoiceNum}
                      onChange={(e) => setPurchaseInvoiceNum(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Producto</label>
                    <select 
                      value={purchaseProdId} 
                      onChange={(e) => setPurchaseProdId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Seleccionar Producto...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stock Actual: {p.stock})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Cantidad Ingresada</label>
                    <input 
                      type="number" 
                      placeholder="Ej: 50" 
                      value={purchaseQty}
                      onChange={(e) => setPurchaseQty(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Costo Unitario ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="Ej: 12.50" 
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button 
                    onClick={addItemToPurchaseCart}
                    type="button"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                  >
                    + Agregar Ítem
                  </button>
                </div>

                {purchaseCart.length > 0 && (
                  <div className="mt-4 border-t border-slate-700 pt-4">
                    <table className="w-full text-left text-sm text-slate-300 mb-4">
                      <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                        <tr>
                          <th className="p-2.5">Producto</th>
                          <th className="p-2.5">Cantidad</th>
                          <th className="p-2.5">Costo Unit ($)</th>
                          <th className="p-2.5">Subtotal ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseCart.map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-700">
                            <td className="p-2.5">{item.name}</td>
                            <td className="p-2.5">{item.quantity}</td>
                            <td className="p-2.5">${item.unit_cost.toFixed(2)}</td>
                            <td className="p-2.5">${(item.quantity * item.unit_cost).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-bold text-white">
                        Total Compra: ${purchaseCart.reduce((sum, i) => sum + (i.quantity * i.unit_cost), 0).toFixed(2)}
                      </span>
                      <button 
                        onClick={handleRegisterPurchase}
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm"
                      >
                        Procesar Compra y Sumar Stock
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-white">Historial de Compras Recientes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                      <tr>
                        <th className="p-3">N° Factura</th>
                        <th className="p-3">Proveedor</th>
                        <th className="p-3">Monto ($)</th>
                        <th className="p-3">Tasa Hist. (Bs)</th>
                        <th className="p-3">Monto (Bs)</th>
                        <th className="p-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Purchases.map((p) => (
                        <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="p-3 font-mono text-blue-400">{p.supplier_invoice_number || 'N/A'}</td>
                          <td className="p-3 font-medium text-white">{p.suppliers?.name || 'Proveedor General'}</td>
                          <td className="p-3 font-bold text-emerald-400">${Number(p.total).toFixed(2)}</td>
                          <td className="p-3">Bs. {Number(p.exchange_rate).toFixed(2)}</td>
                          <td className="p-3">Bs. {(Number(p.total) * Number(p.exchange_rate)).toFixed(2)}</td>
                          <td className="p-3 text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString('es-VE')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentView === 'cxp' && (
            <div className="space-y-8">
              <header className="border-b border-slate-800 pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Cuentas por Pagar (CxP Proveedores)</h2>
                  <p className="text-sm text-slate-400">Control de facturas a crédito, saldos pendientes y registro de abonos a proveedores</p>
                </div>
              </header>

              {(() => {
                const comprasPendientes = Purchases.filter(p => {
                  const total = Number(p.total || 0);
                  const pagado = Number(p.amount_paid || 0);
                  const saldo = total - pagado;
                  return saldo > 0.01;
                });

                const totalDeudaUSD = comprasPendientes.reduce((sum, p) => {
                  const total = Number(p.total || 0);
                  const pagado = Number(p.amount_paid || 0);
                  return sum + (total - pagado);
                }, 0);

                const totalAbonadoUSD = supplierPayments.reduce((sum, sp) => sum + Number(sp.amount || 0), 0);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Deuda Pendiente (CxP)</span>
                      <p className="text-3xl font-extrabold text-rose-400 mt-2">${totalDeudaUSD.toFixed(2)}</p>
                      <p className="text-xs text-slate-400 mt-1">Equivalente a: <strong className="text-white">Bs. {(totalDeudaUSD * currentRate).toFixed(2)}</strong></p>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Facturas Pendientes</span>
                      <p className="text-3xl font-extrabold text-amber-400 mt-2">{comprasPendientes.length}</p>
                      <p className="text-xs text-slate-400 mt-1">Facturas con saldo a favor del proveedor</p>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Abonos Históricos</span>
                      <p className="text-3xl font-extrabold text-emerald-400 mt-2">${totalAbonadoUSD.toFixed(2)}</p>
                      <p className="text-xs text-slate-400 mt-1">Monto total pagado a proveedores</p>
                    </div>
                  </div>
                );
              })()}

              {selectedPurchaseForPay && (
                <div className="bg-slate-800 border-2 border-blue-500/50 p-6 rounded-xl space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                    <h3 className="text-lg font-bold text-white">
                      Registrar Abono a Factura <span className="text-blue-400">#{selectedPurchaseForPay.supplier_invoice_number || 'N/A'}</span>
                    </h3>
                    <button onClick={() => setSelectedPurchaseForPay(null)} className="text-slate-400 hover:text-white text-sm font-bold px-3 py-1 rounded bg-slate-700">
                      ✕ Cancelar
                    </button>
                  </div>

                  {(() => {
                    const saldoPendiente = Number(selectedPurchaseForPay.total || 0) - Number(selectedPurchaseForPay.amount_paid || 0);
                    return (
                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!tenant?.id) return;
                          const montoAbono = Number(cxpPaymentData.amount);
                          if (montoAbono <= 0 || montoAbono > saldoPendiente + 0.01) {
                            return alert('El monto del abono debe ser mayor a $0 y no superar el saldo pendiente.');
                          }

                          const nuevoMontoPagado = Number(selectedPurchaseForPay.amount_paid || 0) + montoAbono;
                          const nuevoEstado = nuevoMontoPagado >= Number(selectedPurchaseForPay.total) - 0.01 ? 'Paid' : 'Partial';

                          const { error: errPay } = await supabase.from('supplier_payments').insert([{
                            tenant_id: tenant.id,
                            purchase_id: selectedPurchaseForPay.id,
                            supplier_id: selectedPurchaseForPay.supplier_id || null,
                            amount: montoAbono,
                            exchange_rate: currentRate,
                            payment_method: cxpPaymentData.payment_method,
                            reference_number: cxpPaymentData.reference_number,
                            notes: cxpPaymentData.notes
                          }]);
                          if (errPay) return alert('Error al procesar el pago: ' + errPay.message);

                          const { error: errPur } = await supabase.from('purchases').update({
                            amount_paid: nuevoMontoPagado,
                            payment_status: nuevoEstado
                          }).eq('id', selectedPurchaseForPay.id);

                          if (!errPur) {
                            alert('¡Abono registrado con éxito!');
                            setSelectedPurchaseForPay(null);
                            setCxpPaymentData({ amount: 0, payment_method: 'Transferencia', reference_number: '', notes: '' });
                            fetchAllData(tenant.id);
                          } else {
                            alert('Error al actualizar saldo de la compra: ' + errPur.message);
                          }
                        }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm"
                      >
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 col-span-3 flex justify-between items-center">
                          <div>
                            <span className="text-xs text-slate-400 block">Proveedor: <strong className="text-white">{selectedPurchaseForPay.suppliers?.name || 'Proveedor General'}</strong></span>
                            <span className="text-xs text-slate-400 block">Total Factura: <strong className="text-white">${Number(selectedPurchaseForPay.total).toFixed(2)}</strong></span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block uppercase font-semibold">Saldo Pendiente Actual</span>
                            <span className="text-xl font-extrabold text-rose-400">${saldoPendiente.toFixed(2)}</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto a Abonar ($)</label>
                          <input 
                            required 
                            type="number" 
                            step="0.01" 
                            max={saldoPendiente}
                            value={cxpPaymentData.amount || ''} 
                            onChange={e => setCxpPaymentData({...cxpPaymentData, amount: Number(e.target.value)})} 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold" 
                            placeholder={`Ej: ${saldoPendiente.toFixed(2)}`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Método de Pago</label>
                          <select value={cxpPaymentData.payment_method} onChange={e => setCxpPaymentData({...cxpPaymentData, payment_method: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                            <option value="Transferencia">Transferencia Bancaria</option>
                            <option value="Pago Móvil">Pago Móvil</option>
                            <option value="Zelle">Zelle</option>
                            <option value="Efectivo">Efectivo ($ / Bs)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nº Referencia / Confirmación</label>
                          <input type="text" value={cxpPaymentData.reference_number} onChange={e => setCxpPaymentData({...cxpPaymentData, reference_number: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Ej: REF-994821" />
                        </div>

                        <div className="md:col-span-3 flex justify-end gap-3 pt-2">
                          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg transition-colors">
                            Confirmar y Registrar Abono
                          </button>
                        </div>
                      </form>
                    );
                  })()}
                </div>
              )}

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl space-y-4">
                <h3 className="text-lg font-semibold text-white">Listado de Facturas de Compras y Cuentas por Pagar</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                      <tr>
                        <th className="p-3">Factura Nº</th>
                        <th className="p-3">Proveedor</th>
                        <th className="p-3">Monto Total ($)</th>
                        <th className="p-3">Monto Pagado ($)</th>
                        <th className="p-3 text-rose-400">Saldo Pendiente ($)</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Purchases.map((p) => {
                        const total = Number(p.total || 0);
                        const pagado = Number(p.amount_paid || 0);
                        const saldo = total - pagado;
                        const status = p.payment_status || (saldo <= 0 ? 'Paid' : 'Pending');

                        return (
                          <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-3 font-mono text-blue-400">{p.supplier_invoice_number || 'N/A'}</td>
                            <td className="p-3 font-medium text-white">{p.suppliers?.name || 'Proveedor General'}</td>
                            <td className="p-3">${total.toFixed(2)}</td>
                            <td className="p-3 text-emerald-400">${pagado.toFixed(2)}</td>
                            <td className="p-3 font-bold text-rose-400">${Math.max(0, saldo).toFixed(2)}</td>
                            <td className="p-3">
                              {status === 'Paid' ? (
                                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Pagada</span>
                              ) : status === 'Partial' ? (
                                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Parcial</span>
                              ) : (
                                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Pendiente</span>
                              )}
                            </td>
                            <td className="p-3">
                              {saldo > 0.01 && (
                                <button 
                                  onClick={() => {
                                    setSelectedPurchaseForPay(p);
                                    setCxpPaymentData({ amount: saldo, payment_method: 'Transferencia', reference_number: '', notes: '' });
                                  }}
                                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  + Abonar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentView === 'analytics' && (
            <div className="space-y-6">
              <header className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Análisis de Resultados & Punto de Equilibrio</h2>
                  <p className="text-sm text-slate-400">Diagnóstico financiero en tiempo real de rentabilidad, márgenes y metas operativas</p>
                </div>
              </header>

              {(() => {
                const totalVentas = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
                const totalGastos = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
                const totalNomina = payroll.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
                const egresosFijosTotales = totalGastos + totalNomina;

                let totalCostoVentas = 0;

                invoices.forEach(inv => {
                  if (inv.invoice_items && Array.isArray(inv.invoice_items) && inv.invoice_items.length > 0) {
                    inv.invoice_items.forEach((item: any) => {
                      const prod = products.find(p => p.id === item.product_id);
                      const costoUnitario = prod ? Number(prod.cost || 0) : 0;
                      totalCostoVentas += costoUnitario * Number(item.quantity || 0);
                    });
                  } 
                  else if (inv.product_id) {
                    const prod = products.find(p => p.id === inv.product_id);
                    const costoUnitario = prod ? Number(prod.cost || 0) : 0;
                    totalCostoVentas += costoUnitario * Number(inv.quantity || 1);
                  }
                  else {
                    const productosConCosto = products.filter(p => Number(p.price) > 0 && Number(p.cost) > 0);
                    if (productosConCosto.length > 0) {
                      const costoPromedioPonderado = productosConCosto.reduce((acc, p) => acc + (Number(p.cost) / Number(p.price)), 0) / productosConCosto.length;
                      totalCostoVentas += Number(inv.total || 0) * costoPromedioPonderado;
                    }
                  }
                });

                const utilidadBruta = totalVentas - totalCostoVentas;
                const utilidadNetaReal = utilidadBruta - egresosFijosTotales;

                const targetBreakEven = Number(tenant?.break_even_target || 2000);
                const porcentajeAlcanzado = targetBreakEven > 0 ? Math.min(Math.round((totalVentas / targetBreakEven) * 100), 100) : 0;
                const superado = totalVentas >= targetBreakEven;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-bold text-white">Meta de Punto de Equilibrio Mensual</h3>
                          <p className="text-xs text-slate-400">
                            {superado 
                              ? '🎉 ¡Enhorabuena! Has superado el punto de equilibrio en ventas.' 
                              : `⚠️ Te faltan $${(targetBreakEven - totalVentas).toFixed(2)} en ventas para cubrir la meta fija.`}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${superado ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {porcentajeAlcanzado}% Alcanzado
                        </span>
                      </div>

                      <div className="w-full bg-slate-900 rounded-full h-4 border border-slate-700 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${superado ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${porcentajeAlcanzado}%` }}
                        ></div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center pt-2">
                        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
                          <span className="text-[10px] text-slate-400 block uppercase">Ventas Total</span>
                          <span className="text-sm font-bold text-emerald-400">${totalVentas.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
                          <span className="text-[10px] text-slate-400 block uppercase">Costo Ventas (COGS)</span>
                          <span className="text-sm font-bold text-amber-400">${totalCostoVentas.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
                          <span className="text-[10px] text-slate-400 block uppercase">Gastos + Nómina</span>
                          <span className="text-sm font-bold text-rose-400">${egresosFijosTotales.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
                          <span className="text-[10px] text-slate-400 block uppercase">Meta Fija</span>
                          <span className="text-sm font-bold text-white">${targetBreakEven.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Utilidad Neta Real</h3>
                        <p className={`text-3xl font-extrabold mt-2 ${utilidadNetaReal >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                          ${utilidadNetaReal.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Equivalente a: <strong className="text-white">Bs. {(utilidadNetaReal * currentRate).toFixed(2)}</strong>
                        </p>
                      </div>
                      <div className="border-t border-slate-700 pt-3 mt-4 text-xs text-slate-400">
                        💡 Fórmula: Ventas - Costo Mercancía - Gastos - Nómina (Tasa BCV: Bs. {currentRate.toFixed(2)}).
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-white">Análisis de Margen de Ganancia por Producto</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                      <tr>
                        <th className="p-3">Producto</th>
                        <th className="p-3">Costo ($)</th>
                        <th className="p-3">Precio Venta ($)</th>
                        <th className="p-3">Ganancia / Unid ($)</th>
                        <th className="p-3">Margen (%)</th>
                        <th className="p-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => {
                        const cost = Number(p.cost || 0);
                        const price = Number(p.price || 0);
                        const profit = price - cost;
                        const margin = price > 0 ? ((profit / price) * 100) : 0;

                        return (
                          <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-3 font-medium text-white">{p.name}</td>
                            <td className="p-3">${cost.toFixed(2)}</td>
                            <td className="p-3 font-semibold text-emerald-400">${price.toFixed(2)}</td>
                            <td className="p-3">${profit.toFixed(2)}</td>
                            <td className="p-3 font-bold">{margin.toFixed(1)}%</td>
                            <td className="p-3">
                              {margin < 15 ? (
                                <span className="px-2 py-1 text-xs rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">Margen Bajo</span>
                              ) : (
                                <span className="px-2 py-1 text-xs rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Saludable</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentView === 'payroll' && (
            <div className="space-y-8">
              <header className="border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold text-white">Gestión de Nómina y Personal</h2>
                <p className="text-sm text-slate-400">Administra empleados, asignación de cargos, sueldos, comisiones y recibos de pago</p>
              </header>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl space-y-4">
                <h3 className="text-lg font-semibold text-white">Registrar Nuevo Empleado</h3>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!tenant?.id) return;
                    const { error } = await supabase.from('employees').insert([{ ...newEmp, tenant_id: tenant.id }]);
                    if (!error) {
                      alert('Empleado guardado con éxito');
                      setNewEmp({ first_name: '', last_name: '', national_id: '', phone: '', position: '', base_salary: 0, payment_frequency: 'Quincenal' });
                      fetchAllData(tenant.id);
                    } else {
                      alert('Error al guardar empleado: ' + error.message);
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre</label>
                    <input required type="text" value={newEmp.first_name} onChange={e => setNewEmp({...newEmp, first_name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Ej: Juan" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Apellido</label>
                    <input required type="text" value={newEmp.last_name} onChange={e => setNewEmp({...newEmp, last_name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Ej: Pérez" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">C.I. / Identificación</label>
                    <input required type="text" value={newEmp.national_id} onChange={e => setNewEmp({...newEmp, national_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Ej: V-12345678" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Cargo</label>
                    <input required type="text" value={newEmp.position} onChange={e => setNewEmp({...newEmp, position: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Ej: Vendedor / Encargado" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Sueldo Base ($)</label>
                    <input required type="number" step="0.01" value={newEmp.base_salary} onChange={e => setNewEmp({...newEmp, base_salary: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="150.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Frecuencia de Pago</label>
                    <select value={newEmp.payment_frequency} onChange={e => setNewEmp({...newEmp, payment_frequency: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                      <option value="Semanal">Semanal</option>
                      <option value="Quincenal">Quincenal</option>
                      <option value="Mensual">Mensual</option>
                    </select>
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
                      + Guardar Empleado
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl space-y-4">
                <h3 className="text-lg font-semibold text-white">Procesar Recibo de Pago de Nómina</h3>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!tenant?.id || !newPayrollPay.employee_id) return alert('Selecciona un empleado');
                    
                    const totalNeto = (Number(newPayrollPay.base_salary_paid) + Number(newPayrollPay.bonuses) + Number(newPayrollPay.commissions)) - Number(newPayrollPay.deductions);
                    
                    const empObj = employees.find(emp => emp.id === newPayrollPay.employee_id);
                    const empName = empObj ? `${empObj.first_name} ${empObj.last_name}` : 'Empleado';

                    const { error } = await supabase.from('payroll_payments').insert([{
                      tenant_id: tenant.id,
                      employee_id: newPayrollPay.employee_id,
                      employee_name: empName,
                      role_description: empObj?.position || 'N/A',
                      amount: totalNeto,
                      exchange_rate: currentRate,
                      payment_period: newPayrollPay.payment_period || 'Pago Regular',
                      base_salary_paid: newPayrollPay.base_salary_paid,
                      bonuses: newPayrollPay.bonuses,
                      commissions: newPayrollPay.commissions,
                      deductions: newPayrollPay.deductions,
                      payment_method: newPayrollPay.payment_method
                    }]);

                    if (!error) {
                      alert('¡Pago de nómina procesado con éxito!');
                      setNewPayrollPay({ employee_id: '', base_salary_paid: 0, bonuses: 0, commissions: 0, deductions: 0, payment_period: '', payment_method: 'Transferencia' });
                      fetchAllData(tenant.id);
                    } else {
                      alert('Error al registrar pago: ' + error.message);
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Empleado</label>
                    <select 
                      value={newPayrollPay.employee_id} 
                      onChange={e => {
                        const selectedEmp = employees.find(emp => emp.id === e.target.value);
                        setNewPayrollPay({
                          ...newPayrollPay, 
                          employee_id: e.target.value,
                          base_salary_paid: selectedEmp ? selectedEmp.base_salary : 0
                        });
                      }} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">Seleccionar Empleado...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} - {emp.position} (${emp.base_salary})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Sueldo Base a Pagar ($)</label>
                    <input type="number" step="0.01" value={newPayrollPay.base_salary_paid} onChange={e => setNewPayrollPay({...newPayrollPay, base_salary_paid: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Bonos / Incentivos ($)</label>
                    <input type="number" step="0.01" value={newPayrollPay.bonuses} onChange={e => setNewPayrollPay({...newPayrollPay, bonuses: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Comisiones por Ventas ($)</label>
                    <input type="number" step="0.01" value={newPayrollPay.commissions} onChange={e => setNewPayrollPay({...newPayrollPay, commissions: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1 text-rose-400">Deducciones / Adelantos ($)</label>
                    <input type="number" step="0.01" value={newPayrollPay.deductions} onChange={e => setNewPayrollPay({...newPayrollPay, deductions: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-rose-300 font-bold" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Período / Detalle</label>
                    <input type="text" value={newPayrollPay.payment_period} onChange={e => setNewPayrollPay({...newPayrollPay, payment_period: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Ej: 1era Quincena Octubre 2026" />
                  </div>

                  <div className="md:col-span-3 bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-slate-400 block">Monto Neto a Transferir / Entregar</span>
                      <span className="text-2xl font-bold text-emerald-400">
                        ${((Number(newPayrollPay.base_salary_paid) + Number(newPayrollPay.bonuses) + Number(newPayrollPay.commissions)) - Number(newPayrollPay.deductions)).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 ml-3">
                        (Bs. {(((Number(newPayrollPay.base_salary_paid) + Number(newPayrollPay.bonuses) + Number(newPayrollPay.commissions)) - Number(newPayrollPay.deductions)) * currentRate).toFixed(2)})
                      </span>
                    </div>
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
                      Procesar Pago de Nómina
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl space-y-4">
                <h3 className="text-lg font-semibold text-white">Historial de Recibos y Pagos de Nómina</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                      <tr>
                        <th className="p-3">Empleado</th>
                        <th className="p-3">Cargo</th>
                        <th className="p-3">Sueldo ($)</th>
                        <th className="p-3">Bonos/Comis. ($)</th>
                        <th className="p-3 text-rose-400">Deducción ($)</th>
                        <th className="p-3">Neto Pagado ($)</th>
                        <th className="p-3">Período</th>
                        <th className="p-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payroll.map((pay) => (
                        <tr key={pay.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="p-3 font-medium text-white">{pay.employee_name}</td>
                          <td className="p-3 text-slate-400">{pay.role_description}</td>
                          <td className="p-3">${Number(pay.base_salary_paid || 0).toFixed(2)}</td>
                          <td className="p-3 text-emerald-400">+${(Number(pay.bonuses || 0) + Number(pay.commissions || 0)).toFixed(2)}</td>
                          <td className="p-3 text-rose-400">-${Number(pay.deductions || 0).toFixed(2)}</td>
                          <td className="p-3 font-bold text-white">${Number(pay.amount).toFixed(2)}</td>
                          <td className="p-3 text-xs text-slate-400">{pay.payment_period}</td>
                          <td className="p-3 text-xs text-slate-400">{new Date(pay.created_at).toLocaleDateString('es-VE')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentView === 'clients' && (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Clientes</h2>
                  <p className="text-sm text-slate-400">Directorio de clientes.</p>
                </div>
                <button onClick={handleExportClients} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
                  📊 Exportar Clientes
                </button>
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
          )}

          {currentView === 'cxc' && (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Cuentas por Cobrar (CxC)</h2>
                  <p className="text-sm text-slate-400">Control de créditos y abonos.</p>
                </div>
                <button onClick={handleExportCxC} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
                  📊 Exportar CxC
                </button>
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
          )}

          {currentView === 'configuracion' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">⚙️ Configuración del Sistema</h2>
                  <p className="text-slate-400 text-sm">Administración general, usuarios, perfiles y parámetros del negocio.</p>
                </div>
              </div>

              <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
                {[
                  { id: 'empresa', label: '🏢 Empresa', desc: 'Datos fiscales' },
                  { id: 'tickets', label: '🖨️ Tickets', desc: 'Plantilla fiscal' },
                  { id: 'usuarios', label: '👥 Usuarios', desc: 'Personal autorizado' },
                  { id: 'roles', label: '🎭 Roles', desc: 'Perfiles y permisos' },
                  { id: 'pagos', label: '💳 Métodos de Pago', desc: 'Formas de cobro' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveConfigTab(tab.id as any)}
                    className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                      activeConfigTab === tab.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeConfigTab === 'empresa' && (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 max-w-2xl">
                  <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-3">Perfil de la Empresa</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Nombre / Razón Social</label>
                      <input
                        type="text"
                        value={tenant?.name || ''}
                        disabled
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Días de Crédito por Defecto</label>
                      <input
                        type="number"
                        value={tenantSettings.default_credit_days || 5}
                        onChange={(e) => setTenantSettings({ ...tenantSettings, default_credit_days: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm"
                  >
                    Guardar Cambios
                  </button>
                </div>
              )}

              {activeConfigTab === 'tickets' && (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 max-w-2xl">
                  <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-3">Personalización de Tickets / Facturas</h3>
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Encabezado del Ticket</label>
                    <input
                      type="text"
                      value={tenantSettings.ticket_header || ''}
                      onChange={(e) => setTenantSettings({ ...tenantSettings, ticket_header: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Pie de Página / Mensaje Final</label>
                    <input
                      type="text"
                      value={tenantSettings.ticket_footer || ''}
                      onChange={(e) => setTenantSettings({ ...tenantSettings, ticket_footer: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white"
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-2">
                    <input
                      type="checkbox"
                      id="showBcv"
                      checked={tenantSettings.ticket_show_bcv ?? true}
                      onChange={(e) => setTenantSettings({ ...tenantSettings, ticket_show_bcv: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                    />
                    <label htmlFor="showBcv" className="text-sm text-slate-200">Mostrar equivalencia en Bolívares y Tasa BCV</label>
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm"
                  >
                    Guardar Configuración
                  </button>
                </div>
              )}

              {activeConfigTab === 'usuarios' && (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-3">Usuarios Autorizados</h3>
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="p-3">Usuario</th>
                        <th className="p-3">Rol</th>
                        <th className="p-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      <tr>
                        <td className="p-3 font-medium text-white">Diego Morales</td>
                        <td className="p-3"><span className="bg-blue-900/50 text-blue-400 px-2.5 py-1 rounded-full text-xs font-bold">Administrador</span></td>
                        <td className="p-3"><span className="text-emerald-400 font-bold">Activo</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeConfigTab === 'roles' && (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-6">
                  <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-3">Perfiles y Roles Granulares</h3>
                  <div className="flex gap-3 max-w-md">
                    <input
                      type="text"
                      placeholder="Ej: Contabilidad, Logística, Vendedor..."
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white"
                    />
                    <button
                      onClick={handleCreateRole}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm"
                    >
                      + Crear Rol
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customRoles.map((role) => (
                      <div key={role.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
                        <h4 className="font-bold text-white text-base">{role.role_name}</h4>
                        <p className="text-xs text-slate-400">Permisos asignados:</p>
                        <div className="flex flex-wrap gap-1">
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">Ventas</span>
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">Inventario</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeConfigTab === 'pagos' && (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 max-w-2xl">
                  <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-3">Métodos y Formas de Pago Aceptados</h3>
                  <div className="space-y-2">
                    {['Efectivo USD', 'Pago Móvil', 'Zelle', 'Efectivo Bs', 'Transferencia Bancaria', 'Binance Pay'].map((method) => {
                      const isChecked = tenantSettings.allowed_payment_methods?.includes(method);
                      return (
                        <label key={method} className="flex items-center space-x-3 bg-slate-900 p-3 rounded-xl border border-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = tenantSettings.allowed_payment_methods || [];
                              const updated = e.target.checked
                                ? [...current, method]
                                : current.filter((m: string) => m !== method);
                              setTenantSettings({ ...tenantSettings, allowed_payment_methods: updated });
                            }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700"
                          />
                          <span className="text-sm font-medium text-white">{method}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm"
                  >
                    Guardar Métodos de Pago
                  </button>
                </div>
              )}
            </div>
          )}

          {currentView === 'ventas' && (
            <div className="space-y-8">
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
                      <th className="p-4">NRO. FACTURA</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Total ($)</th>
                      <th className="p-4">Total (Bs.)</th>
                      <th className="p-4">Condición</th>
                      <th className="p-4">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">Sin facturas.</td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-700/25">
                          <td className="p-4 font-mono text-blue-400">{inv.invoice_number || `FACT-${String(inv.id).slice(0, 4).toUpperCase()}`}</td>
                          <td className="p-4 font-medium text-white">{inv.clients?.name || 'Cliente General'}</td>
                          <td className="p-4 text-emerald-400 font-semibold">${Number(inv.total).toFixed(2)}</td>
                          <td className="p-4 text-slate-300">Bs. {(Number(inv.total) * currentRate).toFixed(2)}</td>
                          <td className="p-4 uppercase text-xs font-semibold">{inv.payment_term || 'contado'}</td>
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
            </div>
          )}

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
                    <p className="text-xs text-blue-400 font-bold font-mono my-1">
                      Nro. Factura: {selectedInvoiceDetail?.invoice_number || `FACT-${String(selectedInvoiceDetail?.id || '').slice(0, 4).toUpperCase()}`}
                    </p>
                    <p className="text-slate-400">Tasa BCV: Bs. {currentRate.toFixed(2)}</p>
                  </div>

                  <div className="space-y-1 text-slate-300">
                    <p><strong>Cliente:</strong> {selectedInvoiceDetail.clients?.name}</p>
                  </div>

                  <div className="border-t border-b border-slate-800 py-3 my-2 space-y-1">
                    {invoiceItemsList.map((item: any) => {
                      const subUSD = Number(item.subtotal || item.unit_price * item.quantity || 0);
                      const subBS = subUSD * currentRate;
                      return (
                        <div key={item.id} className="flex justify-between py-1">
                          <span>{item.quantity}x {item.products?.name}</span>
                          <span className="text-emerald-400">${subUSD.toFixed(2)} (Bs. {subBS.toFixed(2)})</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-sm">
                      <strong>TOTAL: </strong>
                      <span className="text-emerald-400 font-bold text-base">${Number(selectedInvoiceDetail.total || 0).toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-slate-300">
                      Bs. {(Number(selectedInvoiceDetail.total || 0) * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={handlePrintTicket} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm">🖨️ Imprimir</button>
                  <button onClick={() => setSelectedInvoiceDetail(null)} className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-4 rounded-lg text-sm">Cerrar</button>
                </div>
              </div>
            </div>
          )}
        </main>
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