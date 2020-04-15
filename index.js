/**
 * 参数config:{ file, callback, name, type, quality, size, width, height}
 * file: 必填，input[type=file]选中的照片文件
 * name: 非必填，自定义文件名，不包含后缀(如.jpg)，默认原文件名
 * type: 非必填，图片格式，可选png/jpg，默认原图片格式
 * quality: 非必填，图片质量系数，默认0.92
 * 只传size: 压缩图片至size(单位kb)大小
 * 传width: 根据宽度压缩图片，高度自适应
 * 传height: 根据高度压缩图片，宽度自适应
 * 传width和height: 压缩图片，从中心位置裁取
 * 不传size/width/height: 只进行格式转换，不压缩图片
 * 同时传size和width/height: 会忽略size，根据width/height处理
 **/

export function compressImage(config) {
    return new Promise(function(resolve, reject) {
        config.callback = function(blob,fileName){
            resolve(blob,fileName);
        }
        config.error = function(msg){
            reject(msg);
        }
        handleConfig(config)
    });
}

function handleConfig(config) {
    if (!config.file || !config.file.type) {
        config.error("图片文件错误")
        return;
    }
    if (config.type && config.type != "png" && config.type != "jpg") {
        config.error("图片格式指定错误，请选择png或jpg")
        return;
    }

    var file = config.file;
    var idx = file.name.lastIndexOf(".");
    var imageName = file.name.substring(0, idx);
    var imageType = file.name.substring(idx + 1, file.name.length).toLowerCase();

    if (imageType != "png" && imageType != "jpg" && imageType != "jpeg") {
        config.error("不支持的图片格式 - " + imageType)
    } else {
        config.quality = (config.quality && config.quality > 0 && config.quality <= 1) ? config.quality : 0.92;

        // fileType: canvas.toBlob方法的参数
        config.fileType = (!!config.type ? ("image/" + config.type.replace("jpg", "jpeg")) : file.type);

        // type: 文件名中的格式后缀
        config.type = config.type || imageType.replace("jpeg", "jpg");

        // fileName: 完整的文件名，将在callback中返回
        config.fileName = (config.name ? (config.name + "." + config.type) : (imageName + "." + config.type));

        // ios下的jpg文件需要修正照片方向
        var isIOS = (/iphone|ipad|mac/).test(window.navigator.userAgent.toLowerCase());
        if (isIOS && file.type == "image/jpeg") {
            var reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = function() {
                var orientation = getExifOrientation(this.result);
                imageReader(file, config, orientation)
            }
        } else {
            imageReader(file, config)
        }
    }
}

function imageReader(file, config, orientation) {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function() {
        var img = document.createElement("img");
        img.src = this.result;
        img.onload = function() {
            if (orientation == 6 || orientation == 8) {
                var origin_width = parseInt(this.width);
                this.width = parseInt(this.height);
                this.height = origin_width;
            } else {
                this.width = parseInt(this.width);
                this.height = parseInt(this.height);
            }

            // 标记是否只按照size要求去压缩
            var bySize = false;

            // 缩放后图片的尺寸，canvas将从中裁切
            var imgWidth = 0;
            var imgHeight = 0;

            // 目标尺寸,即最后生成的图片尺寸
            var targetWidth = 0;
            var targetHeight = 0;

            // config有width/height时
            if (config.width && config.height) {
                targetWidth = config.width;
                targetHeight = config.height;
                var ratio_x = this.width / targetWidth;
                var ratio_y = this.height / targetHeight;
                if (ratio_x > ratio_y) {
                    imgWidth = this.width / ratio_y;
                    imgHeight = targetHeight;
                } else {
                    imgWidth = targetWidth;
                    imgHeight = this.height / ratio_x;
                }
            }
            if (config.width && !config.height) {
                imgWidth = targetWidth = config.width;
                imgHeight = targetHeight = targetWidth / (this.width / this.height);
            }
            if (!config.width && config.height) {
                imgHeight = targetHeight = config.height;
                imgWidth = targetWidth = (this.width / this.height) * targetHeight;
            }
            if (targetWidth == 0 && targetHeight == 0) {
                // config有size时，根据大小进行压缩
                if (config.size && config.size > 0 && file.size > config.size * 1024) {
                    bySize = true;
                    var ratio = Math.sqrt((config.size * 1024) / file.size).toFixed(2);
                    if (ratio < 0.5) {
                        ratio = 0.5;
                    }
                    imgWidth = targetWidth = parseInt(this.width * ratio);
                    imgHeight = targetHeight = parseInt(this.height * ratio);
                } else {
                    // 不压缩或者裁切，只将图片转为blob数据
                    imgWidth = targetWidth = this.width;
                    imgHeight = targetHeight = this.height;
                }
            } else {
                targetWidth = parseInt(targetWidth);
                targetHeight = parseInt(targetHeight);
            }
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // 矫正旋转方向
            switch (orientation) {
                case 3:
                    ctx.rotate(180 * Math.PI / 180);
                    ctx.drawImage(this, (imgWidth - targetWidth) / 2 - imgWidth, (imgHeight - targetHeight) / 2 - imgHeight, imgWidth, imgHeight);
                    break;
                case 6:
                    ctx.rotate(90 * Math.PI / 180);
                    ctx.drawImage(this, (targetHeight - imgHeight) / 2, (imgWidth - targetWidth) / 2 - imgWidth, imgHeight, imgWidth);
                    break;
                case 8:
                    ctx.rotate(270 * Math.PI / 180);
                    ctx.drawImage(this, (imgHeight - targetHeight) / 2 - imgHeight, (targetWidth - imgWidth) / 2, imgHeight, imgWidth);
                    break;
                default:
                    ctx.drawImage(this, (targetWidth - imgWidth) / 2, (targetHeight - imgHeight) / 2, imgWidth, imgHeight);
            }

            canvas.toBlob(function(blob) {
                if (bySize && blob.size >= config.size * 1024) {
                    compressBySize(blob, config, canvas, ctx)
                    return;
                }
                config.callback(blob, config.fileName)
            }, config.fileType, config.quality);
        }
    }
}

//将图片按0.9倍缩小至目标size
function compressBySize(old_blob, config, canvas, ctx) {
    config.quality = 0.98;
    var reader = new FileReader();
    reader.readAsDataURL(old_blob);
    reader.onload = function() {
        var img = document.createElement("img");
        img.src = this.result;
        img.onload = function() {
            var width = parseInt(img.width * 0.9);
            var height = parseInt(img.height * 0.9);
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(function(blob) {
                if (blob.size >= config.size * 1024) {
                    compressBySize(blob, config, canvas, ctx);
                    return;
                }
                config.callback(blob, config.fileName)
            }, config.fileType, config.quality);
        }
    }
}

/**
 * 获取iOS照片的旋转角度
 * 1: 默认值，不需要修正
 * 3: 需要旋转180°以修正
 * 6: 需要正时针旋转90°以修正
 * 8: 需要正时针旋转270°以修正
 **/

export function getOrientation(file){
    return new Promise(function(resolve, reject) {
        if(!file || !file.size){
            reject("文件错误")
        }else{
            var reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = function() {
                var orientation = getExifOrientation(this.result);
                resolve(orientation)
            }
            reader.onerror = function(){
                reject("文件读取错误")
            }
        }
    });
}
function getExifOrientation(arrayBuffer) {
    var dataView = new DataView(arrayBuffer);
    var length = dataView.byteLength;
    var orientation = 1;
    var exifIDCode;
    var tiffOffset;
    var firstIFDOffset;
    var littleEndian;
    var endianness;
    var app1Start;
    var ifdStart;
    var offset;
    var i;
    if (dataView.getUint8(0) === 0xFF && dataView.getUint8(1) === 0xD8) {
        offset = 2;
        while (offset < length) {
            if (dataView.getUint8(offset) === 0xFF && dataView.getUint8(offset + 1) === 0xE1) {
                app1Start = offset;
                break;
            }
            offset++;
        }
    }
    if (app1Start) {
        exifIDCode = app1Start + 4;
        tiffOffset = app1Start + 10;
        if (getCharCodeStr(dataView, exifIDCode, 4) === 'Exif') {
            endianness = dataView.getUint16(tiffOffset);
            littleEndian = endianness === 0x4949;
            if (littleEndian || endianness === 0x4D4D) {
                if (dataView.getUint16(tiffOffset + 2, littleEndian) === 0x002A) {
                    firstIFDOffset = dataView.getUint32(tiffOffset + 4, littleEndian);
                    if (firstIFDOffset >= 0x00000008) {
                        ifdStart = tiffOffset + firstIFDOffset;
                    }
                }
            }
        }
    }
    if (ifdStart) {
        length = dataView.getUint16(ifdStart, littleEndian);
        for (i = 0; i < length; i++) {
            offset = ifdStart + i * 12 + 2;
            if (dataView.getUint16(offset, littleEndian) === 0x0112) {
                offset += 8;
                orientation = dataView.getUint16(offset, littleEndian);
                break;
            }
        }
    }
    return orientation;
}

function getCharCodeStr(dataView, start, length) {
    var str = '';
    var i;
    for (i = start, length += start; i < length; i++) {
        str += String.fromCharCode(dataView.getUint8(i));
    }
    return str;
}

export default{ compressImage, getOrientation };