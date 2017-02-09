
/**
 * 删除指定目录下的缩略小图
 * 有时候把手机的照片备份到电脑时，会把缩略图也不小心备份进来了，该工具可批量清除缩略小图
 */

var conf = {
	root: 'D:\\手机照片\\整理\\2016\\10',
	paths: [],
	dryrun: true,
	delay: 50,
	sizes: ['328x246', '180x320', '240x320', '342x228', '288x480', '243x320', '179x250', '499x212']
};


var fs = require('fs');
var path = require('path');

var utils = require('./utils');

var fillZero = utils.fillZero;
var walk = utils.walk;
var throttle = utils.throttle;

var print = utils.print;
var log = utils.mlog
var error = utils.elog;

var sizeOf = require('image-size');


var deleted = 0;
var failed = 0;
var rootDir = path.resolve(conf.root);

conf.sizes.forEach(function(size) {
	var newSize = size.split('x').reverse().join('x');
	conf.sizes.push(newSize);
});

function deleteFile (fpath) {
	function checkAllDelete(err) {
		err ? failed++ : deleted++;
		if(failed + deleted === conf.paths.length) {
			log('删除完毕，成功删除 ', deleted , ' 个文件；失败 ', failed , ' 个');
		}
	}

	log('delete: ', fpath);
	fs.unlink(fpath, checkAllDelete);
}

function save(fpath) {
	conf.paths.push(fpath);
}

function filterPaths(cb) {
	var c = 0, total = conf.paths.length;
	var tPaths = [];
	conf.paths.forEach(function(fpath) {
		sizeOf(fpath, function(err, demension) {
			var size = demension.width + 'x' + demension.height;
			if(demension.width < 600 && demension.height < 600){
				log(fpath, '->', size);
			}
			if(conf.sizes.indexOf(size) > -1) {
				tPaths.push(fpath);
			}
			c++;
			if(c === total) { conf.paths = tPaths; cb(); }
		});
	})
}


function deleteFiles() {

	log('\n将要删除 ', conf.paths.length, ' 个缩略小图...');
	var delayDelete = throttle(deleteFile, conf.delay);
	if(!conf.dryrun) { conf.paths.forEach(delayDelete); }
}

walk(rootDir, save, function() { filterPaths(deleteFiles)});
