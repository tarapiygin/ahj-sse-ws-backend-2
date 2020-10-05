const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const { streamEvents } = require('http-event-stream');
const koaBody = require('koa-body');
const uuid = require('uuid');
const WS = require('ws');
const cors = require('@koa/cors');


const app = new Koa();
app.use(cors());
app.use(koaBody({
  text: true,
  urlencoded: true,
  multipart: true,
  json: true,
}));

const router = new Router();
const server = http.createServer(app.callback())
const wsServer = new WS.Server({ server });

const usersList = [];

router.get('/users', async (ctx, next) => {
  ctx.response.body = usersList;
});

router.post('/users', async (ctx, next) => {
  usersList.push({ ...ctx.request.body, id: uuid.v4() });
  ctx.response.status = 204
});

router.delete('/users/:name', async (ctx, next) => {
  console.log(ctx.params.name);
  const index = usersList.findIndex(({ name }) => name === ctx.params.name);
  if (index !== -1) {
    usersList.splice(index, 1);
  };
  console.log(usersList);
  ctx.response.status = 204
});

wsServer.on('connection', (ws, req) => {
  ws.on('message', msg => {
    console.log(msg)
    const data = JSON.parse(msg);
    console.log(data)
    if (data.method === 'DELETE') {
      const index = usersList.findIndex(({ name }) => name === data.name);
      if (index !== -1) {
        usersList.splice(index, 1);
      };
      console.log(usersList);
    } else {
      [...wsServer.clients]
        .filter(o => {
          return o.readyState === WS.OPEN;
        })
        .forEach(o => o.send(msg));
    }
  });
  ws.on('close', msg => {
    [...wsServer.clients]
      .filter(o => {
        return o.readyState === WS.OPEN;
      })
      .forEach(o => o.send(JSON.stringify({ type: 'delete' })));
    ws.close();
  });
  [...wsServer.clients]
    .filter(o => {
      return o.readyState === WS.OPEN;
    })
    .forEach(o => o.send(JSON.stringify({ type: 'add' })));
});


app.use(router.routes()).use(router.allowedMethods());
const port = process.env.PORT || 7070;
server.listen(port);
