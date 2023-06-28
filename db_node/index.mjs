'use strict';
import * as net from 'net';
import dgram from 'node:dgram';
import * as os from 'os';
import { get } from 'http';
const server_heartbeat_port = process.env.HEARTBEAT_PORT ?? 8085;
const server_name = process.env.SERVER_NAME ?? 'localhost';
const node_heartbeat_port = process.env.NODE_HEARTBEAT_PORT ?? 8086;

let client = new net.Socket();
const socket = client.connect(server_heartbeat_port, server_name, function() {
  client.write(`Connect me as database!-${node_heartbeat_port}`);
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


// create socket
const udp_socket = dgram.createSocket('udp4');
console.log(`UDP socket created.`);

// start udp server and bind it to the port
udp_socket.bind(node_heartbeat_port, () => {
  const address = udp_socket.address();
  console.log(`Heartbeat UDP Process started on ${address.address}:${address.port}`);
});
    
// event listener in case of error
udp_socket.on('error', err => {
  console.log(`UDP socket error:\n${err.stack}`);
  udp_socket.close();
});

// event listener for incoming messages
udp_socket.on('message', (msg, rinfo) => {
  console.log(`UDP got: ${msg} from ${rinfo.address}:${rinfo.port}`);

  const messageString = msg.toString();
  if (messageString === "Heartbeat") {

    console.log(`Sending heartbeat to ${rinfo.address}:${rinfo.port}`);

    // Send the response back to the sender
    const responseMsg = "Heartbeat";

    udp_socket.send(responseMsg, rinfo.port, rinfo.address, (err) => {
      if (err) {
        console.error(`Error while sending response: ${err}`);
      } else {
        console.log(`response sent: Heartbeat, ${rinfo.address}, ${rinfo.port}`);
      }
    });
  }
});

