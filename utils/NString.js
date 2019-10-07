/*
 * .NET string reader/writer by Cyuubi
 */

let NString = module.exports = {};

const Leb128 = require('./Leb128');

NString.read = function(buffer) {
    // TODO: Remove this, it's not apart of .NET's string implementation!
    if (buffer.readUInt8() != 11)
        throw new Error('Invalid type ID!');

    const length = Leb128.readUnsigned(buffer);
    const string = buffer.readBuffer(length);
    
    return string.toString('ascii', 0, string.length);
};

NString.write = function(buffer, value) {
    if (value.length != 0) {
        buffer.writeUInt8(11);
        Leb128.writeUnsigned(buffer, value.length);
        buffer.writeBuffer(Buffer.from(value));
    } else
        buffer.writeUInt8(0);
};