# Modo Cafe Pass

Esta rama transforma progresivamente Pasta Lovers Loyalty en un sistema de pases prepagados para Modo Cafe.

## Primera etapa implementada

- Tipos de pase por unidades (`ITEM`) o saldo monetario (`MONEY`).
- Emision de pases vinculados a clientes existentes.
- Saldo inicial y saldo restante persistidos en PostgreSQL.
- Estados: ACTIVE, EXHAUSTED, EXPIRED, BLOCKED y CANCELLED.
- Historial auditable de compra, canje, reembolso, ajuste y reversa.
- Canjes protegidos con `Idempotency-Key` para evitar dobles descuentos.
- Actualizacion condicional del saldo dentro de una transaccion de base de datos.
- La logica Loyalty original se mantiene temporalmente para permitir una migracion segura.

## Endpoints nuevos

- `GET /passes/products`
- `POST /passes/products`
- `POST /passes/issue`
- `GET /passes/:publicId`
- `POST /passes/:publicId/redeem`

Todos requieren autenticacion de staff en esta primera etapa.

## Proxima capa de producto

El frontend debe cambiar de checks/recompensas a una interfaz de mostrador enfocada en: vender pase, escanear pase, confirmar canje, ver saldo e historial. Para el cliente se implementara una tarjeta movil con QR temporal/dinamico; NFC/Wallet puede sumarse como interfaz posterior sin cambiar la contabilidad central del pase.

## Regla de seguridad

El telefono del cliente nunca sera la fuente de verdad del saldo. El saldo siempre se valida y modifica en backend.
