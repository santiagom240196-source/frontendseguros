export const DR_LOCATIONS = {
    "Distrito Nacional": [
        "Piantini", "Naco", "Bella Vista", "Evaristo Morales", "Los Prados", "Mirador Norte", "Mirador Sur",
        "El Millón", "Los Cacicazgos", "San Gerónimo", "Arroyo Hondo", "Ensanche La Fe", "Villa Juana",
        "Villa Consuelo", "San Carlos", "Ciudad Nueva", "Zona Colonial", "Gazcue", "Ensanche Quisqueya",
        "La Julia", "Ensanche Paraíso", "Los Restauradores", "Manganagua", "Los Ríos", "Altos de Arroyo Hondo",
        "Cristo Rey", "La Agustina", "Villas Agrícolas", "Villa María", "Ensanche Luperón", "Ensanche Espaillat",
        "Simón Bolívar", "Capotillo", "Gualey", "Guachupita", "Los Guandules", "Honduras", "Atala", "El Cacique",
        "Mata Hambre", "Centro de los Héroes", "La Esperilla", "Ciudad Universitaria"
    ],
    "Santo Domingo Este": [
        "Alma Rosa I", "Alma Rosa II", "Ensanche Ozama", "Los Mina", "Villa Duarte", "Brizas del Este",
        "Invivienda", "Hainamosa", "Los Frailes", "San Isidro", "El Almirante", "Cancino", "Los Tres Ojos",
        "Isabelita", "Maquiteria", "Villa Faro", "Mendoza", "Villa Carmen", "Lucerna", "Prados del Este",
        "Corales del Sur", "Tropical del Este", "Italia", "Savica", "Las Américas", "Charles de Gaulle",
        "Los Mameyes", "Simonico", "Calero", "Pueblo Nuevo", "Villa Olímpica"
    ],
    "Santo Domingo Norte": [
        "Villa Mella", "Sabana Perdida", "Los Guaricanos", "Hacienda Estrella", "La Victoria", "Ciudad Modelo",
        "El Edén", "Buena Vista I", "Buena Vista II", "Santa Cruz", "San Felipe", "Mata Gorda", "Higüero"
    ],
    "Santo Domingo Oeste": [
        "Herrera", "Las Caobas", "Bayona", "Manoguayabo", "Engombe", "Buenos Aires", "El Abanico",
        "Libertador", "Enriquillo", "El Café", "Constancia", "Altagracia", "Palmas de Alma Rosa",
        "Zona Industrial", "Hato Nuevo", "Caballona"
    ],
    "Santiago": [
        "Los Jardines", "Villa Olga", "La Trinitaria", "El Embrujo I", "El Embrujo II", "El Embrujo III",
        "Hoya del Caimito", "Gurabo", "Cerros de Gurabo", "Llanos de Gurabo", "Pekín",
        "Cienfuegos", "Los Salados", "Buenos Aires", "Camboya", "El Ejido", "Ensanche Libertad",
        "La Barranquita", "La Otra Banda", "Los Ciruelitos", "Los Pepines", "Nibaje", "Pueblo Nuevo",
        "Reparto Peralta", "San José La Mina", "Villa Verde", "Arroyo Hondo", "Bella Vista", "El Despertar",
        "El Inco", "El Retiro", "Ensanche Bermúdez", "Ensanche Bolívar", "Ensanche Espaillat", "Ensanche Julia",
        "Ensanche Román", "La Esmeralda", "La Lotería", "La Moraleja", "La Rinconada", "La Rosaleda",
        "La Zurza", "Las Colinas", "Los Colegios", "Rincón Largo", "Thomén", "Tierra Alta",
        "Las Damas", "Villa Maria", "Quintas de Pontezuela", "Los Alamos", "La Española", "Reparto Oquet",
        "Reparto Universitario", "Reparto Consuelo", "Urbanización Real", "Urbanización Fernández",
        "Urbanización Henríquez", "Urbanización El Ensueño"
    ],
    "La Vega": [
        "Centro de la Ciudad", "Villa Rosa", "Las Carmelitas", "Pontón", "Burende", "El Hatico",
        "Palmarito", "Villa Lora", "Villa Real", "Arenoso", "Guaco", "Rio Verde", "Las Maras",
        "Los Pomos", "San Antonio", "San Miguel"
    ],
    "Puerto Plata": [
        "Centro de la Ciudad", "Torre Alta", "Bayardo", "Los Reyes", "Padre Granero", "San Marcos",
        "Bello Costero", "La Mulata", "Sosúa Abajo", "El Batey", "Cabarete Centro", "Costambar",
        "Cofresí", "Muñoz"
    ],
    "San Francisco de Macorís": [
        "Centro", "El Capacito", "Pueblo Nuevo", "San Martín", "Santa Ana", "Vista al Valle",
        "Los Rieles", "Las Colinas", "Piantini", "Urbanización Toribio"
    ],
    "Higüey": ["Centro", "Savica", "Cambelén", "Los Rosales", "Villa Cerro", "La Malena", "Juan Pablo Duarte"],
    "La Romana": ["Centro", "Buena Vista", "Casa de Campo", "Villa Pereyra", "Villa Verde", "Quisqueya", "Bancola"],
    "San Pedro de Macorís": ["Centro", "Miramar", "Placer Bonito", "Villa Velásquez", "Barrio Lindo", "Restauración"],
    "San Cristóbal": ["Centro", "Madre Vieja Norte", "Madre Vieja Sur", "Lavapiés", "Pueblo Nuevo", "Villa Valdez"],
    "Baní": ["Centro", "Pueblo Nuevo", "Villa Majega", "Boca Canasta", "El Fundo", "Los Barracones"],
    // Generic fallback for others
    "Bonao": ["Centro", "Los Quemados", "Las Amapolas", "Reparto Yuna"],
    "Moca": ["Centro", "Barrio Don Bosco", "Los Lopez", "Barrio Calac"],
    "Azua": ["Centro", "La Bombita", "Pueblo Abajo"],
    "Barahona": ["Centro", "Villa Central", "Los Maestros"],
    "San Juan de la Maguana": ["Centro", "Villa Flores", "Corbano", "Guachupita"],
    "Otros": ["Centro", "Zona Rural", "Otro"]
};

export const getSectors = (city) => {
    const sectors = DR_LOCATIONS[city] || ["Centro / Casco Urbano", "Zona Rural", "Otro"];
    return [...sectors].sort((a, b) => a.localeCompare(b));
};
