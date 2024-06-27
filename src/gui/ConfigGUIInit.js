// Initialize config and GUI
global.settingSelection.ModuleManager.makeObject()
global.export.gui()

let hour = new Date().getHours()
let time = () => {
   if (hour < 12)
      return "morning"
   else if (hour < 18)
      return "afternoon"
   else 
      return "evening"
}

global.export.ChatUtils.sendModMessage(`Good ${time()}!`)
/*
const c = () => global.export.FailsafeManager.register((cb) => {
   ChatLib.chat("&cFailsafe Triggered!")
   c()
}, () => {}, ["Teleport"])

c()
*/