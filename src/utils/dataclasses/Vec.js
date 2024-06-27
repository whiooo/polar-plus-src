class vec {
    constructor(x, y, z) {
        if(x instanceof BlockPos) {
            this.x = x.x
            this.y = x.y
            this.z = x.z
        } else if(x instanceof Entity || x instanceof PlayerMP || x instanceof Player) {
            this.x = x.getX()
            this.y = x.getY()
            this.z = x.getZ()
        } else if(x instanceof net.minecraft.entity.Entity) {
            let ctEntity = new Entity(x)
            this.x = ctEntity.getX()
            this.y = ctEntity.getY()
            this.z = ctEntity.getZ()
        } else if(x instanceof net.minecraft.network.play.server.S08PacketPlayerPosLook) {
            this.x = x.func_148932_c()
            this.y = x.func_148928_d()
            this.z = x.func_148933_e()
            this.yaw = x.func_148931_f()
            this.pitch = x.func_148930_g()
        } else if(x instanceof Array) {
            this.x = x[0]
            this.y = x[1]
            this.z = x[2]
        } else {
            this.x = x
            this.y = y
            this.z = z
        }
    }

    /**
     * @returns {vec}
     */
    add(x,y,z) {
        return new vec(this.x + x, this.y + y, this.z + z)
    }

    getBlockPos() {
        this.x = Math.floor(this.x)
        this.y = Math.round(this.y)
        this.z = Math.floor(this.z)
        return new BlockPos(this.x, this.y, this.z);
    }

    getDistance(x, y, z) {
        let xFinal = 0
        let yFinal = 0
        let zFinal = 0
        if(x instanceof vec) {
            xFinal = x.x
            yFinal = x.y
            zFinal = x.z
        } else {
            xFinal = x
            yFinal = y
            zFinal = z
        }
        const diffX = xFinal - this.x
        const diffY = yFinal - this.y
        const diffZ = zFinal - this.z
        let flat = Math.sqrt((diffX * diffX) + (diffZ * diffZ))
        return Math.sqrt((flat * flat) + (diffY * diffY))
    }

    toMC() {
        return new net.minecraft.util.Vec3(this.x, this.y, this.z)
    }

    equals(vec) {
        return this.x === vec.x && this.y === vec.y && this.z === vec.z
    }

    hashCode() {
        return (this.y + this.z * 31) * 31 + this.x
    }

    toArray() {
        return [this.x, this.y, this.z];
    }

    toString() {
        return `Vector(x=${this.x},y=${this.y},z=${this.z},yaw=${this.yaw},pitch=${this.pitch})`
    }
}

global.export.Vector = vec