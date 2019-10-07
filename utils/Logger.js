let Logger = module.exports = {};

const colors = require('colors/safe');

Logger.info = function(value) {
    console.log(colors.white(`[INFO] | ${value}`)); 
}

Logger.warning = function(value) {
    console.log(colors.yellow(`[WARNING] | ${value}`)); 
}

Logger.error = function(value) {
    console.log(colors.red(`[ERROR] | ${value}`)); 
}