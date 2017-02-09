
/**
 * 递归地获取目录树下的所有文件名(不包括文件夹)
 */

var fs = require('fs');
var path = require('path');

var utils = require('./utils');
var walk = utils.walk;
var checkFolder = utils.checkFolder;

var allFiles = [];
function cacheFile(fpath) {
	var fname = path.basename(fpath);
	allFiles.push(fname);
}

module.exports = function(dir, cb) {
	walk(dir, cacheFile, function(){
		cb(allFiles);
		allFiles = [];
	});
};