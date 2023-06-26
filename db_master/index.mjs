import {
  get_udp_socket,
  get_tcp_socket
} from './network/sockets.mjs';
import config from './config.mjs';

// Initialise server
const server_name = config.server_name;
const heartbeat_port = config.heartbeat_port;

const [udp, tcp] = [
  get_udp_socket(server_name, heartbeat_port),
  get_tcp_socket(server_name, heartbeat_port)
];

// maintain a map of active servers and their chances i.e IP:PORT -> chance
const active_servers = new Map();

// Register
tcp.on('connection', sock => {
  const IP = sock.remoteAddress;
  const PORT = sock.remotePort;
  const name = `${IP}:${PORT}`;

  console.log(`${name}: Connection established.`);

  // register a database
  sock.on('data', data => {
    if (data == "Connect me as database!") {
      active_servers.set(name, 10);
      sock.write('Registered as database node.');
      sock.destroy();
    } else {
      sock.write(`Invalid request parameter '${data}'.`);
    }
  });

  sock.on('close', _ => console.log(`Connection closed with ${name}\n`));
});

// send heartbeat to all active servers every 5 seconds
setInterval(_ => {
  active_servers.forEach((chance, name) => {
    if (chance == 0) {
      console.log(`database ${name} deleted.`)
      active_servers.delete(name);
    } else {
      console.log(`Sending heartbeat to ${name}`);
      udp.send("Heartbeat", name.split(':')[1], name.split(':')[0]);
      console.log(`data sent: Heartbeat, ${name.split(':')[1]}, ${name.split(':')[0]}`);
      active_servers.set(name, chance - 1);
    }
  });
}, 5000);


// Heartbeat response handler
udp.on('data', (msg, rinfo) => {
  console.log(`UDP got: ${msg} from ${rinfo.address}:${rinfo.port}\n`);
  if (msg == "Heartbeat") {
    active_servers.set(`${rinfo.address}:${rinfo.port}`, 10);
  }
}); 