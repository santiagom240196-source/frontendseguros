import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList';
import PolicyList from './components/PolicyList';
import PaymentManagement from './components/PaymentManagement';
import CommissionReport from './components/CommissionReport';
import ClaimsManagement from './components/ClaimsManagement';
import CompaniesManagement from './components/CompaniesManagement';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  /* Shared state for policies to reflect movements in Dashboard */
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [shouldOpenCreateModal, setShouldOpenCreateModal] = useState(false);
  const [shouldOpenPaymentModal, setShouldOpenPaymentModal] = useState(false);

  const navigateToPolicy = (id) => {
    setSelectedPolicyId(id);
    setCurrentPage('policies');
  };

  const navigateToCreatePolicy = () => {
    setShouldOpenCreateModal(true);
    setCurrentPage('policies');
  };

  const navigateToPaymentCreation = () => {
    setShouldOpenPaymentModal(true);
    setCurrentPage('payments');
  };

  // Companies Data State
  const [companies, setCompanies] = useState(() => {
    const saved = localStorage.getItem('app_companies');
    if (saved) return JSON.parse(saved);
    return [
      { name: 'Seguros Universal', domain: 'universal.com.do' },
      { name: 'Humano Seguros', domain: 'seguroshumano.com' },
      { name: 'Mapfre BHD Seguros', domain: 'mapfre.com.do' },
      { name: 'La Colonial de Seguros', domain: 'lacolonial.com.do' },
      { name: 'Seguros Reservas', domain: 'segurosreservas.com' },
      { name: 'Seguros Sura', domain: 'sura.com.do' },
      { name: 'General de Seguros', domain: 'generaldeseguros.com.do' },
      { name: 'Dominicana de Seguros', domain: 'dominicanadeseguros.com' },
      { name: 'Patria Compañía de Seguros', domain: 'segurospatria.com.do' },
      { name: 'Aspirante Seguros', domain: 'aspirante.com.do' },
      { name: 'Seguros Pepín', domain: 'segurospepin.com' },
      { name: 'La Monumental de Seguros', domain: 'lamonumental.com.do' },
      { name: 'Angloamericana de Seguros', domain: 'angloamericana.com.do' },
      { name: 'CoopSeguros', domain: 'coopseguros.coop.do' },
      { name: 'Seguros Crecer', domain: 'crecer.com.do' },
      { name: 'K&M Seguros', domain: 'kmseguros.com' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('app_companies', JSON.stringify(companies));
  }, [companies]);

  // Clients and Policies Data
  const [clients, setClients] = useState([
    { id: 1, name: 'Juan Pérez', personType: 'Física', documentId: '001-1234567-8', insurerCode: 'UNI-88273', email: 'juan.perez@email.com', phone: '809-555-0101', address: 'Calle 1 #23', city: 'Santo Domingo Este', sector: 'Alma Rosa I', policy: 'Auto - Full', status: 'Active', folderLink: '#' },
    { id: 2, name: 'María Gonzalez', personType: 'Física', documentId: '002-8765432-1', insurerCode: 'HUM-30192', email: 'maria.g@email.com', phone: '829-555-0202', address: 'Av. Winston Churchill', city: 'Distrito Nacional', sector: 'Piantini', policy: 'Vida - Term', status: 'Pending', folderLink: '#' },
    { id: 3, name: 'Carlos Ruiz', personType: 'Física', documentId: '001-9988776-5', insurerCode: 'MAP-10293', email: 'carlos.r@email.com', phone: '809-555-0303', address: '', city: 'Santiago', sector: 'Los Jardines', policy: 'Salud - Gold', status: 'Active', folderLink: '#' },
    { id: 4, name: 'Ana Lopez', personType: 'Física', documentId: '003-4455667-8', insurerCode: 'COL-55610', email: 'ana.l@email.com', phone: '849-555-0404', address: 'Res. Las Palmas', city: 'Santo Domingo Oeste', sector: 'Las Caobas', policy: 'Propiedad', status: 'Expired', folderLink: '#' },
    { id: 5, name: 'Pedro Martinez', personType: 'Física', documentId: '001-2233445-6', insurerCode: 'UNI-99482', email: 'pedro.m@email.com', phone: '809-555-0505', address: 'Calle El Sol', city: 'Santiago', sector: 'Villa Olga', policy: 'Auto - Basic', status: 'Active', folderLink: '#' },
    { id: 6, name: 'Empresa ABC', personType: 'Jurídica', documentId: '1-31-45678-9', insurerCode: 'RES-77291', email: 'contacto@empresaabc.com', phone: '809-555-0909', address: 'Zona Industrial', city: 'Santo Domingo Oeste', sector: 'Zona Industrial', policy: 'Incendio', status: 'Active', folderLink: '#' },
  ]);

  const [policies, setPolicies] = useState([
    {
      id: 'POL-001',
      client: 'Juan Pérez',
      type: 'Auto',
      insurer: 'Seguros Universal',
      startDate: '2026-03-15',
      renewalFrequency: 'Anual',
      insuredAmount: 'RD$ 1,500,000',
      amount: 'RD$ 25,000',
      details: 'Cobertura Completa (Full), Deducible RD$ 5,000',
      movements: [
        { id: 1, date: '2025-03-15', type: 'Emisión', description: 'Emisión original de la póliza', evidence: 'Propuesta.pdf' },
        { id: 2, date: '2025-09-10', type: 'Endoso', description: 'Inclusión de conductor adicional', evidence: 'Licencia_Hijo.jpg' }
      ]
    },
    { id: 'POL-002', client: 'María Gonzalez', type: 'Vida', insurer: 'Humano Seguros', startDate: '2026-04-20', renewalFrequency: 'Anual', insuredAmount: 'RD$ 500,000', amount: 'RD$ 12,000', details: 'Vida a Término 20 años', movements: [] },
    { id: 'POL-003', client: 'Carlos Ruiz', type: 'Salud', insurer: 'Mapfre BHD Seguros', startDate: '2026-02-28', renewalFrequency: 'Anual', insuredAmount: 'RD$ 2,000,000', amount: 'RD$ 45,000', details: 'Plan Gold - Internacional', movements: [] },
    { id: 'POL-004', client: 'Empresa ABC', type: 'Incendio', insurer: 'Seguros Reservas', startDate: '2025-09-10', renewalFrequency: 'Anual', insuredAmount: 'RD$ 10,000,000', amount: 'RD$ 150,000', details: 'Local comercial y almacén', movements: [] },
    { id: 'POL-005', client: 'Ana Lopez', type: 'Propiedad', insurer: 'La Colonial de Seguros', startDate: '2024-12-01', renewalFrequency: 'Anual', insuredAmount: 'RD$ 3,000,000', amount: 'RD$ 8,500', details: 'Apartamento Residencial', movements: [] },
  ]);

  const [payments, setPayments] = useState([
    { id: 'PAY-001', client: 'Juan Pérez', policyId: 'POL-001', policy: 'Auto - Seguros Universal (POL-001)', date: '2026-02-15', amount: 'RD$ 2,500', amountNum: 2500, status: 'Paid', type: 'Renovación' },
    { id: 'PAY-002', client: 'María Gonzalez', policyId: 'POL-002', policy: 'Vida - Humano Seguros (POL-002)', date: '2026-02-20', amount: 'RD$ 1,200', amountNum: 1200, status: 'Pending', type: 'Cuota Mensual' },
    { id: 'PAY-003', client: 'Empresa ABC', policyId: 'POL-004', policy: 'Incendio - Seguros Reservas (POL-004)', date: '2026-02-10', amount: 'RD$ 15,000', amountNum: 15000, status: 'Paid', type: 'Anual' },
    { id: 'PAY-004', client: 'Carlos Ruiz', policyId: 'POL-003', policy: 'Salud - Mapfre BHD Seguros (POL-003)', date: '2026-02-28', amount: 'RD$ 4,500', amountNum: 4500, status: 'Overdue', type: 'Trimestral' },
    { id: 'PAY-005', client: 'Ana Lopez', policyId: 'POL-005', policy: 'Propiedad - La Colonial de Seguros (POL-005)', date: '2026-03-01', amount: 'RD$ 850', amountNum: 850, status: 'Pending', type: 'Semestral' },
  ]);

  const [claims, setClaims] = useState([
    {
      id: 'SIN-001', client: 'Juan Pérez', policy: 'POL-001',
      policyDesc: 'Auto – Full · Seguros Universal',
      type: 'Auto – Colisión', date: '2026-02-10', reportDate: '2026-02-10',
      description: 'Colisión frontal en la Autopista Duarte. Vehículo con daños en el frente y bolsas de aire activadas.',
      amount: 'RD$ 85,000', amountNum: 85000,
      status: 'EnProceso', adjuster: 'Carlos Mendez', phone: '809-555-1234',
      attachments: ['Fotos_accidente.zip', 'Informe_policial.pdf'],
      notes: 'Pendiente inspección del ajustador el 25/02/2026.'
    },
    {
      id: 'SIN-002', client: 'María Gonzalez', policy: 'POL-002',
      policyDesc: 'Vida – Term · Humano',
      type: 'Salud – Hospitalización', date: '2026-02-14', reportDate: '2026-02-15',
      description: 'Hospitalización de 3 días por apendicitis aguda en Clínica Abreu.',
      amount: 'RD$ 42,000', amountNum: 42000,
      status: 'Abierto', adjuster: '', phone: '',
      attachments: ['Factura_clinica.pdf'],
      notes: ''
    },
    {
      id: 'SIN-003', client: 'Empresa ABC', policy: 'POL-004',
      policyDesc: 'Incendio · Seguros Reservas',
      type: 'Propiedad – Incendio', date: '2026-01-20', reportDate: '2026-01-20',
      description: 'Incendio parcial en bodega secundaria. Daños estimados en mercancía y estructura.',
      amount: 'RD$ 320,000', amountNum: 320000,
      status: 'Cerrado', adjuster: 'Ana Reyes', phone: '809-555-5678',
      attachments: ['Informe_bomberos.pdf', 'Tasación.pdf', 'Acuerdo_pago.pdf'],
      notes: 'Reclamación liquidada. Cheque emitido el 15/02/2026.'
    },
    {
      id: 'SIN-004', client: 'Carlos Ruiz', policy: 'POL-003',
      policyDesc: 'Salud Gold · Mapfre',
      type: 'Auto – Robo', date: '2026-02-18', reportDate: '2026-02-19',
      description: 'Robo total del vehículo Toyota Corolla 2022 en el Polígono Central.',
      amount: 'RD$ 1,200,000', amountNum: 1200000,
      status: 'Abierto', adjuster: '', phone: '',
      attachments: ['Denuncia_policial.pdf'],
      notes: 'Pendiente asignación de ajustador.'
    },
    {
      id: 'SIN-005', client: 'Ana Lopez', policy: 'POL-005',
      policyDesc: 'Propiedad · La Colonial',
      type: 'Propiedad – Robo', date: '2026-01-05', reportDate: '2026-01-06',
      description: 'Robo de equipos electrónicos en apartamento. Seguros adeudaban póliza vencida.',
      amount: 'RD$ 95,000', amountNum: 95000,
      status: 'Rechazado', adjuster: 'Pedro Gil', phone: '809-555-9012',
      attachments: ['Denuncia.pdf'],
      notes: 'Rechazado por póliza expirada al momento del evento.'
    },
  ]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard
          policies={policies}
          onNavigateToPolicy={navigateToPolicy}
          onNavigate={setCurrentPage}
          onNavigateToCreatePolicy={navigateToCreatePolicy}
          onNavigateToPaymentCreation={navigateToPaymentCreation}
        />;
      case 'clients':
        return <ClientList clients={clients} setClients={setClients} policies={policies} payments={payments} />;
      case 'policies':
        return <PolicyList
          policies={policies}
          setPolicies={setPolicies}
          clients={clients}
          setClients={setClients}
          payments={payments}
          companies={companies}
          initialSelectedId={selectedPolicyId}
          onClearSelection={() => setSelectedPolicyId(null)}
          shouldOpenCreateModal={shouldOpenCreateModal}
          onDetailedActionHandled={() => setShouldOpenCreateModal(false)}
        />;
      case 'payments':
        return <PaymentManagement
          policies={policies}
          payments={payments}
          setPayments={setPayments}
          shouldOpenPaymentModal={shouldOpenPaymentModal}
          onDetailedActionHandled={() => setShouldOpenPaymentModal(false)}
        />;
      case 'commissions':
        return <CommissionReport payments={payments} policies={policies} />;
      case 'companies':
        return <CompaniesManagement 
          policies={policies} 
          payments={payments} 
          claims={claims} 
          companies={companies}
          setCompanies={setCompanies}
        />;
      case 'claims':
        return <ClaimsManagement policies={policies} claims={claims} setClaims={setClaims} />;
      default:
        // Fallback to Dashboard or a "Coming Soon" page
        return <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Sección en Construcción</h2>
          <p>Esta funcionalidad estará disponible pronto.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setCurrentPage('dashboard')}>
            Volver al Inicio
          </button>
        </div>;
    }
  };

  return (
    <Layout activePage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
