import { listen } from 'nodesite.eu-local';
import { Server, Socket } from 'socket.io';

import { config } from './config';

const { create, server } = listen({
	interface: 'http',
	name: (config.str.nodesite_name ||= 'meme-thingy'),
	port: config.num.port,
});

const io = new Server(server);

const followers = new Map<Socket, Set<Socket>>();
const sockets = new Map<string, Socket>();

const init_packets = new Map<Socket, { event: string; args: any[] }>();

export = function init() {
	io.on('connection', (socket: Socket) => {
		if (!followers.has(socket)) {
			followers.set(socket, new Set());
			sockets.set(socket.id, socket);
		}

		socket.on('getID', (callback: (id: string) => void) => {
			if (callback instanceof Function) {
				callback(socket.id);
			}
		});

		socket.on('follow', (id: string) => {
			const master = sockets.get(id);
			const set = master && followers.get(master);

			set && set.add(socket);

			const packet = master && init_packets.get(master);

			if (packet) {
				socket.emit(packet.event, ...packet.args);
			}
		});

		socket.on('forward', (event: string, ...args: any[]) => {
			for (const follower of followers.get(socket) || []) {
				follower.emit(event, ...args);
			}
		});

		socket.on('fwdinit', (event: string, ...args: any[]) => {
			for (const follower of followers.get(socket) || []) {
				follower.emit(event, ...args);
			}

			init_packets.set(socket, { event, args });
		});
	});

	create('/', undefined, '../frontend/dist');

	return io;
};
