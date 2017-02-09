var fs = require('fs');
var path = require('path');

var ExifImage = require('exif').ExifImage;


function eachKey (obj, cb) {
	for(var key in obj) {
		if(obj.hasOwnProperty(key)){
			cb(obj[key], key, obj);
		}
	}
}


function print(type) {
	var prefix = '['+type+']';
	return function() {
		var args = [].slice.call(arguments);
		args.unshift(prefix);
		console.log.apply(console, args);
	}
}

var elog = print('error');
var mlog = print('msg');

// check file or folder exist
function checkExist(path, cb) {
	fs.exists(path, function(exists) {
		cb(exists);
	});
}

function checkFolder(path, folderCb, fileCb) {
	fs.stat(path, function(err, stat) {
		stat.isDirectory() ? folderCb() : fileCb();
	});
}

function throttle(fn, delay) {
	var callings = [];
	var running = false;
	return function runfn() {
		var args = [].slice.call(arguments);
		if(!running) {
			fn.apply(null, args);
			running = true;
			setTimeout(function() {
				running = false;
				if(callings.length) {
					runfn.apply(null, callings.shift());
				}
			}, delay || 100);
		} else {
			callings.push(args);
		}
	}
}

function debounce (fn, delay) {
	var timer;
	function debounceFn() {
		var args = [].slice.call(arguments);
		if(timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(function() {
			fn.apply(null, args);
		}, delay||100);
	}

	debounceFn.cancel = function() {
		clearTimeout(timer);
	};

	return debounceFn;
}

function fillZero (n, opt) {
	var len = typeof opt === 'object' ? opt.len : 2;
	if(isNaN(Number(n))) {
		console.log('err->', n , ' is not a number');
		return;
	}

	if((n+'').length >= len) {
		return n+'';
	} else {
		return ('000000'+n).slice(-1*len);
	}
}

function walk(folder, fileCb, cb, ignoreFolders) {
	ignoreFolders = ignoreFolders || [];
	fs.readdir(folder, function(err, files) {
		var c = 0, total = files.length;
		function checkParentWalkDone() {
			c++;
			if(c === total) { cb();}
		}

		files.forEach(function(file, i) {
			var fpath = path.join(folder, file);
			checkFolder(fpath, function() {
				if(ignoreFolders.includes(file)) {
					checkParentWalkDone();
				}else {
					walk(fpath, fileCb, checkParentWalkDone);
				}
			}, function() {
				fileCb(fpath, file);
				checkParentWalkDone();
			});
		});
	});
}



function parseDtFromExif (fpath, doneCb, failCb) {
	// 2014-12-11 11:22:03
	var dateRe = /(\d{4})(\D)(\d{2})\2(\d{2})(?:\s+(\d{2})\D?(\d{2})\D?(\d{2}))?/;

	try{
		new ExifImage({image: fpath}, function(err, exifData){
			if(err) {
				elog('no exif data, file->', fpath);
				failCb(fpath);
				return;
			}

			var dt;
			if(exifData) {
				var dateStr = exifData.image.ModifyDate || exifData.exif.CreateDate  || '';
				var match = dateStr.match(dateRe);
				if(match) {
					dt = [match[1], match[3], match[4], match[5], match[6], match[7]];
					dt = dt.map(fillZero);
					dt = [dt.slice(0, 3).join('/'), dt.slice(3, 6).join(':')].join(' ');
					doneCb(new Date(dt));
				} else {
					error('exif ModifyDate not match, file->', fpath);
					failCb(fpath);
				}
			} else {
				error('no exif data, file->', fpath);
				failCb(fpath);
			}
		});
	}catch(e) {
		elog(e);
		failCb(fpath);
	}
}


function parseDtFromFilename(fpath, doneCb, failCb) {
	var fname = path.basename(fpath);

	// IMG_20141005_111902.jpg
	var dtRe = /img_(\d{8})_(\d{6})/i;

	var match, dt = false;
	if (match = fname.match(dtRe)) {
		dt = [match[1].replace(/(^\d{4})(\d{2})(\d{2}$)/, '$1/$2/$3'), match[2].replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3')].join(' ');
		doneCb(new Date(dt));
	} else {
		failCb(fpath);
	}
}

function parseDtFromMtime(fpath, doneCb, failCb) {
	fs.stat(fpath, function(err, stat) {
		if(err) {
			failCb(fpath);
			return;
		}

		doneCb(new Date(stat.mtime));
	});
}


function formatDateTime(dt) {
	var o = {};
	if(dt instanceof Array) {
		return dt.join('T')
	} else if(dt instanceof Date) {
		o.y = dt.getFullYear();
		o.m = dt.getMonth() + 1;
		o.d = dt.getDay();
		o.h = dt.getHours();
		o.i = dt.getMinutes();
		o.s = dt.getSeconds();
		eachKey(o, function(val, key) {
			o[key] = fillZero(val);
		});
		return ''+o.y+o.m+o.d+'T'+o.h+o.i+o.s;
	} else {
		error('formatDateTime, dt type error..');
	}
}


module.exports = {
	eachKey: eachKey,
	print: print,
	elog: elog,
	mlog: mlog,
	checkExist: checkExist,
	checkFolder: checkFolder,
	fillZero: fillZero,
	throttle: throttle,
	walk: walk,
	parseDtFromExif: parseDtFromExif,
	parseDtFromFilename: parseDtFromFilename,
	parseDtFromMtime: parseDtFromMtime,
	formatDateTime: formatDateTime,
	debounce: debounce
};