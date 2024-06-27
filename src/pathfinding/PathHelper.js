let { TimeHelper, MathUtils, ChatUtils, Utils, Vector, PolarPathFinder, Rotations, MovementHelper } = global.export

class PathHelper {
    constructor() {
        this.pathfinding = false
        this.target = null
        this.targets = []
        this.finishActions = []

        this.walkTimer = new TimeHelper()
        this.TIMEOUT = 10000

        register("tick", () => {
            if (!this.pathfinding || !this.target) return
            if (this.walkTimer.hasReached(this.TIMEOUT)) return this.end(false)

            if (Client.isInGui() && !Client.isInChat()) Player.getPlayer().func_71053_j()

            if (!PolarPathFinder.currentNode && !PolarPathFinder.findPath(Utils.getPlayerNode()?.getBlockPos(), this.target?.getBlockPos())) return this.end(false)
            
            if (PolarPathFinder.currentNode && MathUtils.getDistanceToPlayer(this.target).distanceFlat > 1.5) {
                MovementHelper.setKeysForStraightLine(MathUtils.calculateAngles(new Vector(PolarPathFinder.currentNode.point)).yaw)

                if (!Rotations.rotate) Rotations.rotateTo((this.finalNode && PolarPathFinder.reachedEnd()) ? this.finalNode : PolarPathFinder.currentNode.lookPoint, 5)
                else Rotations.updateTargetTo((this.finalNode && PolarPathFinder.reachedEnd()) ? this.finalNode : PolarPathFinder.currentNode.lookPoint, 5)
            } else {
                PolarPathFinder.clearPath()
                Rotations.stopRotate()

                this.end()
            }
        })

        register("command", () => {
            this.followPath([[6, 199, -121], [32, 200, -112], [56, 199, -108], [75, 197, -98], [86, 197, -98]])
            this.onFinish(() => ChatLib.chat("done"))
        }).setName("testpath")
    }

    goto(target, finalNode=null) {
        this.pathfinding = true
        this.target = target instanceof Vector ? target : new Vector(target)

        if (finalNode) this.finalNode = finalNode instanceof Vector ? finalNode : new Vector(finalNode)
        else this.finalNode = null

        this.walkTimer.reset()
        PolarPathFinder.clearPath()
    }

    followPath(path) {
        this.targets = path.map((node) => new Vector(node))
        this.goto(this.targets.shift())
    }

    onFinish(cb) {
        this.finishActions.push(cb)
    }

    end(success=true) {
        if (success && this.targets.length > 0) return this.goto(this.targets.shift())

        this.pathfinding = false
        this.target = null
        this.targets = []
        MovementHelper.stopMovement()

        if (!success) return ChatUtils.sendModMessage("&cFailed to reach target location!")

        this.finishActions.forEach((cb) => cb())
        this.finishActions = []
    }
}

global.export.PathHelper = new PathHelper()