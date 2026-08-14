import React, { useState } from 'react';

export const INSURER_LOGOS = {
    'Seguros Universal': 'https://logos-api.apistemic.com/domain:universal.com.do',
    'Humano Seguros': '/logos/humano.png',
    'Mapfre BHD Seguros': '/logos/mapfre.png',
    'La Colonial de Seguros': 'https://logos-api.apistemic.com/domain:lacolonial.com.do',
    'Seguros Reservas': 'https://logos-api.apistemic.com/domain:segurosreservas.com',
    'Seguros Sura': '/logos/sura.png',
    'General de Seguros': '/logos/generaldeseguros.jpg',
    'Dominicana de Seguros': 'https://logos-api.apistemic.com/domain:dominicanadeseguros.com',
    'Patria Compañía de Seguros': '/logos/patria.jpg',
    'Aspirante Seguros': 'https://logos-api.apistemic.com/domain:aspirante.com.do',
    'Seguros Pepín': 'https://logos-api.apistemic.com/domain:segurospepin.com',
    'La Monumental de Seguros': 'https://logos-api.apistemic.com/domain:lamonumental.com.do',
    'Angloamericana de Seguros': '/logos/angloamericana.png',
    'CoopSeguros': 'https://logos-api.apistemic.com/domain:coopseguros.coop.do',
    'Seguros Crecer': '/logos/crecer.png',
    'K&M Seguros': 'https://logos-api.apistemic.com/domain:kmseguros.com'
};

export const getColorForInsurer = (name = '') => {
    const colors = [
        '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
        '#db2777', '#0891b2', '#0d9488', '#4b5563', '#1e293b'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

export const getInitials = (name = '') => {
    return name
        .split(' ')
        .filter(n => !['de', 'seguros', 'compañía'].includes(n.toLowerCase()))
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const InsurerLogo = ({ name = '', domain, size = 32, initialsSize, radius = '50%', showName = false, textStyle = {} }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const logoUrl = INSURER_LOGOS[name] || (domain ? `https://logos-api.apistemic.com/domain:${domain}` : null);
    const initials = getInitials(name);
    const color = getColorForInsurer(name);

    const isRectLogo = name.includes('Mapfre') || name.includes('General') || name.includes('Angloamericana');
    const computedInitialsSize = initialsSize || `${Math.max(10, Math.round(size * 0.4))}px`;

    const logoBadge = logoUrl && !imgFailed ? (
        <div style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: radius,
            backgroundColor: 'white',
            border: '1px solid var(--border)',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            flexShrink: 0
        }}>
            <img
                src={logoUrl}
                alt={name}
                onError={() => setImgFailed(true)}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: isRectLogo ? 'contain' : 'cover',
                    padding: isRectLogo ? `${Math.max(2, Math.round(size * 0.08))}px` : '0'
                }}
            />
        </div>
    ) : (
        <div style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: radius,
            backgroundColor: color,
            color: 'white',
            fontWeight: '700',
            fontSize: computedInitialsSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            flexShrink: 0
        }}>
            {initials}
        </div>
    );

    if (!showName) return logoBadge;

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
            {logoBadge}
            <span style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-main)', ...textStyle }}>
                {name}
            </span>
        </div>
    );
};

export default InsurerLogo;
