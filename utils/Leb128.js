/*
 * Leb128 reader/writer by Cyuubi
 */

let Leb128 = module.exports = {};

// TODO: Implement signed read/write.

Leb128.readUnsigned = function(buffer) {
	let result, shift = 0;
	while (true) {
		const byte = buffer.readUInt8();

		result |= (byte & 0x7f) << shift;
		if ((byte & 0x80) == 0)
			break;

		shift += 7;
	}

	return result;
}

Leb128.writeUnsigned = function(buffer, value) {
	do {
		let byte = value & 0x7f;
		if ((value >>= 7) != 0)
			byte |= 0x80;

		buffer.writeUInt8(byte);
	} while (value != 0);
}