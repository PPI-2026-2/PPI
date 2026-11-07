# StockPlan: backend

API REST con Node.js, Express y Oracle. La guía general está en el [README principal](../README.md).

## Comandos

| Comando | Función |
|---|---|
| `npm run dev` | Arranca con recarga automática |
| `npm start` | Arranca sin recarga |
| `npm run bootstrap:admin` | Crea el primer administrador; se niega si ya existe uno |

## Configuración

Copia `.env.example` a `.env` y completa los valores. El archivo explica cada variable. `JWT_SECRET` debe tener al menos 32 bytes aleatorios. El `.env` no se sube al repositorio.

## Más información

- [Referencia de la API](../docs/api/endpoints.md)
- [Arquitectura del sistema](../docs/arquitectura/sistema.md)
- [Modelo de datos](../docs/database/modelo-de-datos.md)
