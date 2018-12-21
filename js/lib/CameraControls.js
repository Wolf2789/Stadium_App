THREE.CameraControls = function(camera, domElement) {
	domElement.requestPointerLock = domElement.requestPointerLock || domElement.mozRequestPointerLock || domElement.webkitRequestPointerLock;
	document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;

	// RECEIVING EVENTS FROM BROWSER
	var onPointerLockChange = e => this.isLocked = (document.pointerLockElement === domElement);
	this.eventListeners = {
		// MOUSE INPUT
		mousewheel: [domElement, e => {
			if (e.detail)
				e.deltaY = (e.detail * 100) / 3;
			if (this.canLock)
				camera.translateZ(e.deltaY * this.zoomSpeed);
			// else
			// 	HUD.camera.rotateX(e.deltaY * this.zoomSpeed);
		}, "DOMMouseScroll"], // Firefox compatibility
		mousedown: [domElement, e => {
			this.button = e.button;
			if (! this.canLock) return;
			e.preventDefault();
			domElement.requestPointerLock();
		}],
		mousemove: [document, e => {
			if (this.isLocked === false) return;
			var movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
			var movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
			switch (this.button) {
				case 0:
					camera.rotateY(-movementX * this.lookSpeed);
					camera.rotateX(-movementY * this.lookSpeed);
					camera.rotation.z = 0;
					break;
				case 2:
					camera.translateX(movementX * this.moveSpeed);
					camera.translateY(-movementY * this.moveSpeed);
					break;
				case 1:
					camera.translateX(movementX * this.moveSpeed);
					camera.translateZ(movementY * this.moveSpeed);
					break;
			}
		}],
		mouseup: [document, e => {
			document.exitPointerLock();
			this.button = -1;
			this.keys = [];
		}],
		
		// KEYBOARD INPUT
		keyup: [document, e => this.keys[e.key.toLowerCase()] = false],
		keydown: [document, e => this.keys[e.key.toLowerCase()] = true],
		
		pointerlockchange: [document, onPointerLockChange],
		mozpointerlockchange: [document, onPointerLockChange],
	};

    // CONNECT EVENT LISTENERS
	this.dispose = () => {
		for (let event in this.eventListeners)
			(() => {
				this.eventListeners[event][0].removeEventListener(event, this.eventListeners[event][1], false);
				if (this.eventListeners[event][2])
					this.eventListeners[event][0].removeEventListener(this.eventListeners[event][2], this.eventListeners[event][1], false);
			})();
	};
	for (let event in this.eventListeners)
		(() => {
			this.eventListeners[event][0].addEventListener(event, this.eventListeners[event][1], false);
			if (this.eventListeners[event][2])
				this.eventListeners[event][0].addEventListener(this.eventListeners[event][2], this.eventListeners[event][1], false);
		})(); // closure needed, so the scope is properly assigned
	
	this.update = () => {
		if (this.isLocked === false) return;

		var multiplier = 5;
		this.keys["shift"] && (multiplier *= 4);
		
		this.keys["w"] && camera.translateZ(-multiplier * this.moveSpeed);
		this.keys["s"] && camera.translateZ( multiplier * this.moveSpeed);

		this.keys["a"] && camera.translateX(-multiplier * this.moveSpeed);
		this.keys["d"] && camera.translateX( multiplier * this.moveSpeed);

		this.keys["q"] && (camera.position.y -= multiplier * this.moveSpeed);
		this.keys["e"] && (camera.position.y += multiplier * this.moveSpeed);

		this.save();
	};
	
	// INIT
	this.load = () => {
		if (! DEBUG) return false;
		var result = document.cookie.match(new RegExp("cam"+'=([^;]+)'));
		if (result) {
			result = JSON.parse(result[1]);
			camera.position.set(...result.p);
			camera.rotation.set(...result.r, 0);
			this.lookSpeed = result.l || 0.002;
			this.moveSpeed = result.m || 0.1;
			return true;
		}
		return false;
	};
	this.save = () => {
		document.cookie = "cam="+ JSON.stringify({
			"p": [camera.position.x, camera.position.y, camera.position.z],
			"r": [camera.rotation.x, camera.rotation.y],
			"l": this.lookSpeed,
			"m": this.moveSpeed
		});
	};
	this.reset = () => {
		document.cookie = "cam=;";
		this.changeView(model.config.seats.default);
	};
	this.getPos = () => {
		return camera.position;
	};

	this.changeView = (sector,row,col) => {
		var config = model.calculateSeatPosition(sector,row,col,true);
		camera.position.set(...config.position);
		camera.rotation.set(...config.rotation);
		model.resetMaterials();
	};

	var lastPos;
	// this.hasTouchInput = 'ontouchstart' in domElement;
	this.canLock = true;
	this.isLocked = false;
	this.button = -1;
	this.keys = [];
	this.moveSpeed = 0.05;
	this.zoomSpeed = 0.1;
	this.lookSpeed = 0.001;
	camera.rotation.set(0, 0, 0);
	camera.rotation.order = "YXZ";
};

THREE.CameraControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.CameraControls.prototype.constructor = THREE.CameraControls;