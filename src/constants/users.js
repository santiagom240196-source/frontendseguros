export const USERS = [
  {
    id: 'santiago',
    name: 'Santiago Morales',
    role: 'Administrador',
    email: 'santiago@moralesyasoc.com',
    avatar: 'SM',
    isDemo: false,
    description: 'Acceso total con guardado permanente en base de datos.'
  },
  {
    id: 'demo_user',
    name: 'Usuario de Prueba',
    role: 'Invitado / Sandbox',
    email: 'prueba@moralesyasoc.com',
    avatar: 'UP',
    isDemo: true,
    description: 'Modo Sandbox: Consulta datos reales y prueba cambios sin guardarlos.'
  }
];

export const DEFAULT_USER = USERS[0];
