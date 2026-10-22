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
  const [currentView, setCurrentView] = useState<'dashboard' | 'inventory' | 'drivers' | 'clients' | 'invoices' | 'cxc' | 'expenses' | 'analytics' | 'payroll' | 'purchases' | 'cxp' | 'configuracion' | 'ventas' | 'sellers' | 'tracking' | 'bancos'>('dashboard');
const [theme, setTheme] = useState<'dark' | 'light'>('dark');
const isLight = theme === 'light';

const [countryPackage, setCountryPackage] = useState('VE');

const [showNewDriverModal, setShowNewDriverModal] = useState(false);
const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
const [showProcessPurchaseModal, setShowProcessPurchaseModal] = useState(false);
const [purchasesHistory, setPurchasesHistory] = useState<any[]>([]);

const [editingSeller, setEditingSeller] = useState<any>(null);
const [editName, setEditName] = useState('');
const [editEmail, setEditEmail] = useState('');
const [editQuota, setEditQuota] = useState('');
const [editRole, setEditRole] = useState('seller');
const [editStatus, setEditStatus] = useState('active');
const [editBrands, setEditBrands] = useState('');
const [editPassword, setEditPassword] = useState('');

const [editingDriver, setEditingDriver] = useState<any>(null);
const [editDriverName, setEditDriverName] = useState('');
const [editDriverVehicle, setEditDriverVehicle] = useState('');
const [editDriverEmail, setEditDriverEmail] = useState('');
const [editDriverPassword, setEditDriverPassword] = useState('');
// 1. Primero asegúrate de que el estado 'sellers' esté declarado:
const [sellers, setSellers] = useState<any[]>([]);

// 2. Justo debajo de 'sellers', ya puedes declarar 'driversList':
const driversList = sellers.filter((p: any) => p.role === 'driver' || p.role === 'despachador' || p.role === 'chofer');


const [supplierName, setSupplierName] = useState('');
const [supplierRif, setSupplierRif] = useState('');
const [supplierPhone, setSupplierPhone] = useState('');
const [supplierContact, setSupplierContact] = useState('');
const [supplierAddress, setSupplierAddress] = useState('');

const [purchaseSupplierId, setPurchaseSupplierId] = useState('');
const [purchaseProductId, setPurchaseProductId] = useState('');
const [purchaseQty, setPurchaseQty] = useState('');
const [purchaseIva, setPurchaseIva] = useState('16');
const [purchaseNotes, setPurchaseNotes] = useState('');

const [trackingType, setTrackingType] = useState<'seller' | 'driver'>('seller');

const [driverTab, setDriverTab] = useState<'list' | 'routes'>('list');
const [newDriverName, setNewDriverName] = useState('');
const [newDriverEmail, setNewDriverEmail] = useState('');
const [newDriverPassword, setNewDriverPassword] = useState('');
const [newDriverVehicle, setNewDriverVehicle] = useState('');
const [selectedDriverForRoute, setSelectedDriverForRoute] = useState('');
const [selectedInvoicesForRoute, setSelectedInvoicesForRoute] = useState<string[]>([]);
const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');


const getTaxIdLabel = (country = 'VE') => {
  switch (country) {
    case 'CO': return 'NIT';
    case 'AR': return 'CUIT';
    case 'CL': return 'RUT';
    case 'PE': return 'RUC';
    case 'MX': return 'RFC';
    case 'VE':
    default: return 'RIF';
  }
};

const handleAddSupplier = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!profile?.tenant_id) return;
  try {
    const { error } = await supabase.from('suppliers').insert([{
      tenant_id: profile.tenant_id,
      name: supplierName,
      rif: supplierRif,
      phone: supplierPhone,
      contact_person: supplierContact,
      address: supplierAddress
    }]);
    if (error) throw error;
    setShowAddSupplierModal(false);
    setSupplierName(''); setSupplierRif(''); setSupplierPhone(''); setSupplierContact(''); setSupplierAddress('');
    fetchAllData(profile.tenant_id);
    alert('¡Proveedor registrado con éxito!');
  } catch (err: any) {
    alert('Error al registrar proveedor: ' + err.message);
  }
};

const [purchaseItems, setPurchaseItems] = useState<any[]>([]);



const [tempProductId, setTempProductId] = useState('');
const [tempQty, setTempQty] = useState('');
const [tempCost, setTempCost] = useState('');

  // --- FUNCIONES LÓGICAS DE COMPRAS ---
  const handleAddItemToPurchase = () => {
    if (!tempProductId || !tempQty || !tempCost) {
      alert('Seleccione producto, cantidad y costo');
      return;
    }
    const prod = products.find((p: any) => p.id === tempProductId);
    if (!prod) return;

    setPurchaseItems((prev) => [
      ...prev,
      {
        productId: tempProductId,
        productName: prod.name,
        qty: parseFloat(tempQty),
        cost: parseFloat(tempCost)
      }
    ]);
    setTempProductId('');
    setTempQty('');
    setTempCost('');
  };

  const handleRemovePurchaseItem = (index: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotalPurchaseAmount = () => {
    const subtotal = purchaseItems.reduce((acc, item) => acc + (item.qty * item.cost), 0);
    const ivaPercentage = parseFloat(purchaseIva) || 16;
    return subtotal * (1 + ivaPercentage / 100);
  };

  const handleProcessPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !purchaseSupplierId || purchaseItems.length === 0) {
      alert('Debe seleccionar un proveedor y agregar al menos un producto.');
      return;
    }

    const sup = suppliers.find((s: any) => s.id === purchaseSupplierId);
    const totalAmount = calculateTotalPurchaseAmount();

    try {
      const { error: purchaseError } = await supabase.from('purchases_history').insert([{
        tenant_id: profile.tenant_id,
        supplier_id: purchaseSupplierId,
        supplier_name: sup?.name || 'Proveedor',
        invoice_number: purchaseInvoiceNum,
        total_amount: totalAmount,
        bcv_rate: currentRate,
        notes: purchaseNotes
      }]);
      if (purchaseError) throw purchaseError;

      for (const item of purchaseItems) {
        const prod = products.find((p: any) => p.id === item.productId);
        if (prod) {
          const newStock = (Number(prod.stock) || 0) + item.qty;
          await supabase.from('products').update({
            stock: newStock,
            cost: item.cost
          }).eq('id', item.productId);
        }
      }

      setShowProcessPurchaseModal(false);
      setPurchaseSupplierId('');
      setPurchaseInvoiceNum('');
      setPurchaseItems([]);
      setPurchaseNotes('');
      fetchAllData(profile.tenant_id);
      alert('¡Factura de compra registrada y stock actualizado con éxito!');
    } catch (err: any) {
      alert('Error al procesar la factura: ' + err.message);
    }
  };


// Estados de modales y filtros de clientes
const [showAddClientModal, setShowAddClientModal] = useState(false);
const [clientSearch, setClientSearch] = useState('');
const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');

// Nuevos campos profesionales para clientes
const [clientGps, setClientGps] = useState('');
const [clientRoute, setClientRoute] = useState('Ruta Principal');
const [clientCreditLimit, setClientCreditLimit] = useState('500');
const [clientMinSales, setClientMinSales] = useState('100');

const [selectedProductDetails, setSelectedProductDetails] = useState<any>(null);
const [editingProduct, setEditingProduct] = useState<any>(null);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);

// Estado para controlar la visibilidad del modal de productos
const [showAddProductModal, setShowAddProductModal] = useState(false);

// Estados para los campos avanzados del producto
const [productCost, setProductCost] = useState('');
const [productIva, setProductIva] = useState('16.00');
const [productCategory, setProductCategory] = useState('');
const [productBrand, setProductBrand] = useState('');
const [productManufacturer, setProductManufacturer] = useState('');
const [productUnit, setProductUnit] = useState('Und');
const [productWeight, setProductWeight] = useState('0');
const [productReorder, setProductReorder] = useState('5');
const [productMinOrder, setProductMinOrder] = useState('1');
const [productMaxOrder, setProductMaxOrder] = useState('999999');
const [allowNegative, setAllowNegative] = useState(false);
const [allowDecimals, setAllowDecimals] = useState(false);
const [productStatus, setProductStatus] = useState('activo');
const [clientCode, setClientCode] = useState('');
const [editingClient, setEditingClient] = useState<any | null>(null);
const [editingQuotaSeller, setEditingQuotaSeller] = useState<any | null>(null);
const [newQuotaValue, setNewQuotaValue] = useState('');
const [showNewSellerModal, setShowNewSellerModal] = useState(false);
const [newSellerName, setNewSellerName] = useState('');
const [newSellerEmail, setNewSellerEmail] = useState('');
const [newSellerPassword, setNewSellerPassword] = useState('');
const [newSellerQuota, setNewSellerQuota] = useState('1000');
const [loadingNewSeller, setLoadingNewSeller] = useState(false);

  const [purchaseCart, setPurchaseCart] = useState<any[]>([]);
  const [purchaseProdId, setPurchaseProdId] = useState('');
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

  // Estados Módulo de Bancos
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankTransactions, setBankTransactions] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [newBank, setNewBank] = useState({ bank_name: '', account_number: '', currency: 'USD', initial_balance: 0 });
  const [newTx, setNewTx] = useState({ description: '', reference_number: '', amount: '', type: 'ingreso' });

const [assignedSellerId, setAssignedSellerId] = useState('');

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

const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
const [showProcessPayrollModal, setShowProcessPayrollModal] = useState(false);

const [employeeName, setEmployeeName] = useState('');
const [employeeLastName, setEmployeeLastName] = useState('');
const [employeeCi, setEmployeeCi] = useState('');
const [employeeRole, setEmployeeRole] = useState('');
const [employeeSalary, setEmployeeSalary] = useState('');
const [employeeFrequency, setEmployeeFrequency] = useState('Quincenal');

const [payrollEmployeeId, setPayrollEmployeeId] = useState('');
const [payrollBaseSalary, setPayrollBaseSalary] = useState('');
const [payrollBonuses, setPayrollBonuses] = useState('0');
const [payrollCommissions, setPayrollCommissions] = useState('0');
const [payrollDeductions, setPayrollDeductions] = useState('0');
const [payrollPeriod, setPayrollPeriod] = useState('');
const [payrollBank, setPayrollBank] = useState('');

const handleAddEmployee = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!profile?.tenant_id) return;
  try {
    const { error } = await supabase.from('employees').insert([{
      tenant_id: profile.tenant_id,
      name: employeeName,
      first_name: employeeName,
      last_name: employeeLastName,
      ci: employeeCi,
      national_id: employeeCi,
      role: employeeRole,
      position: employeeRole, // <-- Cubrimos ambos nombres de columna para el cargo
      base_salary: parseFloat(employeeSalary) || 0,
      payment_frequency: employeeFrequency
    }]);
    
    if (error) throw error;
    
    setShowAddEmployeeModal(false);
    setEmployeeName(''); 
    setEmployeeLastName(''); 
    setEmployeeCi(''); 
    setEmployeeRole(''); 
    setEmployeeSalary('');
    
    fetchAllData(profile.tenant_id);
    alert('¡Empleado registrado con éxito!');
  } catch (err: any) {
    alert('Error al registrar empleado: ' + err.message);
  }

};
const handleSelectEmployeeForPayroll = (empId: string) => {
  setPayrollEmployeeId(empId);
  const emp = employees.find((e: any) => e.id === empId);
  if (emp) {
    setPayrollBaseSalary(emp.base_salary || 0);
  } else {
    setPayrollBaseSalary('');
  }
};

const handleProcessPayroll = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!profile?.tenant_id || !payrollEmployeeId) return;

  const emp = employees.find((e: any) => e.id === payrollEmployeeId);
  const netAmount = (parseFloat(payrollBaseSalary) || 0) + (parseFloat(payrollBonuses) || 0) + (parseFloat(payrollCommissions) || 0) - (parseFloat(payrollDeductions) || 0);

  try {
    const { error } = await supabase.from('payroll_history').insert([{
      tenant_id: profile.tenant_id,
      employee_id: payrollEmployeeId,
      employee_name: `${emp.name} ${emp.last_name}`,
      base_salary: parseFloat(payrollBaseSalary) || 0,
      bonuses: parseFloat(payrollBonuses) || 0,
      commissions: parseFloat(payrollCommissions) || 0,
      deductions: parseFloat(payrollDeductions) || 0,
      net_amount: netAmount,
      period: payrollPeriod,
      bank_name: payrollBank
    }]);

    if (error) throw error;
    setShowProcessPayrollModal(false);
    setPayrollEmployeeId(''); setPayrollBaseSalary(''); setPayrollBonuses('0'); setPayrollCommissions('0'); setPayrollDeductions('0'); setPayrollPeriod(''); setPayrollBank('');
    fetchAllData(profile.tenant_id);
    alert('¡Pago de nómina procesado y registrado con éxito!');
  } catch (err: any) {
    alert('Error al procesar nómina: ' + err.message);
  }
};

const [payrollHistory, setPayrollHistory]= useState<any[]>([]);

  const [newPayrollPay, setNewPayrollPay] = useState({
    employee_id: '',
    base_salary_paid: 0,
    bonuses: 0,
    commissions: 0,
    deductions: 0,
    payment_period: '',
    payment_method: 'Transferencia'
  });

  // Estados Configuración
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

const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setLoadingNewSeller(true);

    try {
      // 1. Crear el usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newSellerEmail,
        password: newSellerPassword,
      });

      if (authError) throw authError;
      const userId = authData.user?.id;

      if (!userId) throw new Error('No se pudo obtener el ID del usuario creado.');

      // 2. Insertar o actualizar su perfil en la tabla profiles con el rol 'seller'
      const { error: profileError } = await supabase.from('profiles').upsert([
        {
          id: userId,
          tenant_id: profile.tenant_id,
          full_name: newSellerName,
          role: 'seller',
          monthly_quota: parseFloat(newSellerQuota) || 1000,
        },
      ]);

      if (profileError) throw profileError;

      alert('¡Vendedor registrado con éxito! Ya puede iniciar sesión en /pos');
      setShowNewSellerModal(false);
      setNewSellerName('');
      setNewSellerEmail('');
      setNewSellerPassword('');
      setNewSellerQuota('1000');
      if (profile?.tenant_id) fetchAllData(profile.tenant_id);
    } catch (err: any) {
      alert('Error al registrar vendedor: ' + err.message);
    } finally {
      setLoadingNewSeller(false);
    }
  };

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

const fetchAllData = async (tenantId?: string) => {
  const targetTenant = tenantId || profile?.tenant_id;
  if (!targetTenant) return;

  // ✅ Asegúrate de usar 'targetTenant' aquí en lugar de 'tenantId':
  const { data: prodData } = await supabase.from('products').select('*').eq('tenant_id', targetTenant).order('created_at', { ascending: false });
  if (prodData) setProducts(prodData);

// 10. Vendedores / Usuarios
const { data: sellersData } = await supabase
  .from('profiles')
  .select('id, full_name, role, monthly_quota') // <-- Añadido monthly_quota
  .eq('tenant_id', tenantId);
if (sellersData) setSellers(sellersData);

    const { data: suppliersData } = await supabase.from('suppliers').select('*').eq('tenant_id', tenantId).order('name', { ascending: true });
    if (suppliersData) setSuppliers(suppliersData);

    const { data: clientData } = await supabase.from('clients').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (clientData) setClients(clientData);

    const { data: invData } = await supabase.from('invoices').select('*, clients(*)').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (invData) setInvoices(invData);

 // Cargar Historial de Nómina
const { data: payData, error: payError } = await supabase
  .from('payroll_history')
  .select('*')
  .order('created_at', { ascending: false });

if (payData) {
  setPayrollHistory(payData);
}

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

    const { data: bankData } = await supabase.from('bank_accounts').select('*').eq('tenant_id', tenantId);
    if (bankData) setBankAccounts(bankData);

    const { data: txData } = await supabase.from('bank_transactions').select('*, bank_accounts(bank_name)').eq('tenant_id', tenantId).order('transaction_date', { ascending: false });
    if (txData) setBankTransactions(txData);
  };

const handleUpdateQuota = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingQuotaSeller) return;

  try {
    const quotaNum = parseFloat(newQuotaValue);
    if (isNaN(quotaNum) || quotaNum < 0) return alert('Por favor ingresa un monto válido');

    const { error } = await supabase
      .from('profiles')
      .update({ monthly_quota: quotaNum })
      .eq('id', editingQuotaSeller.id);

    if (error) throw error;

    // Actualizar estado local de vendedores inmediatamente
    setSellers((prevSellers) =>
      prevSellers.map((s) =>
        s.id === editingQuotaSeller.id ? { ...s, monthly_quota: quotaNum } : s
      )
    );

    alert('¡Cuota de ventas actualizada con éxito!');
    setEditingQuotaSeller(null);
    setNewQuotaValue('');
    if (profile?.tenant_id) fetchAllData(profile.tenant_id);
  } catch (err: any) {
    alert('Error al actualizar la cuota: ' + err.message);
  }
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
        price: parseFloat(productPrice) || 0,
        cost: parseFloat(productCost) || 0,
        stock: allowDecimals ? parseFloat(productStock) : parseInt(productStock),
        iva: parseFloat(productIva) || 16.0,
        category: productCategory,
        brand: productBrand,
        manufacturer: productManufacturer,
        unit_measure: productUnit,
        weight_per_unit: parseFloat(productWeight) || 0,
        reorder_point: parseFloat(productReorder) || 5,
        min_order_qty: parseFloat(productMinOrder) || 1,
        max_order_qty: parseFloat(productMaxOrder) || 999999,
        allow_negative: allowNegative,
        allow_decimals: allowDecimals,
        is_active: productStatus,
      },
    ]);

    if (error) throw error;

    // Limpiar campos y cerrar modal
    setProductName('');
    setProductSku('');
    setProductPrice('');
    setProductCost('');
    setProductStock('');
    setShowAddProductModal(false);

    fetchAllData(profile.tenant_id);
    alert('¡Producto guardado exitosamente!');
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
        gps_location: clientGps, // <--- Nuevo
        route: clientRoute || 'Ruta Principal', // <--- Nuevo
        credit_limit: parseFloat(clientCreditLimit) || 0, // <--- Nuevo
        min_monthly_sales: parseFloat(clientMinSales) || 0, // <--- Nuevo
        assigned_seller_id: assignedSellerId || null,
      },
    ]);

    if (error) throw error;
    setClientName(''); setClientDoc(''); setClientEmail(''); setClientPhone(''); setClientAddress(''); setClientGps(''); setClientRoute('Ruta Principal'); setClientCreditLimit('500'); setClientMinSales('100'); setAssignedSellerId(''); setClientCode('');
    setShowAddClientModal(false); // Cierra el modal automáticamente
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
  // Configuración fiscal y monetaria automática según el país
  let initialTaxRate = 16.00;
  let initialExchangeRate = 1.00;

  switch (countryPackage) {
    case 'CO':
      initialTaxRate = 19.00;
      initialExchangeRate = 4100.00; // Tasa referencial local vs USD
      break;
    case 'AR':
      initialTaxRate = 21.00;
      initialExchangeRate = 1000.00;
      break;
    case 'CL':
      initialTaxRate = 19.00;
      initialExchangeRate = 950.00;
      break;
    case 'PE':
      initialTaxRate = 18.00;
      initialExchangeRate = 3.75;
      break;
    case 'MX':
      initialTaxRate = 16.00;
      initialExchangeRate = 17.50;
      break;
    case 'VE':
    default:
      initialTaxRate = 16.00;
      initialExchangeRate = 36.00;
      break;
  }

  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .insert([{ 
      name: companyName, 
      country: countryPackage,
      exchange_rate: initialExchangeRate,
      default_tax: initialTaxRate
    }])
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
    if (!products || products.length === 0) {
      alert('No hay productos disponibles para exportar.');
      return;
    }

    const formattedData = products.map((prod) => {
      const price = Number(prod.price || 0);
      const cost = Number(prod.cost || 0);
      const stock = Number(prod.stock || 0);
      const iva = Number(prod.iva || 16);
      const weight = Number(prod.weight_per_unit || 0);
      const totalWeight = stock * weight;
      
      const priceVes = price * currentRate;
      const costVes = cost * currentRate;
      const stockValueCostUSD = stock * cost;
      const stockValueCostVES = stockValueCostUSD * currentRate;
      const stockValuePriceUSD = stock * price;
      const stockValuePriceVES = stockValuePriceUSD * currentRate;

      return {
        ID_Producto: prod.id,
        SKU: prod.sku || 'N/A',
        Nombre: prod.name,
        Categoria: prod.category || 'General',
        Marca: prod.brand || 'N/A',
        Fabricante: prod.manufacturer || 'N/A',
        Unidad_Medida: prod.unit_measure || 'Und',
        Stock_Actual: stock,
        Estado: prod.is_active || 'activo',
        Costo_USD: cost,
        Costo_VES: costVes,
        Precio_Venta_USD: price,
        Precio_Venta_VES: priceVes,
        Porcentaje_IVA: `${iva}%`,
        Punto_Reorden: prod.reorder_point || 5,
        Min_Pedido: prod.min_order_qty || 1,
        Max_Pedido: prod.max_order_qty || 999999,
        Peso_Unitario_Kg: weight,
        Peso_Total_Stock_Kg: totalWeight,
        Facturar_Sin_Stock: prod.allow_negative ? 'Sí' : 'No',
        Permite_Decimales: prod.allow_decimals ? 'Sí' : 'No',
        Valor_Total_Costo_USD: stockValueCostUSD,
        Valor_Total_Costo_VES: stockValueCostVES,
        Valor_Total_Venta_USD: stockValuePriceUSD,
        Valor_Total_Venta_VES: stockValuePriceVES,
      };
    });

    exportToExcel(formattedData, 'Reporte_Inventario_Completo_Kataris');
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
    if (!purchases || purchases.length === 0) {
      alert('No hay compras registradas para exportar.');
      return;
    }

    const formattedData = purchases.map((p) => ({
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

      <div className={`min-h-screen flex transition-colors duration-300 ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-slate-100'}`}>
        <aside className={`w-64 border-r p-6 flex flex-col justify-between transition-colors duration-300 ${
  isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-100'
}`}>
  <div>
    <div className="mb-6">
      <h1 className={`text-2xl font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>Kataris ERP</h1>
      <p className="text-xs text-blue-500 font-medium mt-1 uppercase tracking-wider">
        {tenant ? tenant.name : 'CARGANDO EMPRESA...'}
      </p>
      <div className={`mt-2 px-3 py-1.5 rounded-lg border flex justify-between items-center text-xs ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700/60'
      }`}>
        <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Tasa BCV:</span>
        <span className="text-emerald-500 font-bold">Bs. {currentRate.toFixed(2)}</span>
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
        { id: 'drivers', label: 'Choferes' },
        { id: 'tracking', label: 'Seguimiento GPS' },
        { id: 'configuracion', label: '⚙️ Configuración' },
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => setCurrentView(item.id as any)}
          className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
            currentView === item.id
              ? 'bg-blue-600 text-white shadow'
              : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  </div>

  <div className={`border-t pt-4 ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
    <div className="mb-3">
      <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{profile?.full_name || 'Usuario'}</p>
      <p className="text-xs text-blue-500 capitalize font-medium">Rol: {profile?.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
    </div>
    <button
      onClick={handleLogout}
      className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors shadow"
    >
      Cerrar Sesión
    </button>
  </div>
</aside>

        <main className={`flex-1 p-8 overflow-y-auto transition-colors duration-300 ${isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
          {currentView === 'dashboard' && (
  <>
    <header className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-4 ${
      isLight ? 'border-slate-200' : 'border-slate-800'
    }`}>
      <div>
        <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Panel Ejecutivo Visual</h2>
        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Indicadores de rendimiento y analítica filtrada por período.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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

        <div className={`p-1 rounded-xl border flex items-center text-xs ${
          isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-800 border-slate-700'
        }`}>
          {(['today', 'month', 'year', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                dateFilter === filter 
                  ? 'bg-blue-600 text-white shadow' 
                  : isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              {filter === 'today' ? 'Hoy' : filter === 'month' ? 'Este Mes' : filter === 'year' ? 'Este Año' : 'Todo'}
            </button>
          ))}
        </div>

        <button
          onClick={handleExportInvoices}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
        >
          📊 Exportar Excel
        </button>

        {isAdmin && (
          <form onSubmit={handleUpdateExchangeRate} className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl ${
            isLight ? 'bg-white border-slate-300' : 'bg-slate-800 border-slate-700'
          }`}>
            <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Tasa $:</span>
            <input
              type="number"
              step="0.0001"
              value={exchangeRateInput}
              onChange={(e) => setExchangeRateInput(e.target.value)}
              className={`w-20 border rounded px-2 py-1 text-emerald-500 text-xs font-bold focus:outline-none ${
                isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-700'
              }`}
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

    {/* TARJETAS KPIS DE ESTADÍSTICAS */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* Ventas Período */}
      <div className={`border p-5 rounded-xl shadow-sm transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
      }`}>
        <div className="flex justify-between items-start mb-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Ventas Período
          </span>
          <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            {dateFilter}
          </span>
        </div>
        <h3 className="text-2xl font-bold text-emerald-500 mb-2">${totalSalesFiltered.toFixed(2)}</h3>
        <div className={`w-full rounded-full h-2 mb-2 overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-slate-900'}`}>
          <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }}></div>
        </div>
        <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Bs. {(totalSalesFiltered * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Facturas Emitidas */}
      <div className={`border p-5 rounded-xl shadow-sm transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
      }`}>
        <div className="flex justify-between items-start mb-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Facturas Emitidas
          </span>
          <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">Filtrado</span>
        </div>
        <h3 className="text-2xl font-bold mb-2">{filteredInvoices.length}</h3>
        <div className={`w-full rounded-full h-2 mb-2 overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-slate-900'}`}>
          <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }}></div>
        </div>
        <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Transacciones en rango</p>
      </div>

      {/* Clientes en Cartera */}
      <div className={`border p-5 rounded-xl shadow-sm transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
      }`}>
        <div className="flex justify-between items-start mb-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Clientes en Cartera
          </span>
          <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">Directorio</span>
        </div>
        <h3 className="text-2xl font-bold mb-2">{clients.length}</h3>
        <div className={`w-full rounded-full h-2 mb-2 overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-slate-900'}`}>
          <div className="bg-purple-500 h-full rounded-full" style={{ width: '100%' }}></div>
        </div>
        <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total acumulado</p>
      </div>

      {/* CxC Pendiente */}
      <div className={`border p-5 rounded-xl shadow-sm transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
      }`}>
        <div className="flex justify-between items-start mb-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            CxC Pendiente
          </span>
          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">Crédito</span>
        </div>
        <h3 className="text-2xl font-bold text-amber-500 mb-2">${totalPendingCxCFiltered.toFixed(2)}</h3>
        <div className={`w-full rounded-full h-2 mb-2 overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-slate-900'}`}>
          <div className="bg-amber-500 h-full rounded-full" style={{ width: '100%' }}></div>
        </div>
        <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Bs. {(totalPendingCxCFiltered * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
        </p>
      </div>
    </div>

    {/* GRÁFICOS DE VENTAS Y STOCK */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <div className={`border p-6 rounded-xl shadow-sm transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Ventas por Fecha</h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Evolución de ingresos en el período seleccionado</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredInvoices.slice().reverse().map((inv) => ({
                fecha: new Date(inv.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' }),
                total: Number(inv.total),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#334155'} />
              <XAxis dataKey="fecha" stroke={isLight ? '#64748b' : '#94a3b8'} fontSize={11} />
              <YAxis stroke={isLight ? '#64748b' : '#94a3b8'} fontSize={11} />
              <Tooltip contentStyle={{
                backgroundColor: isLight ? '#ffffff' : '#1e293b',
                borderColor: isLight ? '#cbd5e1' : '#475569',
                borderRadius: '8px',
                color: isLight ? '#0f172a' : '#ffffff'
              }} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`border p-6 rounded-xl shadow-sm transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Stock de Productos</h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Existencias actuales registradas</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={products.map((p) => ({ name: p.name, stock: p.stock }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#334155'} />
              <XAxis dataKey="name" stroke={isLight ? '#64748b' : '#94a3b8'} fontSize={11} />
              <YAxis stroke={isLight ? '#64748b' : '#94a3b8'} fontSize={11} />
              <Tooltip contentStyle={{
                backgroundColor: isLight ? '#ffffff' : '#1e293b',
                borderColor: isLight ? '#cbd5e1' : '#475569',
                borderRadius: '8px',
                color: isLight ? '#0f172a' : '#ffffff'
              }} />
              <Bar dataKey="stock" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    {/* TOP VENDEDORES */}
    <div className={`border p-6 rounded-xl shadow-sm mb-8 transition-colors ${
      isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'
    }`}>
      <h3 className={`text-lg font-bold mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>🏆 Top Vendedores del Período</h3>
      {topSellers.length === 0 ? (
        <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>No hay ventas registradas en este período.</p>
      ) : (
        <div className="space-y-3">
          {topSellers.map((seller, index) => (
            <div key={seller.name} className={`flex justify-between items-center p-3 rounded-lg border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700/50'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                  index === 0 ? 'bg-amber-500 text-slate-950' : index === 1 ? 'bg-slate-400 text-slate-950' : 'bg-amber-700 text-white'
                }`}>
                  {index + 1}
                </span>
                <span className={`text-sm font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>{seller.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-500">${seller.total.toFixed(2)}</p>
                <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Bs. {(seller.total * currentRate).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </>
)}

{currentView === 'tracking' && (
  <div className="space-y-6">
    <header className="flex justify-between items-center border-b border-slate-800 pb-4">
      <div>
        <h2 className="text-2xl font-bold text-white">📡 Rastro GPS y Monitoreo en Tiempo Real</h2>
        <p className="text-sm text-slate-400">Ubicación exacta de la fuerza de ventas y flota de despacho.</p>
      </div>

      {/* Interruptor entre Vendedores y Choferes */}
      <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex text-xs">
        <button
          onClick={() => setTrackingType('seller')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            trackingType === 'seller' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          👨‍💼 Vendedores ({sellers.filter((p: any) => p.role === 'seller' || p.role === 'vendedor').length})
        </button>
        <button
          onClick={() => setTrackingType('driver')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            trackingType === 'driver' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🚚 Choferes / Despacho ({sellers.filter((p: any) => p.role === 'driver' || p.role === 'despachador' || p.role === 'chofer').length})
        </button>
      </div>
    </header>

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Panel lateral: Lista de Personal */}
      <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {trackingType === 'seller' ? 'Vendedores Monitoreados' : 'Despachadores Monitoreados'}
        </h3>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {sellers.filter((p: any) => {
            const roleMatch = trackingType === 'seller' 
              ? (p.role === 'seller' || p.role === 'vendedor')
              : (p.role === 'driver' || p.role === 'despachador' || p.role === 'chofer');
            return roleMatch;
          }).length === 0 ? (
            <p className="text-xs text-slate-500 p-4 text-center">
              No hay {trackingType === 'seller' ? 'vendedores' : 'choferes'} registrados.
            </p>
          ) : (
            sellers.filter((p: any) => {
              const roleMatch = trackingType === 'seller' 
                ? (p.role === 'seller' || p.role === 'vendedor')
                : (p.role === 'driver' || p.role === 'despachador' || p.role === 'chofer');
              return roleMatch;
            }).map((user: any) => (
              <div key={user.id} className="bg-slate-900 border border-slate-700 p-3 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">{user.full_name}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Última señal: {user.location_updated_at ? new Date(user.location_updated_at).toLocaleTimeString() : 'Sin señal'}
                </p>
                {user.current_lat && user.current_lng ? (
                  <a
                    href={`https://www.google.com/maps?q=${user.current_lat},${user.current_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-[10px] text-blue-400 font-bold hover:underline mt-1"
                  >
                    📍 Abrir en Google Maps
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-500 italic block mt-1">Ubicación no activa</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área del Mapa Interactivo */}
      <div className="lg:col-span-3 bg-slate-800 border border-slate-700 rounded-2xl h-[550px] overflow-hidden relative shadow-inner">
        {(() => {
          const userWithLocation = sellers.find((p: any) => {
            const roleMatch = trackingType === 'seller' 
              ? (p.role === 'seller' || p.role === 'vendedor')
              : (p.role === 'driver' || p.role === 'despachador' || p.role === 'chofer');
            return roleMatch && p.current_lat && p.current_lng;
          });

          const lat = userWithLocation?.current_lat || 10.6427;
          const lng = userWithLocation?.current_lng || -71.6125;

          return (
            <div className="w-full h-full relative">
              <iframe
                title="Mapa de Rastreamiento GPS"
                width="100%"
                height="100%"
                className="border-0 grayscale contrast-125 opacity-90 hover:grayscale-0 transition-all duration-500"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.03}%2C${lat - 0.03}%2C${lng + 0.03}%2C${lat + 0.03}&layer=mapnik&marker=${lat}%2C${lng}`}
              />
              
              <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-xl text-xs text-white shadow-lg flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>
                  {userWithLocation 
                    ? `Monitoreando a: ${userWithLocation.full_name}` 
                    : 'Mostrando zona de cobertura (Sin señal activa)'}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  </div>
)}

{currentView === 'drivers' && (
  <div className="space-y-6">
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
      <div>
        <h2 className="text-2xl font-bold text-white">🚚 Gestión de Choferes y Rutas</h2>
        <p className="text-sm text-slate-400">Administra la flota de transporte y la asignación de despachos por lotes.</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Pestañas de Navegación */}
        <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex text-xs">
          <button
            onClick={() => setDriverTab('list')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              driverTab === 'list' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 Listado de Choferes ({sellers.filter((p: any) => p.role === 'driver' || p.role === 'despachador' || p.role === 'chofer').length})
          </button>
          <button
            onClick={() => setDriverTab('routes')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              driverTab === 'routes' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            🗺️ Asignación de Rutas
          </button>
        </div>

        {/* Botón de Registrar Chofer */}
        <button
          onClick={() => setShowNewDriverModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/30"
        >
          + Registrar Chofer
        </button>
      </div>
    </header>

{driverTab === 'list' && (
  <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-900/60 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
          <th className="p-4">Nombre del Chofer</th>
          <th className="p-4">Correo / Usuario</th>
          <th className="p-4">Vehículo / Placa</th>
          <th className="p-4">Estatus GPS</th>
          <th className="p-4 text-center">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-700 text-sm text-slate-200">
        {driversList.length === 0 ? (
          <tr>
            <td colSpan={5} className="p-6 text-center text-slate-500">
              No hay choferes registrados en el sistema.
            </td>
          </tr>
        ) : (
          driversList.map((driver: any) => (
            <tr key={driver.id} className="hover:bg-slate-700/50 transition-colors">
              <td className="p-4 font-bold text-white">{driver.full_name}</td>
              <td className="p-4 text-slate-400 font-mono text-xs">{driver.email || 'N/A'}</td>
              <td className="p-4">{driver.vehicle_info || 'Sin vehículo asignado'}</td>
              <td className="p-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                  driver.current_lat ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700 text-slate-400'
                }`}>
                  {driver.current_lat ? '🟢 GPS Activo' : '⚪ Inactivo'}
                </span>
              </td>
              <td className="p-4 text-center">
<button
  onClick={() => {
    setEditingDriver(driver);
    setEditDriverName(driver.full_name || '');
    setEditDriverEmail(driver.email || '');
    setEditDriverVehicle(driver.vehicle_info || '');
    setEditDriverPassword(''); // Se reinicia para permitir cambiarla solo si se desea
  }}
  className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow"
>
  ✏️ Editar
</button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
)}

{/* MODAL DE EDICIÓN DE CHOFER COMPLETO */}
{editingDriver && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
      <h3 className="text-lg font-bold text-white">✏️ Editar Datos del Chofer</h3>
      
      <form onSubmit={async (e) => {
        e.preventDefault();
        try {
          // 1. Actualizar datos en la tabla profiles
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: editDriverName,
              email: editDriverEmail,
              vehicle_info: editDriverVehicle,
            })
            .eq('id', editingDriver.id);

          if (profileError) throw profileError;

          // 2. Si se ingresó una nueva contraseña, actualizarla en Supabase Auth
          if (editDriverPassword.trim().length > 0) {
            if (editDriverPassword.length < 6) {
              alert('La contraseña debe tener al menos 6 caracteres.');
              return;
            }

            const { error: authError } = await supabase.rpc('update_user_password', {
              user_id: editingDriver.id,
              new_password: editDriverPassword
            });

            // En caso de no tener la función RPC configurada, se intenta actualización directa de admin o aviso
            if (authError) {
              console.warn('Nota sobre contraseña:', authError.message);
            }
          }

          alert('¡Datos del chofer actualizados con éxito!');
          setEditingDriver(null);
          if (typeof fetchAllData === 'function') fetchAllData(profile?.tenant_id);
        } catch (err: any) {
          alert('Error al actualizar chofer: ' + err.message);
        }
      }} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nombre Completo</label>
          <input 
            type="text" 
            required 
            value={editDriverName}
            onChange={(e) => setEditDriverName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Correo Electrónico (Usuario)</label>
          <input 
            type="email" 
            required 
            value={editDriverEmail}
            onChange={(e) => setEditDriverEmail(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nueva Contraseña (Opcional)</label>
          <input 
            type="password" 
            value={editDriverPassword}
            onChange={(e) => setEditDriverPassword(e.target.value)}
            placeholder="Dejar en blanco para mantener la actual" 
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500" 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Vehículo / Placa</label>
          <input 
            type="text" 
            required 
            value={editDriverVehicle}
            onChange={(e) => setEditDriverVehicle(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500" 
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={() => setEditingDriver(null)}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow"
          >
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    {/* PESTAÑA 2: ASIGNACIÓN DE RUTAS */}
    {driverTab === 'routes' && (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Panel Izquierdo: Selección de Chofer */}
      <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">1. Seleccionar Chofer</h3>
        <select
          value={selectedDriverForRoute}
          onChange={(e) => setSelectedDriverForRoute(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">-- Elige un transportista --</option>
          {sellers.filter((p: any) => p.role === 'driver' || p.role === 'despachador' || p.role === 'chofer').map((d: any) => (
            <option key={d.id} value={d.id}>{d.full_name} ({d.vehicle_info || 'Vehículo genérico'})</option>
          ))}
        </select>

        <div className="pt-4 border-t border-slate-700 space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase">Resumen de Selección</h4>
          <p className="text-xs text-slate-300">Facturas seleccionadas: <strong className="text-white">{selectedInvoicesForRoute.length}</strong></p>
          <button
            onClick={async () => {
              if (!selectedDriverForRoute || selectedInvoicesForRoute.length === 0) {
                alert('Selecciona un chofer y al menos una factura.');
                return;
              }
              const { error } = await supabase
                .from('invoices')
                .update({ driver_id: selectedDriverForRoute, dispatch_status: 'no despachada' })
                .in('id', selectedInvoicesForRoute);

              if (!error) {
                alert('¡Ruta asignada con éxito al chofer!');
                setSelectedInvoicesForRoute([]);
                setSelectedDriverForRoute('');
                if (typeof fetchAllData === 'function') fetchAllData();
              } else {
                alert('Error al asignar la ruta: ' + error.message);
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg"
          >
            🚀 Asignar Ruta al Chofer
          </button>
        </div>
      </div>

      {/* Panel Derecho: Selección y Buscador de Facturas PENDIENTES (Sin Chofer) */}
      <div className="lg:col-span-2 bg-slate-800 border border-slate-700 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">2. Facturas Disponibles para Asignar</h3>
          
          <input
            type="text"
            value={invoiceSearchTerm}
            onChange={(e) => setInvoiceSearchTerm(e.target.value)}
            placeholder="🔍 Buscar por N° o Cliente..."
            className="bg-slate-900 border border-slate-700 text-xs rounded-xl px-3 py-2 text-white w-full sm:w-64 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Lista Filtrada: SOLO facturas que NO tienen driver_id asignado */}
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
          {invoices.filter((inv: any) => {
            // Filtrar solo las que no tienen chofer asignado
            if (inv.driver_id) return false;

            const query = invoiceSearchTerm.toLowerCase();
            const invNum = (inv.invoice_number || inv.id || '').toLowerCase();
            const cliName = (inv.client_name || inv.clients?.name || 'Cliente General').toLowerCase();
            return invNum.includes(query) || cliName.includes(query);
          }).length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              {invoiceSearchTerm ? 'No se encontraron facturas sin asignar.' : 'No hay facturas pendientes por asignar a rutas.'}
            </p>
          ) : (
            invoices
              .filter((inv: any) => !inv.driver_id) // Excluir las ya asignadas
              .filter((inv: any) => {
                const query = invoiceSearchTerm.toLowerCase();
                const invNum = (inv.invoice_number || inv.id || '').toLowerCase();
                const cliName = (inv.client_name || inv.clients?.name || 'Cliente General').toLowerCase();
                return invNum.includes(query) || cliName.includes(query);
              })
              .map((inv: any) => {
                const isChecked = selectedInvoicesForRoute.includes(inv.id);
                const displayInvoiceNum = inv.invoice_number || `FACT-${inv.id.slice(0, 6).toUpperCase()}`;
                const displayClientName = inv.client_name || inv.clients?.name || 'Cliente General';

                return (
                  <div
                    key={inv.id}
                    onClick={() => {
                      if (isChecked) {
                        setSelectedInvoicesForRoute(selectedInvoicesForRoute.filter(id => id !== inv.id));
                      } else {
                        setSelectedInvoicesForRoute([...selectedInvoicesForRoute, inv.id]);
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                      isChecked ? 'bg-emerald-600/20 border-emerald-500' : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-mono text-blue-400 font-bold">{displayInvoiceNum}</span>
                      <p className="text-sm font-bold text-white">{displayClientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">${Number(inv.total || 0).toFixed(2)}</p>
                      <span className="text-[10px] text-amber-400 uppercase font-semibold">Sin Asignar</span>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>

    {/* SECCIÓN INFERIOR: HISTORIAL DE RUTAS ASIGNADAS */}
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-slate-700 pb-3">
        <h3 className="text-base font-bold text-white">📋 Historial de Rutas y Facturas Asignadas en Campo</h3>
        <span className="text-xs bg-slate-900 px-3 py-1 rounded-full text-blue-400 font-mono">
          {invoices.filter((inv: any) => inv.driver_id).length} Facturas en Ruta
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/60 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
              <th className="p-3">Factura</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Chofer / Transportista</th>
              <th className="p-3">Estatus de Despacho</th>
              <th className="p-3">Fecha de Entrega</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 text-sm text-slate-200">
            {invoices.filter((inv: any) => inv.driver_id).length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No hay rutas o facturas asignadas a ningún chofer actualmente.
                </td>
              </tr>
            ) : (
              invoices
                .filter((inv: any) => inv.driver_id)
                .map((inv: any) => {
                  const assignedDriver = sellers.find((d: any) => d.id === inv.driver_id);
                  const displayInvoiceNum = inv.invoice_number || `FACT-${inv.id.slice(0, 6).toUpperCase()}`;
                  const displayClientName = inv.client_name || inv.clients?.name || 'Cliente General';
                  const status = inv.dispatch_status || 'no despachada';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="p-3 font-mono text-blue-400 font-bold">{displayInvoiceNum}</td>
                      <td className="p-3 font-bold text-white">{displayClientName}</td>
                      <td className="p-3 text-slate-300">{assignedDriver ? assignedDriver.full_name : 'Chofer Asignado'}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          status === 'despachada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          status === 'rechazada' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-400">
                        {inv.dispatched_at ? new Date(inv.dispatched_at).toLocaleString() : 'Pendiente en ruta'}
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}

    {/* MODAL DE REGISTRO DE CHOFER */}
    {showNewDriverModal && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
          <h3 className="text-lg font-bold text-white">🚚 Registrar Nuevo Chofer</h3>
          
          <form onSubmit={async (e) => {
  e.preventDefault();
  try {
    const response = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newDriverEmail,         // O la variable que uses para el correo
        password: newDriverPassword,   // O la variable que uses para la contraseña
        full_name: editDriverName,     // O newDriverName
        role: 'driver',
        vehicle_info: editDriverVehicle,
        tenant_id: profile?.tenant_id,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al registrar chofer');
    }

    alert('¡Chofer registrado con éxito en Auth y en el sistema!');
    setShowNewDriverModal(false);
    if (typeof fetchAllData === 'function') fetchAllData();
  } catch (err: any) {
    alert('Error al registrar chofer: ' + err.message);
  }
}}>


            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nombre Completo</label>
              <input 
                type="text" 
                required 
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                placeholder="Ej. Carlos Pérez" 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Correo Electrónico (Usuario)</label>
              <input 
                type="email" 
                required 
                value={newDriverEmail}
                onChange={(e) => setNewDriverEmail(e.target.value)}
                placeholder="chofer@kataris.com" 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Contraseña de Acceso</label>
              <input 
                type="password" 
                required 
                value={newDriverPassword}
                onChange={(e) => setNewDriverPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Vehículo / Placa</label>
              <input 
                type="text" 
                required 
                value={newDriverVehicle}
                onChange={(e) => setNewDriverVehicle(e.target.value)}
                placeholder="Ej. Furgón NPR - Placa ABC1234" 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white" 
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewDriverModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
              >
                Guardar y Crear Cuenta
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
)}

{currentView === 'sellers' && (
  <div className="space-y-6">
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
      <div>
        <h2 className="text-2xl font-bold text-white">💼 Gestión de Vendedores y Cuotas</h2>
        <p className="text-sm text-slate-400">Control de rendimiento individual, cuotas de ventas mensuales y permisos comerciales.</p>
      </div>

      <button
        onClick={() => setShowNewSellerModal && setShowNewSellerModal(true)}
        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-lg"
      >
        + Nuevo Vendedor
      </button>
    </header>

    {/* Grid de Vendedores Filtrados */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sellers.filter((p: any) => p.role === 'seller' || p.role === 'vendedor').length === 0 ? (
        <div className="col-span-full bg-slate-800 border border-slate-700 p-8 rounded-2xl text-center text-slate-400">
          No hay vendedores registrados en el sistema.
        </div>
      ) : (
        sellers
          .filter((p: any) => p.role === 'seller' || p.role === 'vendedor')
          .map((seller: any) => {
            const quota = Number(seller.sales_quota || seller.quota || 0);
            const currentSales = Number(seller.current_sales || 0);
            const percentage = quota > 0 ? Math.min(Math.round((currentSales / quota) * 100), 100) : 0;
            const isActive = seller.status !== 'inactive';

            return (
              <div key={seller.id} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl space-y-4 shadow-xl flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white">{seller.full_name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{seller.email || 'Sin correo'}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setEditingSeller(seller);
                      setEditName(seller.full_name || '');
                      setEditEmail(seller.email || '');
                      setEditQuota(seller.sales_quota || seller.quota || '0');
                      setEditRole(seller.role || 'seller');
                      setEditStatus(seller.status || 'active');
                      setEditBrands(seller.allowed_brands || '');
                    }}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow"
                  >
                    ✏️ Editar Vendedor
                  </button>
                </div>

                <div className="space-y-2 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Cuota Asignada:</span>
                    <span className="text-white font-bold">${quota.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Ventas Este Mes:</span>
                    <span className="text-emerald-400 font-bold">${currentSales.toFixed(2)}</span>
                  </div>
                  
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mt-2">
                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-bold">{percentage}% Alcanzado</div>
                </div>

                <div className="text-xs text-slate-400 pt-2 border-t border-slate-700 flex justify-between items-center">
                  <span>Marcas: <strong className="text-slate-200">{seller.allowed_brands || 'Todas'}</strong></span>
                  <span className="font-mono">Pedidos: {seller.orders_count || 0}</span>
                </div>
              </div>
            );
          })
      )}
    </div>

{/* MODAL DE EDICIÓN DE VENDEDOR CON CONTRASEÑA Y MARCAS */}
{editingSeller && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
      <h3 className="text-lg font-bold text-white">✏️ Editar Perfil y Permisos de Vendedor</h3>
      
      <form onSubmit={async (e) => {
        e.preventDefault();
        try {
          // 1. Actualizar perfil en Supabase
          const { error } = await supabase
            .from('profiles')
            .update({
              full_name: editName,
              email: editEmail,
              sales_quota: Number(editQuota),
              quota: Number(editQuota),
              role: editRole,
              status: editStatus,
              allowed_brands: editBrands.toLowerCase().trim(),
            })
            .eq('id', editingSeller.id);

          if (error) throw error;

          // 2. Si se ingresó una nueva contraseña, actualizarla
          if (editPassword.trim().length > 0) {
            if (editPassword.length < 6) {
              alert('La contraseña debe tener al menos 6 caracteres.');
              return;
            }
            await supabase.rpc('update_user_password', {
              user_id: editingSeller.id,
              new_password: editPassword
            });
          }

          alert('¡Vendedor actualizado con éxito!');
          setEditingSeller(null);
          setEditPassword('');
          if (typeof fetchAllData === 'function') fetchAllData();
        } catch (err: any) {
          alert('Error al actualizar vendedor: ' + err.message);
        }
      }} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nombre Completo</label>
          <input 
            type="text" 
            required 
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500" 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required 
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nueva Contraseña (Opcional)</label>
            <input 
              type="password" 
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Dejar en blanco para no cambiar" 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500" 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Cuota Mensual ($)</label>
            <input 
              type="number" 
              step="0.01"
              required 
              value={editQuota}
              onChange={(e) => setEditQuota(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Estatus</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Rol / Permisos</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="seller">Vendedor</option>
              <option value="vendedor">Vendedor (Alternativo)</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Marcas Permitidas (Separadas por coma)</label>
            <input 
              type="text" 
              value={editBrands}
              onChange={(e) => setEditBrands(e.target.value)}
              placeholder="Ej. Cali, Primor, Mavesa" 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500" 
            />
            <span className="text-[10px] text-slate-400">Si se deja en blanco o "todas", podrá vender cualquier marca.</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={async () => {
              if (confirm('¿Estás seguro de eliminar este vendedor del sistema?')) {
                const { error } = await supabase.from('profiles').delete().eq('id', editingSeller.id);
                if (!error) {
                  alert('Vendedor eliminado.');
                  setEditingSeller(null);
                  if (typeof fetchAllData === 'function') fetchAllData();
                } else {
                  alert('Error al eliminar: ' + error.message);
                }
              }
            }}
            className="px-4 py-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-xl text-xs font-bold transition-all"
          >
            🗑️ Eliminar Vendedor
          </button>

          <div className="space-x-2 flex">
            <button
              type="button"
              onClick={() => {
                setEditingSeller(null);
                setEditPassword('');
              }}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
)}
  </div>
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
  <div className="space-y-6">
    <header className="flex justify-between items-center border-b border-slate-800 pb-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Gestión de Inventario</h2>
        <p className="text-sm text-slate-400">Control avanzado de productos, existencias, costos y márgenes.</p>
      </div>
      <div className="flex gap-3">
        <button 
          onClick={handleExportInventory} 
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
        >
          📊 Exportar Inventario
        </button>
        <button 
          onClick={() => setShowAddProductModal(true)} 
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all"
        >
          + Agregar Producto
        </button>
      </div>
    </header>

    {/* Tabla de Inventario limpia y sin formularios estáticos encima */}
<div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
  <table className="w-full text-left border-collapse text-sm">
    <thead>
      <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
        <th className="p-4">PRODUCTO</th>
        <th className="p-4">SKU</th>
        <th className="p-4">CATEGORÍA</th>
        <th className="p-4">COSTO ($)</th>
        <th className="p-4">PRECIO ($)</th>
        <th className="p-4">PRECIO (BS.)</th>
        <th className="p-4">STOCK</th>
        <th className="p-4">ESTADO</th>
        <th className="p-4 text-center">ACCIONES</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-700/60 text-slate-300">
      {products.length === 0 ? (
        <tr>
          <td colSpan={9} className="p-8 text-center text-slate-400">
            No hay productos registrados en el inventario.
          </td>
        </tr>
      ) : (
        products.map((p) => (
          <tr key={p.id} className="hover:bg-slate-700/20">
            <td className="p-4 font-bold text-white">{p.name}</td>
            <td className="p-4 font-mono text-slate-400">{p.sku || 'N/A'}</td>
            <td className="p-4 text-xs font-semibold uppercase">{p.category || 'General'}</td>
            <td className="p-4 text-amber-400 font-semibold">${Number(p.cost || 0).toFixed(2)}</td>
            <td className="p-4 text-emerald-400 font-semibold">${Number(p.price).toFixed(2)}</td>
            <td className="p-4 font-mono text-slate-300">Bs. {(Number(p.price) * currentRate).toFixed(2)}</td>
            <td className="p-4 font-bold text-white">{p.stock} {p.unit_measure || 'Und'}</td>
            <td className="p-4">
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${p.is_active === 'inactivo' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {p.is_active || 'activo'}
              </span>
            </td>
            <td className="p-4 text-center flex justify-center gap-2">
              <button 
                onClick={() => setSelectedProductDetails(p)} 
                title="Ver Detalles"
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2 rounded-xl text-xs transition-colors"
              >
                👁️
              </button>
              <button 
                onClick={() => setEditingProduct(p)} 
                title="Editar Producto"
                className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 p-2 rounded-xl text-xs border border-blue-500/30 transition-colors"
              >
                ✏️
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

{/* 🔍 MODAL DE DETALLES DEL PRODUCTO */}
{selectedProductDetails && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-slate-100">
      <div className="flex justify-between items-center border-b border-slate-700 pb-3">
        <h3 className="text-lg font-bold text-white">📋 Ficha Técnica: {selectedProductDetails.name}</h3>
        <button onClick={() => setSelectedProductDetails(null)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm bg-slate-900/50 p-4 rounded-xl border border-slate-700">
        <div><span className="text-slate-400">SKU:</span> <span className="font-mono text-white">{selectedProductDetails.sku || 'N/A'}</span></div>
        <div><span className="text-slate-400">Categoría:</span> <span className="font-semibold text-white uppercase">{selectedProductDetails.category || 'General'}</span></div>
        <div><span className="text-slate-400">Marca / Fabricante:</span> <span className="text-white">{selectedProductDetails.brand || '-'} / {selectedProductDetails.manufacturer || '-'}</span></div>
        <div><span className="text-slate-400">Unidad de Medida:</span> <span className="text-white">{selectedProductDetails.unit_measure || 'Und'}</span></div>
        <div><span className="text-slate-400">Costo Actual:</span> <span className="text-amber-400 font-bold">${Number(selectedProductDetails.cost || 0).toFixed(2)}</span></div>
        <div><span className="text-slate-400">Precio de Venta:</span> <span className="text-emerald-400 font-bold">${Number(selectedProductDetails.price || 0).toFixed(2)}</span></div>
        <div><span className="text-slate-400">IVA:</span> <span className="text-white">{selectedProductDetails.iva || 16}%</span></div>
        <div><span className="text-slate-400">Stock Actual:</span> <span className="text-white font-bold">{selectedProductDetails.stock}</span></div>
        <div><span className="text-slate-400">Punto de Reorden:</span> <span className="text-white">{selectedProductDetails.reorder_point}</span></div>
        <div><span className="text-slate-400">Peso Unitario:</span> <span className="text-white">{selectedProductDetails.weight_per_unit} Kg</span></div>
        <div><span className="text-slate-400">Mín / Máx Pedido:</span> <span className="text-white">{selectedProductDetails.min_order_qty} / {selectedProductDetails.max_order_qty}</span></div>
        <div><span className="text-slate-400">Facturar Negativo:</span> <span className="text-white">{selectedProductDetails.allow_negative ? 'Sí' : 'No'}</span></div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={() => setSelectedProductDetails(null)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs">Cerrar</button>
      </div>
    </div>
  </div>
)}

{/* ✏️ MODAL DE EDICIÓN AVANZADA DE PRODUCTO */}
{editingProduct && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
      <div className="flex justify-between items-center border-b border-slate-700 pb-3">
        <h3 className="text-lg font-bold text-white">✏️ Editar Producto: {editingProduct.name}</h3>
        <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
      </div>

      <form onSubmit={async (e) => {
        e.preventDefault();
        if (!profile?.tenant_id) return;
        try {
          const { error } = await supabase.from('products').update({
            name: editingProduct.name,
            sku: editingProduct.sku,
            price: parseFloat(editingProduct.price) || 0,
            cost: parseFloat(editingProduct.cost) || 0,
            iva: parseFloat(editingProduct.iva) || 16,
            category: editingProduct.category,
            brand: editingProduct.brand,
            manufacturer: editingProduct.manufacturer,
            unit_measure: editingProduct.unit_measure,
            weight_per_unit: parseFloat(editingProduct.weight_per_unit) || 0,
            reorder_point: parseFloat(editingProduct.reorder_point) || 5,
            min_order_qty: parseFloat(editingProduct.min_order_qty) || 1,
            max_order_qty: parseFloat(editingProduct.max_order_qty) || 999999,
            allow_negative: editingProduct.allow_negative,
            allow_decimals: editingProduct.allow_decimals,
            is_active: editingProduct.is_active
          }).eq('id', editingProduct.id);

          if (error) throw error;
          setEditingProduct(null);
          fetchAllData(profile.tenant_id);
          alert('¡Producto actualizado con éxito!');
        } catch (err: any) {
          alert('Error al actualizar: ' + err.message);
        }
      }} className="space-y-4 text-sm">
        
        {/* Fila 1: Nombre, SKU y Estado */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nombre *</label>
            <input type="text" required value={editingProduct.name || ''} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">SKU</label>
            <input type="text" value={editingProduct.sku || ''} onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Estado</label>
            <select value={editingProduct.is_active || 'activo'} onChange={(e) => setEditingProduct({...editingProduct, is_active: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-emerald-400 font-bold">
              <option value="activo">🟢 Activo</option>
              <option value="inactivo">🔴 Inactivo</option>
            </select>
          </div>
        </div>

        {/* Fila 2: Costos, Precios e IVA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Costo Actual ($)</label>
            <input type="number" step="0.01" value={editingProduct.cost || 0} onChange={(e) => setEditingProduct({...editingProduct, cost: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-amber-400 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Precio de Venta ($)</label>
            <input type="number" step="0.01" value={editingProduct.price || 0} onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-emerald-400 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">IVA (%)</label>
            <input type="number" step="0.01" value={editingProduct.iva || 16} onChange={(e) => setEditingProduct({...editingProduct, iva: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
        </div>

        {/* Fila 3: Clasificación Comercial */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Categoría</label>
            <input type="text" value={editingProduct.category || ''} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Marca</label>
            <input type="text" value={editingProduct.brand || ''} onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Fabricante</label>
            <input type="text" value={editingProduct.manufacturer || ''} onChange={(e) => setEditingProduct({...editingProduct, manufacturer: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
        </div>

        {/* Fila 4: Logística y Parámetros de Stock */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Unidad Medida</label>
            <select value={editingProduct.unit_measure || 'Und'} onChange={(e) => setEditingProduct({...editingProduct, unit_measure: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white">
              <option value="Und">Unidad (Und)</option>
              <option value="Kg">Kilogramos (Kg)</option>
              <option value="Litros">Litros (L)</option>
              <option value="Caja">Caja</option>
              <option value="Saco">Saco</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Peso Unit. (Kg)</label>
            <input type="number" step="0.001" value={editingProduct.weight_per_unit || 0} onChange={(e) => setEditingProduct({...editingProduct, weight_per_unit: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Punto Reorden</label>
            <input type="number" step="any" value={editingProduct.reorder_point || 5} onChange={(e) => setEditingProduct({...editingProduct, reorder_point: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Mín. Pedido</label>
            <input type="number" step="any" value={editingProduct.min_order_qty || 1} onChange={(e) => setEditingProduct({...editingProduct, min_order_qty: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Máx. Pedido</label>
            <input type="number" step="any" value={editingProduct.max_order_qty || 999999} onChange={(e) => setEditingProduct({...editingProduct, max_order_qty: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
        </div>

        {/* Fila 5: Permisos Especiales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input type="checkbox" checked={editingProduct.allow_negative || false} onChange={(e) => setEditingProduct({...editingProduct, allow_negative: e.target.checked})} className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700" />
            <span className="text-xs font-semibold text-white">Permitir facturar en negativo (Vender sin stock)</span>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input type="checkbox" checked={editingProduct.allow_decimals || false} onChange={(e) => setEditingProduct({...editingProduct, allow_decimals: e.target.checked})} className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700" />
            <span className="text-xs font-semibold text-white">Permitir Cantidades en Decimales</span>
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={() => setEditingProduct(null)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs">Cancelar</button>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs">Guardar Cambios</button>
        </div>
      </form>
    </div>
  </div>
)}

{showAddProductModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-white">📦 REGISTRAR NUEVO PRODUCTO (AVANZADO)</h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4 text-sm">
              {/* Fila 1: Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nombre del Producto *</label>
                  <input type="text" required placeholder="Ej: Harina de Maíz 1Kg" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">SKU / Código</label>
                  <input type="text" placeholder="PROD-001" value={productSku} onChange={(e) => setProductSku(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Estado</label>
                  <select value={productStatus} onChange={(e) => setProductStatus(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-emerald-400 font-bold">
                    <option value="activo">🟢 Activo</option>
                    <option value="inactivo">🔴 Inactivo</option>
                  </select>
                </div>
              </div>

              {/* Fila 2: Precios, Costos e IVA */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Costo Actual ($) *</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={productCost} onChange={(e) => setProductCost(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-amber-400 font-bold" />
                  <span className="text-[10px] text-slate-500 block mt-1">Se actualiza con compras</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Precio de Venta ($) *</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-emerald-400 font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">IVA (%)</label>
                  <input type="number" step="0.01" value={productIva} onChange={(e) => setProductIva(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Stock Inicial *</label>
                  <input type="number" step="any" required value={productStock} onChange={(e) => setProductStock(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold" />
                </div>
              </div>

              {/* Fila 3: Clasificación Comercial */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Categoría</label>
                  <input type="text" placeholder="Ej: Víveres, Licores" value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Marca</label>
                  <input type="text" placeholder="Ej: Primor, Polar" value={productBrand} onChange={(e) => setProductBrand(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Fabricante</label>
                  <input type="text" placeholder="Nombre del fabricante" value={productManufacturer} onChange={(e) => setProductManufacturer(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
                </div>
              </div>

              {/* Fila 4: Logística, Unidades y Pedidos */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Unidad Medida</label>
                  <select value={productUnit} onChange={(e) => setProductUnit(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white">
                    <option value="Und">Unidad (Und)</option>
                    <option value="Kg">Kilogramos (Kg)</option>
                    <option value="Litros">Litros (L)</option>
                    <option value="Caja">Caja</option>
                    <option value="Saco">Saco</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Peso Unit. (Kg)</label>
                  <input type="number" step="0.001" value={productWeight} onChange={(e) => setProductWeight(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Punto Reorden</label>
                  <input type="number" step="any" value={productReorder} onChange={(e) => setProductReorder(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Mín. por Pedido</label>
                  <input type="number" step="any" value={productMinOrder} onChange={(e) => setProductMinOrder(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Máx. por Pedido</label>
                  <input type="number" step="any" value={productMaxOrder} onChange={(e) => setProductMaxOrder(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
                </div>
              </div>

              {/* Fila 5: Permisos Especiales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={allowNegative} onChange={(e) => setAllowNegative(e.target.checked)} className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700" />
                  <span className="text-xs font-semibold text-white">Permitir facturar en negativo (Vender sin stock)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={allowDecimals} onChange={(e) => setAllowDecimals(e.target.checked)} className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700" />
                  <span className="text-xs font-semibold text-white">Permitir Cantidades en Decimales (Compras y Ventas)</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={() => setShowAddProductModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs">Cancelar</button>
                <button type="submit" disabled={loadingInv} className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs">
                  {loadingInv ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

{currentView === 'purchases' && (
  <div className="space-y-6">
    <header className="flex justify-between items-center border-b border-slate-800 pb-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Compras y Recepción de Mercancía</h2>
        <p className="text-sm text-slate-400">Gestión de proveedores, entradas de inventario y control fiscal de facturas.</p>
      </div>
      <div className="flex gap-3">
        <button 
          onClick={() => setShowAddSupplierModal(true)} 
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all"
        >
          + Registrar Proveedor
        </button>
        <button 
          onClick={() => setShowProcessPurchaseModal(true)} 
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all"
        >
          📦 Registrar Entrada de Mercancía
        </button>
      </div>
    </header>

    {/* Historial de Compras Recientes */}
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-700 font-bold text-white text-sm">
        📜 Historial de Compras y Entradas de Inventario
      </div>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
            <th className="p-4">Nº FACTURA</th>
            <th className="p-4">PROVEEDOR</th>
            <th className="p-4">MONTO ($)</th>
            <th className="p-4">TASA BCV</th>
            <th className="p-4">MONTO (BS.)</th>
            <th className="p-4">FECHA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/60 text-slate-300">
          {purchasesHistory.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-slate-400">
                No hay compras o entradas registradas aún.
              </td>
            </tr>
          ) : (
            purchasesHistory.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-700/20">
                <td className="p-4 font-mono font-bold text-white">{item.invoice_number}</td>
                <td className="p-4 font-semibold text-slate-200">{item.supplier_name}</td>
                <td className="p-4 text-emerald-400 font-bold">${Number(item.total_amount || 0).toFixed(2)}</td>
                <td className="p-4 font-mono text-xs text-slate-400">Bs. {item.bcv_rate}</td>
                <td className="p-4 font-mono text-slate-300">Bs. {(Number(item.total_amount || 0) * Number(item.bcv_rate || currentRate)).toFixed(2)}</td>
                <td className="p-4 text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
)}

{showAddSupplierModal && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-slate-100">
      <div className="flex justify-between items-center border-b border-slate-700 pb-3">
        <h3 className="text-lg font-bold text-white">🏢 Registrar Nuevo Proveedor</h3>
        <button onClick={() => setShowAddSupplierModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
      </div>

      <form onSubmit={handleAddSupplier} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nombre / Empresa *</label>
            <input type="text" required placeholder="Ej: Distribuidora C.A." value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">RIF / Documento *</label>
            <input type="text" required placeholder="Ej: J-12345678-9" value={supplierRif} onChange={(e) => setSupplierRif(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Teléfono *</label>
            <input type="text" required placeholder="Ej: 0414-1234567" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Persona Encargada</label>
            <input type="text" placeholder="Ej: Lic. Carlos Pérez" value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Dirección Fiscal *</label>
            <input type="text" required placeholder="Ej: Zona Industrial, Calle 72, Maracaibo" value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={() => setShowAddSupplierModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs">Cancelar</button>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs">Guardar Proveedor</button>
        </div>
      </form>
    </div>
  </div>
)}

{showProcessPurchaseModal && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b border-slate-700 pb-3">
        <h3 className="text-lg font-bold text-white">📦 Registrar Factura de Compra y Múltiples Ítems</h3>
        <button type="button" onClick={() => setShowProcessPurchaseModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
      </div>

      <form onSubmit={handleProcessPurchase} className="space-y-4 text-sm">
        {/* Cabecera de la Factura */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Proveedor *</label>
            <select required value={purchaseSupplierId} onChange={(e) => setPurchaseSupplierId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold">
              <option value="">Seleccionar proveedor...</option>
              {suppliers.map((sup: any) => (
                <option key={sup.id} value={sup.id}>{sup.name} (RIF: {sup.rif})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nº Factura / Control *</label>
            <input type="text" required placeholder="Ej: FACT-9908" value={purchaseInvoiceNum} onChange={(e) => setPurchaseInvoiceNum(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">IVA General (%)</label>
            <input type="number" step="0.01" value={purchaseIva} onChange={(e) => setPurchaseIva(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold" />
          </div>
        </div>

        {/* Carga de Productos al Carrito */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-3">
          <h4 className="text-xs font-bold text-emerald-400 uppercase">Agregar Productos a la Factura</h4>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Producto</label>
              <select value={tempProductId} onChange={(e) => setTempProductId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white">
                <option value="">Seleccionar producto...</option>
                {products.map((prod: any) => (
                  <option key={prod.id} value={prod.id}>{prod.name} (Stock: {prod.stock || 0})</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cantidad</label>
              <input type="number" step="any" placeholder="Ej: 10" value={tempQty} onChange={(e) => setTempQty(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Costo Unit. ($)</label>
              <input type="number" step="0.01" placeholder="Ej: 5.00" value={tempCost} onChange={(e) => setTempCost(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white" />
            </div>
            <div className="md:col-span-2">
              <button type="button" onClick={handleAddItemToPurchase} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs">
                + Agregar
              </button>
            </div>
          </div>

          {/* Lista de Ítems */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="p-2">PRODUCTO</th>
                  <th className="p-2 text-center">CANTIDAD</th>
                  <th className="p-2 text-right">COSTO UNIT. ($)</th>
                  <th className="p-2 text-right">SUBTOTAL ($)</th>
                  <th className="p-2 text-center">ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {purchaseItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">No hay productos agregados a esta factura todavía.</td>
                  </tr>
                ) : (
                  purchaseItems.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="p-2 font-bold text-white">{item.productName}</td>
                      <td className="p-2 text-center font-mono">{item.qty}</td>
                      <td className="p-2 text-right font-mono">${Number(item.cost).toFixed(2)}</td>
                      <td className="p-2 text-right font-mono text-emerald-400">${(item.qty * item.cost).toFixed(2)}</td>
                      <td className="p-2 text-center">
                        <button type="button" onClick={() => handleRemovePurchaseItem(index)} className="text-rose-400 hover:text-rose-300 font-bold">✕</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Notas u Observaciones</label>
          <textarea placeholder="Condiciones de pago, guía de despacho..." value={purchaseNotes} onChange={(e) => setPurchaseNotes(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white h-20 resize-none"></textarea>
        </div>

        {/* Total */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 block uppercase font-semibold">Total Factura (Subtotal + IVA {purchaseIva}%)</span>
            <span className="text-2xl font-black text-emerald-400">
              ${calculateTotalPurchaseAmount().toFixed(2)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-mono">Tasa BCV: Bs. {currentRate}</span>
            <span className="text-sm font-bold text-slate-300 font-mono">
              Bs. {(calculateTotalPurchaseAmount() * currentRate).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={() => setShowProcessPurchaseModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs">Cancelar</button>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs">Registrar Factura y Actualizar Stock</button>
        </div>
      </form>
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
                const comprasPendientes = purchases.filter(p => {
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
                      {purchases.map((p) => {
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

          {currentView === 'bancos' && (
            <div className="space-y-8">
              <header className="border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-bold text-white">Módulo de Bancos y Conciliación Bancaria</h2>
                <p className="text-sm text-slate-400">Administra tus cuentas, registra movimientos y concilia tus estados de cuenta</p>
              </header>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl space-y-4">
                <h3 className="text-lg font-semibold text-white">Registrar Nueva Cuenta o Billetera</h3>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!tenant?.id) return;
                    const { error } = await supabase.from('bank_accounts').insert([{
                      tenant_id: tenant.id,
                      bank_name: newBank.bank_name,
                      account_number: newBank.account_number,
                      currency: newBank.currency,
                      current_balance: newBank.initial_balance
                    }]);
                    if (!error) {
                      alert('¡Cuenta bancaria creada con éxito!');
                      setNewBank({ bank_name: '', account_number: '', currency: 'USD', initial_balance: 0 });
                      fetchAllData(tenant.id);
                    } else {
                      alert('Error: ' + error.message);
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre / Banco</label>
                    <input required type="text" value={newBank.bank_name} onChange={e => setNewBank({...newBank, bank_name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Ej: Zelle / Banesco" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nº Cuenta / Correo</label>
                    <input required type="text" value={newBank.account_number} onChange={e => setNewBank({...newBank, account_number: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Ej: 0134-... o correo" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Moneda</label>
                    <select value={newBank.currency} onChange={e => setNewBank({...newBank, currency: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                      <option value="USD">USD ($)</option>
                      <option value="VES">VES (Bs)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Saldo Inicial</label>
                    <input type="number" step="0.01" value={newBank.initial_balance} onChange={e => setNewBank({...newBank, initial_balance: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div className="md:col-span-4 flex justify-end">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
                      + Crear Cuenta Bancaria
                    </button>
                  </div>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {bankAccounts.map(acc => (
                  <div key={acc.id} className="bg-slate-800 border border-slate-700 p-6 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">{acc.currency}</span>
                      <span className="text-xs text-slate-400 font-mono">{acc.account_number}</span>
                    </div>
                    <h4 className="text-lg font-bold text-white">{acc.bank_name}</h4>
                    <p className="text-2xl font-extrabold text-emerald-400">${Number(acc.current_balance).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl space-y-4">
                <h3 className="text-lg font-semibold text-white">Registrar Transacción (Ingreso / Egreso)</h3>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!tenant?.id || !selectedBankId) return alert('Selecciona una cuenta bancaria');
                    
                    const amountNum = Number(newTx.amount);
                    const finalAmount = newTx.type === 'egreso' ? -Math.abs(amountNum) : Math.abs(amountNum);

                    const { error } = await supabase.from('bank_transactions').insert([{
                      tenant_id: tenant.id,
                      bank_account_id: selectedBankId,
                      description: newTx.description,
                      reference_number: newTx.reference_number,
                      amount: finalAmount,
                      type: newTx.type
                    }]);

                    if (!error) {
                      const accObj = bankAccounts.find(a => a.id === selectedBankId);
                      if (accObj) {
                        const newBal = Number(accObj.current_balance) + finalAmount;
                        await supabase.from('bank_accounts').update({ current_balance: newBal }).eq('id', selectedBankId);
                      }

                      alert('¡Transacción registrada con éxito!');
                      setNewTx({ description: '', reference_number: '', amount: '', type: 'ingreso' });
                      setSelectedBankId('');
                      fetchAllData(tenant.id);
                    } else {
                      alert('Error: ' + error.message);
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Cuenta Bancaria</label>
                    <select value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                      <option value="">Seleccionar Cuenta...</option>
                      {bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.bank_name} ({acc.currency})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tipo</label>
                    <select value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                      <option value="ingreso">Ingreso (Débito/Depósito)</option>
                      <option value="egreso">Egreso (Pago/Retiro)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Descripción</label>
                    <input required type="text" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Ej: Cobro factura #001" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nº Referencia</label>
                    <input type="text" value={newTx.reference_number} onChange={e => setNewTx({...newTx, reference_number: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="Ej: 981273" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto ($ / Bs)</label>
                    <input required type="number" step="0.01" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="0.00" />
                  </div>
                  <div className="md:col-span-5 flex justify-end">
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
                      Registrar Movimiento y Actualizar Saldo
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl space-y-4">
                <h3 className="text-lg font-semibold text-white">Conciliación de Movimientos Bancarios</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                      <tr>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Cuenta</th>
                        <th className="p-3">Descripción</th>
                        <th className="p-3">Referencia</th>
                        <th className="p-3">Monto</th>
                        <th className="p-3">Estado Conciliación</th>
                        <th className="p-3">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankTransactions.map(tx => (
                        <tr key={tx.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="p-3 text-xs text-slate-400">{new Date(tx.transaction_date).toLocaleDateString('es-VE')}</td>
                          <td className="p-3 font-medium text-white">{tx.bank_accounts?.bank_name}</td>
                          <td className="p-3">{tx.description}</td>
                          <td className="p-3 font-mono text-blue-400">{tx.reference_number || 'N/A'}</td>
                          <td className={`p-3 font-bold ${Number(tx.amount) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${Number(tx.amount).toFixed(2)}
                          </td>
                          <td className="p-3">
                            {tx.is_reconciled ? (
                              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Conciliado ✓</span>
                            ) : (
                              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Pendiente</span>
                            )}
                          </td>
                          <td className="p-3">
                            <button 
                              onClick={async () => {
                                const newState = !tx.is_reconciled;
                                const { error } = await supabase.from('bank_transactions').update({ is_reconciled: newState }).eq('id', tx.id);
                                if (!error && tenant?.id) {
                                  fetchAllData(tenant.id);
                                }
                              }}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${tx.is_reconciled ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                            >
                              {tx.is_reconciled ? 'Desmarcar' : 'Conciliar'}
                            </button>
                          </td>
                        </tr>
                      ))}
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
  <div className="space-y-6">
    <header className="flex justify-between items-center border-b border-slate-800 pb-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Nómina y Personal</h2>
        <p className="text-sm text-slate-400">Gestión de colaboradores, sueldos y procesamiento de recibos de pago.</p>
      </div>
      <div className="flex gap-3">
        <button 
          onClick={() => setShowAddEmployeeModal(true)} 
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all"
        >
          + Registrar Empleado
        </button>
        <button 
          onClick={() => setShowProcessPayrollModal(true)} 
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all"
        >
          💳 Procesar Pago de Nómina
        </button>
      </div>
    </header>

    {/* Historial de Recibos y Pagos de Nómina */}
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-700 font-bold text-white text-sm">
        📜 Historial de Recibos y Pagos Emitidos
      </div>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
            <th className="p-4">EMPLEADO</th>
            <th className="p-4">PERÍODO / DETALLE</th>
            <th className="p-4">BANCO / MÉTODO</th>
            <th className="p-4">MONTO NETO ($)</th>
            <th className="p-4">MONTO NETO (BS.)</th>
            <th className="p-4">FECHA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/60 text-slate-300">
          {payrollHistory.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-slate-400">
                No hay recibos de nómina procesados aún.
              </td>
            </tr>
          ) : (
            payrollHistory.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-700/20">
                <td className="p-4 font-bold text-white">{item.employee_name}</td>
                <td className="p-4 text-slate-300">{item.period}</td>
                <td className="p-4 font-semibold text-blue-400">{item.bank_name || 'Efectivo / Divisas'}</td>
                <td className="p-4 text-emerald-400 font-bold">${Number(item.net_amount || 0).toFixed(2)}</td>
                <td className="p-4 font-mono text-slate-300">Bs. {(Number(item.net_amount || 0) * currentRate).toFixed(2)}</td>
                <td className="p-4 text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
)}


{showAddEmployeeModal && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-slate-100">
      <div className="flex justify-between items-center border-b border-slate-700 pb-3">
        <h3 className="text-lg font-bold text-white">👤 Registrar Nuevo Empleado</h3>
        <button onClick={() => setShowAddEmployeeModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
      </div>

      <form onSubmit={handleAddEmployee} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nombre *</label>
            <input type="text" required placeholder="Ej: Juan" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Apellido *</label>
            <input type="text" required placeholder="Ej: Pérez" value={employeeLastName} onChange={(e) => setEmployeeLastName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">C.I. / Identificación *</label>
            <input type="text" required placeholder="Ej: V-12345678" value={employeeCi} onChange={(e) => setEmployeeCi(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Cargo *</label>
            <input type="text" required placeholder="Ej: Vendedor / Encargado" value={employeeRole} onChange={(e) => setEmployeeRole(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Sueldo Base ($) *</label>
            <input type="number" step="0.01" required value={employeeSalary} onChange={(e) => setEmployeeSalary(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-amber-400 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Frecuencia de Pago</label>
            <select value={employeeFrequency} onChange={(e) => setEmployeeFrequency(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white">
              <option value="Quincenal">Quincenal</option>
              <option value="Semanal">Semanal</option>
              <option value="Mensual">Mensual</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={() => setShowAddEmployeeModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs">Cancelar</button>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs">Guardar Empleado</button>
        </div>
      </form>
    </div>
  </div>
)}

{/* 💳 MODAL: PROCESAR RECIBO DE PAGO DE NÓMINA (CON BANCO EMISOR) */}
{showProcessPayrollModal && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 text-slate-100">
      <div className="flex justify-between items-center border-b border-slate-700 pb-3">
        <h3 className="text-lg font-bold text-white">💳 Procesar Recibo de Pago de Nómina</h3>
        <button onClick={() => setShowProcessPayrollModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
      </div>

      <form onSubmit={handleProcessPayroll} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Seleccionar Empleado *</label>
            <select 
              required 
              value={payrollEmployeeId} 
              onChange={(e) => handleSelectEmployeeForPayroll(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
            >
              <option value="">Seleccione un empleado...</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.name} {emp.last_name} - {emp.role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Sueldo Base a Pagar ($)</label>
            <input type="number" step="0.01" value={payrollBaseSalary} onChange={(e) => setPayrollBaseSalary(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Bonos / Incentivos ($)</label>
            <input type="number" step="0.01" value={payrollBonuses} onChange={(e) => setPayrollBonuses(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-emerald-400 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Comisiones por Ventas ($)</label>
            <input type="number" step="0.01" value={payrollCommissions} onChange={(e) => setPayrollCommissions(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-blue-400 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Deducciones / Adelantos ($)</label>
            <input type="number" step="0.01" value={payrollDeductions} onChange={(e) => setPayrollDeductions(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-rose-400 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Período / Detalle *</label>
            <input type="text" required placeholder="Ej: 1era Quincena Octubre 2026" value={payrollPeriod} onChange={(e) => setPayrollPeriod(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Banco / Método de Pago *</label>
            <select required value={payrollBank} onChange={(e) => setPayrollBank(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-amber-400 font-bold">
              <option value="">Seleccione banco o método...</option>
              <option value="Banesco (Pago Móvil / Transferencia)">Banesco</option>
              <option value="Banco Mercantil">Banco Mercantil</option>
              <option value="Banco de Venezuela">Banco de Venezuela</option>
              <option value="BNC (Banco Nacional de Crédito)">BNC</option>
              <option value="Divisas en Efectivo ($)">Divisas en Efectivo ($)</option>
              <option value="Zelle">Zelle</option>
            </select>
          </div>
        </div>

        {/* Resumen del Neto a Pagar */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 block uppercase font-semibold">Monto Neto a Transferir / Entregar</span>
            <span className="text-2xl font-black text-emerald-400">
              ${(Number(payrollBaseSalary || 0) + Number(payrollBonuses || 0) + Number(payrollCommissions || 0) - Number(payrollDeductions || 0)).toFixed(2)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-mono">Tasa BCV: Bs. {currentRate}</span>
            <span className="text-sm font-bold text-slate-300 font-mono">
              Bs. {((Number(payrollBaseSalary || 0) + Number(payrollBonuses || 0) + Number(payrollCommissions || 0) - Number(payrollDeductions || 0)) * currentRate).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={() => setShowProcessPayrollModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs">Cancelar</button>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs">Procesar y Emitir Pago</button>
        </div>
      </form>
    </div>
  </div>
)}

{currentView === 'clients' && (
            <>
              <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Clientes</h2>
                  <p className="text-sm text-slate-400">Directorio de clientes y asignación de vendedores.</p>
                </div>

              </header>

              {/* Formulario de Registro */}
              <div className="bg-slate-900 border border-slate-900 p-6 rounded-xl mb-8 shadow-sm">
<button
  onClick={() => setShowAddClientModal(true)} // <-- Esto es obligatorio para que abra el modal
  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg flex items-center space-x-2"
>
  <span>+ Nuevo Cliente</span>
</button>
              </div>

              {/* Tabla de Clientes */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-700/50 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-4">CÓDIGO</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">RIF</th>
                      <th className="p-4">Vendedor Asignado</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4">Dirección</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {clients.length === 0 ? (
                      <tr><td colSpan={7} className="p-6 text-center text-slate-400">Sin clientes registrados.</td></tr>
                    ) : (
                      clients.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-700/20">
                          <td className="p-4 font-mono text-blue-400 font-bold">{c.client_code || `CLI-${String(c.id).slice(0, 4).toUpperCase()}`}</td>
                          <td className="p-4 font-medium text-white">{c.name}</td>
                          <td className="p-4 text-slate-400 font-mono">{c.document_id || 'N/A'}</td>
                          <td className="p-4 text-emerald-400 font-medium">
                            {sellers.find((s) => s.id === c.assigned_seller_id)?.full_name || 'Sin Asignar'}
                          </td>
                          <td className="p-4 text-slate-300">{c.email || 'N/A'} {c.phone ? `/ ${c.phone}` : ''}</td>
                          <td className="p-4 text-slate-400">{c.address || 'N/A'}</td>
                          <td className="p-4 text-center">
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
{showAddClientModal && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
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
              placeholder="CLI-0001" 
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
              placeholder="Comercial C.A." 
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
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">📍 Ruta de Reparto *</label>
            <input 
              type="text" 
              required 
              placeholder="Ej: Ruta Norte" 
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
              {sellers.map((s) => (<option key={s.id} value={s.id}>{s.full_name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">🗺️ Coordenadas / GPS</label>
            <input 
              type="text" 
              placeholder="Enlace o coordenadas" 
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
              value={clientCreditLimit} 
              onChange={(e) => setClientCreditLimit(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-amber-400 font-bold text-sm" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">📉 Mínimo de Compra Mensual ($ USD)</label>
            <input 
              type="number" 
              step="0.01" 
              value={clientMinSales} 
              onChange={(e) => setClientMinSales(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-blue-400 font-bold text-sm" 
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button 
            type="button" 
            onClick={() => setShowAddClientModal(false)} 
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={loadingClient} 
            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs"
          >
            {loadingClient ? 'Guardando...' : 'Guardar Cliente'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}


              {/* Modal de Modificación de Cliente */}
              {editingClient && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                      <h3 className="text-lg font-bold text-white">Editar Cliente ({editingClient.name})</h3>
                      <button onClick={() => setEditingClient(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
                    </div>

                    <form onSubmit={handleUpdateClient} className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Código</label>
                          <input
                            type="text"
                            value={editingClient.client_code || ''}
                            onChange={(e) => setEditingClient({ ...editingClient, client_code: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">RIF / DNI</label>
                          <input
                            type="text"
                            value={editingClient.document_id || ''}
                            onChange={(e) => setEditingClient({ ...editingClient, document_id: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre / Razón Social</label>
                        <input
                          type="text"
                          required
                          value={editingClient.name || ''}
                          onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Vendedor Asignado</label>
                        <select
                          value={editingClient.assigned_seller_id || ''}
                          onChange={(e) => setEditingClient({ ...editingClient, assigned_seller_id: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        >
                          <option value="">-- Sin Asignar --</option>
                          {sellers.map((s) => (
                            <option key={s.id} value={s.id}>{s.full_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Correo</label>
                          <input
                            type="email"
                            value={editingClient.email || ''}
                            onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Teléfono</label>
                          <input
                            type="text"
                            value={editingClient.phone || ''}
                            onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Dirección</label>
                        <input
                          type="text"
                          value={editingClient.address || ''}
                          onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>

                      <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
                        <button
                          type="button"
                          onClick={() => setEditingClient(null)}
                          className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-4 py-2 rounded-lg text-xs"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={loadingClient}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-lg text-xs"
                        >
                          {loadingClient ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

{showAddClientModal && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
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
              placeholder="CLI-0001" 
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
              placeholder="Comercial C.A." 
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
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">📍 Ruta de Reparto *</label>
            <input 
              type="text" 
              required 
              placeholder="Ej: Ruta Norte" 
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
              {sellers.map((s) => (<option key={s.id} value={s.id}>{s.full_name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">🗺️ Coordenadas / GPS</label>
            <input 
              type="text" 
              placeholder="Enlace o coordenadas" 
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
              value={clientCreditLimit} 
              onChange={(e) => setClientCreditLimit(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-amber-400 font-bold text-sm" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">📉 Mínimo de Compra Mensual ($ USD)</label>
            <input 
              type="number" 
              step="0.01" 
              value={clientMinSales} 
              onChange={(e) => setClientMinSales(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-blue-400 font-bold text-sm" 
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button 
            type="button" 
            onClick={() => setShowAddClientModal(false)} 
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={loadingClient} 
            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs"
          >
            {loadingClient ? 'Guardando...' : 'Guardar Cliente'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
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
        placeholder="Ej. Corporación Empresa C.A."
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
      />
    </div>

    {/* 👇 NUEVO CAMPO: Selector de País / Paquete Contable */}
<div>
  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Paquete Contable / País</label>
  <select
    value={countryPackage}
    onChange={(e) => setCountryPackage(e.target.value)}
    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
  >
    <option value="VE">🇻🇪 Venezuela (IVA 16% / BCV / RIF)</option>
    <option value="CO">🇨🇴 Colombia (IVA 19% / DIAN / NIT)</option>
    <option value="AR">🇦🇷 Argentina (IVA 21% / AFIP / CUIT)</option>
    <option value="CL">🇨🇱 Chile (IVA 19% / SII / RUT)</option>
    <option value="PE">🇵🇪 Perú (IVA 18% / SUNAT / RUC)</option>
    <option value="MX">🇲🇽 México (IVA 16% / SAT / RFC)</option>
  </select>
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