function ImageData(image, clickDate, sessionState, orientation) {
    let jpegWrapper = null;
    let exifDate = null;

    function getDataURI() {
        return image.src;
    }

    function hasJpegOrientation() {
        return jpegWrapper
            && jpegWrapper.tiff
            && jpegWrapper.tiff.Orientation
            && jpegWrapper.tiff.Orientation.value;
    }

    function getJpegOrientation() {
        return jpegWrapper.tiff.Orientation.value;
    }

    function getNormalizedDimensions() {
        let ratio;
        if (image.width > image.height) {
            ratio = (image.width / image.height).toFixed(1);
        } else {
            ratio = (image.height / image.width).toFixed(1);
        }

        const yardStick = 1080;
        if (ratio === 1) {
            return { width: yardStick, height: yardStick };
        }
        return {
            width: (image.width * yardStick) / image.height,
            height: yardStick,
        };
    }

    function getNormalizedWidth() {
        return getNormalizedDimensions().width;
    }

    function getNormalizedHeight() {
        return getNormalizedDimensions().height;
    }

    function getOrientationValue() {
        if (orientation !== undefined) {
            return orientation;
        }
        if (hasJpegOrientation()) {
            return getJpegOrientation();
        }
        return 0;
    }

    function transformForImage(canvas, context) {
        context.setTransform(1, 0, 0, 1, 0, 0); // reset transform matrix
        const jpegOrientation = getOrientationValue();
        /* eslint-disable no-param-reassign */
        switch (jpegOrientation) {
            default:
            case 0: // No orientation EXIF tag
            case 1: // Horizontal (normal)
            case 2: // Mirror horizontal
                canvas.width = getNormalizedWidth();
                canvas.height = getNormalizedHeight();
                break;
            case 3: // Rotate 180
            case 4: // Mirror vertical
                canvas.width = getNormalizedWidth();
                canvas.height = getNormalizedHeight();
                context.rotate(-1 * Math.PI);
                context.translate(-canvas.width, -canvas.height);
                break;
            case 6: // Rotate 90 CW
            case 7: // Mirror horizontal and rotate 90 CW
                canvas.width = getNormalizedHeight();
                canvas.height = getNormalizedWidth();
                context.rotate(0.5 * Math.PI);
                context.translate(0, -canvas.width);
                break;
            case 5: // Mirror horizontal and rotate 270 CW
            case 8: // Rotate 270 CW
                canvas.width = getNormalizedHeight();
                canvas.height = getNormalizedWidth();
                context.rotate(-0.5 * Math.PI);
                context.translate(-canvas.height, 0);
                break;
        }
        /* eslint-enable no-param-reassign */
    }

    function getFileSizeInBytes(imageUri) {
        const headerLength = 'data:image/jpeg;base64,'.length;
        // 4 Base64 characters = 3 bytes of data
        return Math.round((imageUri.length - headerLength) * 0.75);
    }

    function hasExifDate() {
        return !!exifDate;
    }

    function isAppleDevice() {
        return sessionState.getUserAgentData().device.vendor === 'Apple';
    }

    function isFromGallery() {
        // if (isAppleDevice()) {
        //   if (file.name === 'image.jpg') {
        //     return false;
        //   }
        //   return true;
        // }

        if (hasExifDate() && exifDate.diff(clickDate) > 0) {
            return false;
        }
        return true;
    }

    function isFromCamera() {
        return !isFromGallery();
    }

    function getLossyDataURI(notifyCallback) {        
        const canvas = document.createElement("canvas");
        const context = canvas.getContext('2d');


        transformForImage(canvas, context);
        context.drawImage(image, 0, 0, getNormalizedWidth(), getNormalizedHeight());

        let quality = 1;
        if (isFromCamera() && ImageData.cameraQuality) {
            quality = ImageData.cameraQuality;
        }

        const targetFileSize = 409430.4;
        let firstRound = true;
        let uri = canvas.toDataURL('image/jpeg', quality);
        // console.log(uri);
        let fileSizeInBytes = getFileSizeInBytes(uri);
        let percentCompressed = (targetFileSize / fileSizeInBytes).toFixed(2) <= 1
            ? (targetFileSize / fileSizeInBytes).toFixed(2)
            : 1;
        // if (notifyCallback) {
        //   notifyCallback(percentCompressed);
        // }
        while (fileSizeInBytes > targetFileSize && quality > 0) {
            if (firstRound && fileSizeInBytes / targetFileSize > 10) {
                quality = 0.6;
            } else {
                quality -= 0.04;
            }
            firstRound = false;

            uri = canvas.toDataURL('image/jpeg', quality);
            //   console.log(uri);
            fileSizeInBytes = getFileSizeInBytes(uri);
            percentCompressed = (targetFileSize / fileSizeInBytes).toFixed(2) <= 1
                ? (targetFileSize / fileSizeInBytes).toFixed(2)
                : 1;
            //   if (notifyCallback) {
            //     notifyCallback(percentCompressed);
            //   }
        }

        if (isFromCamera() && !ImageData.cameraQuality) {
            if (quality > 0) {
                ImageData.cameraQuality = quality;
            } else {
                ImageData.cameraQuality = quality + 0.04;
            }
        }        
        return uri;
    }

    function getDate() {
        if (isAppleDevice()) {
            if (hasExifDate()) {
                return exifDate;
            }            
            return exifDate;
        }

        if (hasExifDate()) {
            return exifDate;
        }
        return clickDate;
    }

    function getOrientation() {
        const jpegOrientation = getOrientationValue();
        switch (jpegOrientation) {
            case 0: // No orientation EXIF tag
            case 1: // Horizontal (normal)
            case 2: // Mirror horizontal
            case 3: // Rotate 180
            case 4: // Mirror vertical
                if (getNormalizedWidth() < getNormalizedHeight()) {
                    return 'p';
                }
                return 'l';
            case 5: // Mirror horizontal and rotate 270 CW
            case 6: // Rotate 90 CW
            case 7: // Mirror horizontal and rotate 90 CW
            case 8: // Rotate 270 CW
                if (getNormalizedHeight() < getNormalizedWidth()) {
                    return 'p';
                }
                return 'l';
            default:
                return 'l';
        }
    }



    function getRawOrientation() {
        if (image.width > image.height) {
            return 'l';
        }
        return 'p';
    }

    this.getDataURI = getDataURI;
    this.getDate = getDate;
    this.getLossyDataURI = getLossyDataURI;
    this.getNormalizedHeight = getNormalizedHeight;
    this.getNormalizedWidth = getNormalizedWidth;
    this.getOrientation = getOrientation;
    this.hasExifDate = hasExifDate;
    this.isFromCamera = isFromCamera;
    this.isFromGallery = isFromGallery;
    this.getRawOrientation = getRawOrientation;
}

ImageData.cameraQuality = null;
