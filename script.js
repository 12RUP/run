// Setting up the scene, camera, and renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);  // Blue sky

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 10);  // Camera higher and looking down
camera.lookAt(0, 0, 0);  // Camera direction

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Getting coin counter element
const coinCounter = document.getElementById('coin-counter');

// Getting modal elements
const gameOverModal = document.getElementById('game-over-modal');
const gameOverText = document.getElementById('game-over-text');

// Creating the ground segments
const segmentLength = 100;
let segments = [];

function createGroundSegment(zPosition) {
    const floorGeometry = new THREE.PlaneGeometry(10, segmentLength);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = zPosition;
    scene.add(floor);
    segments.push(floor);
}

// Initial ground segments
for (let i = 0; i < 20; i++) {
    createGroundSegment(-i * segmentLength);
}

// Creating the player
const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 0.5;
scene.add(player);

// Initializing obstacles and coins array and speed
let obstacles = [];
let coins = [];
let speed = 0.05;  // Initial speed
const lanes = [-2, 0, 2];  // Three lanes: left, center, right
let currentLane = 1;  // Starting lane (center)
let score = 0;
let coinCount = 0;
let isGameOver = false;

// Jump variables
let isJumping = false;
let jumpSpeed = 0;
const gravity = -0.015;
const jumpHeight = 0.3;

// Создание препятствий
function createObstacle(zPosition) {
    const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
    const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    obstacle.position.set(lane, 0.5, zPosition);
    obstacles.push(obstacle);
    scene.add(obstacle);
}

// Создание монет
function createCoin(zPosition) {
    const coinGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const coinMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    coin.position.set(lane, 0.5, zPosition);
    coins.push(coin);
    scene.add(coin);
}

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

// Управление игроком
document.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft' && currentLane > 0) {
        currentLane--;
        player.position.x = lanes[currentLane];
    } else if (event.code === 'ArrowRight' && currentLane < lanes.length - 1) {
        currentLane++;
        player.position.x = lanes[currentLane];
    } else if (event.code === 'Space' && !isJumping) {
        isJumping = true;
        jumpSpeed = jumpHeight;
    }
});

// Функция для создания препятствий и монет чаще
function generateObjects() {
    const zPosition = player.position.z - 50;  // Позиция далеко перед игроком
    for (let i = 0; i < 4; i++) {  // Генерируем четыре препятствия и четыре монеты каждый раз
        if (obstacles.length < 30) {  // Ограничиваем количество препятствий
            createObstacle(zPosition - i * 10);  // Разделяем по позиции
        }
        if (coins.length < 30) {  // Ограничиваем количество монет
            createCoin(zPosition - i * 10);  // Разделяем по позиции
        }
    }
}

// Главная функция анимации
function animate() {
    if (isGameOver) return;

    requestAnimationFrame(animate);

    // Движение игрока вперед
    player.position.z -= speed;
    score += 1;

    // Обработка прыжка
    if (isJumping) {
        player.position.y += jumpSpeed;
        jumpSpeed += gravity;
        if (player.position.y <= 0.5) {
            player.position.y = 0.5;
            isJumping = false;
        }
    }

    // Генерация новых сегментов поля
    if (segments[segments.length - 1].position.z > player.position.z + 10 * segmentLength) {
        const lastSegment = segments[segments.length - 1];
        createGroundSegment(lastSegment.position.z - segmentLength);
        const firstSegment = segments.shift();
        scene.remove(firstSegment);
    }

    // Движение препятствий к игроку
    obstacles.forEach((obstacle, index) => {
        obstacle.position.z += speed;
        if (obstacle.position.z > player.position.z + 10) {
            scene.remove(obstacle);
            obstacles.splice(index, 1);
        }

        // Проверка на столкновения
        const playerBox = new THREE.Box3().setFromObject(player);
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        if (playerBox.intersectsBox(obstacleBox)) {
            gameOverText.innerHTML = `Игра окончена!<br>Ваш счет: ${score}<br>Собрано монет: ${coinCount}`;
            gameOverModal.style.display = 'block';
            isGameOver = true;
        }
    });

    // Движение монет к игроку
    coins.forEach((coin, index) => {
        coin.position.z += speed;
        if (coin.position.z > player.position.z + 10) {
            scene.remove(coin);
            coins.splice(index, 1);
        }

        // Проверка на сбор монет
        const playerBox = new THREE.Box3().setFromObject(player);
        const coinBox = new THREE.Box3().setFromObject(coin);
        if (playerBox.intersectsBox(coinBox)) {
            coinCount++;
            scene.remove(coin);
            coins.splice(index, 1);

            // Обновление счетчика монет
            coinCounter.innerText = 'Монеты: ' + coinCount;
        }
    });

    // Обновление позиции и направления камеры
    camera.position.set(player.position.x, player.position.y + 10, player.position.z + 15);
    camera.lookAt(player.position);

    renderer.render(scene, camera);
}

// Запуск генерации объектов с динамическими интервалами
function startGeneratingObjects() {
    function generate() {
        if (!isGameOver) {
            generateObjects();
            setTimeout(generate, 950);  // Генерация объектов каждые 950 мс
        }
    }
    generate();

    setInterval(() => {
        if (!isGameOver) {
            speed += 0.01;  // Увеличение скорости каждые 45 секунд
        }
    }, 45000);
}

// Начало анимации
animate();
startGeneratingObjects();
// Управление игроком на мобильных устройствах
let touchStartX = 0;

document.addEventListener('touchstart', (event) => {
    touchStartX = event.touches[0].clientX;
});

document.addEventListener('touchend', (event) => {
    const touchEndX = event.changedTouches[0].clientX;
    const swipeDistance = touchEndX - touchStartX;

    if (swipeDistance > 50 && currentLane > 0) {
        currentLane--;
        player.position.x = lanes[currentLane];
    } else if (swipeDistance < -50 && currentLane < lanes.length - 1) {
        currentLane++;
        player.position.x = lanes[currentLane];
    } else if (!isJumping) {
        isJumping = true;
        jumpSpeed = jumpHeight;
    }
});
