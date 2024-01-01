/**
 * 文件转base64
 * @param file
 */
const getBase64 = (file: any) => {
  return new Promise(function (resolve, reject) {
    let reader = new FileReader();
    let imgResult: string | ArrayBuffer | null;
    reader.readAsDataURL(file);
    reader.onload = function () {
      imgResult = reader.result;
    };
    reader.onerror = function (error) {
      reject(error);
    };
    reader.onloadend = function () {
      resolve(imgResult);
    };
  });
};

export { getBase64 };
