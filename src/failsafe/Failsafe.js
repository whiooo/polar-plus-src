let { TimeHelper } = global.export

class Failsafe {
    constructor() {
        this.toggle = false
        this.triggers = []

        this.triggered = false
        this.responseTimer = new TimeHelper()
        this.waitTime = 0
    }

    setToggled(t) {
        this.toggle = t
        this.reset()
        
        if (!this.toggle) this.triggers.forEach(t => t.unregister())
        else this.triggers.forEach(t => t.register())
    }

    reset() {}
}

global.export.Failsafe = Failsafe