/* ============================================================
   1. 物理參數與狀態宣告 (Physics Parameters & States)
   ============================================================ */
const card = document.querySelector(".card");

// 彈簧物理參數
const springInteractSettings = { stiffness: 0.02, damping: 0.066 };
const snapSettings = { stiffness: 0.005, damping: 0.06 };

let targetStiffness = springInteractSettings.stiffness;
let targetDamping = springInteractSettings.damping;
let currentStiffness = springInteractSettings.stiffness;
let currentDamping = springInteractSettings.damping;

let leaveTimer = null;

let rotate = { x: 0, y: 0, vx: 0, vy: 0 };
let glare = { x: 50, y: 50, o: 0, vx: 0, vy: 0, vo: 0 };
let background = { x: 50, y: 50, vx: 0, vy: 0 };
let scale = { val: 1, v: 0 };

let targetRotate = { x: 0, y: 0 };
let targetGlare = { x: 50, y: 50, o: 0 };
let targetBackground = { x: 50, y: 50 };

// 🌟 記錄拉桿設定的基礎縮放值
let baseUserScale = 1; 
let targetScale = 1;

let isGyroActive = false; // 標記陀螺儀開關狀態

/* ============================================================
   2. 數值計算工具函數 (Math Utilities)
   ============================================================ */
const clamp = (val, min = 0, max = 100) => Math.min(Math.max(val, min), max);
const round = (val, precision = 3) => parseFloat(val.toFixed(precision));
const adjust = (val, fromMin, fromMax, toMin, toMax) =>
  round(toMin + ((toMax - toMin) * (val - fromMin)) / (fromMax - fromMin));

/* ============================================================
   3. 逐影格二階物理微分算式 (Spring Physics Loop)
   ============================================================ */
function updateSprings() {
  if (!card) return;

  currentStiffness += (targetStiffness - currentStiffness) * 0.05;
  currentDamping += (targetDamping - currentDamping) * 0.05;

  rotate.vx = (rotate.vx + (targetRotate.x - rotate.x) * currentStiffness) * (1 - currentDamping);
  rotate.x += rotate.vx;

  rotate.vy = (rotate.vy + (targetRotate.y - rotate.y) * currentStiffness) * (1 - currentDamping);
  rotate.y += rotate.vy;

  glare.vx = (glare.vx + (targetGlare.x - glare.x) * currentStiffness) * (1 - currentDamping);
  glare.x += glare.vx;

  glare.vy = (glare.vy + (targetGlare.y - glare.y) * currentStiffness) * (1 - currentDamping);
  glare.y += glare.vy;

  glare.vo = (glare.vo + (targetGlare.o - glare.o) * currentStiffness) * (1 - currentDamping);
  glare.o += glare.vo;

  background.vx = (background.vx + (targetBackground.x - background.x) * currentStiffness) * (1 - currentDamping);
  background.x += background.vx;

  background.vy = (background.vy + (targetBackground.y - background.y) * currentStiffness) * (1 - currentDamping);
  background.y += background.vy;

  scale.v = (scale.v + (targetScale - scale.val) * currentStiffness) * (1 - currentDamping);
  scale.val += scale.v;

  const pointerFromCenter = clamp(
    Math.sqrt((glare.y - 50) ** 2 + (glare.x - 50) ** 2) / 50,
    0,
    1
  );

  card.style.setProperty("--pointer-x", `${round(glare.x)}%`);
  card.style.setProperty("--pointer-y", `${round(glare.y)}%`);
  card.style.setProperty("--pointer-from-center", pointerFromCenter);
  card.style.setProperty("--card-opacity", round(glare.o));
  card.style.setProperty("--rotate-x", `${round(rotate.x)}deg`);
  card.style.setProperty("--rotate-y", `${round(rotate.y)}deg`);
  card.style.setProperty("--background-x", `${round(background.x)}%`);
  card.style.setProperty("--background-y", `${round(background.y)}%`);
  card.style.setProperty("--card-scale", round(scale.val, 4));

  requestAnimationFrame(updateSprings);
}

requestAnimationFrame(updateSprings);

/* ============================================================
   4. 📱 陀螺儀姿態演算法 (平滑過濾手抖 + 強效光影追蹤)
   ============================================================ */
function handleOrientation(event) {
  if (!isGyroActive) return;

  const gamma = event.gamma || 0; 
  const beta = event.beta || 0;   

  const relativeBeta = clamp(beta - 45, -35, 35);
  const clampedGamma = clamp(gamma, -35, 35);

  const percentX = clamp(adjust(clampedGamma, -35, 35, 0, 100));
  const percentY = clamp(adjust(relativeBeta, -35, 35, 0, 100));

  const center = {
    x: percentX - 50,
    y: percentY - 50,
  };

  targetStiffness = 0.04;
  targetDamping = 0.12;

  targetRotate = {
    x: round(-(center.y / 2.2)),
    y: round(center.x / 2.2),
  };

  targetBackground = {
    x: adjust(percentX, 0, 100, 30, 70),
    y: adjust(percentY, 0, 100, 30, 70),
  };

  targetGlare = {
    x: round(percentX),
    y: round(percentY),
    o: 0.65, 
  };

  targetScale = baseUserScale;
}

/* ============================================================
   5. 📱 開關（Toggle）切換邏輯 (隨時開啟 / 關閉 3D 感應)
   ============================================================ */
const gyroBtn = document.getElementById("gyroBtn");

function enableGyro() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then((permissionState) => {
        if (permissionState === 'granted') {
          startGyroListening();
        } else {
          alert('需要允許陀螺儀權限才能體驗 3D 擺動效果喔！');
        }
      })
      .catch(console.error);
  } else if ('DeviceOrientationEvent' in window) {
    startGyroListening();
  } else {
    alert('您的裝置不支援陀螺儀感應。');
  }
}

function startGyroListening() {
  window.addEventListener('deviceorientation', handleOrientation, true);
  isGyroActive = true;
  if (gyroBtn) {
    gyroBtn.textContent = "3D已開啟";
    gyroBtn.style.background = "rgba(139, 92, 246, 0.8)";
    gyroBtn.style.borderColor = "#a78bfa";
  }
}

function stopGyroListening() {
  window.removeEventListener('deviceorientation', handleOrientation, true);
  isGyroActive = false;

  targetStiffness = snapSettings.stiffness;
  targetDamping = snapSettings.damping;
  targetRotate = { x: 0, y: 0 };
  targetGlare = { x: 50, y: 50, o: 0 };
  targetBackground = { x: 50, y: 50 };
  targetScale = baseUserScale;

  if (gyroBtn) {
    gyroBtn.textContent = "3D感應";
    gyroBtn.style.background = "rgba(139, 92, 246, 0.35)";
    gyroBtn.style.borderColor = "rgba(139, 92, 246, 0.6)";
  }
}

if (gyroBtn) {
  gyroBtn.addEventListener("click", () => {
    if (isGyroActive) {
      stopGyroListening();
    } else {
      enableGyro();
    }
  });
}

/* ============================================================
   6. 卡片指標互動事件 (Pointer Event Listeners - 電腦滑鼠)
   ============================================================ */
if (card) {
  card.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" && isGyroActive) return;

    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }

    targetStiffness = springInteractSettings.stiffness;
    targetDamping = springInteractSettings.damping;

    const rect = card.getBoundingClientRect();
    const absolute = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const percent = {
      x: clamp(round((100 / rect.width) * absolute.x)),
      y: clamp(round((100 / rect.height) * absolute.y)),
    };

    const center = {
      x: percent.x - 50,
      y: percent.y - 50,
    };

    targetRotate = {
      x: round(-(center.y / 3.5)),
      y: round(center.x / 3.5),
    };

    targetBackground = {
      x: adjust(percent.x, 0, 100, 37, 63),
      y: adjust(percent.y, 0, 100, 33, 67),
    };

    targetGlare = {
      x: round(percent.x),
      y: round(percent.y),
      o: 1,
    };

    // Hover 時在基礎使用者縮放比例上再微幅放大 1.04 倍
    targetScale = baseUserScale * 1.04; 
  });

  card.addEventListener("pointerleave", () => {
    if (isGyroActive) return;

    if (leaveTimer) clearTimeout(leaveTimer);

    leaveTimer = setTimeout(() => {
      targetStiffness = snapSettings.stiffness;
      targetDamping = snapSettings.damping;

      targetRotate = { x: 0, y: 0 };
      targetGlare = { x: 50, y: 50, o: 0 };
      targetBackground = { x: 50, y: 50 };
      
      // 滑鼠離開時復原回拉桿設定的縮放尺寸
      targetScale = baseUserScale; 
    }, 300);
  });
}

/* ============================================================
   7. 全域 UI DOM 宣告與狀態初始化
   ============================================================ */
const colorDots = document.querySelectorAll(".color-dot");
const blurBgBtn = document.getElementById("blurBgBtn");
const cardImg = document.querySelector(".card__front img");
const imageUploadInput = document.getElementById("imageUpload");
const cardScaleRange = document.getElementById("cardScaleRange");
const scaleValDisplay = document.getElementById("scaleVal");

let currentUploadedImage = null;

/* ============================================================
   8. 控制面板與背景切換邏輯 (面積占比最多色系提取演算法)
   ============================================================ */

// 🌟 [RGB 轉 HSL 工具]
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// 🌟 [面積占比最多主色演算法] 聚類分析圖案中占比面積最大的有效色彩
function getDominantAreaColor(imgElement, callback) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 80;
  canvas.height = 80;

  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imgElement.src;

  img.onload = () => {
    ctx.drawImage(img, 0, 0, 80, 80);
    const imageData = ctx.getImageData(0, 0, 80, 80).data;

    const buckets = Array.from({ length: 12 }, () => ({
      count: 0,
      totalR: 0,
      totalG: 0,
      totalB: 0
    }));

    let fallbackR = 0, fallbackG = 0, fallbackB = 0, validPixelCount = 0;

    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const alpha = imageData[i + 3];

      if (alpha > 128) {
        fallbackR += r; fallbackG += g; fallbackB += b;
        validPixelCount++;

        const hsl = rgbToHsl(r, g, b);

        if (hsl.s > 20 && hsl.l > 18 && hsl.l < 82) {
          const bucketIndex = Math.floor(hsl.h / 30) % 12;
          buckets[bucketIndex].count++;
          buckets[bucketIndex].totalR += r;
          buckets[bucketIndex].totalG += g;
          buckets[bucketIndex].totalB += b;
        }
      }
    }

    let maxBucket = null;
    let maxCount = 0;

    buckets.forEach((bucket) => {
      if (bucket.count > maxCount) {
        maxCount = bucket.count;
        maxBucket = bucket;
      }
    });

    if (!maxBucket || maxCount === 0) {
      if (validPixelCount === 0) {
        callback({ r: 20, g: 20, b: 20 });
        return;
      }
      callback({
        r: Math.floor(fallbackR / validPixelCount),
        g: Math.floor(fallbackG / validPixelCount),
        b: Math.floor(fallbackB / validPixelCount)
      });
      return;
    }

    callback({
      r: Math.floor(maxBucket.totalR / maxBucket.count),
      g: Math.floor(maxBucket.totalG / maxBucket.count),
      b: Math.floor(maxBucket.totalB / maxBucket.count)
    });
  };

  img.onerror = () => {
    callback({ r: 20, g: 20, b: 20 });
  };
}

// 🌟 [透光清亮版] 動態染色背景
function updateBlurBackground() {
  if (!cardImg) return;

  const activeImgSrc = currentUploadedImage || cardImg.currentSrc || cardImg.src;
  if (!activeImgSrc) return;

  getDominantAreaColor(cardImg, (color) => {
    const { r, g, b } = color;

    const lightDarkOverlay = `rgba(10, 10, 15, 0.35)`;
    const softColorTint = `rgba(${r}, ${g}, ${b}, 0.3)`;

    document.body.style.backgroundImage = `
      linear-gradient(${lightDarkOverlay}, ${lightDarkOverlay}),
      linear-gradient(${softColorTint}, ${softColorTint}),
      url("${activeImgSrc}")
    `;

    /* 🌟 修正點 1：背景圖片縮放與對齊 (可自由修改 160% 為你要的放大倍率) */
    document.body.style.backgroundSize = "160%";
    document.body.style.backgroundPosition = "center 20%";
    document.body.style.backgroundRepeat = "no-repeat";
    
    document.body.style.backdropFilter = "blur(15px) saturate(150%) brightness(1.1)";
    document.body.style.webkitBackdropFilter = "blur(15px) saturate(150%) brightness(1.1)";
  });
}

// 綁定背景選擇按鈕事件
colorDots.forEach((dot) => {
  dot.addEventListener("click", (e) => {
    e.stopPropagation();

    colorDots.forEach((d) => d.classList.remove("active"));
    dot.classList.add("active");

    const isBlurBtn = dot === blurBgBtn || dot.id === "blurBgBtn" || dot.classList.contains("color-dot--blur");

    if (isBlurBtn) {
      updateBlurBackground();
      return;
    }

    // 切換至純色背景
    document.body.style.backgroundImage = "none";
    document.body.style.backdropFilter = "none";
    document.body.style.webkitBackdropFilter = "none";

    const newColor = dot.getAttribute("data-color");
    if (newColor) {
      document.body.style.backgroundColor = newColor;
    }
  });
});

/* 🌟 修正點 2：圖片上傳監聽 (直接觸發更新背景，不再仰賴 onload) */
if (imageUploadInput && cardImg) {
  imageUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (event) => {
        const newImgUrl = event.target.result;
        cardImg.src = newImgUrl;
        currentUploadedImage = newImgUrl;

        // 如果目前處於模糊背景模式，直接重新計算主色與刷新背景
        if (blurBgBtn && blurBgBtn.classList.contains("active")) {
          setTimeout(() => {
            updateBlurBackground();
          }, 50);
        }
      };

      reader.readAsDataURL(file);
    }
  });
}

/* ============================================================
   9. 卡片尺寸動態等比例縮放邏輯 (Card Scale Slider)
   ============================================================ */
if (cardScaleRange && card) {
  const baseWidth = 300; // 基礎寬度 300px

  cardScaleRange.addEventListener("input", (e) => {
    const scalePercent = parseInt(e.target.value, 10);
    
    if (scaleValDisplay) {
      scaleValDisplay.textContent = `${scalePercent}%`;
    }

    const newWidth = baseWidth * (scalePercent / 100);
    card.style.width = `${newWidth}px`;

    baseUserScale = 1;
    targetScale = 1;
  });
}