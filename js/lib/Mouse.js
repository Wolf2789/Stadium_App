THREE.Mouse = function() {
    this.update = e => {
        this.X = e.layerX;
        this.Y = e.layerY;
    };
    
    this.X = 0;
    this.Y = 0;

    window.addEventListener("mousemove", this.update, false);
};
THREE.Mouse.prototype.constructor = THREE.Mouse;