
/**
 * 把文件夹下的图片(jpg) 按照拍摄日期重命名(yyyymmddThhiiss.jpg), 以便直观的知道啥时候的事
 */

var conf = {
	paths: [],
	root: 'D:\\手机照片\\整理\\2017',
	delay: 100,
	skipExist: false
};


var fs = require('fs');
var path = require('path');

var ExifImage = require('exif').ExifImage;

// 2014-12-11 11:22:03
var dateRe = /(\d{4})(\D)(\d{2})\2(\d{2})(?:\s+(\d{2})\D?(\d{2})\D?(\d{2}))?/;
// IMG_20141005_111902.jpg
var dtRe = /img_(\d{8})_(\d{6})/i;
var jpgRe = /\.jpe?g/i;

var ignoreFolders = ['video'];
var named = 0;
var failed = 0;
var uid = 2;
var lastDir = '';


var utils = require('./utils');
var checkFolder = utils.checkFolder;
var walk = utils.walk;
var eachKey = utils.eachKey;
var fillZero = utils.fillZero;
var throttle = utils.throttle;
var checkExist = utils.checkExist;

var print = utils.print;
var log = print('msg');
var error = print('error');

var parseDtFromExif = utils.parseDtFromExif;
var parseDtFromFilename = utils.parseDtFromFilename;
var parseDtFromMtime = utils.parseDtFromMtime;
var formatDateTime = utils.formatDateTime;


function saveTargetFile(fpath, file) {

	function save(filePath) {
		conf.paths.push(filePath);
	}

	function isTarget(file){
		var dtFnameRe = /\d{8}T\d{6}/;
		return jpgRe.test(file) && !dtFnameRe.test(file);
	}
	
	if (isTarget(file)) {
		save(fpath);
	}
}

function rename(fpath) {
	var fname = path.basename(fpath);
	var dt = parseDtFromFilename(fname);
	if(dt) {
		doRename(dt);
	} else {
		parseDtFromExif(fpath, doRename, function() {
			parseDtFromMtime(fpath, doRename, function() {
				failed++;
				error('parse from mtime error, file->', fpath);
			});
		});
	}

	function doRename(dt) {
		var extname = path.extname(fpath);
		var dirname = path.dirname(fpath);
		var dtname = formatDateTime(dt) + extname;
		var newfpath = path.join(dirname, dtname);

		checkExist(newfpath, function(exist) {
			if (exist && conf.skipExist) {
				failed++;
				log('checkExist:', newfpath, ' already exist..');
				checkRenameDone();
			} else {
				if(exist) {
					if(dirname !== lastDir) { uid = 2; lastDir = dirname;}
					newfpath = path.join(dirname, dtname.replace(extname, '_'+(uid++)+extname));
				}
				log('rename:', fpath, ' -> ', newfpath);
				fs.rename(fpath, newfpath, function(err) {
					if(err) {
						failed++;
						error(err);
					} else {
						named++;
					}
					checkRenameDone();
				});
			}
		})
	}
}

function checkRenameDone() {
	if(failed + named === conf.paths.length) {
		log('重命名完毕..\n');
	}
}

function renameFiles() {
	log('将要重命名 ', conf.paths.length, ' 个文件\n');
	log('开始重命名..\n');

	var delayRename = throttle(rename, conf.delay);
	conf.paths.forEach(delayRename);
}


walk(conf.root, saveTargetFile, renameFiles, ignoreFolders);