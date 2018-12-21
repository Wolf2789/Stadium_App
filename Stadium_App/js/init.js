var renderer3d, composer, FPS = 80;
var renderPassPersp, renderPassOrtho;
var controls;
var scene, camera, cameraTop, HUD, mouse;
var loader_TEX, loader_MESH;
var map, model;
var font, font_material;
var cameraAnimateTo = null, animationSpeed = 0.5;

function updateRendererSize(e) {
    // Update viewport size
    viewport_width = window.innerWidth;
    viewport_height = window.innerHeight;
    renderer3d.setSize(viewport_width, viewport_height);

    // Update cameras regarding collected information
    if (camera) {
        camera.aspect = viewport_width / viewport_height;
        camera.updateProjectionMatrix();
    }
    if (cameraTop && model) {
        cameraTop.fitToObject(scene);
        HUD && HUD.fitToObject(scene);
    } 
}

function update() {
    // Update main loops
    if (FPS > 0)
        setTimeout( function() {
            requestAnimationFrame(update);
        }, 1000 / FPS );
    else requestAnimationFrame(update);

    controls.update();
    cameraTop.animation && cameraTop.animation.update();
    // cameraTop.updateAnimation();

    // Render
    HUD && HUD.prerender(renderer3d);
    renderer3d.render(scene, (HUD.currentMode > 0) ? cameraTop : camera);
    renderer3d.autoClear = false;
    HUD && HUD.render(renderer3d);
    renderer3d.autoClear = true;
};

// var sun;
function init() {
    // WebGL Renderer
    renderer3d = new THREE.WebGLRenderer({antialias: true, premultipliedAlpha: false});
    renderer3d.setPixelRatio( 2 );
    renderer3d.autoClear = false;
    updateRendererSize();
    document.body.appendChild(renderer3d.domElement);

    // composer = new THREE.EffectComposer(renderer3d);
    // renderPassPersp = new THREE.renderPass(scene, camera);
    // renderPassOrtho = new THREE.renderPass(scene, cameraTop);

    // Initialize helpers
    loader_TEX = new THREE.TextureLoader();
    loader_MESH = new THREE.FBXLoader();

    // Load font
    new THREE.FontLoader().load('fonts/helvetiker_regular.typeface.json', f => font = f);
    font_material = new THREE.MeshPhongMaterial({color: 0x000000});

    // Initialize scene
    scene = new THREE.Scene();
    THREE.loadSkybox( scene, "images/skybox/", "png" );

    // Setup scene light
    var light = new THREE.AmbientLight( 0xffffff );
    scene.add(light);
    // sun = new THREE.DirectionalLight( 0xffffff );
    // sun.add(new THREE.Mesh(
    //     new THREE.BoxBufferGeometry( 1, 1, 1 ),
    //     new THREE.MeshBasicMaterial( { color: 0xffff00 } )));
    // scene.add(sun);

    // Initialize cameras
    camera = new THREE.PerspectiveCamera(60, viewport_width / viewport_height, 0.1, 10000);
    cameraTop = new THREE.OrthographicCamera( 0,0,0,0, 1, 1000); // Dimensions will be updated after model is loaded
	cameraTop.rotation.order = "YXZ";
    // cameraTop.position.set(0, 31, 0);
    // cameraTop.rotation.x = -Math.PI / 2;

    // Initialize HUD and Controls
    mouse = new THREE.Mouse();
    // Initializing HUD before controls makes it receive events first
    HUD = new THREE.HUD({
        mousedown: [renderer3d.domElement, e => {
            mouse.update(e); // manually update mouse state
            controls.canLock = !(HUD.process(mouse.X, mouse.Y) || (HUD.currentMode > 0));
        }],
        mouseup: [renderer3d.domElement, e => controls.canLock = HUD.currentMode == 0],
        mousemove: [renderer3d.domElement, e => {
            // console.log(mouse);
        }]
    });
    controls = new THREE.CameraControls(camera, renderer3d.domElement);

    // Add HUD buttons
    HUD.addButton("bChooseSector", "images/choose_sector_v02.png", 2, 3, 0.0, 1.0, () => {
        if (HUD.currentMode > 0) {
            model.resetMaterials();
            HUD.currentMode = 0;
        } else {
            model.applyTopViewMaterials();
            cameraTop.fitToObject(scene);
            HUD.currentMode = HUD.modes.chooseSector;
        }
        // Always hide back button
        HUD.scene.getObjectByName("bBack").visible = false;
    }, () => HUD.get("bChooseSector").resize(12) );

    HUD.addButton("bBack", "images/back_v02.png", 15, 3, 0.0, 1.0, (_this) => {
        // cameraTop.animateToObject(scene);
        cameraTop.animation = null;
        cameraTop.fitToObject(scene);
        _this.visible = false;
        HUD.currentMode = HUD.modes.chooseSector;
    }, () => HUD.get("bBack").resize(12), false);
    
    // Initialize model and run main loop (automatically after model is loaded)
    model = loadModel(MODEL_NAME);

    // Run main loop
    var runLoop = () => Queue.everythingLoaded()
                        ? (() => {
                            HUD && HUD.fitToObject(model.object);
                            HUD && HUD.initSectorsOverlay(model.config.seats, 1000);
                            update();
                        })() : setTimeout(runLoop, 1000);
    runLoop();
}

function startup() {
    // Check for WebGL
    WEBGL.isWebGLAvailable()
        ? init()
        : document.body.appendChild( WEBGL.getWebGLErrorMessage() );
    window.addEventListener('resize', updateRendererSize, false);
}
