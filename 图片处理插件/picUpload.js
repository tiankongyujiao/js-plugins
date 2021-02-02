Zepto(function(){
	var zjreport = {
		/**
		 * 图片读取信息
		 * @type {Object}
		 */
		imgInfo: {
			cvsWidth: 0,
			cvsHeight: 0,
			oralWid: 0,
			oralHgh: 0,
			ortInfo: 0
		},
		/**
		 * 图片默认信息
		 * @type {Object}
		 */
		defaultInfo: {
			fixWidth: 640,     //输出宽度
			fixHeight: 640,    //输出高度
		},
		// 图片对象
		imgPrt: {},
		init: function(){
			var self = this;
			self.bindEvents();
		},
		bindEvents: function(){
			var self = this;
			var fixUrl = '';
			$('#uploadPic').on('change',function(e){
				var file = e.target.files[0];
				if(file){
					if(file.type != 'image/jpeg' && file.type != 'image/png' && file.type != 'image/gif'){
						alert('图片格式错误！');
					}else{
						var reader = new FileReader();
						reader.readAsDataURL(file);
						reader.onload = function(e){
							var picUrl = e.target.result;
							var image = new Image();
							image.src = picUrl;
							self.imgPrt = image;
							image.onload = function(){
								$('.pic-info').html('<p>图片大小：' + file.size/(1024*1024) + 'M</p><p>图片名称：' + file.name + '</p><p>图片原始宽度：' + image.naturalWidth + '</p><p>图片原始高度：' + image.naturalHeight + '</p>');
								EXIF.getData(this,function(){
									var lref = EXIF.getTag(this, 'GPSLatitudeRef'), 
										ltag = EXIF.getTag(this, 'GPSLatitude'), 
										gref = EXIF.getTag(this, 'GPSLongitudeRef'), 
										gtag = EXIF.getTag(this, 'GPSLongitude');
										orit = EXIF.getTag(this, 'Orientation');
										//原始宽度
										pdWidth = EXIF.getTag(this, 'PixelXDimension') || EXIF.getTag(this, 'ImageWidth') || self.imgPrt.width, 
										//原始高度
                						pdHeight = EXIF.getTag(this, 'PixelYDimension') || EXIF.getTag(this, 'ImageHeight') || self.imgPrt.height;

									if(orit == undefined){
										self.imgInfo.ortInfo = 1; //默认是正的
									}else{
										self.imgInfo.ortInfo = orit;
									}
									
									//根据图片的宽高比例计算画布的宽高
				                	if(pdWidth > pdHeight) {
				                		self.imgInfo.cvsWidth = self.defaultInfo.fixWidth;
				                		self.imgInfo.cvsHeight = self.defaultInfo.fixWidth * pdHeight / pdWidth;
				                	}else if(pdWidth == pdHeight) {
				                		self.imgInfo.cvsWidth = self.defaultInfo.fixWidth;
				                		self.imgInfo.cvsHeight = self.defaultInfo.fixWidth;
				                	}else {
				                		self.imgInfo.cvsWidth = self.defaultInfo.fixHeight * pdWidth / pdHeight;
				                		self.imgInfo.cvsHeight = self.defaultInfo.fixHeight;
				                	}
				                	//调用处理算法
				                	self.imgInfo.img = this;
									self.imgInfo.oralWid = pdWidth;
									self.imgInfo.oralHgh = pdHeight;
									fixUrl = self.fixImage();
									$('.pic-preview').html('<img src="'+ fixUrl +'" class="img" />');
								})					
							};
						};
					}
				}else{
					alert('图片读取失败！');
				}
			});
		},
		/**
		 * 处理图片的主方法
		 * @return {String} [处理后图片的SRC]
		 */
		fixImage: function(){
			var self = this;

			//处理图片变细长的问题
			var tempCvs = document.createElement('canvas');
			tempCvs.width = self.imgPrt.naturalWidth;
			tempCvs.height = self.imgPrt.naturalHeight;
			var temoCtx = tempCvs.getContext('2d');
			self.drawImageIOSFix(temoCtx, self.imgPrt, 0, 0, self.imgInfo.oralWid, self.imgInfo.oralHgh, 0, 0, self.imgInfo.oralWid, self.imgInfo.oralHgh);

			var canvas = document.createElement('canvas');
			var context = canvas.getContext('2d');

			//根据图片方向进行正向翻转
			switch(self.imgInfo.ortInfo) {
				case 1:
					canvas.width = self.imgInfo.cvsWidth;
					canvas.height = self.imgInfo.cvsHeight;
					break;
				case 6:
					canvas.width = self.imgInfo.cvsHeight;
					canvas.height = self.imgInfo.cvsWidth;
					context.translate(self.imgInfo.cvsHeight,0);
					context.rotate(0.5 * Math.PI);
					break;
				case 8:
					canvas.width = self.imgInfo.cvsHeight;
					canvas.height = self.imgInfo.cvsWidth;
					context.translate(0,self.imgInfo.cvsWidth);
					context.rotate(-0.5 * Math.PI);
					break;
				case 3:
					canvas.width = self.imgInfo.cvsWidth;
					canvas.height = self.imgInfo.cvsHeight;
					context.translate(self.imgInfo.cvsWidth,self.imgInfo.cvsHeight);
					context.rotate(-Math.PI);
					break;
			}
			context.drawImage(tempCvs, 0, 0, self.imgInfo.oralWid, self.imgInfo.oralHgh, 0, 0, self.imgInfo.cvsWidth, self.imgInfo.cvsHeight);
			//处理后的图片进行格式输出
			var outImageUrl = canvas.toDataURL('image/jpeg');
			return outImageUrl;
		},
		/**
		 * A replacement for context.drawImage
		 * (args are for source and destination).
		 * 处理IOS中图片变细长的方法
		 */
		drawImageIOSFix: function(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
			var self = this;

		    var vertSquashRatio = self.detectVerticalSquash(img);
		 // Works only if whole image is displayed:
		 //	ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh / vertSquashRatio);
		 // The following works correct also when only a part of the image is displayed:
		    ctx.drawImage(img, sx * vertSquashRatio, sy * vertSquashRatio, sw * vertSquashRatio, sh * vertSquashRatio, dx, dy, dw, dh);
		},
		/**
		 * Detecting vertical squash in loaded image.
		 * Fixes a bug which squash image vertically while drawing into canvas for some images.
		 * This is a bug in iOS6 devices. This function from https://github.com/stomita/ios-imagefile-megapixel
		 * 处理IOS中图片变细长的方法
		 */
		detectVerticalSquash: function(img) {
		    var iw = img.naturalWidth, ih = img.naturalHeight;
		    var dtSqshCvs = document.createElement('canvas');
		    dtSqshCvs.width = 1;
		    dtSqshCvs.height = ih;
		    var dtSqshCtx = dtSqshCvs.getContext('2d');
		    dtSqshCtx.drawImage(img, 0, 0);
		    var data = dtSqshCtx.getImageData(0, 0, 1, ih).data;
		    // search image edge pixel position in case it is squashed vertically.
		    var sy = 0;
		    var ey = ih;
		    var py = ih;
		    while (py > sy) {
		        var alpha = data[(py - 1) * 4 + 3];
		        if (alpha === 0) {
		            ey = py;
		        } else {
		            sy = py;
		        }
		        py = (ey + sy) >> 1;
		    }
		    var ratio = (py / ih);
		    return (ratio===0)?1:ratio;
		},
	}
	return zjreport.init();
}($))