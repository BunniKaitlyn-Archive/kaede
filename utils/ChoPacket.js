let ChoPacket = module.exports = {};

const SmartBuffer = require('smart-buffer').SmartBuffer;

const NString = require('./NString');

ChoPacket.write = function(id, value = null) {
	const output = new SmartBuffer();
	const data   = new SmartBuffer();

	switch (id) {
		/*** NString ***/
		case 24: // Bancho_Announce
		case 64: // Bancho_ChannelJoinSuccess
		case 76: // Bancho_TitleUpdate
			NString.write(data, value);
			break;

		case 7: // Bancho_SendMessage
			NString.write(data, value['sendingClient']);
			NString.write(data, value['message']);
			NString.write(data, value['target']);
			data.writeInt32LE(value['senderId']);
			break;

		case 11: // Bancho_HandleOsuUpdate
			data.writeInt32LE(value['userId']);

			// bStatusUpdate
			data.writeUInt8(value['status']);
			NString.write(data, value['statusText']);
			NString.write(data, value['beatmapChecksum']);
			data.writeUInt32LE(value['currentMods']);
			data.writeUInt8(value['playMode']);
			data.writeInt32LE(value['beatmapId']);

			data.writeBigInt64LE(BigInt(value['rankedScore']));
			data.writeFloatLE(value['accuracy']);
			data.writeInt32LE(value['playcount']);
			data.writeBigInt64LE(BigInt(value['totalScore']));
			data.writeInt32LE(value['rank']);
			data.writeInt16LE(value['performance']);
			break;

		case 12: // Bancho_HandleUserQuit
			data.writeInt32LE(value['userId']);
			data.writeUInt8(value['state']);
			break;

		case 83: // Bancho_UserPresence
			data.writeInt32LE(value['userId']);
			NString.write(data, value['username']);
			data.writeUInt8(value['timezone']);
			data.writeUInt8(value['countryCode']);
			data.writeUInt8(value['tags']);
			data.writeFloatLE(value['longitude']);
			data.writeFloatLE(value['latitude']);
			data.writeInt32LE(value['rank']);
			break;

		/*** Int32[] (short length, Int32[length]) ***/
		case 96: // Bancho_UserPresenceBundle
			data.writeInt16LE(value.length);
			value.forEach((_value) => {
				data.writeInt32LE(_value);
			});
			break;

		/*** Int32 ***/
		case 5: // Bancho_LoginReply
		case 71: // Bancho_LoginPermissions
		case 75: // Bancho_ProtocolNegotiation
		case 86: // Bancho_Restart
		case 92: // Bancho_BanInfo
			data.writeInt32LE(value);
			break;
	}

	output.writeUInt16LE(id);
	output.writeUInt8(0); // Compression
	output.writeUInt32LE(data.length);
	output.writeBuffer(data.readBuffer());

	return output.readBuffer();
}

ChoPacket.read = function(buffer) {
	const data = SmartBuffer.fromBuffer(buffer);
	const id = data.readUInt16LE();

	return {id: id};
}