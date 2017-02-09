
/**
 * 比较两个文件夹的文件，列出在srcdir, 但不在destdir的文件
 */


var conf = {
	srcDir: 'D:\\手机照片\\2016年之前',
	destDir: 'D:\\手机照片\\整理'
};

var fs = require('fs');
var path = require('path');
var getFiles = require('./getFiles');


var p1 = new Promise(function(resolve, reject) {
	getFiles(path.resolve(conf.srcDir), resolve);
});
var p2 = new Promise(function(resolve, reject) {
	getFiles(path.resolve(conf.destDir), resolve);
});


function diff(srcArr, destArr) {
	var ret = [];
	srcArr.forEach(function(item) {
		!destArr.includes(item) && ret.push(item);
	});
	return ret;
}

Promise.all([p1, p2]).then(function(results){
	console.log('src files count:', results[0].length, '; dest files count:', results[1].length);
	var diffArr = diff(results[0], results[1]);
	console.log('files in srcdir but not in destdir: \n', diffArr);
});