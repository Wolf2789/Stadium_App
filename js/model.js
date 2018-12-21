function loadModel(path) {
    // Ensure path string ends with slash
    if (path[path.length-1] != '/')
        path += '/';

    var parseConfig = config_path => {
        var loadTextures = textures => {
            var result = {};
            for (let id in textures) {
                let queueID = Queue.new();
                let tex = loader_TEX.load(path + textures[id], (tex) => {
                    tex.magFilter = THREE.NearestFilter;
                    tex.minFilter = THREE.LinearMipMapLinearFilter;
                    Queue.finish(queueID);
                });
                result[id] = tex;
            }
            return result;
        };
        var loadMaterials = (textures, materials) => {
            var result = {};
            for (let id in materials) {
                let config = {
                    side: THREE.DoubleSide,
                    envMap: scene.background,
                    name: id,
                    metalness: 0,
                    roughness: 1
                };
                let material = new THREE.MeshStandardMaterial(config);
                let toParse = materials[id];
                for (let index in toParse)
                    switch (index) {
                        case 'color':
                            material.color.setHex(parseInt(toParse[index], 16));
                            break;
                        case 'emissive':
                            material.emissive = parseInt(toParse[index], 16);
                            break;
                        case 'transparent':
                            if (toParse[index]) {
                                material.transparent = true;
                                material.opacity = 1.0;
                                material.alphaTest = 0.5;
                            }
                            break;
                        case 'map':
                            material.map = textures[toParse[index]];
                            break;
                        default:
                            if (material.hasOwnProperty(index))
                                material[index] = toParse[index];
                            break;
                    }
                material.needsUpdate = true;
                result[id] = material;
            }
            return result;
        };
    
        var config = {};
        getJSON(config_path, toParse => {
            if (toParse.textures) {
                config.textures = loadTextures(toParse.textures);
                delete toParse.textures;
            }
            if (toParse.materials) {
                config.materials = loadMaterials(config.textures, toParse.materials);
                delete toParse.materials;
            }
            if (toParse.materials_topview) {
                config.materials_topview = loadMaterials(config.textures, toParse.materials_topview);
                delete toParse.materials_topview;
            }
            if (toParse.sun) {
                toParse.sun.color = parseInt(toParse.sun.color, 16) || 0xffffff;
                config.sun = new THREE.DirectionalLight(toParse.sun.color, (toParse.sun.intensity || 1));
                if (toParse.sun.position)
                    config.sun.position.set(...toParse.sun.position);
                if (toParse.sun.target)
                    config.sun.lookAt(...toParse.sun.target);
                delete toParse.sun;
            }
            for (let index in toParse) 
                config[index] = toParse[index];
        });
        return config;
    }



    // Initialize
    var result = {
        config: {},
        calculateSeatPosition: (sector,row,col,lookAt0) => {
            var O3D = new THREE.Object3D();
            lookAt0 = lookAt0 || false;
            // Get config, calculate row & col
            var config = (typeof(sector) == "object") ? sector : result.config.seats[sector];
            row = row || 0;
            col = col - 1 || 0;
            if (config.hasOwnProperty("rows")) {
                for (var i = 0; i < config.max; i++) {
                    if (row <= config.rows[i].max.rows) {
                        config = config.rows[i];
                        break;
                    }
                    row = row - config.rows[i].max.rows;
                }
            }
            row -= 1;
            // Set base position
            if (config.hasOwnProperty("position") || config.hasOwnProperty("origin"))
                O3D.position.set(...(config.position || config.origin));
            // Set base rotation
            O3D.rotation.order = "YXZ";
            O3D.rotation.set(0,0,0);
            if (config.hasOwnProperty("rotation"))
                O3D.rotation.set(...config.rotation.inverse(), 0);
            // Offset if need be
            if (result.config.hasOwnProperty("camera_offset"))
                O3D.translateOnAxis(new THREE.Vector3(...result.config.camera_offset), 1);
            if (config.hasOwnProperty("max") && config.hasOwnProperty("offset")) {
                col = col.clamp(0, config.max.cols-1);
                row = row.clamp(0, config.max.rows-1);
                O3D.translateX(config.offset[0] * col);
                O3D.translateY(config.offset[1] * row);
                O3D.translateZ(config.offset[2] * row);
            }
            // Look at origin
            if (lookAt0) {
                O3D.lookAt(0,0,0);
                O3D.rotateY(Math.PI);
            }
            return {
                position: O3D.position.toArray(),
                rotation: O3D.rotation.toArray().slice(0,3)
            }
        },
        applyTopViewMaterials: () => {
            result.object.traverse(child => {
                if (child.isMesh) {
                    child.material = applyMaterial(child.material, result.config.materials_topview);
                }
            });
        },
        resetMaterials: () => {
            result.object.traverse(child => {
                if (child.isMesh) {
                    child.material = applyMaterial(child.material, result.config.materials);
                }
            });
        },
        getSeatAt: (index, x, y) => {
            if (!result.config.seats.hasOwnProperty(index)) return false;
            var seat = result.config.seats[index];
            if (seat.hasOwnProperty("origin")) {
                // Calculate row
                y -= seat.origin[2];
                y -= Math.abs(seat.offset[2] / 2);
                y = Math.abs(Math.ceil(y / seat.offset[2]));
                // Calculate col
                x -= seat.origin[0];
                x -= Math.abs(seat.offset[0] / 2);
                x = Math.abs(Math.ceil(x / seat.offset[0]));
            } else {
                
            }
            return [y, x]; // [row, col]
        }
    };


    var applyMaterial = (material, config) => {
        if (Array.isArray(material)) {
            for (let index in material)
                material[index] = applyMaterial(material[index], config);
        } else {
            if (config.hasOwnProperty(material.name)) {
                material = config[material.name];
            }
        }
        return material;
    };
    // Load config
    result.config = parseConfig(path +'config.json');
    // Load model
    var queueID = Queue.new();
    loader_MESH.load(path +'model.fbx', obj => {
        obj.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        result.object = obj;
        result.resetMaterials();

        if (result.config.sun) // spawnsun
            obj.add(result.config.sun);
        scene.add(result.object);

        if (controls) {
            cameraTop.fitToObject(result.object);
            if (! controls.load())
                controls.changeView(result.config.seats.default);
        }

        Queue.finish(queueID);
    });
    return result;
}