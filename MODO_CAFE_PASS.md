# Modo Cafe Pass

Esta rama transforma progresivamente Pasta Lovers Loyalty en un sistema de pases prepagados para Modo Cafe.

## Estado actual

- Pases por unidades o saldo monetario.
- Coffee Pass, Breakfast Pass y Gift Pass.
- Alta rápida de clientes desde mostrador.
- Gift Pass sin destinatario con activación posterior.
- QR de identificación y lector QR en caja.
- Roles OWNER / MANAGER / CASHIER.
- Rate limiting y CORS restringido.
- Migraciones Prisma automáticas en Railway.

## Etapa 2 en curso

- Branding oficial de Modo Café y UI responsive.
- Gift premium con animación de apertura y confetti.
- Todo el lenguaje visible en español.
- Acceso del cliente por teléfono + OTP.
- Sesión de cliente revocable.
- Página Mi Pase.
- QR dinámico firmado y de corta duración.
- Base preparada para Passkeys/WebAuthn (Face ID/huella/Windows Hello).

## Regla de seguridad

El teléfono del cliente nunca será la fuente de verdad del saldo. El saldo siempre se valida y modifica en backend.
