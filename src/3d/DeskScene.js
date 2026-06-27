// DeskScene.js — 3D文具桌面场景管理器
// Three.js渲染层：木纹桌面 + 散落文具 + 柔和灯光 + 微动画
// 位于 2D 手绘画布之下，提供深度感和立体氛围

import * as THREE from 'three';

export class DeskScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 6, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = null; // 延迟初始化（需要DOM canvas元素）
    this.clock = new THREE.Clock();
    this.objects = [];
    this.targetCamX = 0;
    this.targetCamY = 0;

    this._buildScene();
  }

  /** 绑定到DOM canvas元素并初始化renderer */
  init(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  _buildScene() {
    // === 背景：透明 — 2D 画布在 3D 之上，3D 桌面透过半透明2D显示 ===
    this.scene.background = null;
    this.scene.fog = null;

    // === 灯光 ===
    // 暖环境光
    const ambient = new THREE.AmbientLight('#FFF5E1', 0.4);
    this.scene.add(ambient);

    // 台灯点光
    this.deskLamp = new THREE.PointLight('#FFE4B5', 2.5, 20, 1.5);
    this.deskLamp.position.set(2, 5, 2);
    this.deskLamp.castShadow = true;
    this.deskLamp.shadow.mapSize.set(1024, 1024);
    this.deskLamp.shadow.radius = 4;
    this.scene.add(this.deskLamp);

    // 补光
    const fill = new THREE.DirectionalLight('#D4C4A8', 0.3);
    fill.position.set(-3, 4, -2);
    this.scene.add(fill);

    // === 木纹桌面 ===
    this._buildDesk();

    // === 散落文具 ===
    this._buildPencil();
    this._buildEraser();
    this._buildPaperclip();
    this._buildNotebook();
    this._buildCoffeeCup();
  }

  /** 程序化木纹桌面 */
  _buildDesk() {
    // 木纹纹理 — 程序化canvas生成
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 512;
    texCanvas.height = 512;
    const tctx = texCanvas.getContext('2d');

    // 底色
    tctx.fillStyle = '#8B6914';
    tctx.fillRect(0, 0, 512, 512);

    // 木纹线
    const rng = (s) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
    for (let i = 0; i < 80; i++) {
      const y = i * 6.4 + (rng(i * 7.3) - 0.5) * 4;
      tctx.strokeStyle = `rgba(60,30,0,${0.03 + rng(i * 3.1) * 0.06})`;
      tctx.lineWidth = 0.5 + rng(i * 2.7) * 1.5;
      tctx.beginPath();
      tctx.moveTo(0, y);
      for (let x = 0; x < 512; x += 20) {
        tctx.lineTo(x, y + (rng(x * 0.1 + i) - 0.5) * 3);
      }
      tctx.stroke();
    }

    const texture = new THREE.CanvasTexture(texCanvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);

    const deskGeo = new THREE.BoxGeometry(16, 0.3, 12);
    const deskMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.02,
      color: '#A0763C',
    });
    this.desk = new THREE.Mesh(deskGeo, deskMat);
    this.desk.position.set(0, -0.15, 0);
    this.desk.receiveShadow = true;
    this.scene.add(this.desk);
  }

  /** 3D铅笔 — 黄色圆柱+粉色橡皮+灰色笔尖 */
  _buildPencil() {
    const group = new THREE.Group();

    // 笔身
    const bodyGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#FDD835', roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.z = Math.PI / 2;
    group.add(body);

    // 笔尖（锥体）
    const tipGeo = new THREE.ConeGeometry(0.06, 0.2, 8);
    const tipMat = new THREE.MeshStandardMaterial({ color: '#2C2C3A', roughness: 0.4 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.rotation.z = -Math.PI / 2;
    tip.position.x = 1.0;
    group.add(tip);

    // 橡皮头
    const eraserGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 8);
    const eraserMat = new THREE.MeshStandardMaterial({ color: '#E91E63', roughness: 0.3 });
    const eraser = new THREE.Mesh(eraserGeo, eraserMat);
    eraser.rotation.z = Math.PI / 2;
    eraser.position.x = -0.92;
    group.add(eraser);

    // 金属箍
    const ferruleGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.08, 8);
    const ferruleMat = new THREE.MeshStandardMaterial({ color: '#B0BEC5', metalness: 0.8, roughness: 0.2 });
    const ferrule = new THREE.Mesh(ferruleGeo, ferruleMat);
    ferrule.rotation.z = Math.PI / 2;
    ferrule.position.x = -0.84;
    group.add(ferrule);

    group.position.set(-3, 0.3, 2);
    group.rotation.x = 0.15;
    group.rotation.y = -0.3;
    group.castShadow = true;
    this.scene.add(group);
    this.objects.push({ mesh: group, type: 'pencil', floatOffset: 0, floatSpeed: 0.8 });
  }

  /** 3D橡皮擦 — 白色/粉色方块 */
  _buildEraser() {
    const geo = new THREE.BoxGeometry(0.5, 0.18, 0.25);
    const mat = new THREE.MeshStandardMaterial({
      color: '#F8BBD0',
      roughness: 0.4,
      metalness: 0.0,
    });
    const eraser = new THREE.Mesh(geo, mat);
    eraser.position.set(3.5, 0.12, -1.5);
    eraser.rotation.y = 0.4;
    eraser.castShadow = true;
    this.scene.add(eraser);
    this.objects.push({ mesh: eraser, type: 'eraser', floatOffset: 1.2, floatSpeed: 0.5 });
  }

  /** 3D回形针 — 弯曲金属线 */
  _buildPaperclip() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.4, 0);
    shape.lineTo(0.4, 0.9);
    shape.lineTo(0.1, 0.9);
    shape.lineTo(0.1, 0.15);
    shape.lineTo(0.3, 0.15);
    shape.lineTo(0.3, 0.75);
    shape.lineTo(0.2, 0.75);
    shape.lineTo(0.2, 0.3);
    shape.lineTo(0, 0.3);

    const extrudeSettings = { depth: 0.02, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({
      color: '#B0BEC5',
      metalness: 0.9,
      roughness: 0.15,
    });
    const clip = new THREE.Mesh(geo, mat);
    clip.scale.set(0.8, 0.8, 0.8);
    clip.position.set(1.5, 0.02, 3);
    clip.rotation.x = -Math.PI / 2;
    clip.rotation.z = 0.6;
    clip.castShadow = true;
    this.scene.add(clip);
    this.objects.push({ mesh: clip, type: 'clip', floatOffset: 2.5, floatSpeed: 0.6 });
  }

  /** 3D笔记本 — 合上的本子 */
  _buildNotebook() {
    const group = new THREE.Group();
    // 本体
    const coverGeo = new THREE.BoxGeometry(1.2, 0.08, 0.9);
    const coverMat = new THREE.MeshStandardMaterial({ color: '#077B8A', roughness: 0.7 });
    const cover = new THREE.Mesh(coverGeo, coverMat);
    group.add(cover);
    // 页边
    const pagesGeo = new THREE.BoxGeometry(1.15, 0.06, 0.85);
    const pagesMat = new THREE.MeshStandardMaterial({ color: '#FAF5E8', roughness: 0.9 });
    const pages = new THREE.Mesh(pagesGeo, pagesMat);
    pages.position.y = -0.01;
    group.add(pages);

    group.position.set(-1.5, 0.08, -2.5);
    group.rotation.y = 0.15;
    group.castShadow = true;
    this.scene.add(group);
    this.objects.push({ mesh: group, type: 'notebook', floatOffset: 3.7, floatSpeed: 0.3 });
  }

  /** 3D咖啡杯 — 简化圆柱 */
  _buildCoffeeCup() {
    const group = new THREE.Group();
    // 杯身
    const cupGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.4, 16);
    const cupMat = new THREE.MeshStandardMaterial({ color: '#EFEBE9', roughness: 0.5 });
    const cup = new THREE.Mesh(cupGeo, cupMat);
    group.add(cup);
    // 咖啡面
    const coffeeGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.05, 16);
    const coffeeMat = new THREE.MeshStandardMaterial({ color: '#4E342E', roughness: 0.3 });
    const coffee = new THREE.Mesh(coffeeGeo, coffeeMat);
    coffee.position.y = 0.17;
    group.add(coffee);
    // 把手 — 小圆环
    const handleGeo = new THREE.TorusGeometry(0.12, 0.025, 8, 16, Math.PI);
    const handleMat = new THREE.MeshStandardMaterial({ color: '#EFEBE9', roughness: 0.5 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.28, 0, 0);
    handle.rotation.y = Math.PI / 2;
    group.add(handle);

    group.position.set(4, 0.22, 1.5);
    group.castShadow = true;
    this.scene.add(group);
    this.objects.push({ mesh: group, type: 'cup', floatOffset: 0.5, floatSpeed: 0.4 });
  }

  /** 根据相机位置更新3D视差 — 2D相机映射到3D偏移 */
  updateParallax(camX, camY, worldW, worldH) {
    // 将2D相机位置(0~worldW) 映射到 3D相机偏移(-2~2)
    const nx = worldW > 0 ? (camX / worldW - 0.5) * 2 : 0;
    const ny = worldH > 0 ? (camY / worldH - 0.5) * 2 : 0;
    this.targetCamX = nx * 1.5;
    this.targetCamY = ny * 0.8;
  }

  /** 每帧更新 */
  update(delta) {
    const t = this.clock.getElapsedTime();

    // 相机平滑跟踪
    this.camera.position.x += (this.targetCamX - this.camera.position.x) * delta * 2;
    this.camera.position.y += (6 + this.targetCamY - this.camera.position.y) * delta * 2;
    this.camera.lookAt(0, 0, 0);

    // 文具微动画
    for (const obj of this.objects) {
      if (obj.type === 'pencil') {
        obj.mesh.position.y = 0.3 + Math.sin(t * obj.floatSpeed + obj.floatOffset) * 0.02;
        obj.mesh.rotation.z = -0.15 + Math.sin(t * 0.3 + obj.floatOffset) * 0.02;
      } else if (obj.type === 'cup') {
        // 轻微晃动
        obj.mesh.rotation.y = Math.sin(t * 0.4 + obj.floatOffset) * 0.02;
      } else if (obj.type === 'eraser') {
        obj.mesh.position.y = 0.12 + Math.sin(t * 0.5 + obj.floatOffset) * 0.01;
      }
    }

    // 台灯微动
    this.deskLamp.intensity = 2.5 + Math.sin(t * 0.8) * 0.15;
  }

  /** 渲染3D场景 */
  render() {
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** 窗口resize */
  resize(w, h) {
    if (this.renderer) {
      this.renderer.setSize(w, h);
    }
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** 清理资源 */
  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
