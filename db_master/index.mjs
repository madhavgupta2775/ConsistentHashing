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
      active_servers.set(name.split(':')[0], 10);
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
  console.log(`Active servers: ${active_servers.size}`);
  active_servers.forEach((chance, name) => {
    if (chance == 0) {
      console.log(`database ${name} deleted.`)
      active_servers.delete(name);
    } else {
      console.log(`Sending heartbeat to db_node with socket ${name}`);
      udp.send("Heartbeat", 8085, name.split(':')[0], (err) => {
        if (err) {
          console.error(`Error while sending response: ${err}`);
        } else {
          console.log(`data sent: Heartbeat, ${heartbeat_port}, ${name.split(':')[0]}`);
          console.log(`chance: ${chance}`);
        }
      });
      // console.log(`data sent: Heartbeat, ${heartbeat_port}, ${name.split(':')[0]}`);
      active_servers.set(name, chance - 1);
    }
  });
}, 5000);

// Heartbeat response handler
udp.on('message', (msg, rinfo) => {
  console.log(`UDP got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  const messageString = msg.toString();
  if (messageString === "Heartbeat") {
    console.log(`Received heartbeat from ${rinfo.address}:${rinfo.port}`);
    active_servers.set(`${rinfo.address}`, 10);
  }
});