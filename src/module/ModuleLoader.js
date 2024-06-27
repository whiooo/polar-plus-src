let configFolder = "PolarConfigV2"
let keybindFile = "keybinds.json"

// TODO seperate regular and plus binds

// All keybinds
let Keys = [
   {
      description: "Gemstone Macro",
      location: "Polar Client - Mining"
   },
   {
      description: "Glacite Commission Macro",
      location: "Polar Client - Mining"
   },
   {
      description: "Tunnel Miner",
      location: "Polar Client - Mining"
   },
   {
      description: "Powder Macro",
      location: "Polar Client - Mining"
   },
   {
      description: "Auto Miner",
      location: "Polar Client - Mining"
   },
   {
      description: "Mining Bot",
      location: "Polar Client - Mining"
   },
   {
      description: "Commission Macro",
      location: "Polar Client - Mining"
   },
   {
      description: "Combat Macro",
      location: "Polar Client - Combat"
   },
   {
      description: "Hoppity Macro",
      location: "Polar Client - Misc"
   },
   {
      description: "Lobby Hopper",
      location: "Polar Client - Misc"
   },
   {
      description: "Ghost Blocks",
      location: "Polar Client - Misc"
   },
   {
      description: "Route Walker",
      location: "Polar Client - Misc"
   },
   {
      description: "X-Ray",
      location: "Polar Client - Render"
   },
   /*
   {
      description: "Freecam",
      location: "Polar Client - Render"
   },
   */
   {
      description: "Cancel Response",
      location: "Polar Client - Failsafes",
      keycode: Keyboard.KEY_F
   }
]

function getKeys() {
   let config = FileLib.read(configFolder, keybindFile)
   return JSON.parse(config)
}

let Keybinds = []
function makeKeyBind(Description, KeyCode, Location) {
   Keybinds.push(new KeyBind(Description, KeyCode, Location))
}

function saveKeybinds(config) {
   let string = JSON.stringify(config, null, 2)
   FileLib.write(configFolder, keybindFile, string)
}


// Checks if the keybind is already in the config and creates the keybind by pushing it to an public Keybinds Array
let config = getKeys()
let newConfig = config
Keys.forEach(key => {
   // Stupid method
   let found = false
   for(let i = 0; i < config.length; i++) {
      if(key.description === config[i].description && key.location === config[i].location) {
         makeKeyBind(key.description, config[i].keycode ?? key.keycode ?? Keyboard.KEY_NONE, key.location)
         found = true
         break
      }
   }
   if(!found) {
      newConfig.push({description: key.description, keycode: 0, location: key.location})
      makeKeyBind(key.description, 0, key.location)
   }
});

saveKeybinds(newConfig)

function updateKeys() {
   let newConfig = []
   Keybinds.forEach((Keybind) => {
      newConfig.push({description: Keybind.getDescription(), keycode: Keybind.getKeyCode(), location: Keybind.getCategory()})
   })
   saveKeybinds(newConfig)
}

register("step", () => {
   updateKeys()
}).setDelay(30)


let keybinds = []
let modules = []
/**
 * Returns the keybind given by name and location
 * @param {String} Description
 * @param {String} Location
 * @returns {KeyBind}
 */
global.settingSelection.getKeyBind = (Description, Location, module) => {
   for(let i = 0; i < Keybinds.length; i++) {
      let Keybind = Keybinds[i]
      if(Keybind.getDescription() === Description && Keybind.getCategory() === Location) {
         if (module) modules.push(module)
         keybinds.push(Keybind)
         UpdateBinds(Keybind)
         return Keybind
      }
   }
}

const safe_module_url = "https://gist.githubusercontent.com/PolarC/35d8abb4139fed0c19163537c9a6bb83/raw/"

let safe_modules = []

const update_safe_modules = (callback = () => {}) => {
   try {
      safe_modules = JSON.parse(FileLib.getUrlContent(safe_module_url));
      callback()
   } catch (error) {
      console.warn(error);
      SendNotification("Warning", "Safe module list not loaded")
   }
}
update_safe_modules()

register("step", () => {
   update_safe_modules(() => {
   })
}).setDelay(30)

function ToggleModule(name) {
   modules.forEach(module => {
      if (module.ModuleName === name) {
         if (safe_modules.Modules && !safe_modules.Modules[name] && !module.Enabled && !module.enabled) {
            let w = new global.export.Warning(
                "Warning!", // title
                [`Module '${name}' flagged as unsafe.`,  "Proceed with caution"], // text lines to show
                [
                   // Buttons to show. Headless function called on click.
                   {"Continue": () => {
                         module.toggle()
                         w.GUI.close()
                      }},
                   {"Cancel": () => {
                         w.GUI.close()
                      }}
                ])

            w.Show()
         } else {
            module.toggle()
         }
      }
   });
}


function UpdateBinds(keybind){
   keybind.registerKeyPress(() => {
      ToggleModule(keybind.getDescription())
   })
}

