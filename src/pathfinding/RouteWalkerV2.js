let { SettingSelector, SettingSlider, SettingToggle, ConfigModuleClass, ModuleToggle, getKeyBind, ModuleManager } = global.settingSelection
let { ChatUtils, MathUtils, Rotations, RenderUtils, MovementHelper, TimeHelper, Utils, Vec3 } = global.export

global.modules.push(
    new ConfigModuleClass(
        "Route Walker",
        "Misc",
        [
            new SettingSelector("Route", 0, [
                "Custom - 1",
                "Custom - 2",
                "Custom - 3",
                "Custom - 4",
                "Custom - 5",
                "Custom - 6",
                "Custom - 7",
                "Custom - 8",
                "Custom - 9"
            ])
        ],
        [
            "Walks between custom waypoints set in the world",
            "Use /walkeradd, /walkerremove, /walkerinsert to edit a route"
        ]
    )
)

class routeWalkerV2 {
    constructor() {
        this.ModuleName = "Route Walker"
        getKeyBind("Route Walker", "Polar Client - Misc", this)
        this.Enabled = false
        this.path = []
        this.currentIndexWalk = 0
        this.currentIndexLook = 0
        this.MacroStates = {
            WALKING: 0,
            WAITING: 1
        }
        this.state = this.MacroStates.WAITING
        this.callBackActions = []
        this.rotationTime = 200
        this.stopOnEnd = false
        this.loadingCords = false
        this.rotations = true

        register("step", () => {
            if(ModuleToggle.UseRouteWalkerV2Module) return
            this.updateRoute()
        }).setDelay(5)

        // seperate renderWorld trigger lol
        register("renderWorld", () => {
            if(this.path.length > 0) {
                RenderUtils.renderCordsWithNumbers(this.path, [0.2, 0.47, 1], 0.2, true)
                RenderUtils.renderLines(this.path, [0.2, 0.47, 1], [0.5,1.0,0.5])
            }
        })

        register("renderWorld", () => {
            if(this.Enabled) {
                if(this.state === this.MacroStates.WALKING) {
                    if(Client.currentGui.getClassName() != "null") {
                        MovementHelper.stopMovement()
                        return
                    }
                    if(this.path.length > 0) {
                        if(this.currentIndexLook >= this.path.length) {
                            this.currentIndexLook = this.path.length-1
                        }
                        let currentWalk = this.path[this.currentIndexWalk]
                        let currentLook = this.path[this.currentIndexLook]
                        let distancePoint = MathUtils.distanceToPlayer([currentWalk[0] + 0.5, currentWalk[1] + 1.52, currentWalk[2] + 0.5])
                        if(distancePoint.distance < 6.0 && distancePoint.distanceFlat < 0.8) {
                            this.currentIndexWalk += 1
                            this.currentIndexLook += 1
                            if(this.currentIndexWalk === this.path.length) {
                                this.currentIndexWalk = 0
                                if(ModuleToggle.UseRouteWalkerV2Module) this.currentIndexLook = 2
                                else this.currentIndexLook = 0
                                this.triggerEnd()
                                if(this.stopOnEnd) {
                                    this.toggle()
                                    return
                                }
                            }
                            if(this.currentIndexLook >= this.path.length) {
                                this.currentIndexLook = this.path.length-1
                            }
                            currentWalk = this.path[this.currentIndexWalk]
                            currentLook = this.path[this.currentIndexLook]
                        }

                        try {
                            let vec3PointLook = new Vec3(currentLook[0] + 0.5, currentLook[1] + 1.52, currentLook[2] + 0.5)
                            let vec3PointWalk = new Vec3(currentWalk[0] + 0.5, currentWalk[1] + 1.0, currentWalk[2] + 0.5)
                            MovementHelper.setKeysBasedOnYaw(MathUtils.calculateAngles(vec3PointWalk).yaw)
                            if(this.rotations) {
                                Rotations.rotateTo(vec3PointLook)
                            }
                        } catch (error) {  
                        }
                    }
                }
            }
        })

        register("command", (number) => {
            this.handleRouteEdit("add", number)
        }).setName("walkeradd")

        register("command", (number) => {
            this.handleRouteEdit("remove", number)
        }).setName("walkerremove")  

        register("command", (number) => {
            this.handleRouteEdit("insert", number)
        }).setName("walkerinsert")
    }

    toggle() {
        this.Enabled = !this.Enabled
        if(!ModuleToggle.UseRouteWalkerV2Module) {
            ChatUtils.sendModMessage(this.ModuleName + ": " + (this.Enabled ? "&aEnabled": "&cDisabled"))
            let index = this.getClosestIndex()
            this.currentIndexLook = index
            this.currentIndexWalk = index
        }
        if(this.Enabled) {
            // Failsafes
            global.export.FailsafeManager.register((cb) => {
                if (this.Enabled) this.toggle()
                cb()
            }, () => {
                if (!this.Enabled) this.toggle()
            })

            MovementHelper.setCooldown()
            this.state = this.MacroStates.WALKING
        }
        if(!this.Enabled) {
            if(!ModuleToggle.UseRouteWalkerV2Module) Rotations.stopRotate()
            global.export.FailsafeManager.unregister()
            MovementHelper.stopMovement()
        }
    }

    /**
     * @param {String} name 
     */
    getAccessKey(name) {
        return "custom" + name.slice(-1)
    }
    
    /**
     * @param {Array<Array>} path 
     */
    setPath(path) {
        this.currentIndexWalk = 0
        this.currentIndexLook = 2
        if(path === undefined) this.path = []
        if(this.currentIndexLook >= path.length) {
            this.currentIndexLook = path.length-1
        }
        this.path = path
    }

    getClosestIndex() {
        let closest = null
        let closestIndex = 0
        let closestDistance = 0
        this.path.forEach((point, index) => {
            let distance = MathUtils.distanceToPlayer(point).distance
            if(!closest || distance < closestDistance) {
                closest = point
                closestIndex = index
                closestDistance = distance
            }
        })
        return closestIndex
    }

    setRotations(rotate) {
        this.rotate = rotate
    }

    setRotationTime(time) {
        this.looktime = time
    }

    setStopOnEnd(boolean) {
        this.stopOnEnd = boolean
    }

    setRotations(boolean) {
        this.rotations = boolean
    }

    triggerOnEnd(CallBack) {
        this.callBackActions.push(CallBack)
    }

    triggerEnd() {
        this.callBackActions.forEach((action) => {
            action()
        })
        this.callBackActions = []
    }

    updateRoute() {
        if(ModuleToggle.UseRouteWalkerV2Module) return
        this.path = Utils.getConfigFile("routewalkerroutes/" + this.getAccessKey(ModuleManager.getSetting(this.ModuleName, "Route")) + ".txt")
    }

    handleRouteEdit(type, index) {
        let configName = "routewalkerroutes/" + this.getAccessKey(ModuleManager.getSetting(this.ModuleName, "Route")) + ".txt"
        let Route = Utils.getConfigFile(configName)
        if(type === "add") {
            let plyCords = Utils.playerCords().floor
            plyCords[1] -= 1
            Route.push(plyCords)
            Utils.writeConfigFile(configName, Route)
            ChatUtils.sendModMessage("Route Walker: Added waypoint " + Route.length)
            this.updateRoute()
            return
        }
        if(type === "remove") {
            Route.pop()
            Utils.writeConfigFile(configName, Route)
            ChatUtils.sendModMessage("Route Walker: Removed waypoint " + Route.length+1)
            this.updateRoute()
            return
        }
        if(type === "insert") {
            if(isNaN(index)) {
                ChatUtils.sendModMessage("Route Walker: /insert <number>")
                return
            }
            let plyCords = Utils.playerCords().floor
            plyCords[1] -= 1
            Route.splice(index-1, 0, plyCords)
            Utils.writeConfigFile(configName, Route)
            ChatUtils.sendModMessage("Route Walker: Inserted waypoint " + index)
            this.updateRoute()
            return
        }
    }


}

global.export.RouteWalkerV2 = new routeWalkerV2()