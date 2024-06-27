import Async from "Async"
let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager } = global.settingSelection
let { ChatUtils, Rotations, Vec3, ItemUtils, aStarPolar, Utils, RouteWalkerV2, GuiInventory, PolarPathFinder, PathFinder, Vector, RenderUtils, Reference } = global.export
class devUtils {
    constructor() {
        register("command", () => {
            let cords = Utils.playerCords().floor
            let text = "[" + cords[0] + "," + cords[1] + "," + cords[2] + "]"
            ChatUtils.sendDevMessage(text + " to clipboard")
            ChatLib.command("ct copy " + text, true)
        }).setName("addwaypoint1")

        register("command", (arg) => {
            let cords = Utils.playerCords().floor
            let text = "new Point(" + cords[0] + "," + cords[1] + "," + cords[2] + "," + arg + ")"
            ChatUtils.sendDevMessage(text + " to clipboard")
            ChatLib.command("ct copy " + text, true)
        }).setName("addwaypoint2")

        register("command", (arg) => {
            let cords = Utils.playerCords().floor
            let text = "" + cords[0] + "," + (cords[1]-1) + "," + cords[2] + ""
            ChatUtils.sendModMessage(text + " to clipboard")
            ChatLib.command("ct copy " + text, true)
        }).setName("addwaypoint3")

        register("command", (x,y,z) => {
            if(x === undefined || y === undefined || z === undefined) {
                Rotations.rotateToVec3(0.0,0.0)
                return
            }
            try {
                Rotations.rotateTo(new Vec3(parseInt(x.toString()),parseInt(y.toString()),parseInt(z.toString())))
            } catch (error) {
            }
        }).setName("lookat")

        register("command", () => {
            let entities = World.getAllPlayers()
            entities.forEach(entity => {
                ChatLib.chat(entity.getName() + ".")
            })
        }).setName("debugplayers")

        register("command", () => {
            let entities = World.getAllEntities()
            entities.forEach(entity => {
                ChatLib.chat(entity.getClassName() + ".")
                ChatLib.chat(entity.getName() + ".")
            })
        }).setName("debugentities")

        let path = []
        register("command", () => {
            Async.run(() => {
                let finder = new PathFinder(Utils.getEntityPathfindLocation(Player.getPlayer()), new Vector(-62,126,432), 1000)
                path = finder.computePath()
            })
        }).setName("pathfind")

        register("command", () => {
            path = aStarPolar.aStar(new BlockPos(Math.floor(Player.getX()),Player.getY()-1,Math.floor(Player.getZ())), false, Math.SQRT2, new BlockPos(-62,126,432))
        }).setName("pathfind2")

        register("renderWorld", () => {
            if(path.length > 0) {
                RenderUtils.renderPathfindingLines(path)
            }
        })

        register("command", () => {
            Rotations.rotateTo(new Vec3(3.5,132.5,376.5))
            ChatLib.chat(Utils.playerIsCollided())
        }).setName("rotate2")

        register("command", () => {
            let cords = Utils.playerCords().floor;
            ChatLib.chat(PolarPathFinder.findPath(Utils.getPlayerNode().getBlockPos(), new BlockPos(-76, 119, 280)))
        }).setName("yesl")

        register("command", () => {
            let block = Player.lookingAt();
            if(block instanceof Block) {
                ChatLib.chat("metadata: " + block.getMetadata());
                ChatLib.chat("blockid: " + block.type.getID());
            } else {
                ChatLib.chat(block);
            }
        }).setName("blockinfo")
    }
}
new devUtils()