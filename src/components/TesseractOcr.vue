<template>
  <el-container class="common-container">
    <el-header class="header">
      <span class="header-title">{{ msg }}</span>
      <div class="header-btn"></div>
    </el-header>
    <el-container>
      <el-aside class="left">
        <div class="left-panel">
          <el-select v-model="lang" multiple collapse-tags max-collapse-tags="1" placeholder="选择识别语言，默认英语" filterable clearable class="left-select">
            <el-option v-for="item in langConfig" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>

          <el-upload
            class="left-upload"
            ref="uploadRef"
            :auto-upload="false"
            :multiple="false"
            :show-file-list="false"
            :accept="imgType"
            :limit="1"
            :on-exceed="handleExceed"
            :on-change="getFile"
            drag
            action=""
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">拖拽文件或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">允许上传的文件类型：{{ imgType }}</div>
            </template>
          </el-upload>

          <div class="left-imgpreview">
            <span class="demonstration">图片预览</span>
            <el-image class="imgpreview" :src="imgBase64" fit="scale-down">
              <template #error>
                <div class="image-slot">
                  <el-icon><icon-picture /></el-icon>
                </div>
              </template>
            </el-image>
          </div>

          <div>
            <el-button type="primary" @click="identify" class="left-btn">
              文字识别<el-icon class="create-btn"><Camera /></el-icon>
            </el-button>
          </div>
        </div>
      </el-aside>
      <el-main class="right">
        <el-progress :percentage="identifyProgress" v-show="showProgress" />
        <span class="result-text" @click="copyResult">{{ resultText }}</span>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, genFileId } from "element-plus";
import type { UploadInstance, UploadProps, UploadRawFile } from "element-plus";
import { UploadFilled, Camera, Picture as IconPicture } from "@element-plus/icons-vue";
import { createWorker } from "tesseract.js";
import clipboard3 from "vue-clipboard3";
import { getBase64 } from "@/utils/fileUtil";
import langConfig from "@/static/tesseract/config/langConfig";

defineProps<{ msg: string }>();

/**
 * 当前选择的识别语言
 */
const lang = ref([]);

/**
 * 识别语言，默认英语
 */
const langStr = ref("eng");

/**
 * 允许识别的图片类型
 */
const imgType = "jpg,png,bmp,pbm";

/**
 * 识别结果
 */
const resultText = ref("");

/**
 * 上传的图片对象
 */
const uploadRef = ref<UploadInstance>();

/**
 * 图片base64
 */
const imgBase64 = ref();

/**
 * 是否识别中
 */
const isIdentify = ref(false);

/**
 * 是否展示进度条
 */
const showProgress = ref(false);

/**
 * 识别进度
 */
const identifyProgress = ref(0);

/**
 * 自动替换前一个文件
 * @param files
 */
const handleExceed: UploadProps["onExceed"] = (files: any) => {
  uploadRef.value!.clearFiles();
  const file = files[0] as UploadRawFile;
  file.uid = genFileId();
  uploadRef.value!.handleStart(file);
};

/**
 * 获取上传的文件，并转成base64
 * @param file
 */
const getFile = (file: any) => {
  getBase64(file.raw).then((res) => {
    imgBase64.value = res;
  });
};

/**
 * 识别文字
 */
const identify = () => {
  if (lang.value && lang.value.length > 0) {
    langStr.value = `${lang.value.join("+")}`;
  }

  if (!imgBase64.value) {
    showError("请上传图片！");
    return;
  }

  if (isIdentify.value) {
    showError("正在识别中，请稍等！");
    return;
  }

  doIdentify();
};

/**
 * 识别文字
 */
const doIdentify = async () => {
  showProgress.value = true;
  isIdentify.value = true;
  identifyProgress.value = 0;
  resultText.value = "";
  const worker = await createWorker(langStr.value, 1, {
    logger: (m) => showProcess(m),
    workerPath: './src/static/tesseract/js/worker.min.js',
    langPath: './src/static/tesseract/lang',
    corePath: './src/static/tesseract/js/tesseract-core.wasm.js',
  });

  const {
    data: { text },
  } = await worker.recognize(imgBase64.value);
  if (text) {
    resultText.value = text;
  } else {
    showError("识别失败，请重试！");
  }

  await worker.terminate();
  isIdentify.value = false;
};

/**
 * 展示进度条
 */
const showProcess = (m: any) => {
  if (m.progress && m.status === "recognizing text" && identifyProgress.value < 100) {
    identifyProgress.value = parseFloat((m.progress * 100).toFixed(2));
  }
};

/**
 * 获取复制方法
 */
const { toClipboard } = clipboard3();

/**
 * 复制识别结果
 */
const copyResult = async () => {
  if (!resultText.value) {
    return;
  }

  try {
    await toClipboard(resultText.value);
    showSuccess("复制成功");
  } catch (error) {
    showError("复制失败!!");
  }
};

/**
 * 初始化
 */
onMounted(() => {});

/**
 * 成功提示
 * @param msg
 */
const showSuccess = (msg: string) => {
  ElMessage({
    showClose: true,
    message: msg,
    type: "success",
  });
};

/**
 * 错误提示
 * @param msg
 */
const showError = (msg: string) => {
  ElMessage({
    showClose: true,
    message: msg,
    type: "error",
  });
};
</script>

<style scoped>
.common-container {
  height: 90vh;
  width: 80%;
  min-height: 600px;
  margin-top: 1%;
  margin-left: 10%;
  position: absolute;
  top: 0;
  left: 0;

  border: 1px solid;
  border-radius: 10px;

  .header {
    height: 100px;
    line-height: 100px;
    border-bottom: 1px solid;
    .header-title {
      font-size: 40px;
      font-weight: bolder;
      display: inline-block;
    }

    .header-btn {
      position: absolute;
      top: -30px;
      right: 5px;
    }
  }

  .left {
    width: 300px;
    .left-panel {
      margin: 30px 10px 20px 10px;

      .left-select {
        width: 280px;
      }

      .left-upload {
        padding: 10px 0;
      }

      .left-imgpreview {
        padding: 10px 0;
        text-align: center;
        display: inline-block;
        box-sizing: border-box;
        vertical-align: top;

        .demonstration {
          display: block;
          font-size: 14px;
          margin-bottom: 10px;
        }

        .imgpreview {
          max-width: 280px;
          max-height: 280px;
          width: 100%;
        }

        .image-slot {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          font-size: 30px;
        }
      }
    }
  }

  .right {
    width: 100%;
    height: 90vh - 100px;
    border-left: 1px solid;

    .result-text {
      margin-top: 5px;
      font-size: 40px;
    }
  }
}
</style>
