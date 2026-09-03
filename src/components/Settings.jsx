import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, Upload, Download, Database, CheckCircle2, AlertTriangle, 
  X, RefreshCw, Layers, Users, FileText, DollarSign, Shield, ArrowRight, 
  Server, Key, Check, Info, FileUp, Sparkles, Loader2, Briefcase, Plus, Trash2, Edit, Building2, HardDrive,
  Eye, EyeOff, UserCheck, ShieldCheck, ShieldAlert, Lock, UserPlus, LogIn, User, LogOut
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useBackend } from '../context/BackendContext';
import { 
  parseExcelFile, downloadSampleExcelTemplate, exportDatabaseToExcel, 
  importExcelDataToHasura 
} from '../services/excelService';
import { 
  insertAgenteCodigoHasura, updateAgenteCodigoHasura, deleteAgenteCodigoHasura 
} from '../services/hasuraService';
import { formatMoney, formatDateToDDMMYYYY } from '../utils/policyHelpers';
import InsurerLogo from './InsurerLogo';
import HasuraSettingsModal from './HasuraSettingsModal';

const Settings = ({ 
  clients = [], 
  policies = [], 
  payments = [], 
  claims = [], 
  companies = [], 
  agentCodes = [], 
  setAgentCodes, 
  onDataImported, 
  onNavigate 
}) => {
  const { isDemo, currentUser, users = [], switchUser, loginWithCredentials, updateUser, addUser, deleteUser, logout } = useUser();
  const { status: backendStatus, latency, config, checkConnection, triggerSync } = useBackend();

  const [activeTab, setActiveTab] = useState('users'); // 'users', 'carteras', 'import', 'database', 'export'
  const [showHasuraModal, setShowHasuraModal] = useState(false);

  // Users Management State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'Administrador Principal',
    email: '',
    isDemo: false,
    description: ''
  });
  const [testLoginForm, setTestLoginForm] = useState({ username: '', password: '' });
  const [testLoginResult, setTestLoginResult] = useState(null);

  // Agent Codes Management State
  const [codeSearchTerm, setCodeSearchTerm] = useState('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('ALL');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [editingCodeItem, setEditingCodeItem] = useState(null);
  const [codeForm, setCodeForm] = useState({
    agent: 'Santiago Morales y Asociados, S.R.L.',
    customAgent: '',
    insurer: 'Humano Seguros',
    code: '',
    notes: ''
  });

  // Excel Import State
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [previewTab, setPreviewTab] = useState('clients'); // 'clients', 'policies', 'payments'
  const [importProgress, setImportProgress] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Backup & Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      setExportMessage({ type: 'info', text: 'Generando archivo Excel consolidado...' });

      // Small delay for UI smoothness
      await new Promise(r => setTimeout(r, 200));

      const filename = exportDatabaseToExcel({
        clients,
        policies,
        payments,
        claims,
        companies,
        agentCodes
      });

      setExportMessage({ 
        type: 'success', 
        text: `¡Copia de seguridad descargada exitosamente como "${filename}"!` 
      });
    } catch (err) {
      console.error('Error generando copia de seguridad:', err);
      setExportMessage({ 
        type: 'error', 
        text: `Error al generar la copia de seguridad: ${err.message || 'Error desconocido'}` 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJsonBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        company: 'Santiago Morales y Asociados, S.R.L.',
        counts: {
          clients: clients.length,
          policies: policies.length,
          payments: payments.length,
          claims: claims.length,
          companies: companies.length,
          agentCodes: agentCodes.length
        },
        clients,
        policies,
        payments,
        claims,
        companies,
        agentCodes
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Backup_SantiagoMorales_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setExportMessage({
        type: 'success',
        text: '¡Respaldo JSON descargado correctamente!'
      });
    } catch (err) {
      setExportMessage({
        type: 'error',
        text: `Error al exportar JSON: ${err.message}`
      });
    }
  };

  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setErrorMessage('Por favor selecciona un archivo Excel válido (.xlsx, .xls o .csv).');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);
    setParsedData(null);
    setImportSummary(null);

    try {
      const result = await parseExcelFile(file);
      if (result.clients.length === 0 && result.policies.length === 0) {
        setErrorMessage('No se encontraron registros de clientes o pólizas en el archivo. Verifica el formato o descarga la plantilla.');
      } else {
        setParsedData(result);
        if (result.clients.length === 0 && result.policies.length > 0) {
          setPreviewTab('policies');
        } else {
          setPreviewTab('clients');
        }
      }
    } catch (err) {
      console.error('Error parseando Excel:', err);
      setErrorMessage('Error al leer el archivo Excel: ' + (err.message || 'Formato no soportado'));
    } finally {
      setIsParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedData) return;
    setIsImporting(true);
    setErrorMessage(null);

    try {
      const summary = await importExcelDataToHasura(parsedData, isDemo, (progress) => {
        setImportProgress(progress);
      });

      setImportSummary(summary);
      setParsedData(null);

      // Trigger global data refresh so all views update immediately
      if (onDataImported) {
        await onDataImported();
      }
      if (triggerSync) {
        triggerSync();
      }
    } catch (err) {
      console.error('Error importando a Hasura:', err);
      setErrorMessage('Ocurrió un error durante la importación: ' + (err.message || 'Error de conexión'));
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleOpenAddCodeModal = () => {
    setEditingCodeItem(null);
    setCodeForm({
      agent: 'Santiago Morales y Asociados, S.R.L.',
      customAgent: '',
      insurer: companies[0]?.name || 'Humano Seguros',
      code: '',
      notes: ''
    });
    setShowCodeModal(true);
  };

  const handleEditCode = (item) => {
    setEditingCodeItem(item);
    setCodeForm({
      agent: item.agente,
      customAgent: '',
      insurer: item.compania,
      code: item.codigo,
      notes: item.notas || ''
    });
    setShowCodeModal(true);
  };

  const handleSaveCodeSubmit = async (e) => {
    e.preventDefault();
    const finalAgent = codeForm.agent === '__OTHER__' ? codeForm.customAgent.trim() : codeForm.agent.trim();
    const finalInsurer = codeForm.insurer.trim();
    const finalCode = codeForm.code.trim();
    const finalNotes = codeForm.notes.trim();

    if (!finalAgent || !finalInsurer || !finalCode) {
      alert('Por favor completa todos los campos obligatorios: Agente, Aseguradora y Código.');
      return;
    }

    setIsSavingCode(true);
    try {
      if (editingCodeItem) {
        // Update
        if (!isDemo) {
          await updateAgenteCodigoHasura(editingCodeItem.id, {
            agente: finalAgent,
            compania: finalInsurer,
            codigo: finalCode,
            notas: finalNotes
          }, isDemo);
        }
        if (setAgentCodes) {
          setAgentCodes(prev => prev.map(c => c.id === editingCodeItem.id ? {
            ...c,
            agente: finalAgent,
            compania: finalInsurer,
            codigo: finalCode,
            notas: finalNotes
          } : c));
        }
        alert('Código de agente en compañía actualizado con éxito.');
      } else {
        // Insert
        let newId = Date.now();
        if (!isDemo) {
          const res = await insertAgenteCodigoHasura({
            agente: finalAgent,
            compania: finalInsurer,
            codigo: finalCode,
            notas: finalNotes
          }, isDemo);
          if (res?.data?.insert_agentes_codigos_one?.id) {
            newId = res.data.insert_agentes_codigos_one.id;
          }
        }
        const newRecord = {
          id: newId,
          agente: finalAgent,
          compania: finalInsurer,
          codigo: finalCode,
          notas: finalNotes,
          created_at: new Date().toISOString()
        };
        if (setAgentCodes) {
          setAgentCodes(prev => [newRecord, ...prev]);
        }
        alert(`Código ${finalCode} registrado con éxito para ${finalAgent} en ${finalInsurer}.`);
      }
      setShowCodeModal(false);
    } catch (err) {
      console.error('Error guardando código de agente:', err);
      alert('Error al guardar el código de compañía: ' + (err.message || ''));
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleDeleteCode = async (id, code, agent, insurer) => {
    if (!window.confirm(`¿Estás seguro de eliminar el código "${code}" de ${agent} en ${insurer}?`)) {
      return;
    }

    try {
      if (!isDemo) {
        await deleteAgenteCodigoHasura(id, isDemo);
      }
      if (setAgentCodes) {
        setAgentCodes(prev => prev.filter(c => c.id !== id));
      }
      alert('Código de compañía eliminado con éxito.');
    } catch (err) {
      console.error('Error eliminando código de agente:', err);
      alert('Error al eliminar código: ' + (err.message || ''));
    }
  };

  const filteredAgentCodes = agentCodes.filter(item => {
    const agentName = item.agente || item.agent || '';
    const companyName = item.compania || item.insurer || '';
    const codeVal = item.codigo || item.code || '';
    const notesVal = item.notas || item.notes || '';

    if (selectedAgentFilter !== 'ALL' && agentName !== selectedAgentFilter) return false;
    if (!codeSearchTerm.trim()) return true;
    const term = codeSearchTerm.toLowerCase();
    return (
      agentName.toLowerCase().includes(term) ||
      companyName.toLowerCase().includes(term) ||
      codeVal.toLowerCase().includes(term) ||
      notesVal.toLowerCase().includes(term)
    );
  });

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleOpenEditUserModal = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || '',
      username: user.username || '',
      password: user.password || '',
      role: user.role || 'Administrador Principal',
      email: user.email || '',
      isDemo: Boolean(user.isDemo),
      description: user.description || ''
    });
    setShowUserModal(true);
  };

  const handleOpenAddUserModal = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      username: '',
      password: '',
      role: 'Agente / Colaborador',
      email: '',
      isDemo: false,
      description: ''
    });
    setShowUserModal(true);
  };

  const handleSaveUserSubmit = (e) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.username.trim() || !userForm.password.trim()) {
      alert('Por favor completa el Nombre, Usuario y Contraseña.');
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, {
        name: userForm.name.trim(),
        username: userForm.username.trim(),
        password: userForm.password.trim(),
        role: userForm.role.trim(),
        email: userForm.email.trim(),
        isDemo: userForm.isDemo,
        description: userForm.description.trim()
      });
      alert(`Usuario "${userForm.username}" actualizado con éxito.`);
    } else {
      addUser({
        name: userForm.name.trim(),
        username: userForm.username.trim(),
        password: userForm.password.trim(),
        role: userForm.role.trim(),
        email: userForm.email.trim(),
        isDemo: userForm.isDemo,
        description: userForm.description.trim()
      });
      alert(`Nuevo usuario "${userForm.username}" creado con éxito.`);
    }

    setShowUserModal(false);
  };

  const handleDeleteUser = (userId, username, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar el usuario "${username}" (${name})?`)) {
      return;
    }
    const res = deleteUser(userId);
    if (!res.success) {
      alert(res.message);
    } else {
      alert('Usuario eliminado con éxito.');
    }
  };

  const handleTestLoginSubmit = (e) => {
    e.preventDefault();
    const res = loginWithCredentials(testLoginForm.username, testLoginForm.password);
    setTestLoginResult(res);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header General */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        backgroundColor: '#ffffff',
        padding: '1.5rem 1.75rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '800',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Panel de Control
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Versión Sistema 2.5
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', margin: 0, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Database size={26} /> Configuración del Sistema
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Administración centralizada de accesos, carteras de agentes, sincronización con Hasura PostgreSQL y copias de seguridad.
          </p>
        </div>

        {/* Live Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: backendStatus === 'connected' ? '#f0fdf4' : '#fffbeb',
          border: backendStatus === 'connected' ? '1.5px solid #86efac' : '1.5px solid #fde68a',
          padding: '0.6rem 1rem',
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: backendStatus === 'connected' ? '#22c55e' : '#f59e0b',
            boxShadow: backendStatus === 'connected' ? '0 0 8px #22c55e' : '0 0 8px #f59e0b'
          }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: backendStatus === 'connected' ? '#166534' : '#92400e' }}>
              {backendStatus === 'connected' ? 'Base de Datos En Línea' : 'Verificando Conexión'}
            </span>
            <span style={{ fontSize: '0.72rem', color: backendStatus === 'connected' ? '#15803d' : '#b45309' }}>
              Latencia: {latency ? `${latency}ms` : '12ms'} · {isDemo ? 'Modo Sandbox' : 'Producción'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 280px) 1fr',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        
        {/* Left Section Navigation Bar */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          position: 'sticky',
          top: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', paddingLeft: '0.5rem' }}>
              Gestión de Accesos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: activeTab === 'users' ? '1.5px solid #2563eb' : '1px solid transparent',
                  backgroundColor: activeTab === 'users' ? '#eff6ff' : 'transparent',
                  color: activeTab === 'users' ? '#1d4ed8' : 'var(--text-main)',
                  fontWeight: activeTab === 'users' ? '800' : '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Users size={18} color={activeTab === 'users' ? '#2563eb' : 'var(--text-muted)'} />
                  <span>Usuarios y Cuentas</span>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '999px',
                  backgroundColor: activeTab === 'users' ? '#dbeafe' : '#f1f5f9',
                  color: activeTab === 'users' ? '#1e40af' : 'var(--text-muted)'
                }}>
                  {users.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('carteras')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: activeTab === 'carteras' ? '1.5px solid #2563eb' : '1px solid transparent',
                  backgroundColor: activeTab === 'carteras' ? '#eff6ff' : 'transparent',
                  color: activeTab === 'carteras' ? '#1d4ed8' : 'var(--text-main)',
                  fontWeight: activeTab === 'carteras' ? '800' : '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Briefcase size={18} color={activeTab === 'carteras' ? '#2563eb' : 'var(--text-muted)'} />
                  <span>Carteras y Códigos</span>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '999px',
                  backgroundColor: activeTab === 'carteras' ? '#dbeafe' : '#f1f5f9',
                  color: activeTab === 'carteras' ? '#1e40af' : 'var(--text-muted)'
                }}>
                  {agentCodes.length}
                </span>
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', paddingLeft: '0.5rem' }}>
              Base de Datos y Datos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('database')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: activeTab === 'database' ? '1.5px solid #2563eb' : '1px solid transparent',
                  backgroundColor: activeTab === 'database' ? '#eff6ff' : 'transparent',
                  color: activeTab === 'database' ? '#1d4ed8' : 'var(--text-main)',
                  fontWeight: activeTab === 'database' ? '800' : '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Server size={18} color={activeTab === 'database' ? '#2563eb' : 'var(--text-muted)'} />
                  <span>Base de Datos & Hasura</span>
                </div>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: backendStatus === 'connected' ? '#22c55e' : '#f59e0b'
                }} />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('import')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: activeTab === 'import' ? '1.5px solid #2563eb' : '1px solid transparent',
                  backgroundColor: activeTab === 'import' ? '#eff6ff' : 'transparent',
                  color: activeTab === 'import' ? '#1d4ed8' : 'var(--text-main)',
                  fontWeight: activeTab === 'import' ? '800' : '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <FileSpreadsheet size={18} color={activeTab === 'import' ? '#2563eb' : 'var(--text-muted)'} />
                  <span>Importar Excel</span>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '999px',
                  backgroundColor: activeTab === 'import' ? '#dbeafe' : '#f1f5f9',
                  color: activeTab === 'import' ? '#1e40af' : 'var(--text-muted)'
                }}>
                  .xlsx
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('export')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: activeTab === 'export' ? '1.5px solid #2563eb' : '1px solid transparent',
                  backgroundColor: activeTab === 'export' ? '#eff6ff' : 'transparent',
                  color: activeTab === 'export' ? '#1d4ed8' : 'var(--text-main)',
                  fontWeight: activeTab === 'export' ? '800' : '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Download size={18} color={activeTab === 'export' ? '#2563eb' : 'var(--text-muted)'} />
                  <span>Copia de Seguridad</span>
                </div>
              </button>
            </div>
          </div>

          <div style={{
            marginTop: 'auto',
            padding: '0.85rem',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #e2e8f0',
            fontSize: '0.78rem',
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} color="#16a34a" /> Datos Protegidos
            </div>
            Toda modificación se almacena de forma relacional en PostgreSQL.
          </div>
        </div>

        {/* Right Content Panel */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* TAB: SETEO DE USUARIOS Y ACCESOS */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header Action Bar */}
          <div className="card" style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1.25rem 1.5rem'
          }}>
            <div>
              <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.25rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={22} /> Seteo y Gestión de Usuarios del Sistema
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Configura los usuarios autorizados. La cuenta principal de <strong>Santiago Alberto Morales Rodriguez</strong> guarda cambios permanentemente en PostgreSQL, y el usuario de prueba <strong>admin</strong> opera en modo Sandbox.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleOpenAddUserModal}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', padding: '0.65rem 1.25rem' }}
            >
              <UserPlus size={18} /> Agregar Nuevo Usuario
            </button>
          </div>

          {/* Active Session Status Banner */}
          <div style={{
            backgroundColor: isDemo ? '#fffbeb' : '#f0fdf4',
            border: isDemo ? '1.5px solid #fde68a' : '1.5px solid #bbf7d0',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: isDemo ? '#d97706' : 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '1.1rem',
                flexShrink: 0
              }}>
                {currentUser?.avatar || 'U'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: isDemo ? '#92400e' : '#14532d' }}>
                    Sesión Actual: {currentUser?.name}
                  </h4>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '999px',
                    fontWeight: '800',
                    backgroundColor: isDemo ? '#fef3c7' : '#dcfce7',
                    color: isDemo ? '#b45309' : '#15803d',
                    border: isDemo ? '1px solid #fcd34d' : '1px solid #86efac'
                  }}>
                    {isDemo ? '🧪 Modo Sandbox (Sin Guardar en BD)' : '👑 Cuenta Principal (PostgreSQL Activo)'}
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: isDemo ? '#b45309' : '#166534' }}>
                  Usuario activo: <strong>{currentUser?.username || currentUser?.id}</strong> · Rol: {currentUser?.role}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isDemo ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => switchUser('santiagom2401')}
                  style={{
                    backgroundColor: '#166534',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  <UserCheck size={16} /> Iniciar como Santiago Alberto Morales
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={() => switchUser('admin')}
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fcd34d',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  <ShieldAlert size={16} /> Cambiar a Usuario de Prueba (admin)
                </button>
              )}

              <button
                type="button"
                className="btn"
                onClick={logout}
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  padding: '0.5rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
                title="Cerrar sesión actual e ir a la página de login"
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          </div>

          {/* Grid of Users Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {users.map((user) => {
              const isSelected = user.id === currentUser?.id || user.username === currentUser?.username;
              const isUserDemo = Boolean(user.isDemo);
              const isPasswordVisible = Boolean(visiblePasswords[user.id]);

              return (
                <div
                  key={user.id}
                  className="card"
                  style={{
                    border: isSelected 
                      ? (isUserDemo ? '2px solid #f59e0b' : '2px solid #16a34a') 
                      : '1.5px solid var(--border)',
                    backgroundColor: isSelected 
                      ? (isUserDemo ? '#fffdfa' : '#fcfdfc') 
                      : '#ffffff',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isSelected ? '0 4px 14px rgba(0,0,0,0.06)' : 'var(--shadow-sm)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div>
                    {/* Card Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          backgroundColor: isUserDemo ? '#d97706' : 'var(--primary)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '1.2rem',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                        }}>
                          {user.avatar || 'U'}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.15rem', fontWeight: '800' }}>
                            {user.name}
                          </h4>
                          <span style={{ fontSize: '0.82rem', color: isUserDemo ? '#b45309' : '#15803d', fontWeight: '700' }}>
                            {user.role}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                        {user.isPrimary ? (
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            👑 Principal
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            backgroundColor: isUserDemo ? '#fef3c7' : '#f1f5f9',
                            color: isUserDemo ? '#b45309' : '#475569',
                            border: isUserDemo ? '1px solid #fde68a' : '1px solid #cbd5e1',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {isUserDemo ? '🧪 Sandbox' : '👤 Usuario'}
                          </span>
                        )}

                        {isSelected && (
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: isUserDemo ? '#fed7aa' : '#bbf7d0',
                            color: isUserDemo ? '#9a3412' : '#166534',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <Check size={12} /> Activo Ahora
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Credentials Info Box */}
                    <div style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #e2e8f0',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      {/* Username */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Usuario (Login):</span>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          fontSize: '0.95rem',
                          color: 'var(--text-main)',
                          backgroundColor: '#ffffff',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1'
                        }}>
                          {user.username || user.id}
                        </span>
                      </div>

                      {/* Password */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Contraseña:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            fontSize: '0.95rem',
                            color: isPasswordVisible ? 'var(--primary)' : 'var(--text-muted)',
                            backgroundColor: '#ffffff',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            letterSpacing: isPasswordVisible ? 'normal' : '0.15em'
                          }}>
                            {isPasswordVisible ? (user.password || '—') : '••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title={isPasswordVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
                          >
                            {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Email */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Email:</span>
                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{user.email || '—'}</span>
                      </div>

                      {/* Database Behavior */}
                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: isUserDemo ? '#b45309' : '#15803d', display: 'block', marginBottom: '0.2rem' }}>
                          {isUserDemo ? '⚡ Comportamiento: Modo Sandbox' : '💾 Comportamiento: Base de Datos Real'}
                        </span>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                          {isUserDemo
                            ? 'Permite consultar todos los datos y probar funciones en memoria. Ninguna modificación se guarda en PostgreSQL.'
                            : 'Acceso total y permanente. Todas las pólizas, cobros, clientes y movimientos se guardan en la base de datos PostgreSQL.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <div>
                      {isSelected ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: isUserDemo ? '#b45309' : '#16a34a',
                          fontWeight: '800',
                          fontSize: '0.86rem'
                        }}>
                          <CheckCircle2 size={16} /> Sesión Activa
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => switchUser(user.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.84rem',
                            fontWeight: '700',
                            padding: '0.45rem 0.9rem'
                          }}
                        >
                          <LogIn size={15} /> Iniciar como {user.name.split(' ')[0]}
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleOpenEditUserModal(user)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          padding: '0.45rem 0.75rem',
                          border: '1px solid var(--border)',
                          backgroundColor: '#ffffff'
                        }}
                        title="Editar datos y contraseña"
                      >
                        <Edit size={14} /> Editar
                      </button>

                      {!user.isPrimary && (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => handleDeleteUser(user.id, user.username, user.name)}
                          style={{
                            padding: '0.45rem 0.6rem',
                            color: '#dc2626',
                            backgroundColor: '#fee2e2',
                            border: '1px solid #fca5a5'
                          }}
                          title="Eliminar usuario"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Credential Tester / Login Validator */}
          <div className="card" style={{
            border: '1px solid var(--border)',
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            marginTop: '0.5rem'
          }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.15rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={20} /> Probar Inicio de Sesión y Validación de Credenciales
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Ingresa cualquier usuario y contraseña para probar el validador de acceso instantáneamente:
              </p>
            </div>

            <form onSubmit={handleTestLoginSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  Nombre de Usuario (Login)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Santiagom2401 o admin"
                  value={testLoginForm.username}
                  onChange={e => setTestLoginForm({ ...testLoginForm, username: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="Ej. Shagy962401 o admin"
                  value={testLoginForm.password}
                  onChange={e => setTestLoginForm({ ...testLoginForm, password: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', padding: '0.65rem 1.35rem', height: '42px' }}
              >
                <LogIn size={17} /> Validar y Conectar
              </button>
            </form>

            {testLoginResult && (
              <div style={{
                marginTop: '1.25rem',
                padding: '0.85rem 1.15rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: testLoginResult.success ? '#f0fdf4' : '#fef2f2',
                border: testLoginResult.success ? '1px solid #bbf7d0' : '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                {testLoginResult.success ? (
                  <>
                    <CheckCircle2 size={20} color="#15803d" />
                    <div>
                      <strong style={{ color: '#15803d', display: 'block', fontSize: '0.92rem' }}>
                        ¡Acceso Correcto! Sesión iniciada con éxito
                      </strong>
                      <span style={{ fontSize: '0.84rem', color: '#166534' }}>
                        Conectado como <strong>{testLoginResult.user?.name}</strong> ({testLoginResult.user?.role}). Modo: {testLoginResult.user?.isDemo ? '🧪 Sandbox' : '👑 Producción'}.
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={20} color="#dc2626" />
                    <div>
                      <strong style={{ color: '#dc2626', display: 'block', fontSize: '0.92rem' }}>
                        Error de Autenticación
                      </strong>
                      <span style={{ fontSize: '0.84rem', color: '#991b1b' }}>
                        {testLoginResult.message}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 0: CARTERAS Y CÓDIGOS DE AGENTES */}
      {activeTab === 'carteras' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header Action Bar */}
          <div className="card" style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1.25rem 1.5rem'
          }}>
            <div>
              <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={22} /> Catálogo de Carteras y Códigos por Compañía
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Cada póliza y cliente se vincula automáticamente al código que tiene el agente en cada compañía aseguradora.
              </p>
            </div>
            
            <button
              className="btn btn-primary"
              onClick={handleOpenAddCodeModal}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', padding: '0.65rem 1.25rem' }}
            >
              <Plus size={18} /> Agregar Nuevo Código
            </button>
          </div>

          {/* Carteras Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* Santiago Morales Card */}
            <div className="card" style={{ border: '1.5px solid #bfdbfe', backgroundColor: '#eff6ff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.1rem', fontWeight: '700' }}>Santiago Morales y Asociados, S.R.L.</h4>
                    <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '600' }}>Cartera Principal de la Agencia</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Códigos de Compañías Configurados:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {(agentCodes || []).filter(c => (c?.agente || c?.agent || '').toLowerCase().includes('santiago morales')).map(c => {
                    const comp = c.compania || c.insurer || '';
                    const cod = c.codigo || c.code || '';
                    return (
                      <span key={c.id} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        color: '#1e40af',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        <InsurerLogo name={comp} size={16} />
                        <span>{comp}: <strong style={{ color: '#1d4ed8' }}>{cod}</strong></span>
                      </span>
                    );
                  })}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#1e40af', fontWeight: '600' }}>
                  📊 Pólizas vinculadas: <strong>{(policies || []).filter(p => (p?.cartera || '').toLowerCase().includes('santiago')).length}</strong>
                </div>
              </div>
            </div>

            {/* Raquel Rodríguez Card */}
            <div className="card" style={{ border: '1.5px solid #f0abfc', backgroundColor: '#fdf4ff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#c026d3', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#701a75', fontSize: '1.1rem', fontWeight: '700' }}>Raquel Rodríguez</h4>
                    <span style={{ fontSize: '0.8rem', color: '#a21caf', fontWeight: '600' }}>Cartera de Agente Asociada</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#86198f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Códigos de Compañías Configurados:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {(agentCodes || []).filter(c => (c?.agente || c?.agent || '').toLowerCase().includes('raquel')).map(c => {
                    const comp = c.compania || c.insurer || '';
                    const cod = c.codigo || c.code || '';
                    return (
                      <span key={c.id} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        border: '1px solid #f0abfc',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        color: '#86198f',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        <InsurerLogo name={comp} size={16} />
                        <span>{comp}: <strong style={{ color: '#a21caf' }}>{cod}</strong></span>
                      </span>
                    );
                  })}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#86198f', fontWeight: '600' }}>
                  📊 Pólizas vinculadas: <strong>{(policies || []).filter(p => (p?.cartera || '').toLowerCase().includes('raquel')).length}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Codes Table & Filter */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '300px' }}>
                <input
                  type="text"
                  placeholder="Buscar por agente, compañía o código..."
                  value={codeSearchTerm}
                  onChange={(e) => setCodeSearchTerm(e.target.value)}
                  style={{ maxWidth: '350px', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
                <select
                  value={selectedAgentFilter}
                  onChange={(e) => setSelectedAgentFilter(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                >
                  <option value="ALL">Todas las Carteras ({agentCodes.length})</option>
                  <option value="Santiago Morales y Asociados, S.R.L.">Santiago Morales y Asoc.</option>
                  <option value="Raquel Rodríguez">Raquel Rodríguez</option>
                </select>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                Total: <strong>{filteredAgentCodes.length}</strong> códigos registrados en Base de Datos
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Cartera / Agente</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Compañía Aseguradora</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Código Asignado</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Notas / Descripción</th>
                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgentCodes.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se encontraron códigos de compañías que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredAgentCodes.map((item) => {
                      const agentName = item.agente || item.agent || '';
                      const companyName = item.compania || item.insurer || '';
                      const codeVal = item.codigo || item.code || '';
                      const notesVal = item.notas || item.notes || '';
                      const isRaquel = agentName.toLowerCase().includes('raquel');

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.2rem 0.65rem',
                              borderRadius: '999px',
                              fontWeight: '700',
                              fontSize: '0.82rem',
                              backgroundColor: isRaquel ? '#fdf4ff' : '#eff6ff',
                              color: isRaquel ? '#86198f' : '#1e40af',
                              border: isRaquel ? '1px solid #f0abfc' : '1px solid #bfdbfe'
                            }}>
                              <Briefcase size={13} />
                              {agentName}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                              <InsurerLogo name={companyName} size={20} />
                              <span>{companyName}</span>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              fontWeight: '800',
                              fontSize: '1rem',
                              color: 'var(--text-main)',
                              fontFamily: 'monospace'
                            }}>
                              {codeVal}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                            {notesVal || '—'}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                              <button
                                className="btn"
                                onClick={() => handleEditCode(item)}
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid var(--border)' }}
                                title="Editar código"
                              >
                                <Edit size={14} /> Editar
                              </button>
                              <button
                                className="btn"
                                onClick={() => handleDeleteCode(item.id, item.codigo, item.agente, item.compania)}
                                style={{ padding: '0.4rem 0.6rem', color: '#dc2626', backgroundColor: '#fee2e2', border: '1px solid #fca5a5' }}
                                title="Eliminar código"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
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

      {/* Add / Edit Agent Code Modal */}
      {showCodeModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', backgroundColor: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                <Briefcase size={20} /> {editingCodeItem ? 'Editar Código de Compañía' : 'Agregar Código de Compañía'}
              </h3>
              <button onClick={() => setShowCodeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveCodeSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                  Cartera / Agente *
                </label>
                <select
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                  value={codeForm.agent}
                  onChange={e => setCodeForm({ ...codeForm, agent: e.target.value })}
                >
                  <option value="Santiago Morales y Asociados, S.R.L.">💼 Santiago Morales y Asociados, S.R.L.</option>
                  <option value="Raquel Rodríguez">💼 Raquel Rodríguez</option>
                  <option value="__OTHER__">➕ Otro Agente / Cartera...</option>
                </select>
                {codeForm.agent === '__OTHER__' && (
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo del nuevo agente..."
                    value={codeForm.customAgent}
                    onChange={e => setCodeForm({ ...codeForm, customAgent: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: '0.5rem' }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                  Compañía Aseguradora *
                </label>
                <select
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                  value={codeForm.insurer}
                  onChange={e => setCodeForm({ ...codeForm, insurer: e.target.value })}
                >
                  {companies.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                  {['Humano Seguros', 'La Colonial de Seguros', 'Seguros Universal', 'Mapfre BHD Seguros', 'Seguros Reservas', 'Seguros Sura', 'General de Seguros', 'Dominicana de Seguros', 'Patria Compañía de Seguros', 'Seguros Pepín', 'La Monumental de Seguros', 'Angloamericana de Seguros', 'CoopSeguros', 'Seguros Crecer', 'K&M Seguros']
                    .filter(name => !companies.some(c => c.name.toLowerCase() === name.toLowerCase()))
                    .map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                  Código Asignado por la Compañía *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 76713, 8055, 897"
                  value={codeForm.code}
                  onChange={e => setCodeForm({ ...codeForm, code: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '700', fontSize: '1rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                  Notas / Descripción (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Código de agencia, ramo ramos generales, etc."
                  value={codeForm.notes}
                  onChange={e => setCodeForm({ ...codeForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowCodeModal(false)}
                  style={{ border: '1px solid var(--border)', backgroundColor: '#f8fafc' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingCode}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}
                >
                  {isSavingCode ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Guardando...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> {editingCodeItem ? 'Guardar Cambios' : 'Guardar Código en Base de Datos'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 1: SUBIR EXCEL */}
      {activeTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header Action Bar with Template Download */}
          <div className="card" style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1.25rem'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} color="var(--accent)" /> Importador Inteligente de Pólizas y Clientes
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Sube cualquier archivo Excel (.xlsx, .xls) con columnas de clientes, pólizas y cobros para guardarlos en PostgreSQL.
              </p>
            </div>
            <button
              className="btn"
              onClick={downloadSampleExcelTemplate}
              style={{
                backgroundColor: 'white',
                border: '1.5px solid var(--primary)',
                color: 'var(--primary)',
                fontWeight: '700',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.1rem'
              }}
            >
              <Download size={16} /> Descargar Plantilla Modelo (.xlsx)
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #f87171',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.95rem'
            }}>
              <AlertTriangle size={22} color="#991b1b" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Summary Modal/Card */}
          {importSummary && (
            <div className="card" style={{
              backgroundColor: '#f0fdf4',
              border: '2px solid #86efac',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              textAlign: 'center'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ color: '#166534', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>
                ¡Importación Completada Exitosamente!
              </h3>
              <p style={{ color: '#14532d', fontSize: '1rem', margin: '0 0 1.5rem' }}>
                Los datos fueron procesados y guardados correctamente en la base de datos.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                maxWidth: '750px',
                margin: '0 auto 1.5rem'
              }}>
                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Clientes Procesados</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#166534', marginTop: '0.2rem' }}>
                    {(importSummary.clientsInserted || 0) + (importSummary.clientsUpdated || 0)}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                    {importSummary.clientsInserted || 0} nuevos · {importSummary.clientsUpdated || 0} actualizados
                  </span>
                </div>
                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Pólizas Procesadas</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#166534', marginTop: '0.2rem' }}>
                    {(importSummary.policiesInserted || 0) + (importSummary.policiesUpdated || 0)}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                    {importSummary.policiesInserted || 0} nuevas · {importSummary.policiesUpdated || 0} actualizadas
                  </span>
                </div>
                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Cobros Registrados</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#166534', marginTop: '0.2rem' }}>
                    {importSummary.paymentsInserted || 0}
                  </div>
                </div>
              </div>

              {importSummary.errors && importSummary.errors.length > 0 && (
                <div style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  maxWidth: '750px',
                  margin: '0 auto 1.5rem'
                }}>
                  <strong style={{ color: '#92400e', fontSize: '0.88rem' }}>Observaciones / Avisos ({importSummary.errors.length}):</strong>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.82rem', color: '#78350f', maxHeight: '120px', overflowY: 'auto' }}>
                    {importSummary.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => onNavigate && onNavigate('policies')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
                >
                  <FileText size={18} /> Ver Pólizas Importadas
                </button>
                <button
                  className="btn"
                  onClick={() => onNavigate && onNavigate('clients')}
                  style={{ backgroundColor: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
                >
                  <Users size={18} /> Ver Clientes
                </button>
                <button
                  className="btn"
                  onClick={() => { setImportSummary(null); setParsedData(null); }}
                  style={{ backgroundColor: '#f1f5f9', color: 'var(--text-main)', padding: '0.65rem 1.25rem' }}
                >
                  Importar Otro Archivo
                </button>
              </div>
            </div>
          )}

          {/* Drag & Drop Upload Area */}
          {!parsedData && !importSummary && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                border: isDragging ? '2.5px dashed var(--accent)' : '2px dashed var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '3.5rem 2rem',
                textAlign: 'center',
                backgroundColor: isDragging ? '#fffbeb' : '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isDragging ? '0 4px 12px rgba(217, 119, 6, 0.15)' : 'none'
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
              />

              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: isDragging ? '#fde68a' : '#e2e8f0',
                color: isDragging ? '#92400e' : 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                {isParsing ? (
                  <Loader2 size={36} className="animate-spin" />
                ) : (
                  <FileUp size={36} />
                )}
              </div>

              <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', margin: '0 0 0.5rem' }}>
                {isParsing ? 'Analizando archivo Excel...' : 'Arrastra tu archivo Excel aquí o haz clic para seleccionarlo'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 1.25rem' }}>
                Soporta libros en formato <strong>.xlsx</strong>, <strong>.xls</strong> o archivos <strong>.csv</strong> con cualquier estructura de columnas.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                style={{ pointerEvents: 'none', padding: '0.65rem 1.5rem', fontWeight: '700' }}
              >
                <Upload size={18} /> Seleccionar Archivo desde tu Computadora
              </button>
            </div>
          )}

          {/* Data Preview & Confirmation Stage */}
          {parsedData && (
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileSpreadsheet size={22} color="#166534" /> Archivo Listo: {parsedData.fileName}
                  </h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Revisa los datos detectados antes de guardarlos en la base de datos de Hasura.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    className="btn"
                    onClick={() => { setParsedData(null); setErrorMessage(null); }}
                    style={{ border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-muted)' }}
                    disabled={isImporting}
                  >
                    <X size={16} /> Cancelar
                  </button>
                  <button
                    className="btn"
                    onClick={handleExecuteImport}
                    disabled={isImporting}
                    style={{
                      backgroundColor: '#166534',
                      color: 'white',
                      fontWeight: '700',
                      padding: '0.65rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 2px 6px rgba(22, 101, 52, 0.3)'
                    }}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Guardando en Base de Datos...
                      </>
                    ) : (
                      <>
                        <Check size={18} /> Confirmar e Importar a Base de Datos
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress Indicator */}
              {isImporting && importProgress && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '700', color: '#166534', marginBottom: '0.5rem' }}>
                    <span>{importProgress.message}</span>
                    <span>{importProgress.progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${importProgress.progress}%`, height: '100%', backgroundColor: '#166534', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}

              {/* Stats Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div
                  onClick={() => setPreviewTab('clients')}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: previewTab === 'clients' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: previewTab === 'clients' ? '#f0fdf4' : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem' }}>
                    <Users size={18} /> Clientes Detectados
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.3rem' }}>
                    {parsedData.clients.length}
                  </div>
                </div>

                <div
                  onClick={() => setPreviewTab('policies')}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: previewTab === 'policies' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: previewTab === 'policies' ? '#f0fdf4' : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem' }}>
                    <FileText size={18} /> Pólizas Detectadas
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.3rem' }}>
                    {parsedData.policies.length}
                  </div>
                </div>

                <div
                  onClick={() => setPreviewTab('payments')}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: previewTab === 'payments' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: previewTab === 'payments' ? '#f0fdf4' : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem' }}>
                    <DollarSign size={18} /> Cobros / Cuotas
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.3rem' }}>
                    {parsedData.payments.length}
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Vista Previa: {previewTab === 'clients' ? 'Clientes' : previewTab === 'policies' ? 'Pólizas' : 'Cobros'} (Primeros registros)
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Mostrando hasta 10 registros
                  </span>
                </div>

                <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                  {previewTab === 'clients' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.6rem 1rem' }}>#</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Nombre Completo</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Tipo</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Cédula / RNC</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Teléfono</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.clients.slice(0, 10).map((c, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.6rem 1rem', fontWeight: 'bold' }}>{i + 1}</td>
                            <td style={{ padding: '0.6rem 1rem', fontWeight: '600', color: 'var(--primary)' }}>{c.name}</td>
                            <td style={{ padding: '0.6rem 1rem' }}>{c.personType}</td>
                            <td style={{ padding: '0.6rem 1rem' }}>{c.documentId}</td>
                            <td style={{ padding: '0.6rem 1rem' }}>{c.phone || '-'}</td>
                            <td style={{ padding: '0.6rem 1rem' }}>{c.email || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {previewTab === 'policies' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.6rem 1rem' }}>Póliza #</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Cliente</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Aseguradora</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Ramo</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Inicio</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Próxima Renovación (Fin)</th>
                          <th style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>Prima</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.policies.slice(0, 10).map((p, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.6rem 1rem', fontWeight: 'bold' }}>{p.id}</td>
                            <td style={{ padding: '0.6rem 1rem', fontWeight: '600', color: 'var(--primary)' }}>{p.clientName}</td>
                            <td style={{ padding: '0.6rem 1rem' }}>{p.insurer}</td>
                            <td style={{ padding: '0.6rem 1rem' }}>{p.type}</td>
                            <td style={{ padding: '0.6rem 1rem' }}>{formatDateToDDMMYYYY(p.startDate)}</td>
                            <td style={{ padding: '0.6rem 1rem', fontWeight: '600', color: '#166534' }}>{formatDateToDDMMYYYY(p.endDate)}</td>
                            <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: '700' }}>{formatMoney(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {previewTab === 'payments' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.6rem 1rem' }}>Recibo</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Póliza</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Cliente</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Fecha</th>
                          <th style={{ padding: '0.6rem 1rem' }}>Estado</th>
                          <th style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.payments.slice(0, 10).map((pay, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.6rem 1rem', fontWeight: 'bold' }}>{pay.receiptId}</td>
                            <td style={{ padding: '0.6rem 1rem' }}>{pay.policyId}</td>
                            <td style={{ padding: '0.6rem 1rem', color: 'var(--primary)', fontWeight: '600' }}>{pay.clientName}</td>
                            <td style={{ padding: '0.6rem 1rem' }}>{formatDateToDDMMYYYY(pay.date)}</td>
                            <td style={{ padding: '0.6rem 1rem' }}>
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                backgroundColor: pay.status === 'Paid' ? '#dcfce7' : '#fef9c3',
                                color: pay.status === 'Paid' ? '#166534' : '#854d0e'
                              }}>
                                {pay.status === 'Paid' ? 'Pagado' : 'Pendiente'}
                              </span>
                            </td>
                            <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: '700' }}>{formatMoney(pay.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ESTADO DE TABLAS Y HASURA */}
      {activeTab === 'database' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Server size={22} /> Servidor GraphQL Hasura &amp; PostgreSQL
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Estado de conexión en tiempo real y volumen de registros por tabla.
                </p>
              </div>

              <button
                className="btn"
                onClick={() => setShowHasuraModal(true)}
                style={{ border: '1px solid var(--border)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}
              >
                <Key size={16} /> Ajustar Claves y Endpoint
              </button>
            </div>

            {/* Connection Status Card */}
            <div style={{
              backgroundColor: backendStatus === 'connected' ? '#f0fdf4' : '#fee2e2',
              border: backendStatus === 'connected' ? '1px solid #bbf7d0' : '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: backendStatus === 'connected' ? '#22c55e' : '#ef4444',
                  boxShadow: backendStatus === 'connected' ? '0 0 8px #22c55e' : '0 0 8px #ef4444'
                }} />
                <div>
                  <strong style={{ color: backendStatus === 'connected' ? '#166534' : '#991b1b', fontSize: '1.05rem', display: 'block' }}>
                    {backendStatus === 'connected' ? 'Hasura GraphQL Conectado y Operativo' : 'Sin Conexión con Hasura'}
                  </strong>
                  <span style={{ fontSize: '0.82rem', color: backendStatus === 'connected' ? '#14532d' : '#7f1d1d' }}>
                    Endpoint: {config.endpoint} · Latencia: {latency ? `${latency}ms` : '0ms'} · Rol: {config.role}
                  </span>
                </div>
              </div>

              <button
                className="btn"
                onClick={checkConnection}
                style={{ backgroundColor: 'white', border: '1px solid var(--border)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={14} /> Probar Conexión
              </button>
            </div>

            {/* Database Tables Stats */}
            <h4 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tablas Activas en PostgreSQL (app_db_dev)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700' }}>
                  <Users size={16} /> clientes
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  {clients.length} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>registros</span>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700' }}>
                  <FileText size={16} /> polizas
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  {policies.length} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>registros</span>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700' }}>
                  <DollarSign size={16} /> cobros
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  {payments.length} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>recibos</span>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700' }}>
                  <Layers size={16} /> companias
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  {companies.length} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>aseguradoras</span>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700' }}>
                  <Shield size={16} /> siniestros
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  {claims.length} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>reclamaciones</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COPIA DE SEGURIDAD / EXPORTAR */}
      {activeTab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800' }}>
                  <Download size={24} /> Copia de Seguridad y Respaldo de Datos
                </h3>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                  Genera y descarga un respaldo completo de la base de datos de <strong>Santiago Morales y Asociados, S.R.L.</strong>
                </p>
              </div>
            </div>

            {/* Summary of Data to Export */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Resumen de Registros a Respaldar:
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)' }}>{clients.length}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)' }}>Clientes</div>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)' }}>{policies.length}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)' }}>Pólizas</div>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)' }}>{payments.length}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)' }}>Recibos de Cobro</div>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)' }}>{companies.length}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)' }}>Aseguradoras</div>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)' }}>{claims.length}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)' }}>Siniestros</div>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)' }}>{agentCodes.length}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)' }}>Códigos Cartera</div>
                </div>
              </div>
            </div>

            {/* Export Message Alert */}
            {exportMessage && (
              <div style={{
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: exportMessage.type === 'error' ? '#fee2e2' : exportMessage.type === 'success' ? '#f0fdf4' : '#eff6ff',
                border: exportMessage.type === 'error' ? '1px solid #fecaca' : exportMessage.type === 'success' ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                color: exportMessage.type === 'error' ? '#991b1b' : exportMessage.type === 'success' ? '#166534' : '#1e40af',
                fontSize: '0.92rem',
                fontWeight: '600'
              }}>
                {exportMessage.type === 'error' && <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />}
                {exportMessage.type === 'success' && <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0 }} />}
                {exportMessage.type === 'info' && <Loader2 size={20} className="animate-spin" color="#2563eb" style={{ flexShrink: 0 }} />}
                <span>{exportMessage.text}</span>
              </div>
            )}

            {/* Action Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Option 1: Excel Backup */}
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                border: '1.5px solid #22c55e',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.08)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <FileSpreadsheet size={22} color="#16a34a" />
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#166534', fontWeight: '800' }}>
                      Respaldo en Excel (.xlsx)
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Genera un libro con hojas individuales para <strong>Pólizas, Clientes, Cobros, Siniestros y Aseguradoras</strong>. Formato recomendado para análisis y reportes.
                  </p>
                </div>

                <button
                  className="btn"
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  style={{
                    backgroundColor: '#16a34a',
                    color: 'white',
                    padding: '0.8rem 1.25rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: isExporting ? 'wait' : 'pointer'
                  }}
                >
                  {isExporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Generando Excel...</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>Descargar Respaldo Excel</span>
                    </>
                  )}
                </button>
              </div>

              {/* Option 2: JSON Backup */}
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                border: '1.5px solid #3b82f6',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Database size={22} color="#2563eb" />
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1d4ed8', fontWeight: '800' }}>
                      Respaldo Estructurado (JSON)
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Copia de seguridad técnica completa en formato JSON para restauraciones directas, desarrollos o migraciones entre bases de datos.
                  </p>
                </div>

                <button
                  className="btn"
                  onClick={handleExportJsonBackup}
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    padding: '0.8rem 1.25rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none'
                  }}
                >
                  <Download size={18} />
                  <span>Descargar Respaldo JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        </div> {/* Close Right Content Panel */}
      </div> {/* Close Main Two-Column Grid */}

      {/* Create / Edit User Modal */}
      {showUserModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '540px', backgroundColor: 'white', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: '800' }}>
                <Users size={20} /> {editingUser ? 'Editar Credenciales de Usuario' : 'Crear Nuevo Usuario'}
              </h3>
              <button onClick={() => setShowUserModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Santiago Alberto Morales Rodriguez"
                  value={userForm.name}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                    Usuario (Login) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Santiagom2401"
                    value={userForm.username}
                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '700', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                    Contraseña *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Shagy962401"
                    value={userForm.password}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '700', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                    Rol / Cargo
                  </label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                  >
                    <option value="Administrador Principal">Administrador Principal</option>
                    <option value="Agente Asociado">Agente Asociado</option>
                    <option value="Oficial de Operaciones">Oficial de Operaciones</option>
                    <option value="Invitado / Modo Sandbox">Invitado / Modo Sandbox</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                    Tipo de Cuenta
                  </label>
                  <select
                    value={userForm.isDemo ? 'demo' : 'prod'}
                    onChange={e => setUserForm({ ...userForm, isDemo: e.target.value === 'demo' })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '700', color: userForm.isDemo ? '#b45309' : '#15803d' }}
                    disabled={editingUser?.isPrimary}
                  >
                    <option value="prod">🟢 Producción (Guarda en BD)</option>
                    <option value="demo">🟡 Sandbox (Prueba sin guardar)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="Ej. santiago@moralesyasoc.com"
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  Descripción / Notas de Acceso
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre permisos o responsabilidades..."
                  value={userForm.description}
                  onChange={e => setUserForm({ ...userForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowUserModal(false)}
                  style={{ border: '1px solid var(--border)', backgroundColor: '#f8fafc' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}
                >
                  <Check size={16} /> {editingUser ? 'Guardar Cambios de Usuario' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hasura Settings Modal */}
      <HasuraSettingsModal isOpen={showHasuraModal} onClose={() => setShowHasuraModal(false)} />
    </div>
  );
};

export default Settings;
