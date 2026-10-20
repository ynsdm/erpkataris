
{currentView === 'configuracion' && (
  <div className="space-y-6">
    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
      <div>
        <h2 className="text-2xl font-bold text-white">⚙️ Configuración del Sistema</h2>
        <p className="text-slate-400 text-sm">Administración general, usuarios, perfiles y parámetros del negocio.</p>
      </div>
    </div>

    {/* Sub-Pestañas de Navegación */}
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

    {/* SUB-PESTAÑA 1: EMPRESA */}
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

    {/* SUB-PESTAÑA 2: TICKETS */}
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

    {/* SUB-PESTAÑA 3: USUARIOS */}
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

    {/* SUB-PESTAÑA 4: ROLES Y PERMISOS */}
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

    {/* SUB-PESTAÑA 5: MÉTODOS DE PAGO */}
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
  <div>
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
                  {/* ... tus celdas <td> ... */}
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
                  const subUSD = Number(item.subtotal || 0);
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