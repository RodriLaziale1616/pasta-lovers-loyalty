# Modo Café Pass

Esta rama transforma Pasta Lovers Loyalty en un sistema de pases prepagados para Modo Café, manteniendo `main` intacto hasta completar las pruebas.

## Implementado

- Productos por unidades (`ITEM`) o saldo monetario (`MONEY`).
- Coffee Pass, Breakfast Pass y Gift Pass iniciales.
- Alta rápida de clientes desde mostrador con teléfono normalizado.
- Emisión de pases vinculados a un cliente.
- Gift Pass sin destinatario (`UNCLAIMED`).
- Token Gift aleatorio de 256 bits: se guarda únicamente su SHA-256 en la base.
- Página pública para previsualizar y reclamar el Gift.
- El destinatario puede crear su cliente al reclamar o usar una cuenta existente por teléfono.
- El token Gift se invalida al primer claim exitoso.
- QR de activación para Gift Pass.
- QR identificador de pase y lector QR mediante cámara para caja.
- Saldo inicial/restante persistido en PostgreSQL.
- Estados: `UNCLAIMED`, `ACTIVE`, `EXHAUSTED`, `EXPIRED`, `BLOCKED`, `CANCELLED`.
- Historial auditable de compra, activación y canje.
- Canjes protegidos por `Idempotency-Key` y actualización condicional dentro de transacción DB.
- Roles `OWNER`, `MANAGER`, `CASHIER` para operaciones de pase.
- Rate limiting para login y claim de Gift.
- CORS restringido al frontend configurado y headers HTTP defensivos.
- Las rutas públicas heredadas de Loyalty fueron retiradas del entorno Modo Café.

## Endpoints principales

### Público

- `GET /passes/gifts/claim/:token`
- `POST /passes/gifts/claim/:token`

### Staff autenticado

- `GET /passes/products`
- `POST /passes/products`
- `POST /passes/issue`
- `GET /passes/:publicId`
- `POST /passes/:publicId/redeem`
- `POST /clients/staff/register`
- `GET /clients/search`
- `GET /clients/:id/passes`

## Próxima etapa

El acceso permanente del cliente no debe depender de una URL secreta ni de conocer solamente su número de teléfono. La siguiente capa será:

1. Login por teléfono + OTP enviado por un proveedor real (WhatsApp/SMS).
2. Sesión cliente revocable.
3. Passkeys/WebAuthn para Face ID, huella o Windows Hello.
4. QR dinámico firmado y de vida corta para consumo.
5. Apple Wallet / Google Wallet como interfaz opcional sobre el mismo saldo backend.

## Regla de seguridad

El teléfono, QR o Wallet nunca son la fuente de verdad del saldo. El saldo se valida y modifica exclusivamente en backend y cada movimiento queda auditado.
