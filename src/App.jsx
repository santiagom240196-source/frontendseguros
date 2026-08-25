import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProvider, useUser } from './context/UserContext';
import { BackendProvider } from './context/BackendContext';
import { fetchAllHasuraData } from './services/hasuraService';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList';
import PolicyList from './components/PolicyList';
import PaymentManagement from './components/PaymentManagement';
import CommissionReport from './components/CommissionReport';
import ClaimsManagement from './components/ClaimsManagement';
import CompaniesManagement from './components/CompaniesManagement';
import RequestsManagement from './components/RequestsManagement';
import Settings from './components/Settings';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { currentUser, isDemo } = useUser();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isLoadingData, setIsLoadingData] = useState(true);

  /* Shared state for policies to reflect movements in Dashboard */
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [shouldOpenCreateModal, setShouldOpenCreateModal] = useState(false);
  const [shouldOpenPaymentModal, setShouldOpenPaymentModal] = useState(false);

  // Persistent reference for Admin data
  const adminCompaniesRef = useRef(null);

  // Exclusively database state - initialized empty, populated strictly from Hasura PostgreSQL
  const [companies, setCompanies] = useState(() => {
    const saved = localStorage.getItem('app_companies');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.length < 10) return parsed;
      } catch (e) {}
    }
    return [{ name: 'La Colonial de Seguros', domain: 'lacolonial.com.do' }];
  });

  const [clients, setClients] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [claims, setClaims] = useState([]);
  const [requests, setRequests] = useState([]);
  const [agentCodes, setAgentCodes] = useState([
    { id: 1, agent: 'Santiago Morales y Asociados, S.R.L.', insurer: 'Humano Seguros', code: '76713', notes: 'Código oficial Humano' },
    { id: 2, agent: 'Santiago Morales y Asociados, S.R.L.', insurer: 'La Colonial de Seguros', code: '8055', notes: 'Código oficial La Colonial' },
    { id: 4, agent: 'Raquel Rodríguez', insurer: 'La Colonial de Seguros', code: '897', notes: 'Código oficial Raquel Rodríguez' }
  ]);

  // Fetch exclusively real live data from Hasura
  useEffect(() => {
    let isMounted = true;

    async function loadHasuraData() {
      setIsLoadingData(true);
      try {
        const liveData = await fetchAllHasuraData(isDemo);
        if (isMounted && liveData) {
          setClients(liveData.clients || []);
          setPolicies(liveData.policies || []);
          setPayments(liveData.payments || []);
          setClaims(liveData.claims || []);
          setRequests(liveData.requests || []);
          if (liveData.agentCodes && liveData.agentCodes.length > 0) {
            setAgentCodes(liveData.agentCodes);
          }
          if (liveData.companies && liveData.companies.length > 0) {
            setCompanies(liveData.companies);
          }
        }
      } catch (err) {
        console.error('Error cargando datos de Hasura:', err);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    }

    loadHasuraData();
    return () => { isMounted = false; };
  }, [isDemo]);

  // Save changes ONLY if current user is NOT in demo mode (Santiago Morales / Admin)
  useEffect(() => {
    if (!isDemo && companies.length > 0) {
      localStorage.setItem('app_companies', JSON.stringify(companies));
      adminCompaniesRef.current = companies;
    }
  }, [companies, isDemo]);

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

  const renderPage = () => {
    if (isLoadingData) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: '1rem',
          color: 'var(--primary)'
        }}>
          <Loader2 size={40} className="animate-spin" />
          <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>Cargando datos de la base de datos Hasura...</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sincronizando clientes y pólizas reales de PostgreSQL</div>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard
          policies={policies}
          clients={clients}
          claims={claims}
          payments={payments}
          requests={requests}
          onNavigateToPolicy={navigateToPolicy}
          onNavigate={setCurrentPage}
          onNavigateToCreatePolicy={navigateToCreatePolicy}
          onNavigateToPaymentCreation={navigateToPaymentCreation}
        />;
      case 'clients':
        return <ClientList 
          clients={clients} 
          setClients={setClients} 
          policies={policies} 
          payments={payments} 
          claims={claims} 
          agentCodes={agentCodes}
          onNavigateToPolicy={navigateToPolicy}
          onNavigateToClaim={(claimId) => setCurrentPage('claims')}
        />;
      case 'policies':
        return <PolicyList
          policies={policies}
          setPolicies={setPolicies}
          clients={clients}
          setClients={setClients}
          payments={payments}
          claims={claims}
          agentCodes={agentCodes}
          companies={companies}
          initialSelectedId={selectedPolicyId}
          onClearSelection={() => setSelectedPolicyId(null)}
          shouldOpenCreateModal={shouldOpenCreateModal}
          onDetailedActionHandled={() => setShouldOpenCreateModal(false)}
          onNavigateToClaim={(claimId) => setCurrentPage('claims')}
        />;
      case 'requests':
        return <RequestsManagement
          requests={requests}
          setRequests={setRequests}
          policies={policies}
          setPolicies={setPolicies}
          clients={clients}
          companies={companies}
          agentCodes={agentCodes}
        />;
      case 'payments':
        return <PaymentManagement
          policies={policies}
          payments={payments}
          setPayments={setPayments}
          clients={clients}
          shouldOpenPaymentModal={shouldOpenPaymentModal}
          onDetailedActionHandled={() => setShouldOpenPaymentModal(false)}
        />;
      case 'commissions':
        return <CommissionReport payments={payments} policies={policies} agentCodes={agentCodes} />;
      case 'companies':
        return <CompaniesManagement 
          policies={policies} 
          payments={payments} 
          claims={claims} 
          companies={companies}
          setCompanies={setCompanies}
          agentCodes={agentCodes}
          setAgentCodes={setAgentCodes}
        />;
      case 'claims':
        return <ClaimsManagement policies={policies} claims={claims} setClaims={setClaims} />;
      case 'settings':
        return <Settings 
          clients={clients}
          policies={policies}
          payments={payments}
          claims={claims}
          companies={companies}
          agentCodes={agentCodes}
          setAgentCodes={setAgentCodes}
          onDataImported={async () => {
            const liveData = await fetchAllHasuraData(isDemo);
            if (liveData) {
              setClients(liveData.clients || []);
              setPolicies(liveData.policies || []);
              setPayments(liveData.payments || []);
              setClaims(liveData.claims || []);
              setRequests(liveData.requests || []);
              if (liveData.companies?.length > 0) setCompanies(liveData.companies);
            }
          }}
          onNavigate={setCurrentPage}
        />;
      default:
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
    <Layout 
      activePage={currentPage} 
      onNavigate={setCurrentPage}
      clients={clients}
      policies={policies}
      requests={requests}
      onNavigateToPolicy={navigateToPolicy}
    >
      {renderPage()}
    </Layout>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #f87171', borderRadius: '12px', padding: '1.5rem', color: '#991b1b' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.4rem' }}>🚨 Ocurrió un error al cargar la vista</h2>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>{this.state.error?.toString()}</p>
            {this.state.errorInfo?.componentStack && (
              <pre style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', overflowX: 'auto', maxHeight: '200px' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
              style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
            >
              🔄 Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [dataVersion, setDataVersion] = useState(0);

  const handleResetData = useCallback((isDemoUser) => {
    setDataVersion(v => v + 1);
  }, []);

  return (
    <ErrorBoundary>
      <BackendProvider onSyncRequested={() => setDataVersion(v => v + 1)}>
        <UserProvider key={dataVersion} onResetData={handleResetData}>
          <AppContent key={dataVersion} />
        </UserProvider>
      </BackendProvider>
    </ErrorBoundary>
  );
}

export default App;
