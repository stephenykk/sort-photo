/**
 * /// 一个简单的工具 用于整理平常拍的照片 ///
 * 尝试在不使用promise  generator, eventProxy, async等异步解决方案时，坚持用异步api, 发现确实是不轻松
 * 需要时刻关注完成时，执行流程比较跳跃
 */

var conf = {
	delay: 200, //转移/复制文件之间的延迟
	dryrun: false, //尝试执行，不真正转移/复制
	copy: false, // copy or move file to dest folder
	src: 'D:\\相机照片\\2015.8月存',
	dest: 'D:\\相机照片\\整理'
};



var fs = require('fs');
var path = require('path');

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();

var utils = require('./utils');

var eachKey = utils.eachKey;
var walk = utils.walk;
var fillZero = utils.fillZero;
var checkExist = utils.checkExist;
var checkFolder = utils.checkFolder;
var parseDtFromFilename = utils.parseDtFromFilename;
var parseDtFromExif = utils.parseDtFromExif;
var parseDtFromMtime = utils.parseDtFromMtime;
var formatDateTime = utils.formatDateTime;
var throttle = utils.throttle;
var debounce = utils.debounce;

var print = utils.print;
var log = print('msg');
var error = print('err');

var destFolders = {}; //hash表 保存文件夹与将要存其中的文件对应关系

var total = 0;
var nojpg = [];
var moved = 0;

var parsed = 0;
var parseFails = [];


var jpgRe = /\.jpe?g$/i;


function parseDate(fpath, saveFolder) {
	var srcPath = fpath;

	function onparsed(date) {
		var y = date.getFullYear()+'';
		var m = fillZero(date.getMonth()+1)+'';

		var targetPath = path.resolve(conf.dest, y, m, getNewFname(date, srcPath));
		var destFolder = path.resolve(conf.dest, y, m);
		saveFolder(srcPath, targetPath, destFolder);

		checkAllParsed();
	}

	function getNewFname(date, fpath) {
		var extname = path.extname(fpath);
		return formatDateTime(date)+extname;
	}

	function onparsefail(fpath) {
		parsed++; //解析日期 成功或失败 计数器都+1

		parseFails.push(fpath);
		checkAllParsed();
	}

	function checkAllParsed() {
		parsed++;
		// log(parsed, total);
		total === parsed && parsed > 0 && emitter.emit('walkdone');
	}

	parseDtFromFilename(fpath, onparsed, function() {
		parseDtFromExif(fpath, onparsed, function() {
			parseDtFromMtime(fpath, onparsed, onparsefail);
		});
	});
}

// 以为目标文件夹为key，保存源文件和目标文件的对应关系
function saveFolder (src, target, dpath) {
	destFolders[dpath] = destFolders[dpath] || [];
	destFolders[dpath].push([src, target]);
}

function copyOrMove(src, target) {
	var action = conf.copy ? 'copy' : 'move';
	checkExist(target, function(exists) {
		if(exists) {
			log(action, ' checkExist: ', path.basename(target), ' already exists..');
		} else {
			doCopyOrMove(src, target);
		}

		moved++;

		if(moved === total - parseFails.length) {
			setTimeout(function() {

				log('\n--------------------------- 复制完毕 ---------------------------\n');

				if(parseFails.length) {
					log('--------------------------- parseFails ---------------------------\n');
					console.log(parseFails.join('\n'));
				}

				if(nojpg.length) {
					log('--------------------------- nojpg ---------------------------\n');
					console.log(nojpg.join('\n'));
				}

			}, 100);
		}
	});

	function doCopyOrMove(src, target) {
		if(conf.copy) {
			var rs = fs.createReadStream(src);
			var ws = fs.createWriteStream(target);
			rs.pipe(ws);
			log(action, ' file: ', src , ' -> ', target );
		}else {
			fs.rename(src, target, function(err) {
				if(err) error(err);
				log(action, ' file: ', src , ' -> ', target );
			});
		}
	}
}

var delayCopyOrMove = throttle(copyOrMove, conf.delay);

function ensureDirPath(dpath, cb, inner) {
	checkExist(dpath, function(exists) {
		if(exists) {
			cb();
		} else {
			ensureDirPath(path.join(dpath, '..'), function() {
				fs.mkdir(dpath, function(err) {
					if(err) log(err);
					cb();
				});
			}, true);
		}
	});
}


function onWalkToFile(fpath, file) {
	if (!jpgRe.test(file)){
		nojpg.push(fpath);
		return;
	}
	total++;
	
	parseDate(fpath, saveFolder);
}

function onAllFilesWalked() {
	log('---------------- 遍历完文件夹，等待路径解析完成 ----------------');
}


function transfer() {

	var delayEnsureDirPath = throttle(function(paths, destFolder) {
		ensureDirPath(destFolder, function() {
			paths.forEach(function(pair) {
				delayCopyOrMove(pair[0], pair[1]);
			});
		});
	}, 200);
	// console.log('walkdone:', destFolders);
	log('\n---------------- 将 ', conf.copy?'复制':'移动', total - parseFails.length , ' 个文件 ----------------\n');
	eachKey(destFolders, delayEnsureDirPath);
}

// 若同文件夹中，将转入同名的文件，则同名文件加文件大小做后缀，
// 文件名相同 大小也相同 则认为是真正相同的文件，任其覆盖即可。
function checkSameFname() {
	log('---------------- 将开始 checkFnames ----------------');
	function getRepItemIndexes(arr) {
		var o = {};
		var ret = [];

		arr.forEach(function(val, i) {
			var key = val + '_' + (typeof val);
			if(o[key] == undefined) {
				o[key] = i;
			} else {
				ret.push(o[key], i);
			}
		});
		return ret;
	}

	var renamed = 0;
	function checkAllRenamed() {
		renamed++;
		if(needRenamePaths.length === renamed) {
			emitter.emit('checkdone');
		}
	}

	var needRenamePaths = [];
	function checkFnames(paths, destFolder) {
		var fnames = paths.map(function(pair) {
			var target = pair[1];
			return path.basename(target);
		});

		var indexes = getRepItemIndexes(fnames);
		needRenamePaths  = needRenamePaths.concat(paths.filter(function(pair, i) {
			return indexes.indexOf(i) > -1;
		}));
	}

	eachKey(destFolders, checkFnames);

	function rename(pair) {
		var src = pair[0], target = pair[1];
		fs.stat(src, function(err, stat) {
			if(err) error('rename err:', err);
			var newTarget = target.replace(/\(.[^.]+)$/, '_'+stat.size+'$1');
			pair[1] = newTarget;
			log('rename file: ', target , ' -> ', newTarget);

			checkAllRenamed();
		});
	}


	var delayRename = throttle(rename, 100);
	if(needRenamePaths.length) {
		log('---------------- 将 重命名 ', needRenamePaths.length , ' 个文件，----------------');
		needRenamePaths.forEach(delayRename);
	}else {
		log('---------------- 无需重命名 ----------------');
		emitter.emit('checkdone');
	}

}


function main() {
	log('---------------- 开始遍历文件夹: ', conf.src, ' ----------------');
	walk(conf.src, onWalkToFile, onAllFilesWalked);
	emitter.on('walkdone', checkSameFname);
	!conf.dryrun && emitter.on('checkdone', transfer);
}

main();

