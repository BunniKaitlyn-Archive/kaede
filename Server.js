const config = require('./config.json');

const express    = require('express');
const bodyParser = require('body-parser');
const app        = express();

const Logger      = require('./utils/Logger');
const SmartBuffer = require('smart-buffer').SmartBuffer;
const NString     = require('./utils/NString');
const ChoPacket   = require('./utils/ChoPacket');
const uuidv4      = require('uuid/v4');

app.use((req, res, next) => {
	req.rawBody = '';
	req.setEncoding('utf8');

	req.on('data', (chunk) => { 
		req.rawBody += chunk;
	});

	req.on('end', () => {
		next();
	});
});
app.use(bodyParser.raw({type: '*/*'}));

function createClient(userId, username) {
	return {
		userId: userId,
		username: username,
		queue: [], // Packet buffer queue
		offline: [],
		chat: []
	};
}

function createChat(username, message, target, userId) {
	return {
		username: username,
		message: message,
		target: target,
		userId: userId
	};
}

let clients        = [{}];
let clientId       = 1000;
let presenceBundle = [2];

app.post('/', (req, res) => {
	let output = new SmartBuffer();

	if (!req.headers['osu-token']) {
		let lines = req.rawBody.split("\n");
		if (lines.length != 4) {
			output.writeBuffer(ChoPacket.write(5, -5));
			return;
		} else {
			let choToken = uuidv4();

			clients[0][choToken] = createClient(clientId, lines[0]);
			presenceBundle.push(clientId);

			res.set('cho-token', choToken);

			output.writeBuffer(ChoPacket.write(92, 0));
			output.writeBuffer(ChoPacket.write(5, clientId));

			output.writeBuffer(ChoPacket.write(75, 19));

			output.writeBuffer(ChoPacket.write(71, 20));
			output.writeBuffer(ChoPacket.write(83, {
				userId: clientId,
				username: clients[0][choToken].username,
				timezone: 24,
				countryCode: 0,
				tags: 20,
				longitude: 0,
				latitude: 0,
				rank: 1
			}));
			output.writeBuffer(ChoPacket.write(11, {
				userId: clientId,

				status: 0,
				statusText: '',
				beatmapChecksum: '',
				currentMods: 0,
				playMode: 0,
				beatmapId: 0,

				rankedScore: 0,
				accuracy: 0,
				playcount: 0,
				totalScore: 0,
				rank: 1,
				performance: 0
			}));

			output.writeBuffer(ChoPacket.write(83, {
				userId: 2,
				username: 'Weeaboot',
				timezone: 24,
				countryCode: 0,
				tags: 20,
				longitude: 0,
				latitude: 0,
				rank: 0
			}));

			output.writeBuffer(ChoPacket.write(96, presenceBundle));

			output.writeBuffer(ChoPacket.write(89)); // Bancho_ChannelListingComplete
			output.writeBuffer(ChoPacket.write(64, '#osu'));
			output.writeBuffer(ChoPacket.write(64, '#updates'));

			output.writeBuffer(ChoPacket.write(76, 'http://i.imgur.com/dpQvPCO.png'));
			output.writeBuffer(ChoPacket.write(24, 'Welcome to Henryru beta!'));
			output.writeBuffer(ChoPacket.write(7, {
				sendingClient: 'Weeaboot',
				message: 'Welcome to Henryru beta! We hope you enjoy your stay, :P',
				target: '#updates',
				senderId: 2
			}));

			clientId++;
		}
	} else {
		const currentClient = clients[0][req.headers['osu-token']];
		const onlineClients = Object.keys(clients[0]);
		const recv          = ChoPacket.read(Buffer.from(req.rawBody));

		// Check if client doesn't exist, if so, restart Bancho client.
		if (currentClient == null) {
			output.writeBuffer(ChoPacket.write(86, 1000));
			return;
		}

		switch (recv.id) {
			case 1:
				const chat = SmartBuffer.fromBuffer(Buffer.from(req.rawBody));
				chat.readUInt16LE();
				chat.readUInt8();
				chat.readUInt32LE();

				const sendingClient = NString.read(chat);
				const message = NString.read(chat);
				const target = NString.read(chat);
				const senderId = chat.readInt32LE();

				switch (message) {
					case '!ping':
					currentClient.chat.push(createChat('Weeaboot', 'Pong', target, 2));
					break;

					default:
					for (i = 0; i < onlineClients.length; i++) {
						const onlineClient = clients[0][onlineClients[i]];
						if (onlineClients[i] != req.headers['osu-token']) {
							onlineClient.chat.push(createChat(currentClient.username, message, target, currentClient.userId));
						}
					}
					break;
				}

				console.log(`(${currentClient.username}|${target}) ${message}`);

				updateClients(currentClient, onlineClients, req, output);
				break;

			case 2: // Osu_Exit
				Logger.info(`(${currentClient.username}|${req.headers['osu-token']}) Exit/Logout recieved!`);
				onlineClients.splice(onlineClients.indexOf(req.headers['osu-token']), 1);

				for (i = 0; i < onlineClients.length; i++) {
					const onlineClient = clients[0][onlineClients[i]];
					if (onlineClients[i] != req.headers['osu-token']) {
						onlineClient.offline.push(currentClient.userId);
					}
				}

				presenceBundle.splice(presenceBundle.indexOf(currentClient.userId), 1);

				updateClients(currentClient, onlineClients, req, output);
				break;

			case 4: // Osu_Pong
				Logger.info(`(${currentClient.username}|${req.headers['osu-token']}) Ping/pong recieved!`);

				updateClients(currentClient, onlineClients, req, output);
				break;

			default:
				console.log(Buffer.from(req.rawBody));
				Logger.warning(`(${currentClient.username}|${req.headers['osu-token']}) Unknown/unimplemented packet recieved! ID = ${recv.id}`);

				updateClients(currentClient, onlineClients, req, output);
				break;
		}
	}

	res.set('cho-protocol', 19);
	res.send(output.readBuffer());
});

function updateClients(currentClient, onlineClients, req, output) {
	for (i = 0; i < onlineClients.length; i++) {
		const onlineClient = clients[0][onlineClients[i]];
		if (onlineClients[i] != req.headers['osu-token']) {
			output.writeBuffer(ChoPacket.write(83, {
				userId: onlineClient.userId,
				username: onlineClient.username,
				timezone: 24,
				countryCode: 0,
				tags: 20,
				longitude: 0,
				latitude: 0,
				rank: 0
			}));
			output.writeBuffer(ChoPacket.write(11, {
				userId: onlineClient.userId,

				status: 0,
				statusText: '',
				beatmapChecksum: '',
				currentMods: 0,
				playMode: 0,
				beatmapId: 0,

				rankedScore: 0,
				accuracy: 0,
				playcount: 0,
				totalScore: 0,
				rank: 0,
				performance: 0
			}));
		}
	}

	if (currentClient.chat != null) {
		if (currentClient.chat.length != 0) {
			for (i = 0; i < currentClient.chat.length; i++) {
				const message = currentClient.chat[i];
				output.writeBuffer(ChoPacket.write(7, {
					sendingClient: message.username,
					message: message.message,
					target: message.target,
					senderId: message.userId
				}));
			}

			currentClient.chat = []; // Clear chat buffer
		}
	}

	if (currentClient.offline.length != 0) {
		for (i = 0; i < currentClient.offline.length; i++) {
			output.writeBuffer(ChoPacket.write(12, { userId: currentClient.offline[i], state: 0 }));
		}
	}

	output.writeBuffer(ChoPacket.write(96, presenceBundle));
}

app.listen(config.choPort, () => console.log(`Kaede service running on port ${config.choPort}!`));