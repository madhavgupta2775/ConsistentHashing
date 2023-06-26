'use strict';
import * as net from 'net';
import * as dgram from 'dgram';
import * as os from 'os';
import { get } from 'http';
const heartbeat_port = process.env.HEARTBEAT_PORT ?? 8085;
const server_name = process.env.SERVER_NAME ?? 'localhost';

let client = new net.Socket();
const socket = client.connect(heartbeat_port, server_name, function() {
  client.write("Connect me as database!");
});

socket.on('data', data => console.log(`Server Response : ${data}`));

socket.on('close', err => console.log("Closed\n"));

socket.on('error', err => console.log(err));


// store own ip address in a variable
const get_ip = _ => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
}
console.log(get_ip());


// store udp socket in a variable
// const udp_socket = dgram.createSocket('udp4');
// console.log(`UDP socket created.`);
// udp_socket.bind(heartbeat_port);

// create socket
const udp_socket = dgram.createSocket('udp4');
console.log(`UDP socket created.`);

// start udp server and bind it to the port
udp_socket.bind(heartbeat_port, () => {
  const address = udp_socket.address();
  console.log(`Heartbeat UDP Process started on ${address.address}:${address.port}`);
});
    
// event listener in case of error
udp_socket.on('error', err => {
  console.log(`UDP socket error:\n${err.stack}`);
  udp_socket.close();
});

udp_socket.on('message', (msg, rinfo_ip, rinfo_port) => {
  console.log(`UDP got: ${msg} from ${rinfo_ip}:${rinfo_port}\n`);
  if (msg == "Heartbeat") {
    udp_socket.send("Heartbeat", rinfo_port, rinfo_ip);
    console.log(`data sent: Heartbeat, ${rinfo_port}, ${rinfo_ip}`);
  }
});
