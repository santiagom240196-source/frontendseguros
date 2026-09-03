export const USERS = [
  {
    id: 'santiagom2401',
    username: 'Santiagom2401',
    password: 'Shagy962401',
    name: 'Santiago Alberto Morales Rodriguez',
    role: 'Administrador Principal',
    email: 'santiago@moralesyasoc.com',
    avatar: 'SM',
    isDemo: false,
    isPrimary: true,
    description: 'Cuenta principal de la agencia. Acceso total con guardado permanente en la base de datos PostgreSQL.'
  },
  {
    id: 'admin',
    username: 'admin',
    password: 'admin',
    name: 'Usuario de Prueba',
    role: 'Invitado / Modo Sandbox',
    email: 'admin@moralesyasoc.com',
    avatar: 'AD',
    isDemo: true,
    isPrimary: false,
    description: 'Modo de prueba (Sandbox): Permite consultar el sistema y simular operaciones sin modificar ni guardar nada en la base de datos.'
  }
];

export const DEFAULT_USER = USERS[0];
