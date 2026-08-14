import React, { useState, useRef, useEffect } from 'react';
import InsurerLogo from './InsurerLogo';
import { ChevronDown } from 'lucide-react';

const InsurerSelect = ({ value, onChange, companies = [], placeholder = 'Seleccionar Aseguradora...', required = false, style = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCompany = companies.find(c => (typeof c === 'string' ? c === value : c.name === value));
    const selectedName = typeof selectedCompany === 'string' ? selectedCompany : (selectedCompany?.name || value);

    const handleSelect = (compName) => {
        onChange({ target: { name: 'insurer', value: compName } });
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    backgroundColor: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    color: selectedName ? 'var(--text-main)' : '#94a3b8',
                    transition: 'all 0.2s',
                    boxShadow: isOpen ? '0 0 0 2px rgba(92, 53, 35, 0.2)' : 'none'
                }}
            >
                {selectedName ? (
                    <InsurerLogo name={selectedName} size={24} showName={true} textStyle={{ fontSize: '0.95rem' }} />
                ) : (
                    <span>{placeholder}</span>
                )}
                <ChevronDown size={18} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    zIndex: 1100,
                    padding: '0.35rem'
                }}>
                    {companies.map((comp) => {
                        const name = typeof comp === 'string' ? comp : comp.name;
                        const isSelected = name === selectedName;
                        return (
                            <div
                                key={name}
                                onClick={() => handleSelect(name)}
                                style={{
                                    padding: '0.6rem 0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? 'rgba(92, 53, 35, 0.08)' : 'transparent',
                                    fontWeight: isSelected ? '600' : '400',
                                    transition: 'background-color 0.15s'
                                }}
                                onMouseEnter={e => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                                }}
                                onMouseLeave={e => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <InsurerLogo name={name} size={26} />
                                <span style={{ fontSize: '0.92rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                                    {name}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default InsurerSelect;
