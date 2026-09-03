import React, { useState, useMemo } from 'react';
import { 
    Building, Phone, Mail, MapPin, Globe, Shield, Users, 
    Plus, Search, Edit2, Trash2, ExternalLink, UserPlus, 
    Check, X, FileText, AlertCircle, ArrowUpRight, Copy, CheckCircle2, ChevronRight, Edit3
} from 'lucide-react';
import InsurerLogo from './InsurerLogo';
import { formatMoney } from '../utils/policyHelpers';
import { useUser } from '../context/UserContext';

// Datos corporativos predeterminados para las principales aseguradoras
const DEFAULT_INSURER_DETAILS = {
    'La Colonial de Seguros': {
        rnc: '1-01-01826-1',
        phone: '(809) 540-3400',
        emergencyPhone: '(809) 540-3400 Opción 1 / (809) 200-3400',
        website: 'https://www.lacolonial.com.do',
        address: 'Av. 27 de Febrero #201, Ensanche La Fe, Santo Domingo, D.N.',
        email: 'contacto@lacolonial.com.do',
        brokerCodes: [
            { agent: 'Santiago Morales & Asoc.', code: '8055' },
            { agent: 'Raquel Rodríguez', code: '897' }
        ],
        authorizedBranches: ['Vehículos de Motor', 'Salud Internacional / Local', 'Vida Colectivo / Individual', 'Incendio y Líneas Aliadas', 'Responsabilidad Civil', 'Fianzas'],
        notes: 'Aseguradora principal con cartera mixta, emisión directa y sistema ágil de conciliación de comisiones.'
    },
    'Humano Seguros': {
        rnc: '1-01-85757-3',
        phone: '(809) 476-3535',
        emergencyPhone: '(809) 476-3535 / 1-809-200-4862',
        website: 'https://www.humanoseguros.com',
        address: 'Av. John F. Kennedy #35, Ensanche Naco, Santo Domingo, D.N.',
        email: 'servicio@humano.com.do',
        brokerCodes: [
            { agent: 'Santiago Morales & Asoc.', code: '76713' }
        ],
        authorizedBranches: ['Salud Local', 'Salud Internacional (Plan Platinum)', 'Vida', 'Accidentes Personales', 'MiAuto (Vehículos)'],
        notes: 'Líder en coberturas de salud médica privada y planes integrales con amplia red de prestadores.'
    },
    'Seguros Universal': {
        rnc: '1-01-01824-5',
        phone: '(809) 544-7100',
        emergencyPhone: '(809) 544-7111 / 1-809-200-7111',
        website: 'https://www.universal.com.do',
        address: 'Av. Winston Churchill #1100, Ensanche Piantini, Santo Domingo, D.N.',
        email: 'contacto@universal.com.do',
        brokerCodes: [
            { agent: 'Santiago Morales & Asoc.', code: '3104' }
        ],
        authorizedBranches: ['Vehículos de Motor', 'Salud', 'Vida', 'Incendio y Terremoto', 'Transporte de Carga', 'Fianzas'],
        notes: 'Grupo asegurador multirramo con la red más amplia de talleres certificados y centros de atención.'
    },
    'Mapfre BHD Seguros': {
        rnc: '1-01-01777-1',
        phone: '(809) 549-7441',
        emergencyPhone: '(809) 549-7441 / SI24 (809) 549-7424',
        website: 'https://www.mapfrebhd.com.do',
        address: 'Av. Abraham Lincoln #1063, Santo Domingo, D.N.',
        email: 'servicioalcliente@mapfre.com.do',
        brokerCodes: [
            { agent: 'Santiago Morales & Asoc.', code: '1540' }
        ],
        authorizedBranches: ['Auto Global', 'Salud Internacional', 'Hogar y Empresas', 'Fianzas y Garantías', 'Responsabilidad Civil'],
        notes: 'Respaldo internacional con servicios avanzados de asistencia en viajes y riesgos patrimoniales.'
    },
    'Seguros Reservas': {
        rnc: '1-01-83141-8',
        phone: '(809) 960-7000',
        emergencyPhone: '(809) 960-7272 / Asistencia Reservas',
        website: 'https://www.segurosreservas.com',
        address: 'Av. 27 de Febrero #223, Ensanche Piantini, Santo Domingo, D.N.',
        email: 'info@segurosreservas.com',
        brokerCodes: [
            { agent: 'Santiago Morales & Asoc.', code: '4090' }
        ],
        authorizedBranches: ['Vehículos de Motor', 'Incendio y Aliados', 'Vida Colectivo', 'Salud', 'Transporte Marítimo / Aéreo'],
        notes: 'Aseguradora del Grupo Banreservas con alta solidez en pólizas corporativas e instituciones.'
    },
    'Seguros Sura': {
        rnc: '1-01-01648-1',
        phone: '(809) 227-7872',
        emergencyPhone: '(809) 227-7872 / Cabina Sura 24/7',
        website: 'https://www.segurossura.com.do',
        address: 'Av. Gustavo Mejía Ricart #102, Ensanche Piantini, Santo Domingo, D.N.',
        email: 'comunicaciones@sura.com.do',
        brokerCodes: [
            { agent: 'Santiago Morales & Asoc.', code: '6012' }
        ],
        authorizedBranches: ['Auto Global', 'Empresas y Pymes', 'Salud y Vida', 'Seguro de Transporte', 'Riesgos Financieros'],
        notes: 'Enfoque en gestión de tendencias y riesgos preventivos para empresas y personas.'
    }
};

// Contactos clave iniciales estructurados por aseguradora
const DEFAULT_INSURER_CONTACTS = {
    'La Colonial de Seguros': [
        {
            id: 'col_1',
            name: 'Lic. Roberto Fernández',
            role: 'Ejecutivo de Cuentas Intermediarios',
            department: 'Comercial & Broker',
            phone: '809-540-3400',
            ext: '2210',
            mobile: '829-555-3410',
            email: 'rfernandez@lacolonial.com.do',
            notes: 'Atención directa para cotizaciones corporativas y emisiones especiales.'
        },
        {
            id: 'col_2',
            name: 'Ing. Patricia Valdez',
            role: 'Suscriptora Senior Ramos Generales',
            department: 'Suscripción',
            phone: '809-540-3400',
            ext: '2345',
            mobile: '829-555-2345',
            email: 'pvaldez@lacolonial.com.do',
            notes: 'Suscripción técnica de flotillas, incendios y pólizas todo riesgo industrial.'
        },
        {
            id: 'col_3',
            name: 'Lic. Manuel Guzmán',
            role: 'Coordinador de Siniestros y Ajustes',
            department: 'Reclamaciones',
            phone: '809-540-3400',
            ext: '2410',
            mobile: '809-555-8920',
            email: 'reclamos@lacolonial.com.do',
            notes: 'Inspecciones presenciales, órdenes de reparación en talleres y piezas.'
        },
        {
            id: 'col_4',
            name: 'Carlos Peña',
            role: 'Oficial de Comisiones y Conciliación',
            department: 'Contabilidad & Cobros',
            phone: '809-540-3400',
            ext: '2180',
            mobile: '',
            email: 'comisiones@lacolonial.com.do',
            notes: 'Conciliación de pagos, cheques de comisiones y estados de cuenta mensuales.'
        }
    ],
    'Humano Seguros': [
        {
            id: 'hum_1',
            name: 'Laura Morales',
            role: 'Ejecutiva de Cuentas Broker',
            department: 'Comercial',
            phone: '809-476-3535',
            ext: '4120',
            mobile: '829-555-7613',
            email: 'lmorales@humano.com.do',
            notes: 'Atención exclusiva de cartera para cotizaciones y solicitudes de emisión.'
        },
        {
            id: 'hum_2',
            name: 'Dr. Andrés Medina',
            role: 'Auditor Médico / Reclamaciones',
            department: 'Salud & Vida',
            phone: '809-476-3535',
            ext: '4502',
            mobile: '',
            email: 'amedina@humano.com.do',
            notes: 'Autorizaciones médicas especiales, reembolsos e ingresos clínicos.'
        },
        {
            id: 'hum_3',
            name: 'Gabriela Santos',
            role: 'Suscriptora Ramos Generales',
            department: 'Suscripción Auto & Daños',
            phone: '809-476-3535',
            ext: '4215',
            mobile: '809-555-4215',
            email: 'gsantos@humano.com.do',
            notes: 'Pólizas de vehículos MiAuto y coberturas patrimoniales.'
        }
    ],
    'Seguros Universal': [
        {
            id: 'uni_1',
            name: 'Lic. Fernando Castillo',
            role: 'Gerente de Cuentas Intermediarios',
            department: 'Comercial & Corredores',
            phone: '809-544-7100',
            ext: '3105',
            mobile: '829-555-3105',
            email: 'fcastillo@universal.com.do',
            notes: 'Coordinación comercial, acuerdos y cotizaciones especiales.'
        },
        {
            id: 'uni_2',
            name: 'Arq. Brenda Reyes',
            role: 'Suscriptora Incendio & Ramos Técnicos',
            department: 'Suscripción',
            phone: '809-544-7100',
            ext: '3220',
            mobile: '',
            email: 'breyes@universal.com.do',
            notes: 'Tasaciones, inspección de riesgos y pólizas todo riesgo.'
        },
        {
            id: 'uni_3',
            name: 'Lic. Héctor Ramírez',
            role: 'Analista de Siniestros Automóvil',
            department: 'Reclamaciones Auto',
            phone: '809-544-7100',
            ext: '3415',
            mobile: '809-555-3415',
            email: 'hramirez@universal.com.do',
            notes: 'Trámites de colisiones, pérdida total y servicio de grúas.'
        }
    ],
    'Mapfre BHD Seguros': [
        {
            id: 'map_1',
            name: 'Lic. Claudia Santana',
            role: 'Ejecutiva de Corredores',
            department: 'Atención a Intermediarios',
            phone: '809-549-7441',
            ext: '5120',
            mobile: '829-555-5120',
            email: 'csantana@mapfrebhd.com.do',
            notes: 'Gestión ágil de emisiones y cartas de garantía.'
        },
        {
            id: 'map_2',
            name: 'Miguel Ángel Rosario',
            role: 'Suscriptor Fianzas y RC',
            department: 'Suscripción Técnica',
            phone: '809-549-7441',
            ext: '5230',
            mobile: '',
            email: 'mrosario@mapfrebhd.com.do',
            notes: 'Líneas de fianzas de licitación y responsabilidad civil.'
        }
    ],
    'Seguros Reservas': [
        {
            id: 'res_1',
            name: 'Lic. David Ortiz',
            role: 'Ejecutivo de Negocios Broker',
            department: 'Intermediarios',
            phone: '809-960-7000',
            ext: '6100',
            mobile: '829-555-6100',
            email: 'dortiz@segurosreservas.com',
            notes: 'Atención directa para cotizaciones corporativas y licitaciones.'
        },
        {
            id: 'res_2',
            name: 'Lic. Sofía Ventura',
            role: 'Oficial de Reclamaciones y Ajustes',
            department: 'Reclamaciones',
            phone: '809-960-7000',
            ext: '6250',
            mobile: '',
            email: 'sventura@segurosreservas.com',
            notes: 'Siniestros patrimoniales y de vehículos de motor.'
        }
    ],
    'Seguros Sura': [
        {
            id: 'sur_1',
            name: 'Lic. Javier Pineda',
            role: 'Gestor de Relación con Intermediarios',
            department: 'Comercial',
            phone: '809-227-7872',
            ext: '7140',
            mobile: '829-555-7140',
            email: 'jpineda@sura.com.do',
            notes: 'Cotizaciones avanzadas y productos de soluciones empresariales.'
        },
        {
            id: 'sur_2',
            name: 'Ing. Carmen Almonte',
            role: 'Analista de Riesgos y Suscripción',
            department: 'Suscripción',
            phone: '809-227-7872',
            ext: '7215',
            mobile: '',
            email: 'calmonte@sura.com.do',
            notes: 'Evaluación técnica de riesgos patrimoniales e industriales.'
        }
    ]
};

const CompaniesManagement = ({ policies = [], payments = [], claims = [], companies = [], setCompanies }) => {
    const { isDemo } = useUser();

    // Insurer Contacts State (Persisted)
    const [contactsByInsurer, setContactsByInsurer] = useState(() => {
        const saved = localStorage.getItem('sm_insurer_contacts');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return DEFAULT_INSURER_CONTACTS;
    });

    // Insurer Details State (Persisted)
    const [detailsByInsurer, setDetailsByInsurer] = useState(() => {
        const saved = localStorage.getItem('sm_insurer_details');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return DEFAULT_INSURER_DETAILS;
    });

    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal de Perfil y Detalle de Aseguradora
    const [selectedInsurerDetails, setSelectedInsurerDetails] = useState(null);
    const [detailType, setDetailType] = useState('contacts'); // 'contacts', 'info', 'policies', 'claims', 'metrics'
    const [contactSearchTerm, setContactSearchTerm] = useState('');
    const [policySearchTerm, setPolicySearchTerm] = useState('');
    const [copiedEmail, setCopiedEmail] = useState(null);

    // Formulario de Contacto (Crear / Editar)
    const [showContactModal, setShowContactModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [contactForm, setContactForm] = useState({
        name: '',
        role: '',
        department: 'Comercial',
        phone: '',
        ext: '',
        mobile: '',
        email: '',
        notes: ''
    });

    // CRUD Compañías
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCompany, setNewCompany] = useState({ name: '', domain: '' });
    const [editingCompany, setEditingCompany] = useState(null);
    const [deletingCompanyConfirm, setDeletingCompanyConfirm] = useState(null);

    // Guardar contactos en localStorage al cambiar
    const saveContactsState = (newContacts) => {
        setContactsByInsurer(newContacts);
        localStorage.setItem('sm_insurer_contacts', JSON.stringify(newContacts));
    };

    // Obtener los contactos actuales de la aseguradora seleccionada
    const currentInsurerContacts = useMemo(() => {
        if (!selectedInsurerDetails) return [];
        return contactsByInsurer[selectedInsurerDetails] || [];
    }, [selectedInsurerDetails, contactsByInsurer]);

    // Filtrar contactos por búsqueda
    const filteredContacts = useMemo(() => {
        if (!contactSearchTerm) return currentInsurerContacts;
        const q = contactSearchTerm.toLowerCase();
        return currentInsurerContacts.filter(c => 
            c.name?.toLowerCase().includes(q) ||
            c.role?.toLowerCase().includes(q) ||
            c.department?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.includes(q) ||
            c.mobile?.includes(q) ||
            c.notes?.toLowerCase().includes(q)
        );
    }, [currentInsurerContacts, contactSearchTerm]);

    // Obtener detalles corporativos de la aseguradora seleccionada
    const currentInsurerInfo = useMemo(() => {
        if (!selectedInsurerDetails) return null;
        return detailsByInsurer[selectedInsurerDetails] || {
            rnc: '1-01-XXXXX-X',
            phone: '(809) 555-0000',
            emergencyPhone: '(809) 555-0000 24/7',
            website: `https://${companies.find(c => c.name === selectedInsurerDetails)?.domain || 'www.seguros.com.do'}`,
            address: 'Santo Domingo, República Dominicana',
            email: 'contacto@aseguradora.com.do',
            brokerCodes: [{ agent: 'Santiago Morales & Asoc.', code: '8055' }],
            authorizedBranches: ['Vehículos de Motor', 'Salud', 'Vida', 'Incendio'],
            notes: 'Compañía registrada en el sistema de gestión de seguros.'
        };
    }, [selectedInsurerDetails, detailsByInsurer, companies]);

    const handleAddCompany = (e) => {
        e.preventDefault();
        const trimmedName = newCompany.name.trim();
        const trimmedDomain = newCompany.domain.trim();
        if (!trimmedName) return;

        if (companies.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
            alert(`La compañía "${trimmedName}" ya existe en el sistema.`);
            return;
        }

        const newObj = { name: trimmedName, domain: trimmedDomain };
        setCompanies([...companies, newObj]);

        // Initialize commission rate
        const updatedRates = { ...insurerRates, [trimmedName]: 0.15 };
        setInsurerRates(updatedRates);
        if (!isDemo) {
            localStorage.setItem('insurer_commission_rates', JSON.stringify(updatedRates));
        }

        setNewCompany({ name: '', domain: '' });
        setShowAddModal(false);
    };

    const handleEditCompanySubmit = (e) => {
        e.preventDefault();
        const trimmedName = editingCompany.name.trim();
        const trimmedDomain = editingCompany.domain.trim();
        const originalName = editingCompany.originalName;
        if (!trimmedName) return;

        if (companies.some(c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.name.toLowerCase() !== originalName.toLowerCase())) {
            alert(`La compañía "${trimmedName}" ya existe.`);
            return;
        }

        const updated = companies.map(c => {
            if (c.name.toLowerCase() === originalName.toLowerCase()) {
                return { name: trimmedName, domain: trimmedDomain };
            }
            return c;
        });
        setCompanies(updated);

        // Update commission rate key
        const updatedRates = { ...insurerRates };
        const oldRate = updatedRates[originalName] !== undefined ? updatedRates[originalName] : 0.15;
        updatedRates[trimmedName] = oldRate;
        if (trimmedName.toLowerCase() !== originalName.toLowerCase()) {
            delete updatedRates[originalName];
        }
        setInsurerRates(updatedRates);
        if (!isDemo) {
            localStorage.setItem('insurer_commission_rates', JSON.stringify(updatedRates));
        }

        setEditingCompany(null);
    };

    const handleDeleteCompany = (name) => {
        const policyCount = policies.filter(p => p.insurer.toLowerCase() === name.toLowerCase()).length;
        if (policyCount > 0) {
            alert(`No se puede eliminar "${name}" porque tiene ${policyCount} pólizas asociadas.`);
            return;
        }
        setDeletingCompanyConfirm(name);
    };

    const handleConfirmDelete = () => {
        if (!deletingCompanyConfirm) return;
        const name = deletingCompanyConfirm;
        const updated = companies.filter(c => c.name.toLowerCase() !== name.toLowerCase());
        setCompanies(updated);
        setDeletingCompanyConfirm(null);
    };

    // Manejo de Contactos
    const handleOpenAddContact = () => {
        setEditingContact(null);
        setContactForm({
            name: '',
            role: '',
            department: 'Comercial & Broker',
            phone: currentInsurerInfo?.phone || '',
            ext: '',
            mobile: '',
            email: '',
            notes: ''
        });
        setShowContactModal(true);
    };

    const handleOpenEditContact = (contact) => {
        setEditingContact(contact);
        setContactForm({
            name: contact.name || '',
            role: contact.role || '',
            department: contact.department || 'Comercial & Broker',
            phone: contact.phone || '',
            ext: contact.ext || '',
            mobile: contact.mobile || '',
            email: contact.email || '',
            notes: contact.notes || ''
        });
        setShowContactModal(true);
    };

    const handleSaveContactSubmit = (e) => {
        e.preventDefault();
        if (!contactForm.name.trim()) return;

        const currentList = contactsByInsurer[selectedInsurerDetails] || [];
        let updatedList;

        if (editingContact) {
            updatedList = currentList.map(c => 
                c.id === editingContact.id ? { ...c, ...contactForm } : c
            );
        } else {
            const newContactItem = {
                id: `cnt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                ...contactForm
            };
            updatedList = [newContactItem, ...currentList];
        }

        const newContactsByInsurer = {
            ...contactsByInsurer,
            [selectedInsurerDetails]: updatedList
        };
        saveContactsState(newContactsByInsurer);
        setShowContactModal(false);
    };

    const handleDeleteContact = (contactId) => {
        if (!window.confirm('¿Está seguro de que desea eliminar este contacto de la aseguradora?')) return;
        const currentList = contactsByInsurer[selectedInsurerDetails] || [];
        const updatedList = currentList.filter(c => c.id !== contactId);
        const newContactsByInsurer = {
            ...contactsByInsurer,
            [selectedInsurerDetails]: updatedList
        };
        saveContactsState(newContactsByInsurer);
    };

    const handleCopyEmail = (email, contactId) => {
        if (!email) return;
        navigator.clipboard.writeText(email);
        setCopiedEmail(contactId);
        setTimeout(() => setCopiedEmail(null), 2000);
    };

    // Calculate aggregated statistics per company
    const statsByInsurer = useMemo(() => {
        const data = {};

        companies.forEach(company => {
            const insurer = company.name;
            const insurerPolicies = policies.filter(p => p.insurer === insurer);
            
            // Primas Emitidas (DOP & USD)
            let dopPremiums = 0;
            let usdPremiums = 0;
            insurerPolicies.forEach(pol => {
                const num = parseFloat(String(pol.amount).replace(/[^0-9.]/g, '')) || 0;
                if (pol.currency === 'USD') usdPremiums += num;
                else dopPremiums += num;
            });

            // Siniestros
            const insurerClaims = claims.filter(c => {
                const pol = policies.find(p => p.id === c.policy);
                return (pol && pol.insurer === insurer) || (c.policyDesc && c.policyDesc.includes(insurer));
            });

            // Comisiones (Calculadas individualmente por cada póliza)
            let dopCommissionsPaid = 0;
            let usdCommissionsPaid = 0;

            payments.forEach(pay => {
                if (pay.status !== 'Paid') return;
                const pol = policies.find(p => p.id === pay.policyId);
                if (pol && pol.insurer === insurer) {
                    const payAmt = pay.amountNum || parseFloat(String(pay.amount).replace(/[^0-9.]/g, '')) || 0;
                    const polRate = (pol.commissionRate !== undefined && pol.commissionRate !== null)
                        ? Number(pol.commissionRate) / 100
                        : (pol.porcentajeComision !== undefined && pol.porcentajeComision !== null ? Number(pol.porcentajeComision) / 100 : 0.15);
                    const commAmt = payAmt * polRate;
                    if (pol.currency === 'USD') usdCommissionsPaid += commAmt;
                    else dopCommissionsPaid += commAmt;
                }
            });

            const contactsCount = (contactsByInsurer[insurer] || []).length;

            data[insurer] = {
                policiesCount: insurerPolicies.length,
                claimsCount: insurerClaims.length,
                contactsCount,
                dopPremiums,
                usdPremiums,
                dopCommissionsPaid,
                usdCommissionsPaid
            };
        });

        return data;
    }, [companies, policies, payments, claims, contactsByInsurer]);

    // Overall summary stats
    const summary = useMemo(() => {
        let totalPolicies = policies.length;
        let totalClaims = claims.length;
        let totalContacts = 0;
        let dopPremiumsSum = 0;
        let usdPremiumsSum = 0;
        let dopCommissionsSum = 0;
        let usdCommissionsSum = 0;

        Object.values(statsByInsurer).forEach(item => {
            dopPremiumsSum += item.dopPremiums;
            usdPremiumsSum += item.usdPremiums;
            dopCommissionsSum += item.dopCommissionsPaid;
            usdCommissionsSum += item.usdCommissionsPaid;
            totalContacts += item.contactsCount;
        });

        return {
            totalPolicies,
            totalClaims,
            totalContacts,
            dopPremiumsSum,
            usdPremiumsSum,
            dopCommissionsSum,
            usdCommissionsSum
        };
    }, [policies, claims, statsByInsurer]);

    const filteredInsurers = useMemo(() => {
        return companies.filter(company => 
            company.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).map(c => c.name).sort((a, b) => a.localeCompare(b));
    }, [companies, searchTerm]);

    // Details view policies
    const currentInsurerPolicies = useMemo(() => {
        if (!selectedInsurerDetails) return [];
        let list = policies.filter(p => p.insurer === selectedInsurerDetails);
        if (policySearchTerm) {
            const q = policySearchTerm.toLowerCase();
            list = list.filter(p => 
                p.id?.toLowerCase().includes(q) ||
                p.client?.toLowerCase().includes(q) ||
                p.type?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [selectedInsurerDetails, policies, policySearchTerm]);

    // Details view claims
    const currentInsurerClaims = useMemo(() => {
        if (!selectedInsurerDetails) return [];
        return claims.filter(c => {
            const pol = policies.find(p => p.id === c.policy);
            return (pol && pol.insurer === selectedInsurerDetails) || (c.policyDesc && c.policyDesc.includes(selectedInsurerDetails));
        });
    }, [selectedInsurerDetails, policies, claims]);

    const handleOpenInsurerProfile = (insurer, defaultTab = 'contacts') => {
        setSelectedInsurerDetails(insurer);
        setDetailType(defaultTab);
        setContactSearchTerm('');
        setPolicySearchTerm('');
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', color: 'var(--primary)', margin: 0 }}>Compañías Aseguradoras</h2>
                    <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
                        Directorio de contactos clave, datos corporativos, códigos de corredor, pólizas y tasas de comisión por aseguradora.
                    </p>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={() => {
                        setNewCompany({ name: '', domain: '' });
                        setShowAddModal(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--primary)' }}
                >
                    <Plus size={18} /> Agregar Aseguradora
                </button>
            </div>

            {/* Quick Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#fdf8f6', borderRadius: '50%', color: 'var(--primary)' }}>
                        <Building2 size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Aseguradoras Aliadas</p>
                        <h4 style={{ fontSize: '1.5rem', margin: '0.2rem 0 0', fontWeight: '800' }}>{companies.length}</h4>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '50%', color: '#2563eb' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Contactos Clave</p>
                        <h4 style={{ fontSize: '1.5rem', margin: '0.2rem 0 0', fontWeight: '800' }}>{summary.totalContacts}</h4>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '50%', color: '#166534' }}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Pólizas Emitidas</p>
                        <h4 style={{ fontSize: '1.5rem', margin: '0.2rem 0 0', fontWeight: '800' }}>{summary.totalPolicies}</h4>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: '50%', color: '#b45309' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Comisiones Cobradas</p>
                        <h4 style={{ fontSize: '1.2rem', margin: '0.2rem 0 0', fontWeight: '800' }}>
                            RD$ {formatMoney(summary.dopCommissionsSum).replace('RD$ ', '').replace('USD$ ', '')}
                            {summary.usdCommissionsSum > 0 && <div style={{ fontSize: '0.82rem', color: '#10b981' }}>USD$ {formatMoney(summary.usdCommissionsSum).replace('RD$ ', '').replace('USD$ ', '')}</div>}
                        </h4>
                    </div>
                </div>
            </div>

            {/* Filter bar */}
            <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'white', flex: 1, maxWidth: '420px', position: 'relative' }}>
                    <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="Buscar compañía por nombre..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', paddingRight: searchTerm ? '24px' : '0' }}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px'
                            }}
                            title="Limpiar búsqueda"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Mostrando <strong>{filteredInsurers.length}</strong> de {companies.length} aseguradoras
                </span>
            </div>

            {/* Grid list of companies */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {filteredInsurers.map(insurer => {
                    const stats = statsByInsurer[insurer] || {};
                    const isEditing = editingInsurer === insurer;
                    const compObj = companies.find(c => c.name === insurer) || {};
                    const contactsCount = stats.contactsCount || 0;

                    return (
                        <div 
                            key={insurer} 
                            className="card hover-card" 
                            style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '1rem', 
                                padding: '1.4rem', 
                                position: 'relative',
                                border: '1px solid var(--border)',
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            {/* Card Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <div 
                                    onClick={() => handleOpenInsurerProfile(insurer, 'contacts')}
                                    style={{ cursor: 'pointer', flexShrink: 0 }}
                                    title="Ver perfil completo"
                                >
                                    <InsurerLogo name={insurer} domain={compObj.domain} size={58} initialsSize="1.3rem" />
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <h3 
                                        onClick={() => handleOpenInsurerProfile(insurer, 'contacts')}
                                        style={{ 
                                            margin: 0, 
                                            fontSize: '1.1rem', 
                                            color: 'var(--text-main)', 
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem'
                                        }}
                                        className="hover-underline"
                                    >
                                        {insurer}
                                    </h3>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                                        {compObj.domain || 'República Dominicana'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.2rem' }}>
                                    <button
                                        onClick={() => {
                                            setEditingCompany({ originalName: insurer, name: insurer, domain: compObj.domain || '' });
                                        }}
                                        className="btn-icon"
                                        title="Editar Compañía"
                                        style={{ padding: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)' }}
                                    >
                                        <Edit3 size={15} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCompany(insurer)}
                                        className="btn-icon"
                                        title="Eliminar Compañía"
                                        style={{ padding: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', borderRadius: 'var(--radius-sm)' }}
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Badge de Contactos y Rate */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                                <button
                                    onClick={() => handleOpenInsurerProfile(insurer, 'contacts')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        backgroundColor: '#eff6ff',
                                        color: '#1d4ed8',
                                        border: '1px solid #bfdbfe',
                                        borderRadius: '999px',
                                        padding: '0.25rem 0.65rem',
                                        fontSize: '0.78rem',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Users size={14} /> {contactsCount} {contactsCount === 1 ? 'Contacto' : 'Contactos Clave'}
                                </button>
                            </div>

                            {/* Stats grids */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.88rem', padding: '0.6rem 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Pólizas Activas</div>
                                    <button 
                                        onClick={() => handleOpenInsurerProfile(insurer, 'policies')} 
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.1rem 0 0 0', fontWeight: '800', fontSize: '1.15rem', color: 'var(--primary)' }}
                                    >
                                        {stats.policiesCount} <ArrowUpRight size={14} />
                                    </button>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Siniestros</div>
                                    <button 
                                        onClick={() => handleOpenInsurerProfile(insurer, 'claims')} 
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.1rem 0 0 0', fontWeight: '800', fontSize: '1.15rem', color: stats.claimsCount > 0 ? '#dc2626' : 'var(--text-muted)' }}
                                    >
                                        {stats.claimsCount} {stats.claimsCount > 0 && <ArrowUpRight size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Financial totals */}
                            <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Primas DOP:</span>
                                    <span style={{ fontWeight: '700' }}>{formatMoney(stats.dopPremiums, 'DOP')}</span>
                                </div>
                                {stats.usdPremiums > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Primas USD:</span>
                                        <span style={{ fontWeight: '700', color: '#10b981' }}>{formatMoney(stats.usdPremiums, 'USD')}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Comisión Ganada:</span>
                                    <span style={{ fontWeight: '800', color: 'var(--primary)' }}>
                                        {formatMoney(stats.dopCommissionsPaid, 'DOP')}
                                        {stats.usdCommissionsPaid > 0 && <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'block', textAlign: 'right' }}>{formatMoney(stats.usdCommissionsPaid, 'USD')}</span>}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                                <button
                                    onClick={() => handleOpenInsurerProfile(insurer, 'contacts')}
                                    className="btn"
                                    style={{
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.35rem',
                                        backgroundColor: '#f1f5f9',
                                        color: 'var(--primary)',
                                        border: '1px solid #cbd5e1',
                                        padding: '0.45rem 0.5rem'
                                    }}
                                >
                                    <Users size={14} /> Contactos
                                </button>
                                <button
                                    onClick={() => handleOpenInsurerProfile(insurer, 'info')}
                                    className="btn btn-primary"
                                    style={{
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.35rem',
                                        backgroundColor: 'var(--primary)',
                                        padding: '0.45rem 0.5rem'
                                    }}
                                >
                                    <Building2 size={14} /> Ver Perfil
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal Completo de Perfil y Detalles de Aseguradora */}
            {selectedInsurerDetails && (
                <div style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    backgroundColor: 'rgba(0,0,0,0.65)', 
                    backdropFilter: 'blur(3px)',
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'center', 
                    zIndex: 1000, 
                    padding: '1.5rem 1rem',
                    overflowY: 'auto'
                }}>
                    <div className="card" style={{ 
                        width: '100%', 
                        maxWidth: '980px', 
                        backgroundColor: 'white', 
                        minHeight: '600px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        padding: 0,
                        boxShadow: 'var(--shadow-xl)',
                        margin: 'auto'
                    }}>
                        {/* Header del Perfil de Aseguradora */}
                        <div style={{ 
                            padding: '1.25rem 1.5rem', 
                            backgroundColor: 'var(--primary)', 
                            color: 'white',
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            borderBottom: '3px solid #d97706',
                            flexWrap: 'wrap',
                            gap: '1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ backgroundColor: 'white', padding: '4px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <InsurerLogo name={selectedInsurerDetails} domain={companies.find(c => c.name === selectedInsurerDetails)?.domain} size={54} initialsSize="1.25rem" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.35rem', fontWeight: '800' }}>
                                        {selectedInsurerDetails}
                                    </h3>
                                    <p style={{ color: '#fef08a', margin: '0.2rem 0 0 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span>RNC: {currentInsurerInfo?.rnc || '1-01-XXXXX-X'}</span>
                                        <span>·</span>
                                        <span>Tel: {currentInsurerInfo?.phone || '(809) 555-0000'}</span>
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedInsurerDetails(null)} 
                                style={{ 
                                    background: 'rgba(255,255,255,0.15)', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Tabs Navigation */}
                        <div style={{ 
                            display: 'flex', 
                            gap: 0, 
                            padding: '0 1.5rem', 
                            backgroundColor: '#f8fafc',
                            borderBottom: '1px solid var(--border)',
                            overflowX: 'auto',
                            flexShrink: 0
                        }}>
                            {[
                                { key: 'contacts', icon: <Users size={15} />, label: 'Contactos', badge: currentInsurerContacts.length },
                                { key: 'info', icon: <Building2 size={15} />, label: 'Info & Códigos', badge: null },
                                { key: 'policies', icon: <FileText size={15} />, label: 'Pólizas', badge: policies.filter(p => p.insurer === selectedInsurerDetails).length },
                                { key: 'claims', icon: <ShieldAlert size={15} />, label: 'Siniestros', badge: currentInsurerClaims.length },
                                { key: 'metrics', icon: <DollarSign size={15} />, label: 'Primas & Com.', badge: null }
                            ].map(tab => (
                                <button 
                                    key={tab.key}
                                    className="btn"
                                    onClick={() => setDetailType(tab.key)}
                                    style={{ 
                                        padding: '0.7rem 1rem', 
                                        fontSize: '0.82rem', 
                                        fontWeight: '700',
                                        borderBottom: detailType === tab.key ? '3px solid var(--primary)' : '3px solid transparent',
                                        borderTop: 'none',
                                        borderLeft: 'none',
                                        borderRight: 'none',
                                        borderRadius: 0,
                                        backgroundColor: 'transparent',
                                        color: detailType === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                        marginBottom: '-1px'
                                    }}
                                >
                                    {tab.icon}
                                    {tab.label}
                                    {tab.badge !== null && (
                                        <span style={{
                                            backgroundColor: detailType === tab.key ? 'var(--primary)' : '#e2e8f0',
                                            color: detailType === tab.key ? 'white' : 'var(--text-muted)',
                                            borderRadius: '999px',
                                            fontSize: '0.7rem',
                                            fontWeight: '800',
                                            padding: '0.05rem 0.4rem',
                                            minWidth: '18px',
                                            textAlign: 'center'
                                        }}>{tab.badge}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#fdfdfd' }}>
                            
                            {/* PESTAÑA 1: DIRECTORIO DE CONTACTOS */}
                            {detailType === 'contacts' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'white', flex: 1, maxWidth: '380px' }}>
                                            <Search size={16} color="var(--text-muted)" />
                                            <input
                                                type="text"
                                                placeholder="Buscar contacto por nombre, cargo, dpto o correo..."
                                                value={contactSearchTerm}
                                                onChange={e => setContactSearchTerm(e.target.value)}
                                                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.88rem' }}
                                            />
                                            {contactSearchTerm && (
                                                <button onClick={() => setContactSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleOpenAddContact}
                                            className="btn btn-primary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '700', backgroundColor: '#15803d' }}
                                        >
                                            <UserPlus size={16} /> Agregar Contacto
                                        </button>
                                    </div>

                                    {filteredContacts.length === 0 ? (
                                        <div style={{ padding: '3rem 1rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed #cbd5e1' }}>
                                            <Users size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                                            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>No se encontraron contactos</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {contactSearchTerm ? 'Ningún contacto coincide con la búsqueda.' : 'No hay contactos registrados para esta aseguradora. ¡Agrega el primero!'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
                                            {filteredContacts.map(contact => (
                                                <div 
                                                    key={contact.id}
                                                    style={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: 'var(--radius-md)',
                                                        padding: '1.2rem',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'space-between',
                                                        gap: '0.85rem'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                                <div style={{
                                                                    width: '42px',
                                                                    height: '42px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: '#fef3c7',
                                                                    color: '#92400e',
                                                                    fontWeight: '800',
                                                                    fontSize: '1rem',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    flexShrink: 0
                                                                }}>
                                                                    {contact.name.split(' ').map(n => n[0]).filter((_, idx) => idx < 2).join('')}
                                                                </div>
                                                                <div>
                                                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)' }}>
                                                                        {contact.name}
                                                                    </h4>
                                                                    <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--primary)' }}>
                                                                        {contact.role}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                                                                <button
                                                                    onClick={() => handleOpenEditContact(contact)}
                                                                    className="btn-icon"
                                                                    title="Editar contacto"
                                                                    style={{ padding: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                                >
                                                                    <Edit3 size={15} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteContact(contact.id)}
                                                                    className="btn-icon"
                                                                    title="Eliminar contacto"
                                                                    style={{ padding: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                            {contact.department && (
                                                                <span style={{
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: '700',
                                                                    backgroundColor: '#eff6ff',
                                                                    color: '#1d4ed8',
                                                                    padding: '0.15rem 0.5rem',
                                                                    borderRadius: '999px'
                                                                }}>
                                                                    🏢 {contact.department}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Contact Details List */}
                                                        <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.84rem' }}>
                                                            {contact.phone && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                                                                    <Phone size={14} color="#64748b" style={{ flexShrink: 0 }} />
                                                                    <a href={`tel:${contact.phone}`} style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
                                                                        {contact.phone} {contact.ext ? `(Ext. ${contact.ext})` : ''}
                                                                    </a>
                                                                </div>
                                                            )}
                                                            {contact.mobile && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                                                                    <PhoneCall size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                                                                    <a href={`tel:${contact.mobile}`} style={{ color: '#166534', fontWeight: '700', textDecoration: 'none' }}>
                                                                        Flota: {contact.mobile}
                                                                    </a>
                                                                    <a 
                                                                        href={`https://wa.me/1${contact.mobile.replace(/[^0-9]/g, '')}`} 
                                                                        target="_blank" 
                                                                        rel="noreferrer"
                                                                        style={{ fontSize: '0.72rem', backgroundColor: '#dcfce7', color: '#166534', padding: '0.1rem 0.4rem', borderRadius: '4px', textDecoration: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                                                    >
                                                                        <MessageSquare size={11} /> WhatsApp
                                                                    </a>
                                                                </div>
                                                            )}
                                                            {contact.email && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                                                                    <Mail size={14} color="#64748b" style={{ flexShrink: 0 }} />
                                                                    <a href={`mailto:${contact.email}`} style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '230px' }}>
                                                                        {contact.email}
                                                                    </a>
                                                                    <button
                                                                        onClick={() => handleCopyEmail(contact.email, contact.id)}
                                                                        title="Copiar correo"
                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedEmail === contact.id ? '#16a34a' : '#94a3b8', padding: '2px', display: 'flex' }}
                                                                    >
                                                                        {copiedEmail === contact.id ? <Check size={13} /> : <Copy size={13} />}
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {contact.notes && (
                                                                <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', backgroundColor: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                                                                    📝 {contact.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Quick Actions Footer */}
                                                    <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
                                                        {contact.email && (
                                                            <a 
                                                                href={`mailto:${contact.email}`}
                                                                className="btn"
                                                                style={{ flex: 1, fontSize: '0.78rem', fontWeight: '700', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', textDecoration: 'none' }}
                                                            >
                                                                <Mail size={13} /> Enviar Correo
                                                            </a>
                                                        )}
                                                        {(contact.phone || contact.mobile) && (
                                                            <a 
                                                                href={`tel:${contact.mobile || contact.phone}`}
                                                                className="btn"
                                                                style={{ flex: 1, fontSize: '0.78rem', fontWeight: '700', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', textDecoration: 'none' }}
                                                            >
                                                                <PhoneCall size={13} /> Llamar
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PESTAÑA 2: INFORMACIÓN CORPORATIVA & CÓDIGOS */}
                            {detailType === 'info' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {/* Códigos de Intermediario */}
                                    <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                                        <h4 style={{ margin: '0 0 0.85rem 0', color: 'var(--primary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem' }}>
                                            <KeyRound size={18} color="#d97706" /> Códigos de Intermediario / Broker Asignados
                                        </h4>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            {(currentInsurerInfo?.brokerCodes || []).map((bc, idx) => (
                                                <div 
                                                    key={idx}
                                                    style={{
                                                        padding: '0.85rem 1.25rem',
                                                        backgroundColor: '#fefce8',
                                                        border: '1.5px solid #fef08a',
                                                        borderRadius: 'var(--radius-sm)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '1rem'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#854d0e', textTransform: 'uppercase' }}>
                                                            {bc.agent}
                                                        </div>
                                                        <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#713f12', letterSpacing: '0.5px' }}>
                                                            Código: {bc.code}
                                                        </div>
                                                    </div>
                                                    <span style={{ fontSize: '0.72rem', backgroundColor: '#ca8a04', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: '800' }}>
                                                        AUTORIZADO
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Grid de Datos Institucionales */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                                        {/* Tarjeta Central & Emergencias */}
                                        <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                            <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.98rem' }}>
                                                <Phone size={17} color="#2563eb" /> Teléfonos & Asistencia 24/7
                                            </h4>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>CENTRAL TELEFÓNICA</div>
                                                <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)' }}>
                                                    {currentInsurerInfo?.phone || '(809) 555-0000'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>ASISTENCIA 24H / GRÚAS & EMERGENCIAS</div>
                                                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#b91c1c' }}>
                                                    {currentInsurerInfo?.emergencyPhone || '(809) 555-0000 24/7'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tarjeta Portal & Web */}
                                        <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                            <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.98rem' }}>
                                                <Globe size={17} color="#16a34a" /> Portal & Emisión Web
                                            </h4>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>PORTAL DE INTERMEDIARIOS</div>
                                                <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#2563eb', marginTop: '0.2rem' }}>
                                                    {currentInsurerInfo?.website || 'https://www.aseguradora.com.do'}
                                                </div>
                                            </div>
                                            <div>
                                                <a 
                                                    href={currentInsurerInfo?.website || '#'} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="btn btn-primary"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '700', padding: '0.4rem 0.85rem', backgroundColor: 'var(--primary)' }}
                                                >
                                                    <ExternalLink size={14} /> Abrir Portal de la Aseguradora
                                                </a>
                                            </div>
                                        </div>

                                        {/* Tarjeta Sede & RNC */}
                                        <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                            <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.98rem' }}>
                                                <MapPin size={17} color="#d97706" /> Sede & Ubicación
                                            </h4>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>RNC OFICIAL</div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)' }}>
                                                    {currentInsurerInfo?.rnc || '1-01-XXXXX-X'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>DIRECCIÓN PRINCIPAL</div>
                                                <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                                                    {currentInsurerInfo?.address || 'Santo Domingo, República Dominicana'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ramos Autorizados & Notas */}
                                    <div style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                                        <h4 style={{ margin: '0 0 0.65rem 0', color: 'var(--text-main)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.98rem' }}>
                                            <Shield size={17} color="#4f46e5" /> Ramos y Coberturas Autorizadas
                                        </h4>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                            {(currentInsurerInfo?.authorizedBranches || ['Vehículos de Motor', 'Salud', 'Vida', 'Incendio']).map((branch, idx) => (
                                                <span 
                                                    key={idx}
                                                    style={{
                                                        padding: '0.35rem 0.75rem',
                                                        backgroundColor: '#f1f5f9',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '999px',
                                                        fontSize: '0.82rem',
                                                        fontWeight: '700',
                                                        color: 'var(--text-main)'
                                                    }}
                                                >
                                                    🛡️ {branch}
                                                </span>
                                            ))}
                                        </div>

                                        {currentInsurerInfo?.notes && (
                                            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#eff6ff', borderRadius: 'var(--radius-sm)', border: '1px solid #bfdbfe', fontSize: '0.86rem', color: '#1e40af' }}>
                                                💡 <strong>Notas Operativas:</strong> {currentInsurerInfo.notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* PESTAÑA 3: PÓLIZAS EMITIDAS */}
                            {detailType === 'policies' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'white', flex: 1, maxWidth: '350px' }}>
                                            <Search size={16} color="var(--text-muted)" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por # póliza, cliente o ramo..."
                                                value={policySearchTerm}
                                                onChange={e => setPolicySearchTerm(e.target.value)}
                                                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.88rem' }}
                                            />
                                            {policySearchTerm && (
                                                <button onClick={() => setPolicySearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                                            Total: <strong>{currentInsurerPolicies.length}</strong> pólizas emitidas
                                        </span>
                                    </div>

                                    {currentInsurerPolicies.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                                            No se encontraron pólizas registradas para esta aseguradora.
                                        </p>
                                    ) : (
                                        <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                                        {['Póliza #', 'Cliente / Titular', 'Ramo', 'Fecha Emisión', 'Prima Total', 'Frecuencia'].map(h => (
                                                            <th key={h} style={{ padding: '0.75rem 1rem', textAlign: h === 'Prima Total' ? 'right' : 'left', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentInsurerPolicies.map(pol => {
                                                        const numVal = parseFloat(String(pol.amount).replace(/[^0-9.]/g, '')) || 0;
                                                        return (
                                                            <tr key={pol.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                                                                <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: 'var(--primary)' }}>{pol.id}</td>
                                                                <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: 'var(--text-main)' }}>{pol.client}</td>
                                                                <td style={{ padding: '0.75rem 1rem' }}>
                                                                    <span style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '600' }}>
                                                                        {pol.type}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{formatDateToDDMMYYYY(pol.startDate)}</td>
                                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '800', color: 'var(--primary)' }}>
                                                                    {formatMoney(numVal, pol.currency)}
                                                                </td>
                                                                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{pol.renewalFrequency || 'Anual'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PESTAÑA 4: SINIESTROS & RECLAMACIONES */}
                            {detailType === 'claims' && (
                                <div>
                                    {currentInsurerClaims.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                                            No hay siniestros o reclamaciones registradas para esta aseguradora.
                                        </p>
                                    ) : (
                                        <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                                        {['ID Siniestro', 'Cliente / Póliza', 'Tipo de Evento', 'Fecha Siniestro', 'Monto Reclamado', 'Estado'].map(h => (
                                                            <th key={h} style={{ padding: '0.75rem 1rem', textAlign: h === 'Monto Reclamado' ? 'right' : 'left', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentInsurerClaims.map(c => (
                                                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: 'var(--primary)' }}>{c.id}</td>
                                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                                <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{c.client}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.policy}</div>
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem' }}>{c.type}</td>
                                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{formatDateToDDMMYYYY(c.date)}</td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '800', color: '#991b1b' }}>
                                                                {formatMoney(c.amountNum || parseFloat(String(c.amount).replace(/[^0-9.]/g, '')) || 0)}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                                <span style={{
                                                                    padding: '0.2rem 0.6rem',
                                                                    borderRadius: '999px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '700',
                                                                    backgroundColor: c.status === 'Cerrado' ? '#dcfce7' : c.status === 'EnProceso' ? '#fef9c3' : '#fee2e2',
                                                                    color: c.status === 'Cerrado' ? '#166534' : c.status === 'EnProceso' ? '#854d0e' : '#991b1b'
                                                                }}>
                                                                    {c.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PESTAÑA 5: PRIMAS & COMISIONES */}
                            {detailType === 'metrics' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                        <div style={{ padding: '1rem', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>PRIMAS EMITIDAS (DOP)</div>
                                            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                                                {formatMoney(statsByInsurer[selectedInsurerDetails]?.dopPremiums || 0, 'DOP')}
                                            </div>
                                        </div>
                                        <div style={{ padding: '1rem', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>COMISIONES GANADAS (DOP)</div>
                                            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#166534', marginTop: '0.25rem' }}>
                                                {formatMoney(statsByInsurer[selectedInsurerDetails]?.dopCommissionsPaid || 0, 'DOP')}
                                            </div>
                                        </div>
                                        {statsByInsurer[selectedInsurerDetails]?.usdPremiums > 0 && (
                                            <div style={{ padding: '1rem', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>PRIMAS EMITIDAS (USD)</div>
                                                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#10b981', marginTop: '0.25rem' }}>
                                                    {formatMoney(statsByInsurer[selectedInsurerDetails]?.usdPremiums || 0, 'USD')}
                                                </div>
                                            </div>
                                        )}
                                        {statsByInsurer[selectedInsurerDetails]?.usdCommissionsPaid > 0 && (
                                            <div style={{ padding: '1rem', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>COMISIONES GANADAS (USD)</div>
                                                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#10b981', marginTop: '0.25rem' }}>
                                                    {formatMoney(statsByInsurer[selectedInsurerDetails]?.usdCommissionsPaid || 0, 'USD')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid var(--border)' }}>
                            <button className="btn btn-primary" onClick={() => setSelectedInsurerDetails(null)} style={{ backgroundColor: 'var(--primary)', fontWeight: '700' }}>
                                Cerrar Perfil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Crear / Editar Contacto */}
            {showContactModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '540px', backgroundColor: 'white', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                                <UserPlus size={20} /> {editingContact ? 'Editar Contacto Clave' : `Nuevo Contacto · ${selectedInsurerDetails}`}
                            </h3>
                            <button onClick={() => setShowContactModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                                    Nombre Completo *
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej: Lic. Roberto Fernández"
                                    value={contactForm.name}
                                    onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                                        Cargo / Rol *
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ej: Ejecutivo de Cuenta"
                                        value={contactForm.role}
                                        onChange={e => setContactForm({ ...contactForm, role: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                                        Departamento
                                    </label>
                                    <select
                                        value={contactForm.department}
                                        onChange={e => setContactForm({ ...contactForm, department: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem', backgroundColor: 'white' }}
                                    >
                                        <option value="Comercial & Broker">Comercial & Broker</option>
                                        <option value="Suscripción">Suscripción</option>
                                        <option value="Reclamaciones / Siniestros">Reclamaciones / Siniestros</option>
                                        <option value="Contabilidad & Comisiones">Contabilidad & Comisiones</option>
                                        <option value="Salud & Vida">Salud & Vida</option>
                                        <option value="Operaciones / Emisión">Operaciones / Emisión</option>
                                        <option value="Soporte Portal">Soporte Portal</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                                        Teléfono Directo / Central
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="809-540-3400"
                                        value={contactForm.phone}
                                        onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                                        Extensión
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="2210"
                                        value={contactForm.ext}
                                        onChange={e => setContactForm({ ...contactForm, ext: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                                        Celular / Flota
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="829-555-3410"
                                        value={contactForm.mobile}
                                        onChange={e => setContactForm({ ...contactForm, mobile: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                                        Correo Electrónico
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="contacto@aseguradora.com.do"
                                        value={contactForm.email}
                                        onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                                    Notas / Horario / Asuntos
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Ej: Atención para cotizaciones y emisiones especiales de 8am a 5pm"
                                    value={contactForm.notes}
                                    onChange={e => setContactForm({ ...contactForm, notes: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.88rem', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.75rem' }}>
                                <button type="button" className="btn" onClick={() => setShowContactModal(false)} style={{ backgroundColor: '#e2e8f0', color: 'var(--text-main)' }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#15803d', fontWeight: '700' }}>
                                    {editingContact ? 'Guardar Cambios' : 'Guardar Contacto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Company Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Building2 size={20} /> Agregar Aseguradora
                            </h3>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Nombre de la Compañía *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej: Seguros Patria"
                                    value={newCompany.name}
                                    onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Dominio de Internet (Logo)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: segurospatria.com.do (opcional)"
                                    value={newCompany.domain}
                                    onChange={e => setNewCompany({ ...newCompany, domain: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                                />
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                                    Usado para descargar automáticamente el logotipo de la marca.
                                </small>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setShowAddModal(false)} style={{ backgroundColor: '#e2e8f0', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Company Modal */}
            {editingCompany && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Edit3 size={20} /> Editar Aseguradora
                            </h3>
                            <button onClick={() => setEditingCompany(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditCompanySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Nombre de la Compañía *</label>
                                <input
                                    required
                                    type="text"
                                    value={editingCompany.name}
                                    onChange={e => setEditingCompany({ ...editingCompany, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Dominio de Internet (Logo)</label>
                                <input
                                    type="text"
                                    value={editingCompany.domain}
                                    onChange={e => setEditingCompany({ ...editingCompany, domain: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                                />
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                                    Usado para descargar automáticamente el logotipo de la marca.
                                </small>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setEditingCompany(null)} style={{ backgroundColor: '#e2e8f0', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Custom Modal */}
            {deletingCompanyConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '2rem', textAlign: 'center' }}>
                        <div style={{ color: '#dc2626', marginBottom: '1rem' }}>
                            <ShieldAlert size={48} style={{ margin: '0 auto' }} />
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '700', fontSize: '1.25rem', color: 'var(--text-main)' }}>¿Confirmar Eliminación?</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                            ¿Está seguro de que desea eliminar la compañía <strong>"{deletingCompanyConfirm}"</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                            <button className="btn" onClick={() => setDeletingCompanyConfirm(null)} style={{ backgroundColor: '#e2e8f0', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                Cancelar
                            </button>
                            <button className="btn" onClick={handleConfirmDelete} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none' }}>
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompaniesManagement;
