# 🍳 Cocina Loca

Juego de cocina multijugador para el navegador. Un **juez** (el host) crea una sala, arma la canasta de ingredientes, elige el tiempo y, si quiere, una consigna. Hasta 8 cocineros por sala. Los **cocineros** entran con un código, inventan un plato con los ingredientes de la canasta y lo entregan antes de que termine el reloj. El juez ve un análisis automático de cada plato (coherencia, creatividad y versatilidad) y decide la nota final.

## Cómo correrlo

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```

- Abrí **http://localhost:5173** en la compu del juez.
- Los cocineros, desde el celular en la misma red Wi‑Fi, entran a `http://<IP-de-tu-compu>:5173` (Vite muestra la dirección "Network" al arrancar), o escanean el QR que aparece en la sala.

### Producción

```bash
npm run build   # verifica tipos, compila el cliente y empaqueta el servidor
npm start       # sirve todo en http://localhost:3001 (o el puerto de PORT)
```

Se despliega como un único servicio Node con WebSockets (Render, Railway, Fly.io, un VPS…). Las plataformas serverless puras (como Vercel Functions) no sirven, porque las salas viven en la memoria del servidor y necesitan conexiones persistentes.

### Tests

```bash
npm test
```

## Cómo se juega

1. **Preparación** (juez): elige ingredientes del catálogo (~170), arma una canasta al azar o crea ingredientes propios con su perfil de sabor. Elige el tiempo de la ronda y, si quiere, una consigna. No hay otras reglas: vale cualquier plato con los ingredientes de la canasta.
2. **Cocina** (jugadores): eligen tipo de plato, técnica, ingredientes y cantidades. Si el juez lo permite, ven pistas de incoherencias ("demasiada sal para una torta").
3. **Juzgamiento** (juez): por cada plato ve la receta, el perfil de sabor estimado, el análisis desglosado y una nota sugerida. Ajusta cada criterio, suma o resta puntos extra, da menciones especiales y deja un comentario. Puede juzgar a ciegas ("Plato A, B, C").
4. **Resultados**: ranking de la ronda, comentarios del juez y tabla general. Al final, podio.

## El motor de análisis

Está en `src/shared/scoring.ts` y es una **guía** para el juez, no la nota final.

- **Coherencia (0–100)**: estructura del tipo de plato (una torta necesita base seca, algo dulce y un ligante), proporciones (cada ingrediente tiene un máximo razonable y cada tipo de plato tiene límites propios: la sal en una torta no debería pasar el 0,8%), perfil de sabor esperado, maridajes entre familias de sabor y técnica. Cada incoherencia grave multiplica la nota por 0,88, así lo absurdo se nota.
- **Creatividad (0–100)**: originalidad frente a los demás platos de la ronda, combinaciones audaces que funcionan (chocolate + ají, cerdo + mango, frutilla + albahaca) y variedad. **Solo cuenta en proporción a la coherencia**: un plato raro pero absurdo no suma.
- **Versatilidad (0–100)**: desde la segunda ronda, premia cambiar de tipo de plato, de dulce a salado, de técnica y de ingredientes.

Los datos que lo alimentan son fáciles de ajustar:

| Archivo | Qué contiene |
| --- | --- |
| `src/shared/ingredients.ts` | Catálogo de ingredientes y plantillas por categoría |
| `src/shared/dishes.ts` | Tipos de plato (requisitos, proporciones, rangos de sabor) y tabla de maridajes |
| `src/shared/rules.ts` | Configuración de ronda por defecto (consigna y tiempo) y su saneo |

## Estructura

```
src/
  shared/    Tipos, catálogo, motor de puntaje y configuración de ronda (lo usan cliente y servidor)
  server/    Express + Socket.IO; room.ts tiene toda la lógica de la sala
  client/    React + Tailwind; screens/ separa las pantallas del juez y de los cocineros
tests/       Tests del motor de puntaje y de la sala
```

El servidor es la fuente de verdad: valida todo lo que llega, analiza los platos y envía a cada persona solo lo que le corresponde ver (los cocineros no ven la canasta hasta que empieza la ronda ni el análisis de los demás).

## Limitaciones conocidas

- Las salas se guardan en memoria: si el servidor se reinicia, se pierden. Para persistirlas habría que guardar `GameRoom` en Redis o una base de datos.
- Si el juez cierra la sala, termina la partida para todos. Si solo se desconecta, puede volver y retomar.
