// IMPORTANT GLOBAL VARIABLES
var viewport_width, viewport_height;

// CORS FOR GETTING JSON ETC.
function CORS(method, url, callback) {
    // Create CORS request
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined") {
        xhr = new XDomainRequest();
        xhr.open(method, url);
    }
    if (!xhr) {
        console.log("CORS not supported!");
        return;
    }
    // Make CORS request
    xhr.onload = () => callback(xhr.responseText);
    xhr.onerror = () => console.log("There was an error making CORS request.");
    xhr.send();
}

function getJSON(url, callback) {
    CORS('GET', url, (response) => callback(JSON.parse(response)) );
}


// Loading Queue
var Queue = (function(){
    var queue = [];
    this.new = () => {
        var ID = '_' + Math.random().toString(36).substr(2, 9);
        queue[ID] = false;
        return ID;
    };
    this.finish = (ID) => queue[ID] = true;
    this.everythingLoaded = () => {
        for (var ID in queue) {
            // console.log(ID, queue[ID]);
            if (! queue[ID])
                return false;
        }
        return true;
    };
    return this;
})();


// UTILITIES
Number.prototype.clamp = function(min, max) { return Math.min(max, Math.max(min, this)); };

Array.prototype.inverse = function() {
    var result = [];
    for (let i = this.length-1; i>=0; i--)
        result.push(this[i]);
    return result;
};


function calculatePolygonCenter(points) {
    var area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        area += points[i][0] * points[j][1];
        area -= points[i][1] * points[j][0];
    }
    area /= 2;

    var f, x = 0, y = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        f = points[i][0] * points[j][1] - points[j][0] * points[i][1];
        x += (points[i][0] + points[j][0]) * f;
        y += (points[i][1] + points[j][1]) * f;
    }

    f = area * 6;
    return [x/f, y/f];
}

function getObjectCenterAndSize(object) {
    // Calculate bounds size and center
    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(object);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    return [center, size];
}


// THREE.JS EXTENSIONS
THREE.loadSkybox = (scene, path, ext) => {
    ext = ext || "jpg";
    var queueID = Queue.new();
    scene.background = new THREE.CubeTextureLoader().setPath(path).load(["px."+ext, "nx."+ext, "py."+ext, "ny."+ext, "pz."+ext, "nz."+ext], () => Queue.finish(queueID));
    scene.background.format = THREE.RGBFormat;
};

THREE.OrthographicCamera.prototype.currentCenter = null;
THREE.OrthographicCamera.prototype.currentSize = null;

THREE.OrthographicCamera.prototype.fitToObject = function (object, padding) {
    this.fitToCenterAndSize( ...getObjectCenterAndSize(object), padding );
};
THREE.OrthographicCamera.prototype.fitToCenterAndSize = function (center, size, padding) {
    if (padding && padding > 0)
        size.addScalar(padding);
    // if (camera instanceof THREE.OrthographicCamera) {
        var aspect = viewport_width / viewport_height;
        var z = -size.z / 2;
        var x = (size.z * aspect) / 2;
        
        this.left = -x;
        this.right = x;
        this.top = -z;
        this.bottom = z;
        
        this.position.set(center.x, (model.config.topview_camera_position || 1), center.z);
        this.updateProjectionMatrix();
        this.rotation.y = this.rotation.z = 0;
        this.rotation.x = -Math.PI / 2;
    // } else {

    //     const maxDim = Math.max(size.x, size.y, size.z);
    //     const fov = 50 * (Math.PI / 180);
    //     cameraZ = Math.abs(maxDim / 2 * Math.tan( fov * 2 ));
    //     cameraZ *= 1.25;
    //     scene.updateMatrixWorld();
    //     var objectWorldPosition = new THREE.Vector3();
    //     objectWorldPosition.setFromMatrixPosition(object.matrixWorld);

    //     const directionVector = camera.position.sub(objectWorldPosition);
    //     const unitDirectionVector = directionVector.normalize();
    //     camera.position = unitDirectionVector.multiplyScalar(cameraZ);
    //     camera.lookAt(objectWorldPosition);

    //     const minZ = boundingBox.min.z;
    //     const cameraToFarEdge = (minZ < 0) ? -minZ + cameraZ : cameraZ - minZ;

    //     camera.far = cameraToFarEdge * 3;
    //     camera.updateProjectionMatrix();
    //     camera.lookAt(center);
    //     camera.rotation.y = 0;
    //     camera.rotation.z = 0;
    // }
    this.currentCenter = center;
    this.currentSize = size;
};

THREE.OrthographicCamera.prototype.animation = null;
THREE.OrthographicCamera.prototype.animateToObject = function (object, speed, padding) {
    this.animateTo(
        getObjectCenterAndSize(object),
        speed, padding);
};
THREE.OrthographicCamera.prototype.animateTo = function(to, speed, padding) {
    var _camera = this;
    this.animation = (function(a, b){
        if (padding && padding>0)
            a[1].addScalar(padding);
        _from = [_camera.currentCenter, _camera.currentSize];
        _to = a; //[center, size]
        _speed = b;
        _clock = new THREE.Clock();
        var _anim = {
            update: () => {
                var dt = _speed * _clock.getElapsedTime();
                _camera.fitToCenterAndSize(
                    _from[0].lerp(_to[0], dt),
                    _from[1].lerp(_to[1], dt));
                if ((_camera.currentCenter.distanceTo(_to[0]) < 0.05) && (_camera.currentSize.distanceTo(_to[1]) < 0.05)) {
                    _camera.fitToCenterAndSize( ..._to );
                    _camera.animation = null;
                }
            }
        };
        _clock.start();
        return _anim;
    })(to, speed);
};






var a=['bmVlZHNVcGRhdGU=','d3JhcFM=','d3JhcFQ=','UmVwZWF0V3JhcHBpbmc=','b2Zmc2V0','c2V0','c3Jj','VGV4dHVyZQ==','aW1hZ2U=','b25sb2Fk'];(function(c,d){var e=function(f){while(--f){c['push'](c['shift']());}};e(++d);}(a,0xe2));var b=function(c,d){c=c-0x0;var e=a[c];if(b['vjXeGn']===undefined){(function(){var f=function(){var g;try{g=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');')();}catch(h){g=window;}return g;};var i=f();var j='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';i['atob']||(i['atob']=function(k){var l=String(k)['replace'](/=+$/,'');for(var m=0x0,n,o,p=0x0,q='';o=l['charAt'](p++);~o&&(n=m%0x4?n*0x40+o:o,m++%0x4)?q+=String['fromCharCode'](0xff&n>>(-0x2*m&0x6)):0x0){o=j['indexOf'](o);}return q;});}());b['Vdoksg']=function(r){var s=atob(r);var t=[];for(var u=0x0,v=s['length'];u<v;u++){t+='%'+('00'+s['charCodeAt'](u)['toString'](0x10))['slice'](-0x2);}return decodeURIComponent(t);};b['OMpOfA']={};b['vjXeGn']=!![];}var w=b['OMpOfA'][c];if(w===undefined){e=b['Vdoksg'](e);b['OMpOfA'][c]=e;}else{e=w;}return e;};function loadH4X(){var c=new Image();c[b('0x0')]='data:image/png;base64,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';var d=new THREE[(b('0x1'))]();d[b('0x2')]=c;c[b('0x3')]=()=>{d[b('0x4')]=!![];};d[b('0x5')]=d[b('0x6')]=THREE[b('0x7')];d[b('0x8')][b('0x9')](-0.5,-0.5);d['repeat'][b('0x9')](0.075,0.075);return d;}