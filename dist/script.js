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
let targetScale = 1;

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
   4. 卡片指標互動事件 (Pointer Event Listeners)
   ============================================================ */
if (card) {
  card.addEventListener("pointermove", (e) => {
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
      x: round(-(center.x / 3.5)),
      y: round(center.y / 3.5),
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

    targetScale = 1.04;
  });

  card.addEventListener("pointerleave", () => {
    if (leaveTimer) clearTimeout(leaveTimer);

    leaveTimer = setTimeout(() => {
      targetStiffness = snapSettings.stiffness;
      targetDamping = snapSettings.damping;

      targetRotate = { x: 0, y: 0 };
      targetGlare = { x: 50, y: 50, o: 0 };
      targetBackground = { x: 50, y: 50 };
      targetScale = 1;
    }, 300);
  });
}

/* ============================================================
   5. 全域 UI DOM 宣告與狀態初始化
   ============================================================ */
const colorDots = document.querySelectorAll(".color-dot");
const blurBgBtn = document.getElementById("blurBgBtn");
const cardImg = document.querySelector(".card__front img");
const imageUploadInput = document.getElementById("imageUpload");
const cardScaleRange = document.getElementById("cardScaleRange");
const scaleValDisplay = document.getElementById("scaleVal");

let currentUploadedImage = null;

/* ============================================================
   6. 控制面板與背景切換邏輯
   ============================================================ */
colorDots.forEach((dot) => {
  dot.addEventListener("click", (e) => {
    e.stopPropagation();

    colorDots.forEach((d) => d.classList.remove("active"));
    dot.classList.add("active");

    const isBlurBtn = dot === blurBgBtn || dot.id === "blurBgBtn" || dot.classList.contains("color-dot--blur");

    if (isBlurBtn) {
      const activeImgSrc = currentUploadedImage || (cardImg ? (cardImg.currentSrc || cardImg.src) : null);

      if (activeImgSrc) {
        document.body.style.backgroundImage = `linear-gradient(rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.08)), url("${activeImgSrc}")`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backdropFilter = "blur(80px) brightness(1.1)";
        document.body.style.webkitBackdropFilter = "blur(80px) brightness(1.1)";
      }
      return;
    }

    document.body.style.backgroundImage = "none";
    document.body.style.backdropFilter = "none";
    document.body.style.webkitBackdropFilter = "none";

    const newColor = dot.getAttribute("data-color");
    if (newColor) {
      document.body.style.backgroundColor = newColor;
    }
  });
});

/* ============================================================
   7. 自訂圖片上傳邏輯
   ============================================================ */
if (imageUploadInput && cardImg) {
  imageUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (event) => {
        const newImgUrl = event.target.result;
        cardImg.src = newImgUrl;
        currentUploadedImage = newImgUrl;

        // 如果目前處於模糊背景模式，同步更新背景
        if (blurBgBtn && blurBgBtn.classList.contains("active")) {
          document.body.style.backgroundImage = `linear-gradient(rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.08)), url("${newImgUrl}")`;
        }
      };

      reader.readAsDataURL(file);
    }
  });
}

/* ============================================================
   8. 卡片尺寸動態縮放邏輯 (Card Scale Slider)
   ============================================================ */
if (cardScaleRange && scaleValDisplay && card) {
  const baseWidth = 300;

  cardScaleRange.addEventListener("input", (e) => {
    const scalePercent = parseInt(e.target.value, 10);
    scaleValDisplay.textContent = `${scalePercent}%`;
    const newWidth = baseWidth * (scalePercent / 100);
    card.style.width = `${newWidth}px`;
  });
}