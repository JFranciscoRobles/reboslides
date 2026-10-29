# Colaboración

Varias personas en una presentación, cada una viendo los cambios de las demás mientras los hacen y lo que cada una tiene elegido, en su color y con su nombre. Deshacer quita lo que hiciste tú, y nada de lo que hicieron los demás mientras tanto.

Un servidor coordina las salas, una por cada presentación compartida. **Tu backend guarda las presentaciones y decide quién puede abrirlas**: el servidor le pregunta, y nada de tu almacenamiento llega al navegador.

## Arranca el servidor {#run-the-server}

```bash
node packages/collab/bin/reboslides-collab.mjs --port 7430
# las presentaciones en ./rooms, como archivos .reboslides; --memory para no guardar ninguna
```

O dentro del servidor de Node que ya tiene tu API:

```ts
import { createCollabServer } from '@reboslides/collab/server';
import { folderStorage } from '@reboslides/collab/storage';

const collab = createCollabServer({ storage: folderStorage('./decks') });
app.use('/collab', collab.handle); // Express, Nest, el de Node
```

Todo lo que responde está bajo `/collab`, así que puede compartir dirección con tu aplicación.

## Comparte una presentación {#share-a-deck}

Una sala se hace con la presentación dentro, y su id es lo que los demás usan para unirse:

```ts
import { createRoom } from '@reboslides/collab/browser';

const room = await createRoom('https://collab.example', deck, deck.title);
```

Cuando tu backend guarda las presentaciones (abajo), la sala es el id de la presentación en tu sistema: no hay nada que crear.

## Conecta el estudio {#connect-the-studio}

```tsx
<SlideStudio collab={{ url: 'https://collab.example', room, name: 'Ana', ticket }} />
```

El [proveedor headless](/docs/headless/) acepta el mismo `collab`, y su estado dice quién está. Sin React:

```ts
import { joinRoom, studioHost } from '@reboslides/collab/browser';

const session = joinRoom(room, studioHost(studio), { url, name: 'Ana', ticket });
session.peers; // quién más está
session.leave();
```

Pruébalo en este sitio: arranca el servidor, abre `/demo/?collab=http://127.0.0.1:7430`, pulsa **Compartir** y abre la dirección que da en otra ventana.

## Tu backend {#backend}

Con `--backend https://app.example/api/decks`, el servidor no guarda nada: lo hacen tres rutas de tu aplicación.

| Ruta | Cuándo | Hace |
| --- | --- | --- |
| `GET URL/<id>` | Alguien abre una sala vacía. | Devuelve la presentación, como el archivo `.reboslides`. |
| `PUT URL/<id>` | `--save-after` segundos después de que paran los cambios, al menos cada `--save-every` mientras siguen, y cuando la sala se vacía. | La guarda. |
| `POST URL/<id>/access` | Alguien entra, con `{ "ticket" }`. | `{ "name": "Ana" }` para dejarle entrar, con `"readOnly": true` para que solo mire; 403 para dejarle fuera. |

El servidor muestra `--backend-key` como `Authorization: Bearer <clave>`. El ticket es un token de vida corta que tu aplicación firma para cada persona.

## Cómo se juntan los cambios {#changes}

Cada cambio dice qué es algo ahora: un elemento entero, el fondo de una diapositiva, el orden de las diapositivas. El servidor los pone en un solo orden y todos lo siguen. Dos personas cambiando elementos distintos de una diapositiva conservan ambos cambios; dos moviendo el mismo elemento terminan donde lo puso el último que tomó el servidor, igual para todos. Lo que hace una persona se ve al momento, sin esperar al servidor.

Los cambios son los del motor: `diffDecks(before, after)` los da y `applyChanges(deck, changes)` los hace, así que un servidor, una prueba o un asistente también pueden leerlos y hacerlos.

## Un asistente en la sala {#assistant}

El [servidor MCP](/docs/assistants/) se une a una sala con `join_room`: lo que cambia Claude lo ven al momento todos los que están en ella.
