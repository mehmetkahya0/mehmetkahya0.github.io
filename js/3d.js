// Three.js sahnesini oluşturma
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("3d-model-container").appendChild(renderer.domElement);

// Işık ekleme
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1).normalize();
scene.add(light);

// 3D modeli yükleme
const loader = new THREE.GLTFLoader();
loader.load("path/to/your/3dmodel.glb", function (gltf) {
  scene.add(gltf.scene);
  renderer.render(scene, camera);
});

// Kamera pozisyonu
camera.position.z = 5;

// Animasyon fonksiyonu
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
