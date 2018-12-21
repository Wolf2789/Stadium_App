THREE.HUD = function(config) {
    // FUNCTIONS THAT DRIVE HUD SYSTEM
    this.prerender = renderer => {
        renderer.render(this.SectorsHiddenData, cameraTop);
        renderer.clear();
    };
    this.render = renderer => {
        if (this.currentMode == this.modes.chooseSector) {
            renderer.clearDepth();
            renderer.render(this.SectorsOverlay, cameraTop);
        }
        renderer.clearDepth();
        renderer.render(this.scene, this.camera);
    };

    this.fitToObject = (object) => {
        this.camera.fitToObject(object);
        this.camera.translateX((Math.abs(this.camera.right) + Math.abs(this.camera.left))/2);
        this.camera.translateY(-(this.camera.top - this.camera.bottom)/2);
        this.camera.rotation.x = (-Math.PI/1.75);
    };

    this.process = (x, y) => {
        var result = this.testIntersects(x, y);
        if (result !== false) {
            if (result.object.hasOwnProperty("callback")) {
                result.object.callback(result.object);
                return true;
            }
            if ((this.currentMode > 0) && this.SectorsHiddenData.getObjectByName(result.object.name)) {
                if (this.currentMode != this.modes.chooseSeat) {
                    // cameraTop.fitToObject(result.object);
                    cameraTop.animateToObject(result.object, 0.5, 1);
                    this.scene.getObjectByName("bBack").visible = true;
                    this.currentMode = this.modes.chooseSeat;
                } else {
                    let index = result.object.name.substr(1);
                    let seat = model.getSeatAt(index, result.point.x, result.point.z);
                    controls.changeView(index, ...seat);
                    this.currentMode = 0;
                    this.scene.getObjectByName("bBack").visible = false;
                    let message = "This is how view looks like in sector '"+index+"', row "+seat[0]+" and seat "+seat[1]+".";
                    tinyToast.show(message).hide(8000);
                }
                return true;
            }
        }
        return false;
    };

    this.testIntersects = (x, y) => {
        x = (x / viewport_width) * 2 - 1;
        y = -(y / viewport_height) * 2 + 1;
        var raycaster = new THREE.Raycaster();
        function testIt(scene, camera) {
            raycaster.setFromCamera(new THREE.Vector3(x, y, 1), camera);
            var intersects = raycaster.intersectObject(scene, true);
            if (intersects.length > 0) {
                var res = intersects[0];
                if (res && res.object && res.point)
                    return {object: res.object, point: res.point};
            }
            return false;
        };
        return testIt(this.scene, this.camera) || testIt(this.SectorsHiddenData, cameraTop);
    };

    // FUNCTIONS THAT DEALS WITH HUD OBJECTS
    this.addElem = elem => this.scene.add(elem);
    this.get = ID => {
        return this.scene.getObjectByName(ID);
    };

    this.addButton = (ID, texture, X, Y, CX, CY, callback, afterLoad, visible) => {
        if (visible == "undefined")
            visible = true;
        var createButton = (ID, tex, X, Y, CX, CY, callback) => {
            var aspect = viewport_width / viewport_height;
            var button = new THREE.Sprite(new THREE.SpriteMaterial({map: tex}));
            button.scale.set(tex.image.width, tex.image.height, 1);
            button.center.set(CX, CY);
            button.position.set(X, Y * aspect, 1);
            button.visible = true;
            button.name = ID;
            button.callback = () => callback(button);
            button.resize = (W, H) => {
                var aspect = tex.image.height / tex.image.width;
                button.scale.set(
                    W || tex.image.width,
                    H || (W * aspect),
                    1);
            };
            button.visible = visible;
            this.scene.add(button);
        };
        if (texture instanceof THREE.Texture) {
            createButton(ID, texture, X, Y, CX, CY, callback);
            afterLoad && afterLoad();
        } else {
            loader_TEX.load(texture, tex => {
                createButton(ID, tex, X, Y, CX, CY, callback);
                afterLoad && afterLoad();
            });
        }
    };

    this.initSectorsOverlay = (seats, timeout) => {
        if (! seats) {
            this.SectorsDataInitialized = false;
            // retry
            if (timeout) {
                var _this = this;
                setTimeout(function() {
                    _this.initSectorsOverlay(seats, timeout);
                }, timeout);
            }
            return;
        }
        // Let the magic begin
        for (let i = this.SectorsOverlay.children.length - 1; i >= 0; i--)
            this.SectorsOverlay.remove(this.SectorsOverlay.children[i]);
        var material = new THREE.MeshBasicMaterial({map: loadH4X()});
        for (let index in seats) {
            if (index == "default" || index == seats["default"]) continue;
            if (!( seats[index].hasOwnProperty("bounds") && (seats[index].bounds.length > 1) )) continue;

            // Create bounding poly for testing intersections of mouse clicks
            // Calculate bounds center
            var centroid = calculatePolygonCenter(seats[index].bounds);
            // Translate points from global to local
            for (let i = 0; i < seats[index].bounds.length; i++)
                for (let j = 0; j < 2; j++)
                    seats[index].bounds[i][j] = seats[index].bounds[i][j] - centroid[j];
            // Create geometry
            let poly_geometry = new THREE.Shape();
            poly_geometry.moveTo(...seats[index].bounds[0]);
            for (let i = 1; i < seats[index].bounds.length; i++)
                poly_geometry.lineTo(...seats[index].bounds[i]);
            poly_geometry.lineTo(...seats[index].bounds[0]);
            // Create mesh
            let polyMesh = new THREE.Mesh(new THREE.ShapeBufferGeometry(poly_geometry), material);
            polyMesh.position.set(centroid[0], 0, -centroid[1]);
            polyMesh.rotation.x = -Math.PI / 2;
            polyMesh.name = '_' + index;
            this.SectorsHiddenData.add(polyMesh);

            // Create label
            let text_geometry = new THREE.TextGeometry(index, {
                font: font,
                size: 3,
                height: 1,
                bevelEnabled: false
            });
            text_geometry.computeBoundingBox();
            text_geometry.translate(-text_geometry.boundingBox.max.x / 2, -text_geometry.boundingBox.max.y / 2, 0);

            let textMesh = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(text_geometry), font_material);
            textMesh.rotation.x = -Math.PI / 2;
            
            textMesh.position.set(centroid[0], 1, -centroid[1]);
            textMesh.position.y = 1;
            this.SectorsOverlay.add(textMesh);
        }
        this.SectorsDataInitialized = true;
    }

    // CONNECTING EVENT LISTENERS
    this.eventListeners = {};
    if (config) for (let index in config)
        this.eventListeners[index] = config[index];
	this.dispose = () => {
		for (let event in this.eventListeners)
			(() => { this.eventListeners[event][0].removeEventListener(event, this.eventListeners[event][1], false); })();
	};
	for (let event in this.eventListeners)
		(() => { this.eventListeners[event][0].addEventListener(event, this.eventListeners[event][1], false); })();

    // INITIALIZE HUD
    this.scene = new THREE.Scene();

    this.SectorsOverlay = new THREE.Scene();
    this.SectorsHiddenData = new THREE.Scene();
    this.SectorsDataInitialized = false;

    this.camera = new THREE.OrthographicCamera(0,0,0,0, 1, 10);
	this.camera.rotation.order = "YXZ";
    // this.camera.position.z = 10;
    this.modes = {
        chooseSector: 1,
        chooseSeat: 2
    };
    this.currentMode = 0;
};

THREE.HUD.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.HUD.prototype.constructor = THREE.HUD;