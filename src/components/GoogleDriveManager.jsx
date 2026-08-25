import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive, CheckCircle2, AlertTriangle, RefreshCw, Key, ExternalLink,
  FolderPlus, Upload, Search, FileText, Trash2, Edit3, Download, Eye,
  Lock, Unlock, LogOut, Check, HelpCircle, File, Folder, Sparkles, Loader2,
  ArrowRight, Layers, Users, FolderTree, Database, PlayCircle
} from 'lucide-react';
import {
  getStoredDriveConfig,
  saveDriveConfig,
  isDriveAuthenticated,
  getConnectedUser,
  connectGoogleDrive,
  disconnectGoogleDrive,
  createFolder,
  uploadFile,
  searchFiles,
  readFileContent,
  updateFileContent,
  deleteFile,
  syncFullDatabaseHierarchy,
  getFolderMappings
} from '../services/googleDrive';

const GoogleDriveManager = ({ clients = [], policies = [] }) => {
  const [config, setConfig] = useState(getStoredDriveConfig());
  const [isAuthenticated, setIsAuthenticated] = useState(isDriveAuthenticated());
  const [connectedUser, setConnectedUser] = useState(getConnectedUser());
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Folder Mappings State
  const [mappings, setMappings] = useState(getFolderMappings());

  // Mass Synchronization State
  const [isSyncingHierarchy, setIsSyncingHierarchy] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [syncSummary, setSyncSummary] = useState(null);

  // Drive Explorer State
  const [files, setFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create Folder State
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Quick Note / Text Upload Modal State
  const [quickNoteTitle, setQuickNoteTitle] = useState('');
  const [quickNoteContent, setQuickNoteContent] = useState('');
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);

  // Read Modal State
  const [selectedFileForRead, setSelectedFileForRead] = useState(null);
  const [fileContentPreview, setFileContentPreview] = useState(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Edit / Rename Modal State
  const [editingFile, setEditingFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Show Setup Guide Toggle
  const [showGuide, setShowGuide] = useState(!getStoredDriveConfig().clientId);

  useEffect(() => {
    setIsAuthenticated(isDriveAuthenticated());
    setConnectedUser(getConnectedUser());
    setMappings(getFolderMappings());
    if (isDriveAuthenticated()) {
      loadFiles();
    }
  }, []);

  const handleSaveConfig = (e) => {
    if (e) e.preventDefault();
    saveDriveConfig(config);
    setStatusMessage({ type: 'success', text: 'Configuración de Google Drive guardada correctamente.' });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setStatusMessage(null);
    try {
      if (!config.clientId) {
        throw new Error('Primero debes ingresar tu "OAuth Client ID" en el formulario de configuración.');
      }
      saveDriveConfig(config);
      const authResult = await connectGoogleDrive();
      setIsAuthenticated(true);
      setConnectedUser(authResult.user);
      setStatusMessage({ type: 'success', text: '¡Conexión con Google Drive establecida exitosamente!' });
      loadFiles();
    } catch (err) {
      console.error('Error al conectar Google Drive:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Error al conectar con Google Drive' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleDrive();
    setIsAuthenticated(false);
    setConnectedUser(null);
    setFiles([]);
    setStatusMessage({ type: 'info', text: 'Sesión de Google Drive cerrada.' });
  };

  const handleSyncDatabaseHierarchy = async () => {
    if (!isAuthenticated) {
      alert('Debes conectar tu cuenta de Google Drive antes de crear las carpetas.');
      return;
    }

    if (clients.length === 0) {
      alert('No hay clientes en la base de datos para sincronizar.');
      return;
    }

    const confirmMsg = `¿Deseas crear la estructura organizada en Google Drive para ${clients.length} clientes y ${policies.length} pólizas?\n\n- Carpeta Raíz: Santiago Morales & Asoc - Cartera\n- Carpetas individuales para cada cliente\n- Subcarpetas para cada póliza asociada`;
    if (!window.confirm(confirmMsg)) return;

    setIsSyncingHierarchy(true);
    setSyncLogs([]);
    setSyncSummary(null);
    setSyncProgress({ percentage: 0, message: 'Iniciando conexión con Google Drive...' });

    try {
      const result = await syncFullDatabaseHierarchy({
        clients,
        policies,
        onProgress: (prog) => {
          setSyncProgress(prog);
          if (prog.message) {
            setSyncLogs(prev => [prog.message, ...prev.slice(0, 40)]);
          }
        }
      });

      setMappings(result.mappings);
      setSyncSummary(result.stats);
      setStatusMessage({
        type: 'success',
        text: `¡Estructura creada con éxito en Google Drive! ${result.stats.totalClients} clientes y ${result.stats.createdPolicyFolders} subcarpetas de pólizas organizadas.`
      });
      loadFiles();
    } catch (err) {
      console.error('Error sincronizando jerarquía en Drive:', err);
      setStatusMessage({ type: 'error', text: 'Error al sincronizar estructura: ' + err.message });
    } finally {
      setIsSyncingHierarchy(false);
    }
  };

  const loadFiles = async (customSearch = searchTerm) => {
    if (!isDriveAuthenticated()) return;
    setIsLoadingFiles(true);
    try {
      const results = await searchFiles({
        name: customSearch || undefined,
        parentFolderId: config.parentFolderId || undefined,
        pageSize: 40
      });
      setFiles(results);
    } catch (err) {
      console.error('Error al listar archivos de Drive:', err);
      setStatusMessage({ type: 'error', text: 'Error al consultar archivos: ' + err.message });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      const folder = await createFolder(newFolderName.trim(), config.parentFolderId || null);
      setStatusMessage({ type: 'success', text: `Carpeta "${folder.name}" creada con éxito en Google Drive.` });
      setNewFolderName('');
      loadFiles();
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error al crear carpeta: ' + err.message });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMessage(null);
    try {
      const uploaded = await uploadFile({
        name: file.name,
        content: file,
        mimeType: file.type || 'application/octet-stream',
        parentFolderId: config.parentFolderId || null
      });
      setStatusMessage({ type: 'success', text: `Archivo "${uploaded.name}" subido con éxito a Google Drive.` });
      loadFiles();
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error al subir archivo: ' + err.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateQuickNote = async (e) => {
    e.preventDefault();
    if (!quickNoteTitle.trim()) return;
    setIsUploading(true);
    try {
      const fileName = quickNoteTitle.endsWith('.txt') ? quickNoteTitle : `${quickNoteTitle}.txt`;
      await uploadFile({
        name: fileName,
        content: quickNoteContent,
        mimeType: 'text/plain',
        parentFolderId: config.parentFolderId || null
      });
      setStatusMessage({ type: 'success', text: `Documento de texto "${fileName}" guardado en Drive.` });
      setShowQuickNoteModal(false);
      setQuickNoteTitle('');
      setQuickNoteContent('');
      loadFiles();
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error al crear documento: ' + err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReadFile = async (file) => {
    setSelectedFileForRead(file);
    setIsLoadingContent(true);
    setFileContentPreview(null);
    try {
      if (file.mimeType?.includes('text') || file.mimeType?.includes('json') || file.name.endsWith('.txt') || file.name.endsWith('.json') || file.name.endsWith('.csv')) {
        const text = await readFileContent(file.id, 'text');
        setFileContentPreview(text);
      } else {
        setFileContentPreview('Este tipo de archivo es binario (' + file.mimeType + '). Puedes abrirlo o descargarlo directamente.');
      }
    } catch (err) {
      setFileContentPreview('Error al leer contenido: ' + err.message);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const blob = await readFileContent(file.id, 'blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al descargar archivo: ' + err.message);
    }
  };

  const handleOpenRename = (file) => {
    setEditingFile(file);
    setNewFileName(file.name);
  };

  const handleSaveRename = async (e) => {
    e.preventDefault();
    if (!newFileName.trim() || !editingFile) return;
    setIsUpdating(true);
    try {
      await updateFileContent(editingFile.id, { name: newFileName.trim() });
      setStatusMessage({ type: 'success', text: `Archivo renombrado a "${newFileName.trim()}".` });
      setEditingFile(null);
      loadFiles();
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error al renombrar: ' + err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`¿Estás seguro de mover a la papelera el archivo "${file.name}" de Google Drive?`)) {
      return;
    }
    try {
      await deleteFile(file.id, false);
      setStatusMessage({ type: 'success', text: `"${file.name}" movido a la papelera.` });
      loadFiles();
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error al eliminar archivo: ' + err.message });
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === '0') return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const syncedClientsCount = Object.keys(mappings?.clients || {}).length;
  const syncedPoliciesCount = Object.keys(mappings?.policies || {}).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Banner & Connection Status */}
      <div className="card" style={{
        backgroundColor: isAuthenticated ? '#f0fdf4' : '#fffbeb',
        border: isAuthenticated ? '1.5px solid #86efac' : '1.5px solid #fde68a',
        padding: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: isAuthenticated ? '#16a34a' : '#d97706',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}>
            <HardDrive size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: isAuthenticated ? '#15803d' : '#b45309' }}>
                Integración con Google Drive API
              </h3>
              <span style={{
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: '700',
                backgroundColor: isAuthenticated ? '#dcfce7' : '#fee2e2',
                color: isAuthenticated ? '#166534' : '#991b1b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                {isAuthenticated ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {isAuthenticated ? 'Conectado y Autorizado' : 'No Conectado'}
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {isAuthenticated && connectedUser 
                ? `Conectado como: ${connectedUser.email || connectedUser.name || 'Cuenta de Google'}`
                : 'Conecta tu Google Drive para crear automáticamente carpetas de clientes, subcarpetas de pólizas y archivar recibos.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuthenticated ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => loadFiles()}
                disabled={isLoadingFiles}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
              >
                <RefreshCw size={16} className={isLoadingFiles ? 'animate-spin' : ''} />
                Actualizar Archivos
              </button>
              <button
                className="btn"
                onClick={handleDisconnect}
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '600'
                }}
              >
                <LogOut size={16} /> Desconectar
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={isConnecting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontWeight: '700',
                padding: '0.7rem 1.4rem',
                fontSize: '0.95rem',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
              }}
            >
              {isConnecting ? <Loader2 size={18} className="animate-spin" /> : <Unlock size={18} />}
              {isConnecting ? 'Autorizando con Google...' : 'Conectar con Google Drive (OAuth 2.0)'}
            </button>
          )}
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: statusMessage.type === 'error' ? '#fef2f2' : statusMessage.type === 'success' ? '#f0fdf4' : '#eff6ff',
          color: statusMessage.type === 'error' ? '#991b1b' : statusMessage.type === 'success' ? '#166534' : '#1e40af',
          border: `1px solid ${statusMessage.type === 'error' ? '#fca5a5' : statusMessage.type === 'success' ? '#86efac' : '#bfdbfe'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.9rem',
          fontWeight: '500'
        }}>
          {statusMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* FEATURE BANNER: Sincronización Masiva Base de Datos -> Google Drive */}
      {isAuthenticated && (
        <div className="card" style={{
          backgroundColor: '#eff6ff',
          border: '1.5px solid #93c5fd',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#2563eb',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FolderTree size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#1e3a8a', fontWeight: '700' }}>
                  Crear Estructura de Base de Datos en Google Drive
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem', color: '#3b82f6' }}>
                  Crea automáticamente una <strong>carpeta principal para cada cliente</strong> y <strong>subcarpetas para cada una de sus pólizas</strong> en Drive.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleSyncDatabaseHierarchy}
                disabled={isSyncingHierarchy || clients.length === 0}
                style={{
                  backgroundColor: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '700',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.92rem',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                }}
              >
                {isSyncingHierarchy ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={18} />}
                {isSyncingHierarchy ? 'Creando carpetas en Drive...' : `Sincronizar ${clients.length} Clientes y ${policies.length} Pólizas`}
              </button>
            </div>
          </div>

          {/* Hierarchy preview summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #bfdbfe',
            fontSize: '0.85rem'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Clientes en Base de Datos:</span>
              <strong style={{ color: '#1e40af', fontSize: '1.1rem' }}>{clients.length} registrados</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Pólizas en Base de Datos:</span>
              <strong style={{ color: '#1e40af', fontSize: '1.1rem' }}>{policies.length} pólizas</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Estructura en Drive:</span>
              <span style={{ color: '#059669', fontWeight: '700' }}>
                {mappings?.root ? '📁 ' + mappings.root.name : '📁 Santiago Morales & Asoc - Cartera'}
              </span>
            </div>
          </div>

          {/* Progress Bar & Live Log during sync */}
          {isSyncingHierarchy && syncProgress && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '700', color: '#1e40af' }}>
                <span>{syncProgress.message}</span>
                <span>{syncProgress.percentage}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', backgroundColor: '#dbeafe', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${syncProgress.percentage}%`,
                  height: '100%',
                  backgroundColor: '#2563eb',
                  transition: 'width 0.2s ease-in-out'
                }} />
              </div>
              
              {/* Activity Log console */}
              <div style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                backgroundColor: '#1e293b',
                color: '#93c5fd',
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-sm)',
                maxHeight: '130px',
                overflowY: 'auto'
              }}>
                {syncLogs.map((log, idx) => (
                  <div key={idx} style={{ marginBottom: '2px' }}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Settings & Operations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 2fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Configuration & Help */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Credentials Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={18} /> Credenciales de Google Cloud
            </h4>

            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  OAuth 2.0 Client ID <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ej. 821740511057-xxx.apps.googleusercontent.com"
                  value={config.clientId}
                  onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                  Client ID de OAuth 2.0 Web Application de tu Google Cloud Console.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  ID Carpeta Raíz / Empresa (Opcional)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ej. 1A2B3C4D5E6F7G8H9I0..."
                  value={config.parentFolderId}
                  onChange={(e) => setConfig({ ...config, parentFolderId: e.target.value })}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                  Si se deja vacío, el sistema creará automáticamente la carpeta principal <em>"Santiago Morales & Asoc - Cartera y Pólizas"</em>.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: '600' }}
                >
                  <Check size={16} /> Guardar Configuración
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              style={{
                marginTop: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                fontWeight: '600',
                padding: 0
              }}
            >
              <HelpCircle size={16} /> {showGuide ? 'Ocultar guía de Google Cloud' : '¿Cómo obtener mi Client ID?'}
            </button>

            {showGuide && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #e2e8f0',
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                lineHeight: '1.5'
              }}>
                <strong style={{ color: 'var(--primary)' }}>Configuración en Google Cloud:</strong>
                <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
                  <li>Asegúrate de que en <em>Credenciales &gt; ID de cliente de OAuth</em> estén agregados los orígenes JavaScript autorizados (<code>http://localhost:5173</code>, <code>http://localhost:5176</code>).</li>
                  <li>En <em>Pantalla de consentimiento OAuth &gt; Usuarios de prueba</em>, añade tu dirección de Gmail.</li>
                </ol>
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          {isAuthenticated && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} /> Operaciones Rápidas
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Create Folder Form */}
                <form onSubmit={handleCreateFolder} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    Crear Carpeta Manual:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nombre de carpeta..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isCreatingFolder || !newFolderName.trim()}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}
                    >
                      {isCreatingFolder ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={16} />}
                      Crear
                    </button>
                  </div>
                </form>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />

                {/* Upload Local File */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>
                    Subir Archivo desde PC:
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: '600' }}
                    >
                      {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      Seleccionar y Subir
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowQuickNoteModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}
                    >
                      <FileText size={16} /> Nota
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Google Drive File Explorer & Operations */}
        <div className="card" style={{ padding: '1.5rem', minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1.15rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HardDrive size={20} /> Explorador de Archivos en Google Drive
              </h4>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {isAuthenticated ? `${files.length} elementos encontrados` : 'Inicia sesión para listar tus archivos.'}
              </span>
            </div>

            {isAuthenticated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar en Drive..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadFiles(searchTerm)}
                    style={{ paddingLeft: '2.2rem', fontSize: '0.85rem', width: '200px' }}
                  />
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => loadFiles(searchTerm)}
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  <Search size={16} />
                </button>
              </div>
            )}
          </div>

          {!isAuthenticated ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem 1rem',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed #cbd5e1'
            }}>
              <HardDrive size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#475569' }}>Google Drive no está conectado</h4>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.88rem', color: '#64748b', maxWidth: '420px' }}>
                Haz clic en "Conectar con Google Drive" para autorizar la creación de las carpetas de tus clientes y pólizas.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleConnect}
                disabled={isConnecting || !config.clientId}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}
              >
                <Unlock size={18} /> Conectar Ahora
              </button>
            </div>
          ) : isLoadingFiles ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem', color: 'var(--primary)' }}>
              <Loader2 size={36} className="animate-spin" />
              <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Cargando archivos desde Google Drive...</span>
            </div>
          ) : files.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)'
            }}>
              <Folder size={44} style={{ color: '#94a3b8', marginBottom: '0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: '#475569' }}>No se encontraron archivos en Google Drive</p>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Usa el botón "Sincronizar Clientes y Pólizas" superior para generar toda tu estructura.
              </span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Nombre</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Tipo</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Tamaño</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Modificado</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    return (
                      <tr key={file.id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isFolder ? (
                              <Folder size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
                            ) : (
                              <FileText size={18} style={{ color: '#059669', flexShrink: 0 }} />
                            )}
                            <span style={{ wordBreak: 'break-all' }}>{file.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {isFolder ? 'Carpeta' : file.mimeType?.split('/')?.pop() || 'Archivo'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                          {isFolder ? '-' : formatBytes(file.size)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            {/* Read Preview Button */}
                            {!isFolder && (
                              <button
                                className="btn-icon"
                                title="Ver / Leer Contenido"
                                onClick={() => handleReadFile(file)}
                                style={{ padding: '4px', color: '#2563eb' }}
                              >
                                <Eye size={16} />
                              </button>
                            )}

                            {/* Download Button */}
                            {!isFolder && (
                              <button
                                className="btn-icon"
                                title="Descargar"
                                onClick={() => handleDownloadFile(file)}
                                style={{ padding: '4px', color: '#059669' }}
                              >
                                <Download size={16} />
                              </button>
                            )}

                            {/* Open in Drive Link */}
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-icon"
                                title="Abrir en Google Drive"
                                style={{ padding: '4px', color: '#d97706', display: 'inline-flex' }}
                              >
                                <ExternalLink size={16} />
                              </a>
                            )}

                            {/* Rename / Modify Button */}
                            <button
                              className="btn-icon"
                              title="Renombrar / Modificar"
                              onClick={() => handleOpenRename(file)}
                              style={{ padding: '4px', color: '#475569' }}
                            >
                              <Edit3 size={16} />
                            </button>

                            {/* Delete Button */}
                            <button
                              className="btn-icon"
                              title="Mover a Papelera"
                              onClick={() => handleDelete(file)}
                              style={{ padding: '4px', color: '#dc2626' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Read / Preview File Content */}
      {selectedFileForRead && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '650px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} />
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>{selectedFileForRead.name}</h3>
              </div>
              <button
                onClick={() => setSelectedFileForRead(null)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {isLoadingContent ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '0.75rem' }}>
                  <Loader2 size={24} className="animate-spin" />
                  <span>Leyendo contenido desde Google Drive...</span>
                </div>
              ) : (
                <pre style={{
                  backgroundColor: '#f8fafc',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #e2e8f0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.85rem',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {fileContentPreview}
                </pre>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => handleDownloadFile(selectedFileForRead)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Download size={16} /> Descargar Archivo
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setSelectedFileForRead(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Rename File */}
      {editingFile && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '480px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={20} />
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>Renombrar en Drive</h3>
              </div>
              <button
                onClick={() => setEditingFile(null)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRename} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  Nuevo Nombre del Archivo / Carpeta:
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingFile(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating || !newFileName.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Quick Note Document Upload */}
      {showQuickNoteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '520px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} />
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>Crear Documento de Texto en Drive</h3>
              </div>
              <button
                onClick={() => setShowQuickNoteModal(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuickNote} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  Título del Documento:
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ej. Notas_Poliza_1234.txt"
                  value={quickNoteTitle}
                  onChange={(e) => setQuickNoteTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  Contenido:
                </label>
                <textarea
                  className="form-control"
                  rows={6}
                  placeholder="Escribe aquí las notas, detalles de póliza o datos que deseas almacenar en Drive..."
                  value={quickNoteContent}
                  onChange={(e) => setQuickNoteContent(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowQuickNoteModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUploading || !quickNoteTitle.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  Guardar en Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default GoogleDriveManager;
