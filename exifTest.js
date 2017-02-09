var fs = require('fs');
var path = require('path');
var utils = require('./utils');
var fillZero = utils.fillZero;
var dateRe = /(\d{4})(\D)(\d{2})\2(\d{2})(?:\s+(\d{2})\D?(\d{2})\D?(\d{2}))?/;
var ExifImage = require('exif').ExifImage;



var fpath = path.resolve('D:\\手机照片\\整理\\2015\\09\\20150925T9250.jpg');
parseDtFromExif(
		fpath, 
		function(dt) { console.log(dt);}, 
		function(){ console.log('fail')}
	);

function parseDtFromExif (fpath, doneCb, failCb) {
	try{
		new ExifImage({image: fpath}, function(err, exifData){
			if(err) {
				error('no exif data, file->', fpath);
				failCb();
				return;
			}

			var dt;
			if(exifData) {
				var dateStr = exifData.image.ModifyDate || exifData.exif.CreateDate  || '';
				var match = dateStr.match(dateRe);
				if(match) {
					dt = [match[1], match[3], match[4], match[5], match[6], match[7]];
					console.log('dt->', dt);
					dt = dt.map(fillZero);
					console.log('dt2->', dt);
					dt = [dt.slice(0, 3).join(''), dt.slice(3, 6).join('')];
					doneCb(dt);
				} else {
					failCb();
				}
			} else {
				failCb();
			}
		});
	}catch(e) {
		error(e);
		failCb();
	}
}