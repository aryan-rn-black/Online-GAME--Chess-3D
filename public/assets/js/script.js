import * as THREE from "https://esm.sh/three@0.158.0";
import { GLTFLoader } from "https://esm.sh/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";
import gsap from "https://esm.sh/gsap@3";
import ScrollTrigger from "https://esm.sh/gsap@3/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ---------------- SCENE ---------------- */
const scene = new THREE.Scene();
scene.background = null;

/* ---------------- CAMERA ---------------- */
const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 100);
camera.position.set(0, 9, 11);
camera.lookAt(0, 1, 0);

/* ---------------- RENDERER ---------------- */
const renderer = new THREE.WebGLRenderer({alpha: true,antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
document.body.appendChild(renderer.domElement);

/* ---------------- LIGHTS ---------------- */
scene.add(new THREE.AmbientLight(0xffffff,0.6));
const sun = new THREE.DirectionalLight(0xffffff,1.2);
sun.position.set(10,20,10);
scene.add(sun);

/* ---------------- BOARD ---------------- */
const boardGroup = new THREE.Group();
const tileGeo = new THREE.BoxGeometry(1,0.3,1);

for(let x=0;x<8;x++){
  for(let z=0;z<8;z++){
    const dark = (x+z)%2;
    const mat = new THREE.MeshStandardMaterial({
      color: dark ? 0x937053 : 0xc5b294
    });
    const tile = new THREE.Mesh(tileGeo, mat);
    tile.position.set(x-3.5, 0.6, z-3.5);
    boardGroup.add(tile);
  }
}
scene.add(boardGroup);

const base = new THREE.Mesh(
  new THREE.BoxGeometry(9.2,0.4,9.2),
  new THREE.MeshStandardMaterial({color:0x070d14})
);
base.position.y = 0.4;
scene.add(base);

/* ---------------- GROUPS (IMPORTANT) ---------------- */
const demoPiecesGroup = new THREE.Group();   // autoplay game
const focusPieceGroup = new THREE.Group();   // falling pieces
scene.add(demoPiecesGroup);
scene.add(focusPieceGroup);

/* ---------------- MODELS ---------------- */
const loader = new GLTFLoader();
const models = {};

async function loadModel(key){
  return new Promise(res=>{
    loader.load(`assets/chesspieces/DarkGeo/${key}.glb`, g=>{
      const m = g.scene;
      m.scale.setScalar(1);
      res(m);
    });
  });
}

async function loadAll(){
  for(const k of ["k","q","r","b","n","p"]){
    models[k] = await loadModel(k);
  }
}

/* ---------------- DEMO GAME ---------------- */
const START_POSITIONS = [
  // White pieces
  ["r",0.2,0.5,"w"],["n",1,0.5,"w"],["b",2,0,"w"],["q",3,0,"w"],
  ["k",4,0.5,"w"],["b",5,0,"w"],["n",6,0,"w"],["r",7,0,"w"],
  ["p",0,1,"w"],["p",1,1,"w"],["p",2,1,"w"],["p",3,1,"w"],
  ["p",4,1,"w"],["p",5,1,"w"],["p",6,1,"w"],["p",7,1,"w"],

  // Black pieces
  ["r",0,7,"b"],["n",1,7,"b"],["b",2,7,"b"],["q",3,7,"b"],
  ["k",4,7,"b"],["b",5,7,"b"],["n",6,7,"b"],["r",7,7,"b"],
  ["p",0,6,"b"],["p",1,6,"b"],["p",2,6,"b"],["p",3,6,"b"],
  ["p",4,6,"b"],["p",5,6,"b"],["p",6,6,"b"],["p",7,6,"b"],
];
const pieceMap = {}; // e.g. "wp_e2", "bn_g8"
const PIECE_SCALE = {k: 0.7, q: 0.68, r: 0.65,b: 0.65, n: 0.55, p: 0.50};
/* ---------------- MATERIAL UTILS ---------------- */
function applyColor(model, colorHex){
  model.traverse(o=>{
    if(o.isMesh){
      o.material = o.material.clone();
      o.material.color.setHex(colorHex);
      o.material.metalness = 0.25;
      o.material.roughness = 0.55;
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

function spawnDemoPiece(type, x, z){
  const m = models[type].clone();
  m.position.set(x-3.5, 1.1, z-3.5);
  demoPiecesGroup.add(m);
  return m;
}
function startDemo(){
  demoPiecesGroup.clear();
  Object.keys(pieceMap).forEach(k=>delete pieceMap[k]);

  START_POSITIONS.forEach(([type,x,z,color])=>{
    const piece = models[type].clone();

    applyColor(piece, color==="w" ? 0xffffff : 0x111111);

    piece.position.set(
      x - 3.5,
      1.1,
      z - 3.2
    );
    //piece.scale.setScalar(1);
    piece.scale.setScalar(1.5 * PIECE_SCALE[type]);
    demoPiecesGroup.add(piece);
  
    // create stable ID (example: wp_e2)
    const file = "abcdefgh"[x];
    const rank = color==="w" ? z+1 : z+1;
    const id = `${color}${type}_${file}${rank}`;
    pieceMap[id] = piece;
  });

  playDemoGame();
}
function squareToWorld(file, rank){
  return {
    x: "abcdefgh".indexOf(file) - 3.5,
    y: 1.1,
    z: rank - 1 - 3.5
  };
}
function playDemoGame(){
  const pawnW = pieceMap["wp_e2"];
  const pawnB = pieceMap["bp_e7"];
  const knight = pieceMap["wn_g1"];

  if(!pawnW || !pawnB || !knight) return;

  // 1. e2 → e4
  gsap.to(pawnW.position,{
    ...squareToWorld("e",4.5),
    duration:1,
    delay:1,
    ease:"power2.out"
  });

  // ... e7 → e5
  gsap.to(pawnB.position,{
    ...squareToWorld("e",5.5),
    duration:1,
    delay:2,
    ease:"power2.out"
  });

  // 2. Ng1 → f3
  gsap.to(knight.position,{
    ...squareToWorld("f",3.5),
    duration:1,
    delay:3,
    ease:"power2.out"
  });
}


function shift(){
boardGroup.position.set(-15, -7.2,5);
base.position.set(-15, -7 ,5.2);
camera.position.set(5, -3, -5.3);
camera.lookAt(-5, -2.5, -5);
// Create helper (size 5 units)

//const axesHelper1 = new THREE.AxesHelper(5);
//axesHelper1.position.set(-5, -2.5, -5);
//scene.add(axesHelper1);
}
/*---------------- FALLING PIECES ---------------- */
function dropPiece(type){
  focusPieceGroup.clear();
  try{
  const p = models[type].clone();
  p.position.set(-5,9, 1.6); // start higher for weight
  focusPieceGroup.add(p);

  let X= type;
  let s;
  if(type == "n"|| type == "p")
  {
    if(type == "n")
    {
      s=-3.1;
      p.position.set(-6,8, 1.6);
    }else{
      s=-3.2;
      p.position.set(-6,8, 1.6);
    }
  }else{
    s=-2.5
  }
   focusPieceGroup.scale.setScalar(3.5*PIECE_SCALE[type]);
  gsap.to(p.position, {
    y: s,
    duration: 1.2,        // ⬅ slower king
    ease: "bounce.out"
  });
  console.log(type,s);
}catch (error) {
  console.log("An error occurred:", error.message);
}
}

/* ---------------- SCROLL ---------------- */
ScrollTrigger.create({trigger:"#intro",onEnter:()=>{scene.background = null;scene.add(demoPiecesGroup);}});
ScrollTrigger.create({trigger:"#king",onEnter:()=>{demoPiecesGroup.clear();dropPiece("k");
  shift();
}});
ScrollTrigger.create({trigger:"#queen",onEnter:()=>dropPiece("q")});
ScrollTrigger.create({trigger:"#rook",onEnter:()=>dropPiece("r")});
ScrollTrigger.create({trigger:"#bishop",onEnter:()=>dropPiece("b")});
ScrollTrigger.create({trigger:"#knight",onEnter:()=>dropPiece("n")});
ScrollTrigger.create({trigger:"#pawn",onEnter:()=>dropPiece("p")});

/* ---------------- ANIMATE ---------------- */
function animate(){
  focusPieceGroup.children.forEach(p=>p.rotation.y+=0.01);
  renderer.render(scene,camera);
  requestAnimationFrame(animate);
}

/* ---------------- INIT ---------------- */
(async()=>{
  await loadAll();
  startDemo();
  animate();
})();
function myFunction() {
  var x = document.getElementById("myTopnav");
  if (x.className === "topnav") {
    x.className += " responsive";
  } else {
    x.className = "topnav";
  }
}
window.addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});