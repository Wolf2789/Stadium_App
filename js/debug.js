var DEBUG = true;

var D2R = (Math.PI / 180);
var R2D = (180 / Math.PI);
var boxGeom = new THREE.BoxGeometry( 0.25, 0.25, 0.25 );
var whiteMat = new THREE.MeshBasicMaterial();
var boxMat = [];
for (i = 0; i < 5; i++)
    boxMat.push( whiteMat );
boxMat.push( new THREE.MeshBasicMaterial({
    map: new THREE.TextureLoader().load("images/face.png")
}) );

var cubes = new THREE.Mesh();
cubes.material = boxMat;

function spawnCube(config) {
    var cube = new THREE.Mesh(boxGeom);
    cube.position.set(...config.position);
    cube.rotation.order = "YXZ";
    cube.rotation.set(...config.rotation);
    cube.updateMatrix();
    cubes.merge(cube.geometry, cube.matrix);
    // scene.add(cube);
}