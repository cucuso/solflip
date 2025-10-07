import * as THREE from 'three';
import { WiggleBone } from 'wiggle';

let scene, camera, renderer, coinGroup, isFlipped = false;
let balance = Math.floor(Math.random() * 901) + 100;
let isAnimating = false;
let flipSound;
let wiggleBones = [];

function init() {
    createFlipSound();

    scene = new THREE.Scene();

    const canvasContainer = document.getElementById('canvasContainer');
    const aspect = canvasContainer.offsetWidth / canvasContainer.offsetHeight;
    camera = new THREE.PerspectiveCamera(95, aspect, 0.1, 1000);
    camera.position.z = 3;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
    renderer.setClearColor(0xffffff);
    canvasContainer.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const headsTexture = textureLoader.load('heads.png');
    const tailsTexture = textureLoader.load('tails.png');

    const geometry = new THREE.PlaneGeometry(4, 4);

    const headsMaterial = new THREE.MeshBasicMaterial({
        map: headsTexture,
        transparent: true
    });

    const tailsMaterial = new THREE.MeshBasicMaterial({
        map: tailsTexture,
        transparent: true
    });

    // Create bone structure for wiggle
    const rootBone = new THREE.Bone();
    rootBone.position.set(0, 0, 0);

    const tipBone = new THREE.Bone();
    tipBone.position.set(0, 0, 0);
    rootBone.add(tipBone);

    coinGroup = new THREE.Group();
    coinGroup.add(rootBone);

    const headsPlane = new THREE.Mesh(geometry, headsMaterial);
    headsPlane.position.z = 0.01;
    tipBone.add(headsPlane);

    const tailsPlane = new THREE.Mesh(geometry, tailsMaterial);
    tailsPlane.rotation.y = Math.PI;
    tailsPlane.position.z = -0.01;
    tipBone.add(tailsPlane);

    scene.add(coinGroup);

    // Create wiggle bone with spring physics
    const wiggle = new WiggleBone(tipBone, {
        velocity: 0.5,
        maxStretch: 0.3
    });
    wiggleBones.push(wiggle);

    updateBalanceDisplay();

    document.getElementById('headsButton').addEventListener('click', () => placeBet('heads'));
    document.getElementById('tailsButton').addEventListener('click', () => placeBet('tails'));

    window.addEventListener('resize', onWindowResize);

    animate();
}

function updateBalanceDisplay() {
    document.getElementById('balance').textContent = `Balance: $${balance}`;
}

function placeBet(choice) {
    if (isAnimating) return;

    const betAmount = parseInt(document.getElementById('betInput').value);
    if (betAmount <= 0 || betAmount > balance) {
        document.getElementById('result').textContent = 'Invalid bet amount!';
        document.getElementById('result').className = 'lose';
        return;
    }

    isAnimating = true;
    document.getElementById('headsButton').disabled = true;
    document.getElementById('tailsButton').disabled = true;
    document.getElementById('result').textContent = 'Flipping...';
    document.getElementById('result').className = '';

    const outcome = Math.floor(Math.random() * 2);
    const outcomeText = outcome === 0 ? 'heads' : 'tails';
    const won = choice === outcomeText;

    flipImage(outcome, choice, betAmount, won);
}

function createFlipSound() {
    const audio = new Audio('flip-sound.mp3');
    audio.preload = 'auto';

    function playFlipSound() {
        try {
            audio.pause();
            audio.currentTime = 0;
            audio.play().catch(e => {
                console.log('Audio playback failed:', e);
            });
        } catch (e) {
            console.log('Audio not available');
        }
    }

    flipSound = playFlipSound;
}

function flipImage(outcome, playerChoice, betAmount, won) {
    if (flipSound) {
        flipSound();
    }

    const targetRotationY = outcome === 0 ? 0 : Math.PI;
    const startRotation = coinGroup.rotation.y;
    const startTime = performance.now();
    const duration = 2000;
    const numberOfSpins = 6;

    function animateFlip(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        if (progress < 1) {
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            coinGroup.rotation.y = startRotation + (numberOfSpins * Math.PI * 2 * easeProgress) + (targetRotationY * easeProgress);

            const heightProgress = Math.sin(progress * Math.PI);
            coinGroup.position.y = heightProgress * 1.5;

            coinGroup.position.x = Math.sin(progress * Math.PI * 2) * 0.2;

            const scaleVariation = 1 + Math.sin(progress * Math.PI * 12) * 0.1;
            coinGroup.scale.set(scaleVariation, scaleVariation, 1);

            requestAnimationFrame(animateFlip);
        } else {
            coinGroup.rotation.y = targetRotationY;
            coinGroup.position.set(0, 0, 0);
            coinGroup.scale.set(1, 1, 1);

            finishFlip(outcome, playerChoice, betAmount, won);
        }
    }

    requestAnimationFrame(animateFlip);
}

function finishFlip(outcome, playerChoice, betAmount, won) {
    const outcomeText = outcome === 0 ? 'heads' : 'tails';

    if (won) {
        balance += betAmount;
        document.getElementById('result').textContent = `${outcomeText.toUpperCase()}! You won $${betAmount}!`;
        document.getElementById('result').className = 'win';
    } else {
        balance -= betAmount;
        document.getElementById('result').textContent = `${outcomeText.toUpperCase()}! You lost $${betAmount}.`;
        document.getElementById('result').className = 'lose';
    }

    updateBalanceDisplay();

    isAnimating = false;
    document.getElementById('headsButton').disabled = false;
    document.getElementById('tailsButton').disabled = false;

    if (balance <= 0) {
        document.getElementById('result').textContent += ' Game Over!';
        document.getElementById('headsButton').disabled = true;
        document.getElementById('tailsButton').disabled = true;
    }
}

function onWindowResize() {
    const canvasContainer = document.getElementById('canvasContainer');
    camera.aspect = canvasContainer.offsetWidth / canvasContainer.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Update wiggle bones
    wiggleBones.forEach(wiggle => wiggle.update());

    renderer.render(scene, camera);
}

init();
